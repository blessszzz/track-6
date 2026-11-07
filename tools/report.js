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
  let hint=$('auto-hint');
  if(!hint){hint=document.createElement('p');hint.id='auto-hint';hint.className='small';$('form').before(hint);}
  hint.textContent=t.auto;
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
  const width=1240,height=1754,margin=92,lineHeight=38;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');const images=[];let y;
  function begin(){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#0f6b73';ctx.fillRect(0,0,width,20);ctx.fillStyle='#10282c';ctx.font='26px Arial, sans-serif';y=margin;}
  function finish(){ctx.fillStyle='#53686c';ctx.font='20px Arial, sans-serif';ctx.fillText(String(images.length+1),width-margin,height-45);images.push(Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.92).split(',')[1]),c=>c.charCodeAt(0)));}
  begin();
  for(const line of reportLines()){
    const words=line.trim().split(/\s+/);let row='';
    for(const word of words){
      if(ctx.measureText(row+' '+word).width>width-margin*2&&row){if(y>height-margin){finish();begin();}ctx.fillText(row,margin,y);y+=lineHeight;row=word;}
      else row+=(row?' ':'')+word;
    }
    if(y>height-margin){finish();begin();}ctx.fillText(row,margin,y);y+=lineHeight;
  }
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
