/* Speech is optional. Transcripts remain in memory and require explicit confirmation. */
const VOICE={
 en:{welcome:'Welcome. Choose voice or text to begin your screening.',voice:'Continue with Voice',text:'Continue with Text',listen:'Speak my answer',read:'Read question and choices',confirm:'Confirm this answer',retry:'Speak again',heard:'What you said — review before confirming',consent:'Allow browser speech processing. Audio may be sent to your browser provider and may require internet.',unsupported:'Voice recognition is unavailable here. You can still use the text controls.',local:'On-device speech is unavailable for this language. Use text, or allow browser speech processing below.',error:'Could not understand this answer. Please try again or use the text controls.',listening:'Listening… Speak now.',ready:'Review your words, then confirm. Nothing is submitted automatically.',hint:'For height and weight, speak two numbers in that order, in centimetres and kilograms. For other questions, say a displayed option or number.',fallback:'A Mauritian Creole voice may not be installed. Read-aloud will use a local French voice if available.',stop:'Stop listening',none:'No local reading voice is available. You can read the question on screen.'},
 fr:{welcome:'Bienvenue. Choisissez la voix ou le texte pour commencer votre dépistage.',voice:'Continuer avec la voix',text:'Continuer avec le texte',listen:'Dicter ma réponse',read:'Lire la question et les choix',confirm:'Confirmer cette réponse',retry:'Parler à nouveau',heard:'Vos paroles — vérifiez avant de confirmer',consent:'Autoriser le traitement vocal du navigateur. Le son peut être envoyé à son fournisseur et nécessiter Internet.',unsupported:'La reconnaissance vocale est indisponible. Utilisez les commandes texte.',local:'La reconnaissance sur cet appareil est indisponible pour cette langue. Utilisez le texte ou autorisez le traitement vocal ci-dessous.',error:'Réponse non comprise. Réessayez ou utilisez les commandes texte.',listening:'Écoute en cours… Parlez maintenant.',ready:'Vérifiez vos paroles puis confirmez. Aucune réponse n’est envoyée automatiquement.',hint:'Pour la taille et le poids, dites deux nombres dans cet ordre, en centimètres et kilogrammes. Sinon, dites un choix affiché ou un nombre.',fallback:'Sans voix créole installée, la lecture utilise une voix française locale si disponible.',stop:'Arrêter l’écoute',none:'Aucune voix locale disponible. Lisez la question à l’écran.'},
 mfe:{welcome:'Bienveni. Swazir lavwa ouswa text pou koumans ou depistaz.',voice:'Kontinie avek lavwa',text:'Kontinie avek text',listen:'Dir mo repons',read:'Lir kestion ek bann swa',confirm:'Konfirm sa repons-la',retry:'Koz ankor',heard:'Se ki ou finn dir — verifye avan konfirme',consent:'Permet navigater tret ou lavwa. Li kapav avoy son kot so fourniser ek bizin Internet.',unsupported:'Rekonesans lavwa pa disponib. Servi bann bouton ek text.',local:'Rekonesans lor sa aparey-la pa disponib pou sa lang-la. Servi text ouswa permet tretman lavwa anba.',error:'Pa finn konpran repons-la. Esey ankor ouswa servi text.',listening:'Pe ekoute… Koz aster.',ready:'Verifye ou bann parol avan konfirme. Nanye pa anvoye otomatikman.',hint:'Pou oter ek pwa, dir de sif dan sa lord-la, an santimet ek kilo. Sinon dir enn swa ki afise ouswa enn sif.',fallback:'Si pena lavwa Kreol, lektir pou servi enn lavwa Franse lokal si ena.',stop:'Aret ekoute',none:'Pena lavwa lokal disponib. Lir kestion lor lekran.'}
};
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
  welcome.hidden=voiceStarted;
  welcome.innerHTML=`<h2>${esc(v.welcome)}</h2><p>Welcome · Bienvenue · Bienveni</p><div class="btns"><button class="btn" id="choose-voice">${esc(v.voice)}</button><button class="btn alt" id="choose-text">${esc(v.text)}</button><button class="btn alt" id="greet">▶ English · Français · Kreol</button></div>`;
  $('journey').hidden=!voiceStarted||complete;$('report').hidden=!voiceStarted||!complete;
  controls.hidden=!voiceMode||complete;
  controls.innerHTML=`<div class="btns"><button class="btn alt" id="read-question">${esc(v.read)}</button><button class="btn" id="listen">${esc(v.listen)}</button><button class="btn alt" id="stop-listening">${esc(v.stop)}</button><button class="btn alt" id="use-text">${esc(v.text)}</button></div><p class="small">${esc(v.hint)}</p>${lang==='mfe'?`<p class="small">${esc(v.fallback)}</p>`:''}<label class="small"><input type="checkbox" id="speech-consent"> ${esc(v.consent)}</label><p id="voice-status" role="status"></p><div id="voice-review" hidden><label for="voice-transcript">${esc(v.heard)}</label><textarea id="voice-transcript" rows="2" style="width:100%;font:inherit"></textarea><div class="btns"><button class="btn" id="confirm-voice">${esc(v.confirm)}</button><button class="btn alt" id="retry-voice">${esc(v.retry)}</button></div></div>`;
  $('speech-consent').checked=allowSpeechRemote;
  if(voiceMode&&voiceStarted&&!complete)readQuestion();
}
function readQuestion(){
  speechStop();
  const section=document.querySelector('.journey-question:not([hidden])');
  if(section)say(section.innerText);
}
function listen(){
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
  if(id==='choose-voice'||id==='choose-text'){voiceStarted=true;voiceMode=id==='choose-voice';voiceUI();}
  if(id==='greet')greetings();
  if(id==='read-question')readQuestion();
  if(id==='listen'||id==='retry-voice')listen();
  if(id==='stop-listening')speechStop();
  if(id==='confirm-voice')confirmVoice();
  if(id==='use-text'){voiceMode=false;voiceUI();}
  if(id==='reset'){voiceStarted=false;voiceMode=false;allowSpeechRemote=false;voiceUI();}
});
document.addEventListener('change',event=>{if(event.target.id==='speech-consent')allowSpeechRemote=event.target.checked;});
window.addEventListener('pagehide',speechStop);
voiceUI();
// Some browsers block speech until a tap; the greeting button always retries it.
greetings();
if(window.speechSynthesis){
  speechSynthesis.addEventListener('voiceschanged',()=>{if(!voiceStarted&&speechSynthesis.getVoices().length)greetings();},{once:true});
}
