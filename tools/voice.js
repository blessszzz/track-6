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
const UI_ICONS={
 mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>',
 text:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14M12 4v16M8 20h8"/></svg>',
 speaker:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/></svg>',
 stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>'
};
const COMPACT={
 en:{voice:'Voice',text:'Text',answer:'Your answer',review:'Review, then tap →',permission:'Microphone access denied. You can use text.',unavailable:'Voice unavailable. Use text.',privacy:'Allow browser voice processing?',allow:'Use voice',notice:'Your browser provider may process this audio online. Answers are not saved by this app.'},
 fr:{voice:'Voix',text:'Texte',answer:'Votre réponse',review:'Vérifiez puis touchez →',permission:'Microphone refusé. Utilisez le texte.',unavailable:'Voix indisponible. Utilisez le texte.',privacy:'Autoriser le traitement vocal ?',allow:'Utiliser la voix',notice:'Le fournisseur de votre navigateur peut traiter le son en ligne. Cette application ne sauvegarde pas vos réponses.'},
 mfe:{voice:'Lavwa',text:'Text',answer:'Ou repons',review:'Verifye ek apiy →',permission:'Mikro pa otorize. Servi text.',unavailable:'Lavwa pa disponib. Servi text.',privacy:'Permet tretman lavwa?',allow:'Servi lavwa',notice:'Fourniser ou navigater kapav tret son online. Sa aplikasyon-la pa gard ou bann repons.'}
};
const STAGES={
 en:{mode:'How would you like to continue?',language:'Change language',noVoice:'Kreol voice assistant is not available for now.',thanks:'Thank you for choosing us',close:'You can now close this tab or start another screening.',again:'Start again',pdf:'Download PDF report',done:'Finish',exit:'Exit app',auto:'Your answer will continue automatically. Press Enter to continue sooner.'},
 fr:{mode:'Comment souhaitez-vous continuer ?',language:'Changer de langue',noVoice:'L’assistant vocal créole est indisponible pour le moment.',thanks:'Merci de nous avoir choisis',close:'Vous pouvez fermer cet onglet ou recommencer.',again:'Recommencer',pdf:'Télécharger le rapport PDF',done:'Terminer',exit:'Quitter',auto:'La réponse est validée automatiquement. Appuyez sur Entrée pour continuer plus vite.'},
 mfe:{mode:'Kouma ou anvi kontinie?',language:'Sanz lang',noVoice:'Asistan vokal Kreol pa disponib pou lemoman.',thanks:'Mersi ki ou finn swazir nou',close:'Ou kapav ferm sa onglet-la ouswa rekoumanse.',again:'Rekoumanse',pdf:'Tele sarz rapor PDF',done:'Termine',exit:'Kit aplikasyon',auto:'Ou repons pou valide otomatikman. Apiy Enter pou kontinie pli vit.'}
};
let startStage='splash';
let voiceStarted=false, voiceMode=false, recognition=null, speechEpoch=0, allowSpeechRemote=false;
let modeRequest=0, awaitingSpeechConsent=false;
const welcome=document.createElement('section');welcome.className='panel';welcome.id='welcome';
$('view-s').before(welcome);
const controls=document.createElement('section');controls.id='voice-controls';controls.className='follow';
const questionLayout=document.createElement('div');questionLayout.className='question-layout';
$('form').before(questionLayout);questionLayout.append($('form'),controls);
const topTools=document.createElement('div');topTools.className='top-tools';$('langs').before(topTools);topTools.append($('langs'));
const modeTools=document.createElement('div');modeTools.id='mode-tools';modeTools.className='seg';topTools.append(modeTools);
const modeFeedback=document.createElement('p');modeFeedback.id='mode-feedback';modeFeedback.className='small';modeFeedback.setAttribute('role','alert');topTools.append(modeFeedback);
function speechStop(){speechEpoch++;if(window.speechSynthesis)speechSynthesis.cancel();if(recognition){recognition.abort();recognition=null;}}
function say(text,language=lang,append=false,onend=null){
  if(!window.speechSynthesis)return false;
  const voices=speechSynthesis.getVoices().filter(voice=>voice.localService);
  const prefix=language==='mfe'?'mfe':language;
  const voice=voices.find(v=>v.lang.toLowerCase().startsWith(prefix)) || (language==='mfe'?voices.find(v=>v.lang.startsWith('fr')):null);
  if(!voice){$('voice-status').textContent=VOICE[lang].none;return false;}
  if(!append)speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.9;
  if(onend)utterance.onend=onend;
  speechSynthesis.speak(utterance);return true;
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
  else welcome.innerHTML=`<p class="eyebrow">${esc(LANGS[lang])}</p><h2>${esc(STAGES[lang].mode)}</h2><div class="choice-grid"><button class="choice" id="choose-voice" ${lang==='mfe'?'disabled aria-describedby="kreol-note"':''}><span class="choice-icon" aria-hidden="true">🎙</span><strong>${esc(COMPACT[lang].voice)}</strong></button><button class="choice" id="choose-text"><span class="choice-icon" aria-hidden="true">✎</span><strong>${esc(COMPACT[lang].text)}</strong></button></div>${lang==='mfe'?`<p id="kreol-note">${esc(STAGES.mfe.noVoice)}</p>`:''}`;
  $('journey').hidden=!voiceStarted||complete;$('report').hidden=!voiceStarted||!complete;
  controls.hidden=!voiceMode||complete;
  controls.innerHTML=`<div class="voice-icons"><button class="icon-btn" id="read-question" aria-label="${esc(v.read)}" title="${esc(v.read)}">${UI_ICONS.speaker}</button><button class="icon-btn primary" id="listen" aria-label="${esc(v.listen)}" title="${esc(v.listen)}">${UI_ICONS.mic}</button><button class="icon-btn" id="stop-listening" aria-label="${esc(v.stop)}" title="${esc(v.stop)}">${UI_ICONS.stop}</button></div><p id="voice-status" role="status"></p><div id="voice-review"><label for="voice-transcript">${esc(COMPACT[lang].answer)}</label><div class="transcript-row"><textarea id="voice-transcript" rows="2" placeholder="${esc(COMPACT[lang].answer)}"></textarea><button class="icon-btn primary" id="confirm-voice" disabled aria-label="${esc(v.confirm)}" title="${esc(v.confirm)}">${UI_ICONS.arrow}</button></div></div>`;
  $('langs').innerHTML=Object.entries(LANGS).map(([key,name])=>`<button type="button" data-lang="${key}" aria-label="${esc(name)}" title="${esc(name)}" aria-pressed="${key===lang}">${LANGUAGE_ICONS[key]}</button>`).join('');
  modeTools.innerHTML=`<button type="button" id="mode-voice" ${lang==='mfe'?'disabled':''} aria-label="${esc(COMPACT[lang].voice)}" title="${esc(lang==='mfe'?STAGES[lang].noVoice:COMPACT[lang].voice)}" aria-pressed="${voiceMode}">${UI_ICONS.mic}</button><button type="button" id="mode-text" aria-label="${esc(COMPACT[lang].text)}" title="${esc(COMPACT[lang].text)}" aria-pressed="${!voiceMode}">${UI_ICONS.text}</button>`;
  questionLayout.classList.toggle('with-voice',voiceMode);
  if(voiceMode&&voiceStarted&&!complete&&!awaitingSpeechConsent)readQuestion();
  if($('report-actions'))updateReportActions();
}
function readQuestion(){
  speechStop();
  const section=document.querySelector('.journey-question:not([hidden])');
  if(section){
    const epoch=speechEpoch;
    const startListening=()=>{if(epoch===speechEpoch&&voiceMode&&!complete&&!awaitingSpeechConsent)listen();};
    if(!say(section.innerText,lang,false,startListening))startListening();
  }
}
function listen(){
  if(lang==='mfe')return;
  speechStop();const Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Constructor){$('voice-status').textContent=VOICE[lang].unsupported;return;}
  const instance=new Constructor();
  if(!allowSpeechRemote){
    if(!('processLocally' in instance)){showSpeechConsent();return;}
    instance.processLocally=true;
  }
  instance.lang={en:'en-GB',fr:'fr-FR',mfe:'mfe-MU'}[lang];instance.interimResults=true;instance.continuous=false;
  const epoch=speechEpoch;recognition=instance;
  $('voice-transcript').value='';$('voice-review').hidden=false;$('confirm-voice').disabled=true;
  instance.onresult=event=>{
    if(epoch!==speechEpoch)return;
    $('voice-transcript').value=Array.from(event.results).map(result=>result[0].transcript).join(' ');
    $('confirm-voice').disabled=!Array.from(event.results).some(result=>result.isFinal);
    $('voice-status').textContent=Array.from(event.results).some(result=>result.isFinal)?COMPACT[lang].review:VOICE[lang].listening;
  };
  instance.onerror=event=>{if(epoch===speechEpoch){$('voice-status').textContent=VOICE[lang].unsupported;$('confirm-voice').disabled=true;if(instance.processLocally&&event.error==='language-not-supported')showSpeechConsent();}};
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
  if(id==='choose-voice'||id==='mode-voice')chooseVoice();
  if(id==='choose-text'||id==='mode-text'){modeRequest++;voiceStarted=true;voiceMode=false;awaitingSpeechConsent=false;voiceUI();}
  if(id==='close-app'){speechStop();if(window.opener)window.close();}
  if(id==='greet')greetings();
  if(id==='read-question')readQuestion();
  if(id==='listen'||id==='retry-voice')listen();
  if(id==='stop-listening')speechStop();
  if(id==='confirm-voice')confirmVoice();
  if(id==='reset'||id==='start-again'){restartScreening();}
});

