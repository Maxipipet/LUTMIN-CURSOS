// =============================================================
// LUTMIN V33.0 · ADMIN MODULE VIEW LOADER
// Mantiene un shell mínimo y monta un único módulo interno a la vez.
// Caché de HTML en memoria + cache HTTP/SW; sin servicios externos.
// =============================================================
(function(){
  'use strict';
  const VERSION='33.0';
  const modules=['overview','operations','academic','people','companies','commercial','finance','talent','communications','system'];
  const dynamicModules=new Set(['development','agents']);
  const paths=Object.fromEntries(modules.map(name=>[name,`assets/views/admin/${name}.html`]));
  const cache=new Map();
  const inFlight=new Map();
  const state={active:null,requestId:0,mounts:0,networkLoads:0,cacheHits:0,lastBytes:0,lastDuration:0,runtimeLoads:0,dataLoads:0,error:null};

  function host(){return document.getElementById('adminModuleHostV32');}
  function normalize(name){return paths[name]||dynamicModules.has(name)?name:'overview';}
  function url(name){return paths[name]?`${paths[name]}?v=${encodeURIComponent(VERSION)}`:null;}
  function skeleton(name){
    const labels={overview:'Resumen',operations:'Operación',academic:'Academia',people:'Personas',companies:'Empresas',commercial:'Comercial',finance:'Finanzas',talent:'Talento',communications:'Comunicación',system:'Sistema'};
    return `<div class="mt-6 rounded-3xl border border-slate-100 bg-white p-6"><div class="flex items-center gap-3 text-sm text-slate-500"><span class="lutmin-view-spinner-v31"></span><span>Cargando ${labels[name]||'módulo'}…</span></div></div>`;
  }
  async function getHtml(name,{force=false}={}){
    if(!force&&cache.has(name)){state.cacheHits+=1;return cache.get(name);}
    if(inFlight.has(name))return inFlight.get(name);
    const p=(async()=>{
      const started=performance.now();
      const res=await fetch(url(name),{credentials:'same-origin',cache:force?'reload':'force-cache'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const html=await res.text();
      if(!html.trim())throw new Error('Módulo vacío');
      cache.set(name,html);state.networkLoads+=1;state.lastBytes=new Blob([html]).size;state.lastDuration=Math.round(performance.now()-started);return html;
    })().finally(()=>inFlight.delete(name));
    inFlight.set(name,p);return p;
  }
  async function hydrate(name){
    try{window.LutminV32CoreBindings?.bind?.('admin');}catch(err){console.warn('[Lutmin V33] binding admin',err);}
    const jobs=[];
    if(window.LutminV33AdminData?.loadForModule)jobs.push(window.LutminV33AdminData.loadForModule(name).then(()=>{state.dataLoads+=1;}));
    if(window.LutminV30Admin?.loadForModule)jobs.push(window.LutminV30Admin.loadForModule(name));
    await Promise.allSettled(jobs);
    try{if(typeof renderAdminPanel==='function')renderAdminPanel();}catch(err){console.warn('[Lutmin V33] render admin',err);}
    try{if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();}catch(_){ }
    window.dispatchEvent(new CustomEvent('lutmin:v33:admin-module-ready',{detail:{module:name}}));
    window.dispatchEvent(new CustomEvent('lutmin:v32:admin-module-ready',{detail:{module:name}}));
  }
  async function mount(name,{force=false}={}){
    name=normalize(name);const target=host();if(!target)return false;
    if(state.active===name&&target.dataset.adminModuleReadyV32==='1'&&!force)return true;
    if(dynamicModules.has(name)){
      const requestId=++state.requestId;target.innerHTML=skeleton(name);target.dataset.adminModuleReadyV32='0';target.dataset.adminModuleV32=name;
      try{
        await window.LutminV30Modules?.ensureAdminModule?.(name);state.runtimeLoads+=1;if(requestId!==state.requestId)return false;
        target.innerHTML='';target.dataset.adminModuleReadyV32='1';state.active=name;state.mounts+=1;
        await window.LutminV33AdminData?.loadForModule?.(name);
        if(name==='development'){try{window.ensureAdminDevelopmentPanelV100?.();const panel=document.getElementById('adminDevelopmentV100');if(panel&&panel.parentElement!==target)target.appendChild(panel);await window.loadAdminDevelopmentV100?.();}catch(_){}}
        if(name==='agents'){try{window.ensureAdminAgentsPanelV110?.();const panel=document.getElementById('adminAgentsV110');if(panel&&panel.parentElement!==target)target.appendChild(panel);await window.loadAdminAgentsV110?.(false);}catch(_){}}
        // Cualquier tarjeta histórica etiquetada para este módulo pasa al host activo.
        document.querySelectorAll(`section[data-campus-panel="admin"] > [data-admin-module-v19="${name}"]`).forEach(el=>{if(el!==target)target.appendChild(el);});
        await window.LutminV30Admin?.loadForModule?.(name).catch?.(()=>{});
        try{if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();}catch(_){ }
        window.dispatchEvent(new CustomEvent('lutmin:v33:admin-module-ready',{detail:{module:name,dynamic:true}}));return true;
      }catch(err){state.error=String(err?.message||err);target.dataset.adminModuleReadyV32='error';target.innerHTML=`<div class="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>No pude cargar este módulo.</strong><button type="button" data-admin-v32-retry class="mt-3 px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-bold">Reintentar</button></div>`;target.querySelector('[data-admin-v32-retry]')?.addEventListener('click',()=>mount(name,{force:true}));return false;}
    }
    const requestId=++state.requestId;target.dataset.adminModuleReadyV32='0';target.dataset.adminModuleV32=name;target.innerHTML=skeleton(name);
    try{
      const [html]=await Promise.all([getHtml(name,{force}),window.LutminV30Modules?.ensureAdminModule?.(name)||Promise.resolve(true)]);state.runtimeLoads+=1;if(requestId!==state.requestId)return false;
      target.innerHTML=html;target.dataset.adminModuleReadyV32='1';state.active=name;state.mounts+=1;state.error=null;await hydrate(name);return true;
    }catch(err){
      if(requestId!==state.requestId)return false;state.error=String(err?.message||err);target.dataset.adminModuleReadyV32='error';
      target.innerHTML=`<div class="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>No pude cargar este módulo.</strong><p class="mt-1 text-xs">Revisá la conexión y volvé a intentar.</p><button type="button" data-admin-v32-retry class="mt-3 px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-bold">Reintentar</button></div>`;
      target.querySelector('[data-admin-v32-retry]')?.addEventListener('click',()=>mount(name,{force:true}));return false;
    }
  }
  function prefetch(name){
    name=normalize(name);if(dynamicModules.has(name)||cache.has(name)||inFlight.has(name))return false;
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(c?.saveData||/2g/.test(String(c?.effectiveType||'')))return false;
    getHtml(name).catch(()=>{});return true;
  }
  function install(){
    const base=window.setAdminModuleV19;if(typeof base!=='function'||base.__lutminV32Views)return false;
    const wrapped=function(module,opts={}){
      const name=normalize(module);const target=host();if(target&&!(state.active===name&&target.dataset.adminModuleReadyV32==='1')){target.dataset.adminModuleReadyV32='0';target.dataset.adminModuleV32=name;target.innerHTML=skeleton(name);}const out=base.call(this,name,opts);mount(name).catch(()=>{});return out;
    };
    wrapped.__lutminV32Views=true;wrapped.__lutminV32Base=base;window.setAdminModuleV19=wrapped;return true;
  }
  function ensureActive(){const name=normalize(localStorage.getItem('lutmin-admin-module-v19')||'overview');return mount(name);}
  function clear(name){if(name)cache.delete(normalize(name));else cache.clear();}
  function status(){return {version:VERSION,active:state.active,mounts:state.mounts,networkLoads:state.networkLoads,cacheHits:state.cacheHits,lastBytes:state.lastBytes,lastDuration:state.lastDuration,runtimeLoads:state.runtimeLoads,dataLoads:state.dataLoads,error:state.error,cached:[...cache.keys()],inFlight:[...inFlight.keys()]};}
  window.LutminV33AdminViews={version:VERSION,mount,ensureActive,prefetch,clear,status,install};
  window.LutminV32AdminViews=window.LutminV33AdminViews;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lutmin:v32:view-ready',e=>{if(e.detail?.view==='admin'){install();const name=normalize(localStorage.getItem('lutmin-admin-module-v19')||'overview');if(typeof window.setAdminModuleV19==='function')window.setAdminModuleV19(name,{noSave:true,noScroll:true});else ensureActive();}});
  window.addEventListener('lutmin:v30:modules-ready',()=>install());
})();
