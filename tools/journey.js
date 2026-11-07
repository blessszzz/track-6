/* Only presentation and navigation; the existing compute/update functions are retained. */
let step=0, complete=false;
const answered=new Set();
const numericDraft=new Map();
const FLOW={
 en:{about:"About this screening",step:"Question",of:"of",back:"Back",next:"Next",finish:"View my report",edit:"Review my answers",error:"Please answer this question before continuing."},
 fr:{about:"À propos de ce dépistage",step:"Question",of:"sur",back:"Retour",next:"Suivant",finish:"Voir mon rapport",edit:"Revoir mes réponses",error:"Veuillez répondre à cette question avant de continuer."},
 mfe:{about:"Lor sa depistaz-la",step:"Kestion",of:"lor",back:"Retour",next:"Swivan",finish:"Get mo rapor",edit:"Reget mo bann repons",error:"Reponn sa kestion-la avan kontinie."}
};
function buildForm(){
  buildQuestionFields();
  const form=$("form"), profile=[...form.querySelector('.row2').children];
  const body=document.createElement('div');
  body.className='row2'; body.append(profile[2],profile[3]);
  const bmi=$("bmi"); body.append(bmi);
  const questions=[profile[0],profile[1],body,...form.querySelectorAll('.q')];
  form.replaceChildren();
  questions.forEach((node,index)=>{
    const section=document.createElement('div');section.className='journey-question';section.dataset.step=index;
    section.append(node);form.append(section);
    section.querySelectorAll('input[type=number]').forEach(input=>{
      input.required=true;
      if(numericDraft.has(input.id))input.value=numericDraft.get(input.id);
      else if(!answered.has(index))input.value='';
    });
    if(!answered.has(index)){
      section.querySelectorAll('[role=radio]').forEach(button=>button.setAttribute('aria-checked','false'));
    }
  });
}
function renderJourney(focus=false){
  const f=FLOW[lang];

  $("journey").hidden=complete;$("report").hidden=!complete;
  $("previous").textContent=f.back;$("previous").disabled=step===0;
  $("next").textContent=step===15?f.finish:f.next;
  $("edit").textContent=f.edit;$("reset").textContent=T().reset;
  $("report-warning").textContent=T().disclaimer;
  $("progress-label").textContent=`${f.step} ${step+1} ${f.of} 16`;
  $("progress").value=step+1;
  $("progress").setAttribute('aria-label',$("progress-label").textContent);
  $("step-error").textContent='';
  document.querySelectorAll('.journey-question').forEach((section,index)=>{
    section.hidden=index!==step;
    section.classList.remove('step-enter');
    if(index===step && focus){void section.offsetWidth;section.classList.add('step-enter');section.tabIndex=-1;section.focus({preventScroll:true});}
  });
  document.dispatchEvent(new CustomEvent('journeychange'));
  if(complete && focus){$("report").tabIndex=-1;$("report").focus({preventScroll:true});}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('#form [data-k]'))answered.add(step);
  if(button.id==='previous'){step=Math.max(0,step-1);renderJourney(true);}
  if(button.id==='edit'){complete=false;renderJourney(true);}
  if(button.id==='next'){
    const current=document.querySelector(`.journey-question[data-step="${step}"]`);
    const invalid=[...current.querySelectorAll('input[type=number]')].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();return;}
    if(current.querySelector('[role=radio]')&&!answered.has(step)){$('step-error').textContent=FLOW[lang].error;return;}
    answered.add(step);
    if(step===15){complete=true;update();}else step++;
    renderJourney(true);
  }
});
document.addEventListener('input',event=>{
  if(event.target.closest('#form')){
    if(event.target.type==='number')numericDraft.set(event.target.id,event.target.value);
    const current=event.target.closest('.journey-question');
    if(current && [...current.querySelectorAll('input[type=number]')].every(input=>input.checkValidity()))answered.add(step);
  }
});
