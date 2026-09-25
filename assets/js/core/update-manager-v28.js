// =============================================================
// LUTMIN V28.0 · UPDATE MANAGER + SALUD DE DESPLIEGUE
// Sin API externa. Usa Service Worker y Cache Storage del navegador.
// =============================================================
(function(){
  'use strict';
  const VERSION='28.0';
  const S={registration:null,waiting:null,lastCheck:0,controllerReload:false,online:navigator.onLine,assetRetries:0,lastModuleDuration:null};

  function banner(){
    let el=document.getElementById('lutminV28UpdateBanner');
    if(el)return el;
    el=document.createElement('div');
    el.id='lutminV28UpdateBanner';
    el.setAttribute('role','status');
    el.innerHTML='<div class="v28-update-inner"><div class="v28-update-copy"><strong>Nueva versión disponible</strong><br><span>Actualizá para usar la última versión de Lutmin.</span></div><button type="button" data-v28-apply>Actualizar ahora</button></div>';
    document.body.appendChild(el);
    el.querySelector('[data-v28-apply]')?.addEventListener('click',applyUpdate);
    return el;
  }
  function showBanner(){requestAnimationFrame(()=>banner().classList.add('is-visible'));}
  function hideBanner(){document.getElementById('lutminV28UpdateBanner')?.classList.remove('is-visible');}

  async function clearRuntimeCaches(){
    if(!('caches' in window))return false;
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));
    return true;
  }

  function inspectRegistration(reg){
    if(!reg)return;
    S.registration=reg;
    if(reg.waiting){S.waiting=reg.waiting;showBanner();}
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){S.waiting=reg.waiting||worker;showBanner();renderAdminCard();}
      });
    });
    renderAdminCard();
  }

  async function check(force=false){
    if(!('serviceWorker' in navigator))return false;
    const now=Date.now(); if(!force && now-S.lastCheck<300000)return Boolean(S.waiting);
    S.lastCheck=now;
    try{
      const reg=S.registration || await navigator.serviceWorker.getRegistration('./');
      if(!reg)return false;
      inspectRegistration(reg);
      await reg.update();
      if(reg.waiting){S.waiting=reg.waiting;showBanner();}
      renderAdminCard();
      return Boolean(S.waiting);
    }catch(_){return false;}
  }

  async function applyUpdate(){
    hideBanner();
    const worker=S.waiting || S.registration?.waiting;
    if(worker){worker.postMessage({type:'SKIP_WAITING'});return true;}
    await clearRuntimeCaches();
    location.reload();
    return true;
  }

  function ensureAdminCard(){
    const host=document.getElementById('adminSystemGuideV19');
    if(!host || document.getElementById('v28DeployHealth'))return null;
    const card=document.createElement('div');
    card.id='v28DeployHealth';
    card.className='border-t border-slate-100 p-5 sm:p-6 bg-white';
    card.innerHTML='<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-lutmin-light">VERSIÓN Y DESPLIEGUE</p><h4 class="mt-1 font-extrabold text-lutmin-dark">Estado del frontend</h4><p class="mt-1 text-xs text-slate-500">Comprueba versión, conexión, cache local y carga de módulos sin consultar servicios externos.</p></div><div class="flex gap-2"><button type="button" data-v28-check class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Buscar actualización</button><button type="button" data-v28-clean class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Limpiar cache</button></div></div><div data-v28-health-body class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3"></div>';
    host.appendChild(card);
    card.querySelector('[data-v28-check]')?.addEventListener('click',()=>check(true));
    card.querySelector('[data-v28-clean]')?.addEventListener('click',async()=>{await clearRuntimeCaches(); if(typeof showToast==='function')showToast('Cache local limpiada. La próxima carga descargará los archivos nuevamente.'); renderAdminCard();});
    return card;
  }

  function stat(label,value,detail,ok=true){return `<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p class="text-[10px] uppercase font-bold text-slate-400">${label}</p><p class="mt-1 text-lg font-black ${ok?'text-emerald-700':'text-amber-700'}">${value}</p><p class="mt-1 text-[10px] text-slate-500">${detail}</p></div>`;}
  function renderAdminCard(){
    const card=ensureAdminCard(); if(!card)return;
    const root=card.querySelector('[data-v28-health-body]'); if(!root)return;
    const mods=window.LutminV28Modules?.status?.();
    root.innerHTML=[
      stat('Versión',`V${VERSION}`,'Frontend publicado',true),
      stat('Conexión',S.online?'ONLINE':'OFFLINE',S.online?'Conectado a internet':'Modo sin conexión',S.online),
      stat('Módulos',mods?.status==='ready'?'LISTOS':String(mods?.status||'EN ESPERA').toUpperCase(),mods?.finishedAt?`${mods.loaded?.length||0} recursos preparados`:'Se cargan al autenticar',mods?.status!=='error'),
      stat('Actualización',S.waiting?'DISPONIBLE':'AL DÍA',S.waiting?'Hay una versión esperando':'Sin actualización pendiente',!S.waiting)
    ].join('');
  }

  window.addEventListener('lutmin:v28:sw-registered',e=>inspectRegistration(e.detail?.registration));
  window.addEventListener('lutmin:v28:asset-retry',()=>{S.assetRetries+=1;renderAdminCard();});
  window.addEventListener('lutmin:v28:modules-ready',e=>{S.lastModuleDuration=e.detail?.duration_ms??null;renderAdminCard();});
  window.addEventListener('online',()=>{S.online=true;check(true);renderAdminCard();});
  window.addEventListener('offline',()=>{S.online=false;renderAdminCard();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(false);});
  window.addEventListener('pageshow',()=>check(false));

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(S.controllerReload)return;
      S.controllerReload=true;
      location.reload();
    });
  }

  const observer=new MutationObserver(()=>renderAdminCard());
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{renderAdminCard();check(false);},1200);

  window.LutminV28Update={version:VERSION,check,applyUpdate,clearRuntimeCaches,state:()=>({...S})};
})();
