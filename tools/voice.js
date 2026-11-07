/* Speech is optional. Transcripts remain in memory and require explicit confirmation. */
const VOICE={
 en:{welcome:'Welcome. Choose voice or text to begin your screening.',voice:'Continue with Voice',text:'Continue with Text',listen:'Speak my answer',read:'Read question and choices',confirm:'Confirm this answer',retry:'Speak again',heard:'What you said — review before confirming',consent:'Allow browser speech processing. Audio may be sent to your browser provider and may require internet.',unsupported:'Voice recognition is unavailable here. You can still use the text controls.',local:'On-device speech is unavailable for this language. Use text, or allow browser speech processing below.',error:'Could not understand this answer. Please try again or use the text controls.',listening:'Listening… Speak now.',ready:'Review your words, then confirm. Nothing is submitted automatically.',hint:'For height and weight, speak two numbers in that order, in centimetres and kilograms. For other questions, say a displayed option or number.',fallback:'A Mauritian Creole voice may not be installed. Read-aloud will use a local French voice if available.',stop:'Stop listening',none:'No local reading voice is available. You can read the question on screen.'},
 fr:{welcome:'Bienvenue. Choisissez la voix ou le texte pour commencer votre dépistage.',voice:'Continuer avec la voix',text:'Continuer avec le texte',listen:'Dicter ma réponse',read:'Lire la question et les choix',confirm:'Confirmer cette réponse',retry:'Parler à nouveau',heard:'Vos paroles — vérifiez avant de confirmer',consent:'Autoriser le traitement vocal du navigateur. Le son peut être envoyé à son fournisseur et nécessiter Internet.',unsupported:'La reconnaissance vocale est indisponible. Utilisez les commandes texte.',local:'La reconnaissance sur cet appareil est indisponible pour cette langue. Utilisez le texte ou autorisez le traitement vocal ci-dessous.',error:'Réponse non comprise. Réessayez ou utilisez les commandes texte.',listening:'Écoute en cours… Parlez maintenant.',ready:'Vérifiez vos paroles puis confirmez. Aucune réponse n’est envoyée automatiquement.',hint:'Pour la taille et le poids, dites deux nombres dans cet ordre, en centimètres et kilogrammes. Sinon, dites un choix affiché ou un nombre.',fallback:'Sans voix créole installée, la lecture utilise une voix française locale si disponible.',stop:'Arrêter l’écoute',none:'Aucune voix locale disponible. Lisez la question à l’écran.'},
 mfe:{welcome:'Bienveni. Swazir lavwa ouswa text pou koumans ou depistaz.',voice:'Kontinie avek lavwa',text:'Kontinie avek text',listen:'Dir mo repons',read:'Lir kestion ek bann swa',confirm:'Konfirm sa repons-la',retry:'Koz ankor',heard:'Se ki ou finn dir — verifye avan konfirme',consent:'Permet navigater tret ou lavwa. Li kapav avoy son kot so fourniser ek bizin Internet.',unsupported:'Rekonesans lavwa pa disponib. Servi bann bouton ek text.',local:'Rekonesans lor sa aparey-la pa disponib pou sa lang-la. Servi text ouswa permet tretman lavwa anba.',error:'Pa finn konpran repons-la. Esey ankor ouswa servi text.',listening:'Pe ekoute… Koz aster.',ready:'Verifye ou bann parol avan konfirme. Nanye pa anvoye otomatikman.',hint:'Pou oter ek pwa, dir de sif dan sa lord-la, an santimet ek kilo. Sinon dir enn swa ki afise ouswa enn sif.',fallback:'Si pena lavwa Kreol, lektir pou servi enn lavwa Franse lokal si ena.',stop:'Aret ekoute',none:'Pena lavwa lokal disponib. Lir kestion lor lekran.'}
};
const LANGUAGE_ICONS={
 en:'<svg viewBox="0 0 60 40" width="48" height="32" aria-hidden="true"><path fill="#173d7a" d="M0 0h60v40H0z"/><path stroke="white" stroke-width="10" d="m0 0 60 40M0 40 60 0"/><path stroke="#c8233d" stroke-width="4" d="m0 0 60 40M0 40 60 0"/><path stroke="white" stroke-width="15" d="M30 0v40M0 20h60"/><path stroke="#c8233d" stroke-width="8" d="M30 0v40M0 20h60"/></svg>',
 fr:'<svg viewBox="0 0 60 40" width="48" height="32" aria-hidden="true"><path fill="#163b91" d="M0 0h20v40H0z"/><path fill="white" d="M20 0h20v40H20z"/><path fill="#e43843" d="M40 0h20v40H40z"/></svg>',
 mfe:'<svg viewBox="0 0 60 40" width="48" height="32" aria-hidden="true"><path fill="#e43446" d="M0 0h60v10H0z"/><path fill="#17327a" d="M0 10h60v10H0z"/><path fill="#f7d545" d="M0 20h60v10H0z"/><path fill="#1c9a59" d="M0 30h60v10H0z"/></svg>'
};
const STAGES={
 en:{mode:'How would you like to continue?',language:'Change language',noVoice:'Kreol voice assistant is not available for now.',thanks:'Thank you for choosing us',close:'You can now close this tab or start another screening.',again:'Start again',pdf:'Download PDF report',done:'Finish',exit:'Exit app',auto:'Your answer will continue automatically. Press Enter to continue sooner.'},
 fr:{mode:'Comment souhaitez-vous continuer ?',language:'Changer de langue',noVoice:'L’assistant vocal créole est indisponible pour le moment.',thanks:'Merci de nous avoir choisis',close:'Vous pouvez fermer cet onglet ou recommencer.',again:'Recommencer',pdf:'Télécharger le rapport PDF',done:'Terminer',exit:'Quitter',auto:'La réponse est validée automatiquement. Appuyez sur Entrée pour continuer plus vite.'},
 mfe:{mode:'Kouma ou anvi kontinie?',language:'Sanz lang',noVoice:'Asistan vokal Kreol pa disponib pou lemoman.',thanks:'Mersi ki ou finn swazir nou',close:'Ou kapav ferm sa onglet-la ouswa rekoumanse.',again:'Rekoumanse',pdf:'Tele sarz rapor PDF',done:'Termine',exit:'Kit aplikasyon',auto:'Ou repons pou valide otomatikman. Apiy Enter pou kontinie pli vit.'}
};
let startStage='splash';
let voiceStarted=false, voiceMode=false, recognition=null, speechEpoch=0, allowSpeechRemote=false;
const welcome=document.createElement('section');welcome.className='panel';welcome.id='welcome';
$('view-s').before(welcome);
const controls=document.createElement('section');controls.id='voice-controls';controls.className='follow';
$('form').after(controls);
function speechStop(){speechEpoch++;if(window.speechSynthesis)speechSynthesis.cancel();if(recognition){recognition.abort();recognition=null;}}
function say(text,language=lang,append=false){
  if(!window.speechSynthesis)return;
  const voices=speechSynthesis.getVoices().filter(voice=>voice.localService);
  const prefix=language==='mfe'?'mfe':language;
  const voice=voices.find(v=>v.lang.toLowerCase().startsWith(prefix)) || (language==='mfe'?voices.find(v=>v.lang.startsWith('fr')):null);
  if(!voice){$('voice-status').textContent=VOICE[lang].none;return;}
  if(!append)speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.9;
  speechSynthesis.speak(utterance);
}
function greetings(){
  speechStop();['en','fr','mfe'].forEach(language=>say(VOICE[language].welcome,language,true));
}
function voiceUI(){
  speechStop();const v=VOICE[lang];
  if(lang==='mfe')voiceMode=false;
  welcome.hidden=voiceStarted;
  document.body.dataset.stage=voiceStarted?'screening':startStage;
  if(startStage==='splash')welcome.innerHTML=`<div class="splash-orbit"><img src="./icons/icon-512.png" alt="Diabetes Screening" class="splash-logo"></div><p class="eyebrow">DIABETES RISK SCREENING</p><h2>Care starts with you.</h2><div class="splash-loader" aria-label="Loading"><i></i><i></i><i></i></div>`;
  else if(startStage==='language')welcome.innerHTML=`<p class="eyebrow">WELCOME · BIENVENUE · BIENVENI</p><h2>Choose your language</h2><p>Choisissez votre langue · Swazir ou lang</p><div class="choice-grid"><button class="choice" data-language-choice="en"><span class="choice-icon" aria-hidden="true">${LANGUAGE_ICONS.en}</span><strong>English</strong><small>Default language</small></button><button class="choice" data-language-choice="fr"><span class="choice-icon" aria-hidden="true">${LANGUAGE_ICONS.fr}</span><strong>Français</strong><small>Continuer en français</small></button><button class="choice" data-language-choice="mfe"><span class="choice-icon" aria-hidden="true">${LANGUAGE_ICONS.mfe}</span><strong>Kreol Morisien</strong><small>Kontinie an Kreol</small></button></div>`;
  else if(startStage==='farewell')welcome.innerHTML=`<div class="closing-icon" aria-hidden="true">✓</div><h2>${esc(STAGES[lang].thanks)}</h2><p>Thank you for choosing us. Take care, and goodbye.</p><p>Merci de nous avoir choisis. Prenez soin de vous, au revoir.</p><p>Mersi ki ou finn swazir nou. Pran swin ou, orevwar.</p><p class="small">${esc(STAGES[lang].close)}</p><div class="btns"><button class="btn" id="start-again">${esc(STAGES[lang].again)}</button><button class="btn alt" id="close-app">${esc(STAGES[lang].exit)}</button></div>`;
  else welcome.innerHTML=`<p class="eyebrow">${esc(LANGS[lang])}</p><h2>${esc(STAGES[lang].mode)}</h2><div class="choice-grid"><button class="choice" id="choose-voice" ${lang==='mfe'?'disabled aria-describedby="kreol-note"':''}><span class="choice-icon" aria-hidden="true">🎙</span><strong>${esc(v.voice)}</strong></button><button class="choice" id="choose-text"><span class="choice-icon" aria-hidden="true">✎</span><strong>${esc(v.text)}</strong></button></div>${lang==='mfe'?`<p id="kreol-note">${esc(STAGES.mfe.noVoice)}</p>`:''}<button class="btn alt" id="choose-language">${esc(STAGES[lang].language)}</button>`;
  $('journey').hidden=!voiceStarted||complete;$('report').hidden=!voiceStarted||!complete;
  controls.hidden=!voiceMode||complete;
  controls.innerHTML=`<div class="btns"><button class="btn alt" id="read-question">${esc(v.read)}</button><button class="btn" id="listen">${esc(v.listen)}</button><button class="btn alt" id="stop-listening">${esc(v.stop)}</button><button class="btn alt" id="use-text">${esc(v.text)}</button></div><p class="small">${esc(v.hint)}</p>${lang==='mfe'?`<p class="small">${esc(v.fallback)}</p>`:''}<label class="small"><input type="checkbox" id="speech-consent"> ${esc(v.consent)}</label><p id="voice-status" role="status"></p><div id="voice-review" hidden><label for="voice-transcript">${esc(v.heard)}</label><textarea id="voice-transcript" rows="2" style="width:100%;font:inherit"></textarea><div class="btns"><button class="btn" id="confirm-voice">${esc(v.confirm)}</button><button class="btn alt" id="retry-voice">${esc(v.retry)}</button></div></div>`;
  $('speech-consent').checked=allowSpeechRemote;
  if(voiceMode&&voiceStarted&&!complete)readQuestion();
  if($('report-actions'))updateReportActions();
}
function readQuestion(){
  speechStop();
  const section=document.querySelector('.journey-question:not([hidden])');
  if(section)say(section.innerText);
}
function listen(){
  if(lang==='mfe')return;
  speechStop();const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){$('voice-status').textContent=VOICE[lang].unsupported;return;}
  const instance=new Constructor();
  if(!$('speech-consent').checked){
    if(!('processLocally' in instance)){$('voice-status').textContent=VOICE[lang].local;return;}
    instance.processLocally=true;
  }
  instance.lang={en:'en-GB',fr:'fr-FR',mfe:'mfe-MU'}[lang];instance.interimResults=true;instance.continuous=false;
  const epoch=speechEpoch;recognition=instance;
  $('voice-transcript').value='';$('voice-review').hidden=false;$('confirm-voice').disabled=true;
  instance.onresult=event=>{
    if(epoch!==speechEpoch)return;
    $('voice-transcript').value=Array.from(event.results).map(result=>result[0].transcript).join(' ');
    $('confirm-voice').disabled=!Array.from(event.results).some(result=>result.isFinal);
    $('voice-status').textContent=Array.from(event.results).some(result=>result.isFinal)?VOICE[lang].ready:VOICE[lang].listening;
  };
  instance.onerror=()=>{if(epoch===speechEpoch){$('voice-status').textContent=instance.processLocally?VOICE[lang].local:VOICE[lang].unsupported;$('confirm-voice').disabled=true;}};
  instance.onend=()=>{if(recognition===instance)recognition=null;};
  try{instance.start();$('voice-status').textContent=VOICE[lang].listening;}catch(_){$('voice-status').textContent=VOICE[lang].unsupported;}
}
function normal(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[!?]/g,'').trim().replace(/\.$/,'');}
function spokenNumbers(text){
  const english=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const french=['zero','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
  const kreol=['zero','enn','de','trwa','kat','sink','sis','set','wit','nef','dis','onz','douz','trez','katorz','kinz','sez','diset','dizwit','diznef'];
  const en=n=>n<20?english[n]:['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n/10)]+(n%10?' '+english[n%10]:'');
  const fr=n=>n<17?french[n]:n<20?'dix '+french[n-10]:n<70?['','','vingt','trente','quarante','cinquante','soixante'][Math.floor(n/10)]+(n%10===1?' et un':n%10?' '+french[n%10]:''):n<80?'soixante '+(n===71?'et ':'')+fr(n-60):'quatre vingt'+(n===80?'s':' '+fr(n-80));
  const mfe=n=>n<20?kreol[n]:['','','vin','trant','karant','sinkant','swasant','swasanndis','katrovin','katrovin dis'][Math.floor(n/10)]+(n%10?' '+kreol[n%10]:'');
  const names=[];
  for(let n=0;n<=250;n++){
    const tail=n%100, hundreds=Math.floor(n/100);
    let name;
    if(lang==='en')name=hundreds?(hundreds===1?'one':'two')+' hundred'+(tail?' '+en(tail):''):en(n);
    else if(lang==='fr')name=hundreds?(hundreds===1?'cent':'deux cent')+(tail?' '+fr(tail):hundreds===2?'s':''):fr(n);
    else name=hundreds?(hundreds===1?'san':'de san')+(tail?' '+mfe(tail):''):mfe(n);
    names.push([name,n]);
    if(lang==='en'&&hundreds&&tail)names.push([(hundreds===1?'one':'two')+' hundred and '+en(tail),n]);
  }
  let value=text.replace(/(?<=[a-z])-(?=[a-z])/g,' ');
  for(const [name,n] of names.sort((a,b)=>b[0].length-a[0].length))value=value.replace(new RegExp('\\b'+name+'\\b','g'),String(n));
  return value;
}
function confirmVoice(){
  const section=document.querySelector('.journey-question:not([hidden])');
  const text=normal($('voice-transcript').value);
  const radios=[...section.querySelectorAll('[role=radio]')];
  if(radios.length){
    const button=radios.find(button=>normal(button.textContent)===text);
    if(!button){$('voice-status').textContent=VOICE[lang].error;return;}
    button.click();
  }else{
    // Conservative parsing: never guess units, free text, or out-of-range values.
    const numericText=spokenNumbers(text);
    const numbers=numericText.match(/\d+(?:[,.]\d+)?/g)||[];
    const inputs=[...section.querySelectorAll('input')];
    const stripped=numericText.replace(/\d+(?:[,.]\d+)?/g,'').replace(/\b(cm|kg|years|ans|an|centimetres|centimeters|kilograms|kilo|santimet)\b/g,'').replace(/[,;\s]/g,'');
    if(numbers.length!==inputs.length||stripped||inputs.some((input,index)=>{const value=Number(numbers[index].replace(',','.'));return value<Number(input.min)||value>Number(input.max)||(value-Number(input.min))%Number(input.step||1)!==0;})){$('voice-status').textContent=VOICE[lang].error;return;}
    inputs.forEach((input,index)=>{input.value=numbers[index].replace(',','.');input.dispatchEvent(new Event('input',{bubbles:true}));});
  }
  speechStop();$('voice-review').hidden=true;$('next').click();
}
document.addEventListener('journeychange',voiceUI);
document.addEventListener('click',event=>{
  const id=event.target.closest('button')?.id;
  const languageButton=event.target.closest('[data-language-choice]');
  if(languageButton){lang=languageButton.dataset.languageChoice;startStage='mode';full();return;}
  if(id==='choose-language'){startStage='language';voiceUI();}
  if(id==='choose-voice'||id==='choose-text'){
    if(id==='choose-voice'&&lang==='mfe')return;
    voiceStarted=true;voiceMode=id==='choose-voice';voiceUI();
  }
  if(id==='close-app'){speechStop();if(window.opener)window.close();}
  if(id==='greet')greetings();
  if(id==='read-question')readQuestion();
  if(id==='listen'||id==='retry-voice')listen();
  if(id==='stop-listening')speechStop();
  if(id==='confirm-voice')confirmVoice();
  if(id==='use-text'){voiceMode=false;voiceUI();}
  if(id==='reset'||id==='start-again'){restartScreening();}
});
document.addEventListener('change',event=>{if(event.target.id==='speech-consent')allowSpeechRemote=event.target.checked;});
window.addEventListener('pagehide',speechStop);
voiceUI();
setTimeout(()=>{if(startStage==='splash'){startStage='language';voiceUI();}},2200);

function restartScreening(){
  clearTimeout(advanceTimer);speechStop();S={...NEUTRAL};step=0;complete=false;answered.clear();numericDraft.clear();
  voiceStarted=false;voiceMode=false;allowSpeechRemote=false;lang='en';startStage='language';full();
}
function endScreening(exit=false){
  clearTimeout(advanceTimer);speechStop();
  S={...NEUTRAL};answered.clear();numericDraft.clear();step=0;complete=false;
  voiceStarted=false;voiceMode=false;allowSpeechRemote=false;startStage='farewell';full();
  ['en','fr','mfe'].forEach(language=>say({en:'Thank you for choosing us. Take care, and goodbye.',fr:'Merci de nous avoir choisis. Prenez soin de vous, au revoir.',mfe:'Mersi ki ou finn swazir nou. Pran swin ou. Orevwar.'}[language],language,true));
  if(exit&&window.opener)window.close();
}
