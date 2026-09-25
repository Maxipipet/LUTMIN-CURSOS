// =============================================================
// LUTMIN V30.0 · ADMIN DEMAND LOADER
// Evita consultar todos los módulos secundarios al abrir Administración.
// =============================================================
(function(){
  'use strict';
  const VERSION='30.0';
  const S={loaded:new Set(),inFlight:new Map(),activeModule:null,runs:0};
  const TTL=30000;
  function getUser(){try{return typeof currentLutminUser!=='undefined'?currentLutminUser:null;}catch(_){return null;}}
  const loaders={
    companies:()=>window.loadAdminCompaniesData?.(),
    training:()=>window.loadAdminTrainingData?.(),
    ops1:()=>window.loadAdminV1Ops?.(),
    talent:()=>window.loadAdminConectaData?.(),
    ops16:()=>window.loadAdminOpsV16?.(),
    executive:()=>window.loadExecutiveV17?.(),
    health:()=>window.loadAdminV18?.(),
    prefs:()=>window.loadAdminWorkspacePrefsV19?.()
  };
  const moduleMap={
    overview:['ops1','ops16','executive'],
    operations:['ops1','ops16'],
    academic:['companies','training'],
    people:[],
    companies:['companies','training'],
    development:['companies'],
    commercial:[],
    finance:[],
    talent:['talent'],
    communications:['ops1'],
    system:['health','ops1'],
    agents:['ops16']
  };
  async function runKey(k,{force=false}={}){
    const fn=loaders[k];if(typeof fn!=='function')return null;
    if(S.inFlight.has(k))return S.inFlight.get(k);
    const data=window.LutminV30Data||window.LutminV29Data;
    const p=(data?.load?data.load(`admin-secondary:${k}`,fn,{ttl:TTL,force}):Promise.resolve(fn())).then(v=>{S.loaded.add(k);S.runs+=1;return v;}).finally(()=>S.inFlight.delete(k));
    S.inFlight.set(k,p);return p;
  }
  function setBusy(value){const panel=document.querySelector('section[data-campus-panel="admin"]');if(panel)panel.setAttribute('aria-busy',value?'true':'false');const title=document.getElementById('adminModuleTitleV19');if(!title)return;let badge=document.getElementById('adminDemandBadgeV30');if(!badge){badge=document.createElement('span');badge.id='adminDemandBadgeV30';badge.className='ml-2 align-middle text-[9px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700';title.insertAdjacentElement('afterend',badge);}badge.textContent=value?'Actualizando…':'Datos listos';badge.classList.toggle('hidden',!value);}
  async function loadForModule(module,{force=false}={}){
    if(getUser()?.role!=='admin')return false;
    const key=moduleMap[module]?module:'overview';S.activeModule=key;
    const list=moduleMap[key]||[];setBusy(list.length>0);await Promise.allSettled(list.map(k=>runKey(k,{force})));setBusy(false);
    if(typeof window.refreshAdminWorkspaceV19==='function')window.refreshAdminWorkspaceV19();
    window.dispatchEvent(new CustomEvent('lutmin:v30:admin-demand-ready',{detail:{module:key,loaded:[...S.loaded]}}));
    return true;
  }
  async function bootstrap(){
    if(getUser()?.role!=='admin')return false;
    await runKey('prefs');
    const module=localStorage.getItem('lutmin-admin-module-v19')||'overview';
    return loadForModule(module,{force:true});
  }
  function installWrapper(){
    const base=window.setAdminModuleV19;if(typeof base!=='function'||base.__lutminV30Demand)return false;
    const wrapped=function(module,opts){const out=base.apply(this,arguments);queueMicrotask(()=>loadForModule(module));return out;};
    wrapped.__lutminV30Demand=true;window.setAdminModuleV19=wrapped;return true;
  }
  function invalidate(module){
    const keys=moduleMap[module]||[];const data=window.LutminV30Data||window.LutminV29Data;keys.forEach(k=>data?.invalidate?.(`admin-secondary:${k}`));
  }
  window.LutminV30Admin={version:VERSION,bootstrap,loadForModule,invalidate,status:()=>({version:VERSION,activeModule:S.activeModule,loaded:[...S.loaded],inFlight:[...S.inFlight.keys()],runs:S.runs,moduleMap})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installWrapper,{once:true});else installWrapper();
  window.addEventListener('lutmin:v30:modules-ready',installWrapper);
})();
