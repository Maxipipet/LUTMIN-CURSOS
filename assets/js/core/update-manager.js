// =============================================================
// LUTMIN V55.0 · UPDATE MANAGER
// - sólo muestra una actualización cuando conoce una versión realmente posterior
// - nunca deja el CTA trabado en “Actualizando…”
// - una misma versión se activa en silencio
// =============================================================
(function(){
  'use strict';
  const VERSION='55.0';
  const TARGET_KEY='lutmin:update-target';
  const S={registration:null,waiting:null,waitingVersion:null,lastCheck:0,controllerReload:false,applying:false,silentActivation:false,online:navigator.onLine,assetRetries:0,lastModuleDuration:null,applyTimer:null};

  function banner(){
    let el=document.getElementById('lutminV30UpdateBanner');if(el)return el;
    el=document.createElement('div');el.id='lutminV30UpdateBanner';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
    el.innerHTML='<div class="v30-update-inner"><div class="v30-update-copy"><strong>Nueva versión disponible</strong><br><span>Actualizá para usar la última versión de Lutmin.</span></div><button type="button" data-v30-apply>Actualizar ahora</button></div>';
    document.body.appendChild(el);el.querySelector('[data-v30-apply]')?.addEventListener('click',applyUpdate);return el;
  }
  function setApplyState(active){const b=document.querySelector('#lutminV30UpdateBanner [data-v30-apply]');if(!b)return;b.disabled=active;b.textContent=active?'Actualizando…':'Actualizar ahora';}
  function showBanner(){setApplyState(false);requestAnimationFrame(()=>banner().classList.add('is-visible'));}
  function hideBanner(){setApplyState(false);document.getElementById('lutminV30UpdateBanner')?.classList.remove('is-visible');S.applying=false;clearTimeout(S.applyTimer);S.applyTimer=null;}
  async function clearRuntimeCaches(){if(!('caches' in window))return false;const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));return true;}
  function semverParts(v){return String(v||'').split('.').map(x=>parseInt(x,10)||0)}
  function newerThan(a,b){const A=semverParts(a),B=semverParts(b);for(let i=0;i<Math.max(A.length,B.length);i++){const x=A[i]||0,y=B[i]||0;if(x!==y)return x>y}return false}

  function workerVersion(worker,timeout=1400){
    if(!worker)return Promise.resolve(null);
    return new Promise(resolve=>{
      let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v||null)};
      const timer=setTimeout(()=>finish(null),timeout);
      try{const ch=new MessageChannel();ch.port1.onmessage=e=>finish(e.data?.version);worker.postMessage({type:'GET_VERSION'},[ch.port2]);}catch(_){finish(null)}
    });
  }
  async function considerWaiting(worker){
    if(!worker){S.waiting=null;S.waitingVersion=null;hideBanner();renderAdminCard();return false;}
    const version=await workerVersion(worker);
    S.waiting=worker;S.waitingVersion=version;
    // Si no conocemos la versión, no inventamos que hay una actualización.
    if(!version){hideBanner();renderAdminCard();return false;}
    if(version===VERSION){
      hideBanner();S.silentActivation=true;
      try{worker.postMessage({type:'SKIP_WAITING'});}catch(_){ }
      renderAdminCard();return false;
    }
    if(!newerThan(version,VERSION)){hideBanner();renderAdminCard();return false;}
    let target=null;try{target=sessionStorage.getItem(TARGET_KEY);}catch(_){ }
    if(target===version&&S.applying){setApplyState(true);return true;}
    showBanner();renderAdminCard();return true;
  }
  function inspectRegistration(reg){
    if(!reg)return;S.registration=reg;
    if(reg.waiting)considerWaiting(reg.waiting);
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)considerWaiting(reg.waiting||worker);});
    });
    renderAdminCard();
  }
  async function check(force=false){
    if(!('serviceWorker' in navigator))return false;
    const now=Date.now();if(!force&&now-S.lastCheck<300000)return Boolean(S.waiting&&S.waitingVersion&&newerThan(S.waitingVersion,VERSION));
    S.lastCheck=now;
    try{
      const reg=S.registration||await navigator.serviceWorker.getRegistration('./');if(!reg)return false;
      inspectRegistration(reg);await reg.update();
      if(reg.waiting)return considerWaiting(reg.waiting);
      S.waiting=null;S.waitingVersion=null;hideBanner();renderAdminCard();return false;
    }catch(_){hideBanner();return false;}
  }
  async function applyUpdate(){
    if(S.applying)return true;
    const worker=S.waiting||S.registration?.waiting;
    if(!worker){hideBanner();return false;}
    const version=S.waitingVersion||await workerVersion(worker);
    if(!version||!newerThan(version,VERSION)){hideBanner();return false;}
    S.applying=true;setApplyState(true);
    try{sessionStorage.setItem(TARGET_KEY,version);}catch(_){ }
    try{worker.postMessage({type:'SKIP_WAITING'});}catch(_){S.applying=false;setApplyState(false);return false;}
    // Si controllerchange no llega, recargamos una vez. Si tampoco puede recargar,
    // el botón vuelve a estar disponible en vez de quedar bloqueado para siempre.
    clearTimeout(S.applyTimer);
    S.applyTimer=setTimeout(async()=>{
      if(S.controllerReload)return;
      try{await clearRuntimeCaches();hardReload(version);}catch(_){S.applying=false;setApplyState(false);}
    },3200);
    return true;
  }
  function hardReload(version){
    if(S.controllerReload)return;S.controllerReload=true;
    const u=new URL(location.href);u.searchParams.set('_lutminv',version||VERSION);location.replace(u.toString());
  }
  function settleReloadMarker(){
    let target=null;try{target=sessionStorage.getItem(TARGET_KEY);}catch(_){ }
    const u=new URL(location.href);const marker=u.searchParams.get('_lutminv');
    // Limpiamos marcadores de actualizaciones ya aplicadas o antiguas. Un target
    // viejo de V54 no debe sobrevivir en una sesión V55.
    const targetSettled=target&&!newerThan(target,VERSION);
    const markerSettled=marker&&!newerThan(marker,VERSION);
    if(targetSettled){try{sessionStorage.removeItem(TARGET_KEY)}catch(_){ }}
    if(markerSettled){u.searchParams.delete('_lutminv');history.replaceState(history.state,'',u.pathname+u.search+u.hash);}
    if(targetSettled||markerSettled)hideBanner();
  }

  function ensureAdminCard(){const host=document.getElementById('adminSystemGuideV19');if(!host||document.getElementById('v30DeployHealth'))return null;const card=document.createElement('div');card.id='v30DeployHealth';card.className='border-t border-slate-100 p-5 sm:p-6 bg-white';card.innerHTML='<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-lutmin-light">VERSIÓN Y RENDIMIENTO</p><h4 class="mt-1 font-extrabold text-lutmin-dark">Estado del frontend</h4><p class="mt-1 text-xs text-slate-500">Runtime, caché y estado real de despliegue de esta sesión.</p></div><div class="flex gap-2"><button type="button" data-v30-check class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Buscar actualización</button><button type="button" data-v30-clean class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Limpiar cache</button></div></div><div data-v30-health-body class="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3"></div>';
    host.appendChild(card);card.querySelector('[data-v30-check]')?.addEventListener('click',()=>check(true));card.querySelector('[data-v30-clean]')?.addEventListener('click',async()=>{await clearRuntimeCaches();window.LutminData?.invalidate?.();if(typeof showToast==='function')showToast('Cache local limpiada. La próxima carga descargará los archivos nuevamente.');renderAdminCard();});return card;}
  function stat(label,value,detail,ok=true){return `<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p class="text-[10px] uppercase font-bold text-slate-400">${label}</p><p class="mt-1 text-lg font-black ${ok?'text-emerald-700':'text-amber-700'}">${value}</p><p class="mt-1 text-[10px] text-slate-500">${detail}</p></div>`;}
  function renderAdminCard(){const card=ensureAdminCard();if(!card)return;const root=card.querySelector('[data-v30-health-body]');if(!root)return;const mods=window.LutminModules?.status?.();const data=window.LutminData?.status?.();const ui=window.LutminUI?.status?.();const admin=window.LutminAdminRuntime?.status?.();const pending=Boolean(S.waitingVersion&&newerThan(S.waitingVersion,VERSION));root.innerHTML=[
    stat('Versión',`V${VERSION}`,'Frontend publicado',true),
    stat('Conexión',S.online?'ONLINE':'OFFLINE',S.online?'Conectado a internet':'Modo sin conexión',S.online),
    stat('Runtime',mods?.loadedScripts!=null?`${mods.loadedScripts}/${mods.totalScripts}`:'EN ESPERA',mods?.bundles?.length?mods.bundles.join(' · '):'Se carga según acceso',mods?.status!=='error'),
    stat('Datos evitados',String((data?.hits||0)+(data?.reused||0)),`${data?.hits||0} cache · ${data?.reused||0} cargas concurrentes`,true),
    stat('Actualización',pending?`V${S.waitingVersion}`:'AL DÍA',pending?'Hay una versión posterior esperando':'Sin actualización pendiente',!pending),
    stat('Render',ui?.activeTab?ui.activeTab.toUpperCase():'LISTO',ui?.restores!=null?`${ui.restores} restauraciones de posición`:'Paneles por demanda',true),
    stat('Admin demanda',admin?.loaded?.length!=null?`${admin.loaded.length} BLOQUES`:'—',admin?.activeModule?`Módulo: ${admin.activeModule}`:'Carga sólo lo necesario',true)
  ].join('');}

  settleReloadMarker();
  window.addEventListener('lutmin:v30:sw-registered',e=>inspectRegistration(e.detail?.registration));
  window.addEventListener('lutmin:v30:asset-retry',()=>{S.assetRetries+=1;renderAdminCard();});
  window.addEventListener('lutmin:v30:modules-ready',e=>{S.lastModuleDuration=e.detail?.duration_ms??null;renderAdminCard();});
  window.addEventListener('lutmin:v32:admin-module-ready',renderAdminCard);window.addEventListener('lutmin:v30:data-cache-hit',renderAdminCard);window.addEventListener('lutmin:v30:data-loaded',renderAdminCard);
  window.addEventListener('online',()=>{S.online=true;check(true);renderAdminCard();});window.addEventListener('offline',()=>{S.online=false;renderAdminCard();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(false);});
  if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{
    clearTimeout(S.applyTimer);S.applyTimer=null;
    if(S.silentActivation&&!S.applying){S.silentActivation=false;S.waiting=null;S.waitingVersion=null;hideBanner();renderAdminCard();return;}
    if(S.controllerReload)return;hardReload(S.waitingVersion||(()=>{try{return sessionStorage.getItem(TARGET_KEY)}catch(_){return null}})()||VERSION);
  });
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-admin-v19-btn],#adminDesktopTab,#adminMobileTab'))setTimeout(renderAdminCard,60);},true);
  setTimeout(()=>{renderAdminCard();check(false);},1200);
  const api={version:VERSION,check,applyUpdate,clearRuntimeCaches,state:()=>({...S,applyTimer:Boolean(S.applyTimer)})};window.LutminUpdate=api;window.LutminV32Update=api;window.LutminV31Update=api;window.LutminV30Update=api;
})();
