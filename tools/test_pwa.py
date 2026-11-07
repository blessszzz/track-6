"""PWA regression checks. Requires pandas, Pillow and Playwright in the test environment.

Run: python tools/test_pwa.py (uses an installed Playwright Chromium browser).
"""
import functools
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
    worker_override = []
    assert manifest['display'] == 'standalone'
    for icon in manifest['icons']:
        with Image.open(ROOT / 'web' / icon['src']) as image:
            assert f'{image.width}x{image.height}' == icon['sizes']

    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
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

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'web')))
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
            page.click('[data-lang="en"]')
            page.evaluate('''() => {
              window.testSpoken=[];
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
            page.check('#speech-consent');page.click('#listen')
            assert not page.evaluate('testRecognition.processLocally')
            page.evaluate('testRecognition.onresult({results:[Object.assign([{transcript:"999 85"}],{isFinal:true})]})')
            page.click('#confirm-voice');assert page.evaluate('step')==2
            page.fill('#voice-transcript','170 85');page.click('#confirm-voice')
            assert page.evaluate('step')==3 and page.evaluate('S.weight')==85
            page.click('#use-text');assert page.locator('#voice-controls').is_hidden()
            page.evaluate('document.getElementById("reset").click()')
            session = context.new_cdp_session(page)
            info = session.send('Page.getAppManifest')
            assert not info['errors'], info['errors']
            install = session.send('Page.getInstallabilityErrors')
            assert not install['installabilityErrors'], install
            context.set_offline(True)
            page.reload()
            page.click('#choose-text')
            for language in ['en', 'fr', 'mfe']:
                page.click(f'[data-lang="{language}"]')
                assert page.evaluate('MODEL.features.length') == 16
                assert page.evaluate('Number.isFinite(compute().p)')
                assert page.locator('#report').is_hidden()
                assert page.locator('.journey-question:visible').count() == 1
            # The existing web app has copy/Google Calendar, not the Streamlit ICS export.
            # Complete all steps through real controls, preserving answers when going Back.
            page.fill('#age','62'); page.click('#next')
            page.click('#next')
            assert page.locator('#step-error').inner_text()
            page.click('[data-k="sex"][data-v="1"]'); page.click('#next')
            page.fill('#height','170');page.fill('#weight','85');page.click('#next')
            for index in range(3,16):
                radios=page.locator('.journey-question:visible [role="radio"]')
                if radios.count(): radios.first.click()
                page.click('#next')
            assert page.locator('#report').is_visible()
            assert page.locator('#journey').is_hidden()
            assert page.locator('#copy').count() == 1
            page.click('#edit');page.click('#previous')
            assert page.locator('.journey-question:visible').count()==1
            page.click('#next');page.click('#next')
            page.click('#reset');assert page.locator('#report').is_hidden()
            assert page.locator('#welcome').is_visible()
            assert page.input_value('#age')==''
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

            assert page.locator('a[href^="https://calendar.google.com/"]').count() == 1
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
            # Simulate a deployment without modifying checked-in files.
            worker_override.append((ROOT / 'web/sw.js').read_text().replace(keys[0], keys[0] + '-update'))
            page.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())')
            page.wait_for_function('navigator.serviceWorker.getRegistration().then(r => !!r.waiting)', timeout=30000)
            for tab in list(context.pages):
                tab.close()
            page = context.new_page()
            page.goto(origin + '/')
            page.wait_for_function('caches.keys().then(keys => keys.some(k => k.endsWith("-update")) && keys.filter(k => k.startsWith("diabetes-screen-")).length === 1)')
            assert not errors, errors
            browser.close()
            print('PASS: unchanged compute/report logic; manifest/icons; Chromium installability; registration; 9 baseline comparisons; offline languages/wizard/reminder controls/both pages; file standalone; deployment update and old cache removal; no page errors.')
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
