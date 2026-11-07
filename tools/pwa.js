/* Public release metadata only. Never reload a screening/report in progress. */
const APP_VERSION='__APP_VERSION__';
if(location.protocol!=='file:'&&'serviceWorker' in navigator&&window.isSecureContext){
  let registration,checking=false,reloading=false,pending=false,knownVersion;
  let hadController=!!navigator.serviceWorker.controller;
  const status=document.getElementById('update-status');
  const labels={
    en:{check:'Check for updates',checking:'Checking for updates…',ready:'Update ready. It will apply when you start a new screening.',latest:'This app is up to date.',offline:'Cannot check for updates. Your cached app remains available.',download:'Downloading the latest app…'},
    fr:{check:'Vérifier les mises à jour',checking:'Recherche de mises à jour…',ready:'Mise à jour prête. Elle sera appliquée au prochain dépistage.',latest:'Cette application est à jour.',offline:'Vérification impossible. La version hors ligne reste disponible.',download:'Téléchargement de la nouvelle version…'},
    mfe:{check:'Verifye bann miz-a-zour',checking:'Pe verifye bann miz-a-zour…',ready:'Miz-a-zour pre. Li pou aplike kan ou koumans enn nouvo depistaz.',latest:'Aplikasyon-la a zour.',offline:'Pa kapav verifye. Aplikasyon-la res disponib offline.',download:'Pe tele sarz nouvo versyon…'}
  };
  const t=()=>labels[lang]||labels.en;
  const busy=()=>voiceStarted||complete||startStage==='farewell';
  function applyUpdate(){
    document.getElementById('check-updates').textContent=t().check;
    if(!pending||reloading)return;
    if(busy()){status.textContent=t().ready;return;}
    reloading=true;location.reload();
  }
  async function checkUpdate(manual=false){
    if(checking||reloading||(!manual&&document.visibilityState==='hidden'))return;
    checking=true;if(manual)status.textContent=t().checking;
    try{
      registration=registration||await navigator.serviceWorker.getRegistration();
      if(!registration)throw new Error('Offline installation not ready');
      // Do not send this version check through the app cache.
      const response=await fetch('./version.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Release metadata unavailable');
      const release=await response.json();
      if(typeof release.version!=='string')throw new Error('Invalid release metadata');
      knownVersion=release.version;
      if(release.version!==APP_VERSION)status.textContent=t().download;
      await registration.update();
      if(release.version===APP_VERSION&&!pending&&manual)status.textContent=t().latest;
      applyUpdate();
    }catch(_){if(manual)status.textContent=t().offline;}
    finally{checking=false;}
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(hadController||(knownVersion&&knownVersion!==APP_VERSION)){pending=true;applyUpdate();}
    hadController=true;
  });
  // Register immediately; external fonts must not delay update detection.
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(result=>{
    registration=result;checkUpdate();
  }).catch(()=>{status.textContent=t().offline;});
  document.getElementById('check-updates').addEventListener('click',()=>checkUpdate(true));
  document.addEventListener('journeychange',applyUpdate);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkUpdate();});
  window.addEventListener('online',()=>checkUpdate());
  window.addEventListener('pageshow',()=>checkUpdate());
  setInterval(()=>checkUpdate(),60000);
}else{
  document.getElementById('check-updates').hidden=true;
}
