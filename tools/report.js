/* Local PDF export: render Unicode report text into JPEG pages, then a PDF container.
   No external library, API, storage, patient identifier, or font download is required. */
const reportActions=document.createElement('div');reportActions.id='report-actions';reportActions.className='btns';
$('report').append(reportActions);
const downloadBar=document.createElement('div');downloadBar.id='pdf-download-bar';downloadBar.className='btns';
$('report-warning').after(downloadBar);
function updateReportActions(){
  const t=STAGES[lang];
  downloadBar.innerHTML=`<button class="btn" id="download-pdf">${esc(t.pdf)}</button>`;
  reportActions.innerHTML=`<button class="btn alt" id="finish-session">${esc(t.done)}</button><button class="btn alt" id="exit-app">${esc(t.exit)}</button>`;
  $('reset').textContent=t.again;

}
function reportLines(){
  const result=$('result').cloneNode(true);
  result.querySelectorAll('.btns,#copied').forEach(node=>node.remove());
  const lines=[T().title,new Date().toLocaleDateString({en:'en-GB',fr:'fr-FR',mfe:'fr-FR'}[lang]),'',T().disclaimer,''];
  // cloneNode is detached, so innerText is not consistently available across browsers.
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;width:700px';host.append(result);document.body.append(host);
  lines.push(...result.innerText.split('\n'));
  host.remove();
  lines.push('',T().section_profile);
  document.querySelectorAll('.journey-question').forEach(section=>{
    section.querySelectorAll('input').forEach(input=>{
      const label=section.querySelector(`label[for="${input.id}"]`);
      if(label)lines.push(`${label.textContent}: ${input.value}`);
    });
    const selected=section.querySelector('[role=radio][aria-checked=true]');
    if(selected){const group=selected.closest('[role=radiogroup]');lines.push(`${$(group.getAttribute('aria-labelledby')).textContent}: ${selected.textContent}`);}
  });
  lines.push('',T().footer);
  return lines;
}
function createReportPDF(){
  const width=1240,height=1754,margin=72;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');const images=[];let y;
  const ink='#10282c',teal='#0f6b73',muted='#53686c',soft='#e6f3f3',inner=width-margin*2,t=T();
  function font(size=24,bold=false){ctx.font=`${bold?'bold ':''}${size}px Arial, sans-serif`;}
  function wrap(text,maxWidth){
    const lines=[];let row='';
    for(const word of String(text).trim().split(/\s+/)){
      if(row&&ctx.measureText(row+' '+word).width>maxWidth){lines.push(row);row=word;}else row+=(row?' ':'')+word;
    }
    if(row)lines.push(row);return lines;
  }
  function box(x,top,w,h,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,top,w,h,18);ctx.fill();}
  function begin(){
    ctx.fillStyle='#f3f6f6';ctx.fillRect(0,0,width,height);
    const gradient=ctx.createLinearGradient(0,0,width,200);gradient.addColorStop(0,teal);gradient.addColorStop(1,'#123e46');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,200);
    box(margin,43,104,104,'#ffffff18');
    ctx.save();ctx.translate(margin+18,62);ctx.strokeStyle='white';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(12,24);ctx.bezierCurveTo(12,48,48,48,48,24);ctx.lineTo(48,0);ctx.moveTo(30,43);ctx.lineTo(30,52);ctx.bezierCurveTo(30,78,67,78,67,48);ctx.stroke();ctx.beginPath();ctx.arc(67,40,8,0,Math.PI*2);ctx.stroke();ctx.restore();
    font(18,true);ctx.fillStyle='#bde9eb';ctx.fillText('TECH WAVE 2026 / TRACK 6',margin+132,61);
    font(32,true);ctx.fillStyle='#ffffff';wrap(t.title,inner-150).forEach((line,index)=>ctx.fillText(line,margin+132,106+index*39));
    font(19);ctx.fillStyle='#d5eeee';ctx.fillText(new Date().toLocaleDateString({en:'en-GB',fr:'fr-FR',mfe:'fr-FR'}[lang]),margin,180);y=234;
  }
  function finish(){
    ctx.strokeStyle='#d3dfe0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(margin,height-89);ctx.lineTo(width-margin,height-89);ctx.stroke();
    font(18);ctx.fillStyle=muted;ctx.fillText('Tech Wave 2026 · Track 6 · Prototype · #VITMU',margin,height-50);ctx.textAlign='right';ctx.fillText(String(images.length+1),width-margin,height-50);ctx.textAlign='left';
    images.push(Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]),c=>c.charCodeAt(0)));
  }
  function ensure(space){if(y+space>height-125){finish();begin();}}
  function heading(text){ensure(80);font(25,true);ctx.fillStyle=teal;ctx.fillText(text,margin,y+27);y+=51;}
  function paragraph(text,colour=muted,size=23){font(size);const lines=wrap(text,inner);ensure(lines.length*33+18);font(size);ctx.fillStyle=colour;lines.forEach(line=>{ctx.fillText(line,margin,y+25);y+=33;});y+=14;}
  function callout(text,fill,colour){
    font(23);const lines=wrap(text,inner-48),h=lines.length*32+44;ensure(h+20);box(margin,y,inner,h,fill);ctx.fillStyle=colour;lines.forEach((line,index)=>ctx.fillText(line,margin+24,y+35+index*32));y+=h+24;
  }
  function rows(items,valueColour=ink){
    items.forEach(([label,value],index)=>{
      font(23);const lines=wrap(label,inner-220),h=Math.max(56,lines.length*31+26);ensure(h+8);box(margin,y,inner,h,index%2?'#ffffff':soft);
      ctx.fillStyle=ink;lines.forEach((line,i)=>ctx.fillText(line,margin+20,y+32+i*31));font(23,true);ctx.fillStyle=valueColour;ctx.textAlign='right';ctx.fillText(value,width-margin-20,y+32);ctx.textAlign='left';y+=h+7;
    });y+=18;
  }
  begin();
  const band=$('result').querySelector('.band'),riskColour=band.classList.contains('high')?'#b3261e':band.classList.contains('mod')?'#b36200':'#2b7a3d';
  box(margin,y,inner,154,'#ffffff');box(margin,y,10,154,riskColour);font(27,true);ctx.fillStyle=riskColour;ctx.fillText(band.textContent,margin+30,y+49);font(22);ctx.fillStyle=muted;wrap(t.risk_est,inner-390).forEach((line,i)=>ctx.fillText(line,margin+30,y+88+i*28));font(60,true);ctx.fillStyle=ink;ctx.textAlign='right';ctx.fillText($('result').querySelector('.pct').textContent.trim(),width-margin-28,y+92);ctx.textAlign='left';y+=179;
  paragraph(t.risk_note);callout(t.disclaimer,'#fff1dc','#5a3600');
  const follow=$('result').querySelector('.follow').cloneNode(true);follow.querySelectorAll('.btns,#copied').forEach(node=>node.remove());
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;width:700px';host.append(follow);document.body.append(host);const followText=follow.innerText.replace(t.follow,'').trim();host.remove();
  heading(t.follow);callout(followText,soft,ink);
  const lists=$('result').querySelectorAll('.fac');
  [t.factors_up,t.factors_down].forEach((title,index)=>{heading(title);rows([...lists[index].querySelectorAll('li')].map(li=>li.children.length>1?[li.children[0].innerText,li.children[1].innerText]:[li.innerText,'']),index===0?'#b3261e':teal);});
  const {c}=compute(),entries=Object.entries(c).sort((a,b)=>b[1]-a[1]),max=Math.max(.01,...entries.map(([,value])=>Math.abs(value)));
  ensure(entries.length*39+120);heading(t.chart_title);paragraph(t.vs_avg);
  ensure(entries.length*39+35);box(margin,y,inner,entries.length*39+26,'#ffffff');
  entries.forEach(([feature,value],index)=>{
    const row=y+30+index*39,centre=margin+685;
    font(20);ctx.fillStyle=ink;ctx.fillText(FEATNAME[lang][feature],margin+18,row);
    ctx.fillStyle='#e3eded';ctx.fillRect(centre-180,row-16,360,18);ctx.fillStyle=value>0?'#b3261e':teal;const size=Math.abs(value)/max*180;ctx.fillRect(value>0?centre:centre-size,row-16,size,18);
    ctx.fillStyle=muted;font(20,true);ctx.textAlign='right';ctx.fillText('×'+Math.exp(value).toFixed(2),width-margin-20,row);ctx.textAlign='left';
  });y+=entries.length*39+53;
  heading(t.section_profile);
  const answers=[];
  document.querySelectorAll('.journey-question').forEach(section=>{
    section.querySelectorAll('input').forEach(input=>{const label=section.querySelector(`label[for="${input.id}"]`);if(label)answers.push([label.textContent,input.value]);});
    const selected=section.querySelector('[role=radio][aria-checked=true]');if(selected){const group=selected.closest('[role=radiogroup]');answers.push([$(group.getAttribute('aria-labelledby')).textContent,selected.textContent]);}
  });
  rows(answers);paragraph(t.footer);
  finish();
  const encode=text=>new TextEncoder().encode(text),chunks=[],offsets=[0];let size=0;
  function write(data){const bytes=typeof data==='string'?encode(data):data;chunks.push(bytes);size+=bytes.length;}
  function object(id,body){offsets[id]=size;write(`${id} 0 obj\n`);write(body);write('\nendobj\n');}
  write('%PDF-1.4\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  images.forEach((image,i)=>{
    const page=3+i*3,imageId=page+1,contentId=page+2;
    object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Image ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    offsets[imageId]=size;write(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);write(image);write('\nendstream\nendobj\n');
    const content='q 595.28 0 0 841.89 0 0 cm /Image Do Q';
    object(contentId,`<< /Length ${encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  const xref=size,count=3+images.length*3;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for(let id=1;id<count;id++)write(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks,{type:'application/pdf'});
}
document.addEventListener('click',event=>{
  const id=event.target.closest('button')?.id;
  if(id==='download-pdf'&&complete){
    const url=URL.createObjectURL(createReportPDF()),link=document.createElement('a');
    link.href=url;link.download='diabetes-screening-report.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  if(id==='finish-session')endScreening();
  if(id==='exit-app')endScreening(true);
});
updateReportActions();
