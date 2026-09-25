// =============================================================
// LUTMIN V31.0 · UPDATE MANAGER + SALUD DE DESPLIEGUE
// =============================================================
(function(){
  'use strict';
  const VERSION='31.0';
  const S={registration:null,waiting:null,lastCheck:0,controllerReload:false,online:navigator.onLine,assetRetries:0,lastModuleDuration:null};

  function banner(){let el=document.getElementById('lutminV30UpdateBanner');if(el)return el;el=document.createElement('div');el.id='lutminV30UpdateBanner';el.setAttribute('role','status');el.innerHTML='<div class="v30-update-inner"><div class="v30-update-copy"><strong>Nueva versión disponible</strong><br><span>Actualizá para usar la última versión de Lutmin.</span></div><button type="button" data-v30-apply>Actualizar ahora</button></div>';document.body.appendChild(el);el.querySelector('[data-v30-apply]')?.addEventListener('click',applyUpdate);return el;}
  function showBanner(){requestAnimationFrame(()=>banner().classList.add('is-visible'));}
  function hideBanner(){document.getElementById('lutminV30UpdateBanner')?.classList.remove('is-visible');}
  async function clearRuntimeCaches(){if(!('caches' in window))return false;const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));return true;}
  function inspectRegistration(reg){if(!reg)return;S.registration=reg;if(reg.waiting){S.waiting=reg.waiting;showBanner();}reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){S.waiting=reg.waiting||worker;showBanner();renderAdminCard();}});});renderAdminCard();}
  async function check(force=false){if(!('serviceWorker' in navigator))return false;const now=Date.now();if(!force&&now-S.lastCheck<300000)return Boolean(S.waiting);S.lastCheck=now;try{const reg=S.registration||await navigator.serviceWorker.getRegistration('./');if(!reg)return false;inspectRegistration(reg);await reg.update();if(reg.waiting){S.waiting=reg.waiting;showBanner();}renderAdminCard();return Boolean(S.waiting);}catch(_){return false;}}
  async function applyUpdate(){hideBanner();const worker=S.waiting||S.registration?.waiting;if(worker){worker.postMessage({type:'SKIP_WAITING'});return true;}await clearRuntimeCaches();location.reload();return true;}

  function ensureAdminCard(){const host=document.getElementById('adminSystemGuideV19');if(!host||document.getElementById('v30DeployHealth'))return null;const card=document.createElement('div');card.id='v30DeployHealth';card.className='border-t border-slate-100 p-5 sm:p-6 bg-white';card.innerHTML='<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-lutmin-light">VERSIÓN Y RENDIMIENTO</p><h4 class="mt-1 font-extrabold text-lutmin-dark">Estado del frontend</h4><p class="mt-1 text-xs text-slate-500">Muestra qué runtime se cargó y cuántas recargas de datos se evitaron en esta sesión.</p></div><div class="flex gap-2"><button type="button" data-v30-check class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Buscar actualización</button><button type="button" data-v30-clean class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Limpiar cache</button></div></div><div data-v30-health-body class="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3"></div>';
    host.appendChild(card);card.querySelector('[data-v30-check]')?.addEventListener('click',()=>check(true));card.querySelector('[data-v30-clean]')?.addEventListener('click',async()=>{await clearRuntimeCaches();window.LutminV30Data?.invalidate?.();if(typeof showToast==='function')showToast('Cache local limpiada. La próxima carga descargará los archivos nuevamente.');renderAdminCard();});return card;}
  function stat(label,value,detail,ok=true){return `<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p class="text-[10px] uppercase font-bold text-slate-400">${label}</p><p class="mt-1 text-lg font-black ${ok?'text-emerald-700':'text-amber-700'}">${value}</p><p class="mt-1 text-[10px] text-slate-500">${detail}</p></div>`;}
  function renderAdminCard(){const card=ensureAdminCard();if(!card)return;const root=card.querySelector('[data-v30-health-body]');if(!root)return;const mods=window.LutminV30Modules?.status?.();const data=window.LutminV30Data?.status?.();const ui=window.LutminV30UI?.status?.();const admin=window.LutminV30Admin?.status?.();root.innerHTML=[
    stat('Versión',`V${VERSION}`,'Frontend publicado',true),
    stat('Conexión',S.online?'ONLINE':'OFFLINE',S.online?'Conectado a internet':'Modo sin conexión',S.online),
    stat('Runtime',mods?.loadedScripts!=null?`${mods.loadedScripts}/${mods.totalScripts}`:'EN ESPERA',mods?.bundles?.length?mods.bundles.join(' · '):'Se carga según acceso',mods?.status!=='error'),
    stat('Datos evitados',String((data?.hits||0)+(data?.reused||0)),`${data?.hits||0} cache · ${data?.reused||0} cargas concurrentes`,true),
    stat('Actualización',S.waiting?'DISPONIBLE':'AL DÍA',S.waiting?'Hay una versión esperando':'Sin actualización pendiente',!S.waiting),
    stat('Render',ui?.activeTab?ui.activeTab.toUpperCase():'LISTO',ui?.restores!=null?`${ui.restores} restauraciones de posición`:'Paneles por demanda',true),
    stat('Admin demanda',admin?.loaded?.length!=null?`${admin.loaded.length} BLOQUES`:'—',admin?.activeModule?`Módulo: ${admin.activeModule}`:'Carga sólo lo necesario',true)
  ].join('');}

  window.addEventListener('lutmin:v30:sw-registered',e=>inspectRegistration(e.detail?.registration));
  window.addEventListener('lutmin:v30:asset-retry',()=>{S.assetRetries+=1;renderAdminCard();});
  window.addEventListener('lutmin:v30:modules-ready',e=>{S.lastModuleDuration=e.detail?.duration_ms??null;renderAdminCard();});
  window.addEventListener('lutmin:v30:data-cache-hit',renderAdminCard);window.addEventListener('lutmin:v30:data-loaded',renderAdminCard);
  window.addEventListener('online',()=>{S.online=true;check(true);renderAdminCard();});window.addEventListener('offline',()=>{S.online=false;renderAdminCard();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check(false);});window.addEventListener('pageshow',()=>check(false));
  if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(S.controllerReload)return;S.controllerReload=true;location.reload();});
  // V30 mantiene el diagnóstico sin MutationObserver permanente sobre todo el DOM. Buscamos el host
  // sólo durante el arranque y cuando la persona navega por Administración.
  let bootAttempts=0;const bootTimer=setInterval(()=>{bootAttempts+=1;renderAdminCard();if(document.getElementById('v30DeployHealth')||bootAttempts>=20)clearInterval(bootTimer);},500);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-admin-v19-btn],#adminDesktopTab,#adminMobileTab'))setTimeout(renderAdminCard,60);},true);
  setTimeout(()=>{renderAdminCard();check(false);},1200);
  const api={version:VERSION,check,applyUpdate,clearRuntimeCaches,state:()=>({...S})};window.LutminV31Update=api;window.LutminV30Update=api;
})();
