// =============================================================
// LUTMIN V27.0 · AUTH-GATED MODULE LOADER
// Carga el runtime pesado sólo cuando existe una sesión real.
// Mantiene el orden histórico de los parches para proteger compatibilidad.
// =============================================================
(function(){
  'use strict';

  const VERSION='27.0';
  const state={status:'idle',promise:null,loaded:new Set(),startedAt:0,finishedAt:0,error:null};
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

  const withVersion=(url)=>`${url}${url.includes('?')?'&':'?'}v=${encodeURIComponent(VERSION)}`;

  function ensureBootBar(){
    let bar=document.getElementById('lutminV27BootBar');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.id='lutminV27BootBar';
    bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<span></span>';
    document.body?.appendChild(bar);
    return bar;
  }
  function setBootBar(mode){
    const bar=ensureBootBar(); if(!bar)return;
    bar.dataset.state=mode;
    if(mode==='loading')requestAnimationFrame(()=>bar.classList.add('is-visible'));
    else setTimeout(()=>bar.classList.remove('is-visible'),mode==='ready'?180:1200);
  }

  function loadCssOnce(file){
    const key=`v27-css:${file}`;
    if(state.loaded.has(key))return;
    const existing=[...document.styleSheets].some(s=>String(s.href||'').includes(file));
    if(existing){state.loaded.add(key);return;}
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=withVersion(file);
    link.dataset.lutminV27='css';
    document.head.appendChild(link);
    state.loaded.add(key);
  }

  function preloadScripts(){
    scriptFiles.forEach(file=>{
      if(document.head.querySelector(`link[data-lutmin-v27-preload="${file}"]`))return;
      const link=document.createElement('link');
      link.rel='preload'; link.as='script'; link.href=withVersion(file);
      link.dataset.lutminV27Preload=file;
      document.head.appendChild(link);
    });
  }

  function loadScriptOnce(file){
    const key=`v27-js:${file}`;
    if(state.loaded.has(key))return Promise.resolve(true);
    const existing=[...document.scripts].find(s=>String(s.src||'').includes(file));
    if(existing){state.loaded.add(key);return Promise.resolve(true);}
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=withVersion(file);
      script.async=false;
      script.dataset.lutminV27='module';
      script.onload=()=>{state.loaded.add(key);resolve(true);};
      script.onerror=()=>reject(new Error(`No se pudo cargar ${file}`));
      document.body.appendChild(script);
    });
  }

  // Los módulos históricos registran inicializadores en DOMContentLoaded.
  // Cuando se cargan luego del login, el evento real ya pudo ocurrir.
  // Durante la carga solamente, ejecutamos esos callbacks de inmediato.
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

  async function loadAll(){
    if(state.status==='ready')return true;
    if(state.promise)return state.promise;
    state.status='loading'; state.startedAt=performance.now(); state.error=null;
    document.documentElement.dataset.lutminModules='loading';
    setBootBar('loading');
    cssFiles.forEach(loadCssOnce);
    preloadScripts();
    state.promise=withLateDomReadyCompatibility(async()=>{
      for(const file of scriptFiles)await loadScriptOnce(file);
      state.status='ready'; state.finishedAt=performance.now();
      document.documentElement.dataset.lutminModules='ready';
      setBootBar('ready');
      window.dispatchEvent(new CustomEvent('lutmin:v27:modules-ready',{detail:{duration_ms:Math.round(state.finishedAt-state.startedAt),count:scriptFiles.length}}));
      return true;
    }).catch(err=>{
      state.status='error'; state.error=String(err?.message||err); state.promise=null;
      document.documentElement.dataset.lutminModules='error';
      setBootBar('error');
      console.error('[Lutmin V27] Error cargando módulos:',err);
      return false;
    });
    return state.promise;
  }

  function warm(reason='intent'){
    if(state.status!=='idle')return state.promise||Promise.resolve(state.status==='ready');
    // Dar prioridad al click/login; el preload empieza en paralelo y la ejecución
    // se realiza inmediatamente para que los wrappers queden instalados antes del Campus.
    return loadAll(reason);
  }

  async function ensureAuthenticated(){return loadAll();}

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator) || location.protocol==='file:')return false;
    try{
      const reg=await navigator.serviceWorker.register(`./sw.js?v=${VERSION}`,{scope:'./'});
      reg.update().catch(()=>{});
      return true;
    }catch(err){console.warn('[Lutmin V27] Service Worker no disponible:',err?.message||err);return false;}
  }

  window.LutminV27Modules={
    version:VERSION,
    ensureAuthenticated,
    warm,
    status:()=>({...state,loaded:[...state.loaded]}),
    files:{css:[...cssFiles],scripts:[...scriptFiles]},
    registerServiceWorker
  };

  // Perfiles públicos necesitan los módulos de Conecta aun sin sesión.
  const publicTalent=new URL(location.href).searchParams.get('talento');
  if(publicTalent){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>warm('public-talent'),{once:true});
    else warm('public-talent');
  }

  // Empezar a descargar cuando hay intención clara de ingreso; normalmente termina
  // mientras la persona escribe sus credenciales.
  document.addEventListener('pointerover',e=>{
    if(e.target.closest?.('[data-public-event="student_access"],[data-public-event="company_access"],[data-public-event="campus_student_access"],[data-public-event="company_portal_cta"]')) preloadScripts();
  },{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',registerServiceWorker,{once:true});
  else registerServiceWorker();
})();
