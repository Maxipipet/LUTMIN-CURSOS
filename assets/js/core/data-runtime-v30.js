// =============================================================
// LUTMIN V30.0 · DATA RUNTIME
// Evita recargas repetidas al volver a una pantalla, reutiliza cargas
// concurrentes y mantiene métricas locales. No cachea datos sensibles.
// =============================================================
(function(){
  'use strict';
  const VERSION='30.0';
  const state={entries:new Map(),metrics:new Map(),hits:0,misses:0,reused:0};
  const defaults={dashboard:18000,admin:20000,company:20000,'company-conecta':22000,instructor:22000,agenda:30000,activities:22000,talent:26000,notifications:18000,support:30000};

  function entry(key){if(!state.entries.has(key))state.entries.set(key,{lastSuccess:0,inFlight:null,lastDuration:0,runs:0,errors:0});return state.entries.get(key);}
  async function load(key,loader,options={}){
    if(typeof loader!=='function')return null;
    const e=entry(key),ttl=Number(options.ttl??defaults[key]??12000),force=Boolean(options.force),now=Date.now();
    if(e.inFlight){state.reused+=1;return e.inFlight;}
    if(!force&&e.lastSuccess&&now-e.lastSuccess<ttl){state.hits+=1;window.dispatchEvent(new CustomEvent('lutmin:v30:data-cache-hit',{detail:{key,age_ms:now-e.lastSuccess,ttl}}));return null;}
    state.misses+=1;const started=performance.now();
    e.inFlight=Promise.resolve().then(loader).then(result=>{e.lastSuccess=Date.now();e.lastDuration=Math.round(performance.now()-started);e.runs+=1;state.metrics.set(key,{lastDuration:e.lastDuration,runs:e.runs,lastSuccess:e.lastSuccess});window.dispatchEvent(new CustomEvent('lutmin:v30:data-loaded',{detail:{key,duration_ms:e.lastDuration}}));return result;}).catch(err=>{e.errors+=1;throw err;}).finally(()=>{e.inFlight=null;});
    return e.inFlight;
  }
  function mark(key){const e=entry(key);e.lastSuccess=Date.now();}
  function invalidate(key){if(!key){state.entries.clear();return;}for(const k of [...state.entries.keys()])if(k===key||k.startsWith(`${key}:`))state.entries.delete(k);}
  function fresh(key,ttl){const e=state.entries.get(key);if(!e?.lastSuccess)return false;const limit=Number(ttl??defaults[key]??12000);return Date.now()-e.lastSuccess<limit;}
  function invalidateMany(keys=[]){(keys||[]).forEach(k=>invalidate(k));}
  function status(){return {version:VERSION,hits:state.hits,misses:state.misses,reused:state.reused,entries:[...state.entries.entries()].map(([key,v])=>({key,lastSuccess:v.lastSuccess,lastDuration:v.lastDuration,runs:v.runs,errors:v.errors,inFlight:Boolean(v.inFlight)}))};}

  async function openTab(tab){
    const role=(typeof currentLutminUser!=='undefined'&&currentLutminUser)?currentLutminUser.role:null;
    const ready=await window.LutminV30Modules?.ensureFeatureForTab?.(tab,role);if(ready===false)return false;
    if(typeof goToCampusTab==='function')goToCampusTab(tab);
    const map={
      admin:['admin',()=>loadAdminData(),12000],company:['company',()=>loadCompanyPortalData(),12000],
      'company-conecta':['company-conecta',()=>loadCompanyConectaData(),15000],instructor:['instructor',()=>loadInstructorPortalV50(),15000],
      agenda:['agenda',()=>loadStudentAgenda(),20000],activities:['activities',()=>loadStudentActivitiesV50(),15000],
      talent:['talent',()=>loadTalentCenter(),18000],notifications:['notifications',()=>loadNotificationCenter(),12000],support:['support',()=>loadSupportCenter(),25000]
    };
    const cfg=map[tab];if(cfg)await load(cfg[0],cfg[1],{ttl:cfg[2]});return true;
  }
  async function openConecta(module='summary'){
    const ok=await openTab('talent');if(!ok)return false;
    if(typeof openConectaModuleV210==='function')await openConectaModuleV210(module);return true;
  }
  async function openCompanyConecta(module='overview'){
    const ok=await openTab('company-conecta');if(!ok)return false;
    if(typeof setCompanyConectaView==='function')setCompanyConectaView(module);return true;
  }

  const api={version:VERSION,load,mark,invalidate,invalidateMany,fresh,status,openTab,openConecta,openCompanyConecta,ttl:{...defaults}};
  window.LutminV30Data=api;
  window.LutminV29Data=api;
})();
