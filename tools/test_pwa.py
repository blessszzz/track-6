"""PWA regression checks. Requires pandas, Pillow and Playwright in the test environment.

Run: python tools/test_pwa.py (uses an installed Playwright Chromium browser).
"""
import functools
import io
import http.server
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import tempfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.test-deps'))
from playwright.sync_api import sync_playwright
from PIL import Image


def main():
    original = subprocess.check_output(['git', 'show', 'HEAD:web/index.html'], cwd=ROOT).decode('utf-8')
    original_admin = subprocess.check_output(['git', 'show', 'HEAD:admin-web/index.html'], cwd=ROOT).decode('utf-8')
    current = (ROOT / 'web/index.html').read_text(encoding='utf-8')
    script = lambda html: re.findall(r'<script>(.*?)</script>', html, re.S)[0]
    for name, end in [('compute', '/* ---------- form'), ('update', '/* ---------- chrome')]:
        if name == 'compute':
            extract=lambda text: re.search(r'function compute\(\)\{(.*?)\n\}', text, re.S).group(1)
        else:
            extract=lambda text: re.search(r'function update\(\)\{(.*?)\n\}', text, re.S).group(1)
        assert extract(original)==extract(current), name+' changed'
    assert 'const MODEL=' in current and 'const MODEL=' in original
    assert 'METRICS=' not in current and 'FAIR=' not in current and 'id="mc"' not in current
    manifest = json.loads((ROOT / 'web/manifest.webmanifest').read_text())
    release=json.loads((ROOT / 'web/version.json').read_text())['version']
    assert f"const APP_VERSION='{release}'" in current
    assert f"diabetes-screen-{release}" in (ROOT/'web/sw.js').read_text()
    worker_override = []
    release_override = []
    page_override = []
    fail_shell = [False]
    assert manifest['display'] == 'standalone'
    for icon in manifest['icons']:
        with Image.open(ROOT / 'web' / icon['src']) as image:
            assert f'{image.width}x{image.height}' == icon['sizes']

    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/index.html' and fail_shell[0]:
                self.send_error(503,'Simulated incomplete deployment')
                return
            if self.path == '/version.json' and release_override:
                self.send_response(200)
                self.send_header('Content-Type','application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'version':release_override[0]}).encode())
                return
            if self.path in ['/', '/index.html', '/standalone.html'] and page_override:
                self.send_response(200)
                self.send_header('Content-Type','text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(page_override[0].encode('utf-8'))
                return
            if self.path == '/sw.js' and worker_override:
                self.send_response(200)
                self.send_header('Content-Type', 'application/javascript')
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(worker_override[0].encode('utf-8'))
                return
            if self.path in ['/baseline.html','/baseline-admin.html']:
                body = (original_admin if self.path=='/baseline-admin.html' else original).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(body)
            else:
                super().do_GET()

        def log_message(self, *_):
            pass

    class Server(http.server.ThreadingHTTPServer):
        def handle_error(self,request,client_address):
            if isinstance(sys.exc_info()[1],(ConnectionAbortedError,ConnectionResetError,BrokenPipeError)):
                return  # Browser navigation/auto-update cancelled an in-flight response.
            super().handle_error(request,client_address)

    server = Server(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'web')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://localhost:{server.server_port}'
    try:
        with tempfile.TemporaryDirectory(prefix='diabetes-pwa-') as profile, sync_playwright() as p:
            options = {}
            installed = list((Path(os.environ['LOCALAPPDATA']) / 'ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'))
            if installed:
                options['executable_path'] = str(installed[-1])
            browser = p.chromium.launch_persistent_context(profile, accept_downloads=True, **options)
            context = browser
            errors = []
            context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
            baseline = context.new_page()
            baseline.goto(origin + '/baseline.html')
            admin = context.new_page()
            admin.goto((ROOT / 'admin-web/index.html').as_uri())
            baseline_admin = context.new_page()
            baseline_admin.goto(origin+'/baseline-admin.html')
            for language in ['en', 'fr', 'mfe']:
                expected=baseline_admin.evaluate('(language)=>{lang=language;buildCard();return $("mc").innerHTML}',language)
                admin.select_option('#language',language)
                assert admin.locator('#mc').inner_html()==expected
            assert admin.evaluate('navigator.serviceWorker.controller') is None
            page = context.new_page()
            page.goto(origin + '/')
            assert page.evaluate('lang')=='en'
            assert page.locator('.splash-logo').is_visible()
            page.wait_for_selector('[data-language-choice]')
            preview=ROOT/'tools/.pwa-preview';preview.mkdir(exist_ok=True)
            page.screenshot(path=str(preview/'language.png'),full_page=True)
            page.evaluate('navigator.serviceWorker.ready')
            page.wait_for_function('!!navigator.serviceWorker.controller')
            registration = page.evaluate('navigator.serviceWorker.getRegistration().then(r => ({scope:r.scope, state:r.active.state}))')
            assert registration['state'] == 'activated'
            for language in ['en', 'fr', 'mfe']:
                for state in [dict(age=20, weight=50, HighBP=0, GenHlth=1), dict(age=58, weight=92, HighBP=1, GenHlth=4), dict(age=80, weight=140, HighBP=1, GenHlth=5, HighChol=1, DiffWalk=1)]:
                    expression = '(arg) => {lang=arg.language; S={...DEMO,...arg.state};full(); return {score:compute(),result:$("result").innerHTML}}'
                    args = dict(language=language, state=state)
                    assert baseline.evaluate(expression, args) == page.evaluate(expression, args)
            # Mock recognition events: verify transcript review, consent, and conservative parsing.
            # This tests the integration, not microphone accuracy or installed device voices.
            page.evaluate('document.getElementById("reset").click()')
            page.click('[data-language-choice="en"]')
            page.evaluate('''() => {
              window.testSpoken=[];window.testMicRequests=0;window.testMicStops=0;
              navigator.mediaDevices.getUserMedia=async()=>{testMicRequests++;return {getTracks:()=>[{stop(){testMicStops++;}}]};};
              window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
              Object.defineProperty(window,'speechSynthesis',{value:{
                getVoices:()=>['en-GB','fr-FR','mfe-MU'].map(lang=>({lang,localService:true})),
                cancel(){},speak(utterance){testSpoken.push(utterance);},addEventListener(){}
              }});
              window.SpeechRecognition=class {
                constructor(){this.processLocally=false;window.testRecognition=this;}
                start(){} abort(){}
              };
            }''')
            page.evaluate('greetings()')
            assert page.evaluate('testSpoken.map(item=>item.lang)')==['en-GB','fr-FR','mfe-MU']
            page.click('#choose-voice')
            page.wait_for_function('voiceMode')
            assert page.evaluate('testMicRequests')==1 and page.evaluate('testMicStops')==1
            assert page.locator('#speech-consent').count()==0
            page.click('#listen')
            assert page.evaluate('testRecognition.processLocally')
            page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"sixty"}],{isFinal:false})]})')
            assert page.locator('#confirm-voice').is_disabled()
            page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"sixty two"}],{isFinal:true})]})')
            assert page.input_value('#voice-transcript')=='sixty two'
            assert page.evaluate('S.age')==45
            page.click('#confirm-voice')
            assert page.evaluate('S.age')==62 and page.evaluate('step')==1
            page.click('#listen')
            page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"male"}],{isFinal:true})]})')
            page.click('#confirm-voice')
            assert page.evaluate('step')==2
            page.evaluate('() => {window.SpeechRecognition=class {constructor(){window.testRecognition=this;}start(){}abort(){}};}')
            page.click('#mode-voice');page.click('#allow-browser-speech');page.click('#listen')
            assert not page.evaluate('testRecognition.processLocally')
            page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"999 85"}],{isFinal:true})]})')
            page.click('#confirm-voice');assert page.evaluate('step')==2
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.getElementById("confirm-voice").getBoundingClientRect().bottom <= innerHeight')
            assert page.evaluate('document.querySelector(".journey-question:not([hidden])").getBoundingClientRect().top >= 0')
            page.screenshot(path=str(preview/'voice-mobile.png'),full_page=True)
            page.fill('#voice-transcript','85');page.click('#confirm-voice')
            assert page.evaluate('step')==3 and page.evaluate('S.weight')==85
            assert page.locator('.journey-question:visible #height').count()==1
            page.click('#listen');page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"170"}],{isFinal:true})]})')
            page.click('#confirm-voice');assert page.evaluate('step')==4 and page.evaluate('S.height')==170
            for language in ['en','fr']:
                page.evaluate('(language)=>{step=9;lang=language;full();}',language)
                assert page.evaluate('document.getElementById("confirm-voice").getBoundingClientRect().bottom <= innerHeight')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(preview/'voice-general-health-mobile.png'),full_page=True)
            page.evaluate('step=4;lang="en";full()')
            page.click('#mode-text');assert page.locator('#voice-controls').is_hidden()
            page.evaluate('() => {navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError");};}')
            page.click('#mode-voice')
            page.wait_for_function('document.getElementById("mode-feedback").textContent.includes("denied")')
            assert not page.evaluate('voiceMode') and page.evaluate('S.height')==170
            page.set_viewport_size({'width':1280,'height':900})
            page.evaluate('document.getElementById("reset").click()')
            session = context.new_cdp_session(page)
            info = session.send('Page.getAppManifest')
            assert not info['errors'], info['errors']
            install = session.send('Page.getInstallabilityErrors')
            assert not install['installabilityErrors'], install
            context.set_offline(True)
            page.reload()
            page.click('[data-language-choice="mfe"]')
            assert page.locator('#choose-voice').is_disabled()
            assert page.locator('#kreol-note').is_visible()
            page.click('#choose-text')
            for language in ['en', 'fr', 'mfe']:
                page.click(f'[data-lang="{language}"]')
                assert page.evaluate('MODEL.features.length') == 16
                assert page.evaluate('Number.isFinite(compute().p)')
                assert page.locator('#report').is_hidden()
                assert page.locator('.journey-question:visible').count() == 1
            # The existing web app has copy/Google Calendar, not the Streamlit ICS export.
            # Complete all steps through real controls, preserving answers when going Back.
            page.fill('#age','62');page.wait_for_function('step===1')
            page.click('[data-k="sex"][data-v="1"]');page.wait_for_function('step===2')
            page.fill('#weight','85');page.wait_for_function('step===3')
            page.fill('#height','170');page.wait_for_function('step===4')
            for index in range(4,17):
                radios=page.locator('.journey-question:visible [role="radio"]')
                if radios.count(): radios.first.click()
                else: page.locator('.journey-question:visible [data-zero]').click()
                page.wait_for_function('(previous)=>step!==previous || complete',arg=index)
            assert page.locator('#report').is_visible()
            assert page.locator('#journey').is_hidden()
            assert page.locator('#copy').count() == 1
            assert page.locator('a[href^="https://calendar.google.com/"]').count() == 1
            for language in ['en','fr','mfe']:
                page.click(f'[data-lang="{language}"]')
                with page.expect_download() as event:
                    page.click('#download-pdf')
                pdf=Path(event.value.path()).read_bytes()
                assert pdf.startswith(b'%PDF-1.4') and pdf.rstrip().endswith(b'%%EOF')
                xref=re.search(rb'xref\n0 (\d+)\n((?:\d{10} \d{5} [nf] \n)+)',pdf)
                assert xref
                entries=xref[2].splitlines()
                assert len(entries)==int(xref[1])
                for number,entry in enumerate(entries[1:],1):
                    offset=int(entry[:10]);assert pdf[offset:].startswith(f'{number} 0 obj'.encode())
                for image_index,image in enumerate(re.finditer(rb'/Subtype /Image[^\n]+/Length (\d+) >>\nstream\n',pdf)):
                    with Image.open(io.BytesIO(pdf[image.end():image.end()+int(image[1])])) as bitmap:
                        assert bitmap.size==(1240,1754)
                        if image_index==0 and language=='fr':bitmap.save(preview/'pdf-report.png')
                assert page.evaluate('reportLines().some(line=>line.includes(T().disclaimer))')
            preview=ROOT/'tools/.pwa-preview';preview.mkdir(exist_ok=True)
            page.screenshot(path=str(preview/'report.png'),full_page=True)
            page.click('#edit');page.click('#previous')
            assert page.locator('.journey-question:visible').count()==1
            page.locator('.journey-question:visible [data-zero]').click()
            page.wait_for_function('step===16')
            page.locator('.journey-question:visible [data-zero]').click()
            page.wait_for_function('complete')
            page.click('#finish-session')
            assert page.locator('#welcome').is_visible()
            assert page.evaluate('answered.size')==0 and page.evaluate('numericDraft.size')==0
            assert page.locator('#voice-transcript').input_value()==''
            page.click('#close-app')
            assert page.locator('#start-again').is_visible()
            page.click('#start-again')
            assert page.evaluate('lang')=='en'
            page.click('[data-language-choice="en"]');page.click('#choose-text')
            assert page.input_value('#age')==''
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

            page.goto(origin + '/standalone.html')
            assert page.evaluate('MODEL.features.length') == 16
            keys = page.evaluate('caches.keys()')
            assert len([key for key in keys if key.startswith('diabetes-screen-')]) == 1
            urls = page.evaluate('async () => (await (await caches.open((await caches.keys())[0])).keys()).map(r=>r.url)')
            assert all('calendar.google' not in url and 'admin' not in url for url in urls)
            context.set_offline(False)
            standalone = context.new_page()
            standalone.goto((ROOT / 'web/standalone.html').as_uri())
            assert standalone.evaluate('Number.isFinite(compute().p)')
            # Keep both an active screening and an idle installed-app window open.
            page.click('[data-language-choice="en"]');page.click('#choose-text')
            page.fill('#age','62');page.wait_for_function('step===1')
            old_version=page.evaluate('APP_VERSION')
            idle=context.new_page();idle.goto(origin+'/')
            idle.wait_for_selector('[data-language-choice]')
            # Simulate a deployment without modifying checked-in files.
            release_override.append(old_version+'-update')
            page_override.append(current.replace(old_version,release_override[0]))
            worker_override.append((ROOT / 'web/sw.js').read_text().replace(keys[0], keys[0] + '-update'))
            launch=context.new_page();launch.goto(origin+'/')
            assert launch.evaluate('APP_VERSION')==release_override[0]
            page.click('#check-updates')
            page.wait_for_function('document.getElementById("update-status").textContent.includes("Update ready")',timeout=30000)
            assert page.evaluate('APP_VERSION')==old_version
            assert page.evaluate('step')==1 and page.evaluate('S.age')==62
            idle.wait_for_function('APP_VERSION.endsWith("-update")',timeout=30000)
            # Starting a new session applies the release without closing other tabs.
            page.evaluate('restartScreening()')
            page.wait_for_function('APP_VERSION.endsWith("-update")',timeout=30000)
            assert page.evaluate('answered.size')==0
            page.wait_for_function('caches.keys().then(keys => keys.some(k => k.endsWith("-update")) && keys.filter(k => k.startsWith("diabetes-screen-")).length === 1)')
            context.set_offline(True);page.reload()
            page.wait_for_selector('[data-language-choice]')
            assert page.evaluate('APP_VERSION')==release_override[0]
            page.click('[data-language-choice="en"]');page.click('#choose-text')
            page.click('#check-updates')
            page.wait_for_function('document.getElementById("update-status").textContent.includes("Cannot check")')
            # An incomplete next deployment must leave the working offline release intact.
            context.set_offline(False);fail_shell[0]=True
            worker_override[0]=worker_override[0].replace(keys[0]+'-update',keys[0]+'-failed')
            page.evaluate('''async () => {
              const registration=await navigator.serviceWorker.getRegistration();
              await new Promise((resolve,reject)=>{
                registration.addEventListener('updatefound',()=>{
                  const worker=registration.installing;
                  worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve();});
                },{once:true});
                registration.update().catch(reject);
              });
            }''')
            assert not page.evaluate('caches.keys().then(keys=>keys.some(key=>key.endsWith("-failed")))')
            context.set_offline(True);page.reload()
            page.wait_for_selector('[data-language-choice]')
            assert page.evaluate('APP_VERSION')==release_override[0]
            assert not errors, errors
            browser.close()
            print('PASS: unchanged scoring/report; installability/offline/PDF/languages; deployed update reaches idle window automatically; active screening preserved; new session applies update without closing tabs; updated offline cache; offline update-check fallback; no page errors.')
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
