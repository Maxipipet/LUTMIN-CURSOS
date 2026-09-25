// =============================================================
// LUTMIN V28.0 · AUTH-GATED MODULE LOADER + RECUPERACIÓN
// Descarga en segundo plano al abrir el login y ejecuta sólo cuando
// existe una sesión válida. Mantiene el orden histórico de parches.
// =============================================================
(function(){
  'use strict';

  const VERSION='28.0';
  const state={status:'idle',promise:null,loaded:new Set(),startedAt:0,finishedAt:0,error:null,retries:0,warmed:false};
  const cssFiles=[
    'assets/css/v18-conecta.css',
    'assets/css/v24-core.css',
    'assets/css/v24-1-video-gate.css',
    'assets/css/v19-workspaces.css',
    'assets/css/v20-organizations-onboarding.css',
    'assets/css/v21-conecta-hub.css',
    'assets/css/v21-conecta-panels.css',
    'assets/css/v22-performance.css',
    'assets/css/v23-runtime.css',
    'assets/css/v25-control-center.css'
  ];
  const scriptFiles=[
    'assets/js/modules/academy/learning-paths-quality.js',
    'assets/js/modules/talent/development.js',
    'assets/js/modules/core/qa-security.js',
    'assets/js/modules/academy/operations.js',
    'assets/js/modules/core/ux-support.js',
    'assets/js/modules/academy/competencies-pro.js',
    'assets/js/modules/academy/compliance.js',
    'assets/js/modules/teacher/portal.js',
    'assets/js/modules/platform/superplatform.js',
    'assets/js/modules/agents/autopilot.js',
    'assets/js/modules/agents/autopilot-company.js',
    'assets/js/modules/talent/pre-interview.js',
    'assets/js/modules/talent/intelligence-core.js',
    'assets/js/modules/talent/cv-parser.js',
    'assets/js/modules/talent/evidence-career.js',
    'assets/js/modules/core/workspaces-command.js',
    'assets/js/modules/talent/zero-friction.js',
    'assets/js/v18-conecta.js',
    'assets/js/v19-workspaces.js',
    'assets/js/v20-organizations-onboarding.js',
    'assets/js/v21-conecta-hub.js',
    'assets/js/v21-conecta-panels.js',
    'assets/js/v22-performance.js',
    'assets/js/v23-runtime.js',
    'assets/js/v24-core.js',
    'assets/js/v24-1-video-gate.js',
    'assets/js/v25-control-center.js',
    'assets/js/v26-health.js'
  ];

  const withVersion=(url,recovery=false)=>`${url}${url.includes('?')?'&':'?'}v=${encodeURIComponent(VERSION)}${recovery?`&r=${Date.now()}`:''}`;

  function ensureBootBar(){
    let bar=document.getElementById('lutminV28BootBar');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.id='lutminV28BootBar';
    bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<span></span>';
    document.body?.appendChild(bar);
    return bar;
  }
  function setBootBar(mode){
    const bar=ensureBootBar(); if(!bar)return;
    bar.dataset.state=mode;
    if(mode==='loading')requestAnimationFrame(()=>bar.classList.add('is-visible'));
    else setTimeout(()=>bar.classList.remove('is-visible'),mode==='ready'?180:1400);
  }

  function loadCssOnce(file){
    const key=`v28-css:${file}`;
    if(state.loaded.has(key))return Promise.resolve(true);
    const existing=[...document.styleSheets].some(s=>String(s.href||'').includes(file));
    if(existing){state.loaded.add(key);return Promise.resolve(true);}
    return new Promise(resolve=>{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=withVersion(file);
      link.dataset.lutminV28='css';
      const done=()=>{state.loaded.add(key);resolve(true);};
      link.onload=done;
      link.onerror=()=>{console.warn('[Lutmin V28] CSS no disponible:',file);resolve(false);};
      document.head.appendChild(link);
      setTimeout(done,4500);
    });
  }

  function preloadScripts(){
    state.warmed=true;
    scriptFiles.forEach(file=>{
      if(document.head.querySelector(`link[data-lutmin-v28-preload="${file}"]`))return;
      const link=document.createElement('link');
      link.rel='preload'; link.as='script'; link.href=withVersion(file);
      link.dataset.lutminV28Preload=file;
      document.head.appendChild(link);
    });
  }

  function clearPreloads(){
    document.head.querySelectorAll('link[data-lutmin-v28-preload]').forEach(x=>x.remove());
  }

  async function clearRuntimeCaches(){
    try{
      if(window.LutminV28Update?.clearRuntimeCaches) return await window.LutminV28Update.clearRuntimeCaches();
      if(!('caches' in window))return false;
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));
      return true;
    }catch(_){return false;}
  }

  function appendScript(file,recovery=false){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=withVersion(file,recovery);
      script.async=false;
      script.dataset.lutminV28='module';
      script.dataset.lutminSource=file;
      script.onload=()=>resolve(true);
      script.onerror=()=>{script.remove();reject(new Error(`No se pudo cargar ${file}`));};
      document.body.appendChild(script);
    });
  }

  async function loadScriptOnce(file){
    const key=`v28-js:${file}`;
    if(state.loaded.has(key))return true;
    const existing=[...document.scripts].find(s=>String(s.src||'').includes(file));
    if(existing){state.loaded.add(key);return true;}
    try{
      await appendScript(file,false);
      state.loaded.add(key);
      return true;
    }catch(firstError){
      state.retries+=1;
      window.dispatchEvent(new CustomEvent('lutmin:v28:asset-retry',{detail:{file}}));
      await clearRuntimeCaches();
      await appendScript(file,true);
      state.loaded.add(key);
      return true;
    }
  }

  // Los módulos históricos registran inicializadores en DOMContentLoaded.
  // Si se ejecutan luego del login, ejecutamos esos callbacks inmediatamente
  // sólo durante la hidratación del runtime.
  async function withLateDomReadyCompatibility(task){
    if(document.readyState==='loading')return task();
    const nativeAdd=document.addEventListener.bind(document);
    document.addEventListener=function(type,listener,options){
      if(type==='DOMContentLoaded' && typeof listener==='function'){
        queueMicrotask(()=>{
          try{listener.call(document,new Event('DOMContentLoaded'));}
          catch(err){setTimeout(()=>{throw err;},0);}
        });
        return;
      }
      return nativeAdd(type,listener,options);
    };
    try{return await task();}
    finally{document.addEventListener=nativeAdd;}
  }

  async function loadAll(reason='authenticated'){
    if(state.status==='ready')return true;
    if(state.promise)return state.promise;
    state.status='loading'; state.startedAt=performance.now(); state.error=null;
    document.documentElement.dataset.lutminModules='loading';
    setBootBar('loading');
    preloadScripts();
    state.promise=withLateDomReadyCompatibility(async()=>{
      await Promise.all(cssFiles.map(loadCssOnce));
      for(const file of scriptFiles)await loadScriptOnce(file);
      state.status='ready'; state.finishedAt=performance.now();
      document.documentElement.dataset.lutminModules='ready';
      setBootBar('ready');
      clearPreloads();
      window.dispatchEvent(new CustomEvent('lutmin:v28:modules-ready',{detail:{reason,duration_ms:Math.round(state.finishedAt-state.startedAt),count:scriptFiles.length,retries:state.retries}}));
      return true;
    }).catch(err=>{
      state.status='error'; state.error=String(err?.message||err); state.promise=null;
      document.documentElement.dataset.lutminModules='error';
      setBootBar('error');
      window.dispatchEvent(new CustomEvent('lutmin:v28:modules-error',{detail:{reason,error:state.error}}));
      console.error('[Lutmin V28] Error cargando módulos:',err);
      return false;
    });
    return state.promise;
  }

  // V28: abrir el login ya no ejecuta 28 módulos. Sólo inicia la descarga
  // en segundo plano. La ejecución espera una sesión válida.
  function warm(reason='intent'){
    preloadScripts();
    cssFiles.forEach(file=>{ loadCssOnce(file); });
    window.dispatchEvent(new CustomEvent('lutmin:v28:warm',{detail:{reason,count:scriptFiles.length}}));
    return Promise.resolve(true);
  }

  async function ensureAuthenticated(options={}){return loadAll(options?.role||'authenticated');}

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator) || location.protocol==='file:')return false;
    try{
      const reg=await navigator.serviceWorker.register(`./sw.js?v=${VERSION}`,{scope:'./'});
      window.dispatchEvent(new CustomEvent('lutmin:v28:sw-registered',{detail:{registration:reg}}));
      reg.update().catch(()=>{});
      return reg;
    }catch(err){console.warn('[Lutmin V28] Service Worker no disponible:',err?.message||err);return false;}
  }

  window.LutminV28Modules={
    version:VERSION,
    ensureAuthenticated,
    warm,
    loadAll,
    status:()=>({...state,loaded:[...state.loaded]}),
    files:{css:[...cssFiles],scripts:[...scriptFiles]},
    registerServiceWorker,
    clearRuntimeCaches
  };

  // Un perfil público sí necesita ejecutar Conecta aun sin sesión.
  const publicTalent=new URL(location.href).searchParams.get('talento');
  if(publicTalent){
    const boot=()=>loadAll('public-talent');
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',registerServiceWorker,{once:true});
  else registerServiceWorker();
})();