window.addEventListener('pagehide',speechStop);
voiceUI();
setTimeout(()=>{if(startStage==='splash'){startStage='language';voiceUI();}},2200);

function restartScreening(){
  clearTimeout(advanceTimer);speechStop();S={...NEUTRAL};step=0;complete=false;answered.clear();numericDraft.clear();
  voiceStarted=false;voiceMode=false;allowSpeechRemote=false;modeRequest++;awaitingSpeechConsent=false;lang='en';startStage='language';full();
}
function endScreening(exit=false){
  clearTimeout(advanceTimer);speechStop();
  S={...NEUTRAL};answered.clear();numericDraft.clear();step=0;complete=false;
  voiceStarted=false;voiceMode=false;allowSpeechRemote=false;modeRequest++;awaitingSpeechConsent=false;startStage='farewell';full();
  ['en','fr','mfe'].forEach(language=>say({en:'Thank you for choosing us. Take care, and goodbye.',fr:'Merci de nous avoir choisis. Prenez soin de vous, au revoir.',mfe:'Mersi ki ou finn swazir nou. Pran swin ou. Orevwar.'}[language],language,true));
  if(exit&&window.opener)window.close();
}
const speechDialog=document.createElement('dialog');speechDialog.id='speech-permission';speechDialog.setAttribute('aria-labelledby','speech-permission-title');document.body.append(speechDialog);
function showSpeechConsent(){
  speechStop();awaitingSpeechConsent=true;const t=COMPACT[lang];
  speechDialog.innerHTML=`<h2 id="speech-permission-title">${esc(t.privacy)}</h2><p>${esc(t.notice)}</p><div class="btns"><button class="btn" id="allow-browser-speech">${esc(t.allow)}</button><button class="btn alt" id="decline-browser-speech">${esc(t.text)}</button></div>`;
  if(!speechDialog.open)speechDialog.showModal();
}
async function chooseVoice(){
  if(lang==='mfe')return;
  const request=++modeRequest,Constructor=window.SpeechRecognition||window.webkitSpeechRecognition;
  modeFeedback.textContent='';
  if(!Constructor){modeFeedback.textContent=COMPACT[lang].unavailable;return;}
  try{
    if(navigator.mediaDevices?.getUserMedia){
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.getTracks().forEach(track=>track.stop());
    }
    if(request!==modeRequest)return;
    voiceStarted=true;voiceMode=true;
    awaitingSpeechConsent=!allowSpeechRemote&&!('processLocally' in new Constructor());
    voiceUI();
    if(awaitingSpeechConsent)showSpeechConsent();
  }catch(_){if(request===modeRequest){modeFeedback.textContent=COMPACT[lang].permission;}}
}
speechDialog.addEventListener('cancel',()=>{modeRequest++;awaitingSpeechConsent=false;voiceMode=false;voiceUI();});
speechDialog.addEventListener('click',event=>{
  if(event.target.id==='allow-browser-speech'){allowSpeechRemote=true;awaitingSpeechConsent=false;speechDialog.close();voiceUI();}
  if(event.target.id==='decline-browser-speech'){modeRequest++;awaitingSpeechConsent=false;voiceMode=false;speechDialog.close();voiceUI();}
});
