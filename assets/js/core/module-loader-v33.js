// =============================================================
// LUTMIN V47.0 · ACTIVE-WORKSPACE MODULE LOADER
// Carga sólo el runtime necesario para cada acceso y deja Conecta
// pesado bajo demanda. Mantiene costo API $0 y fallback completo.
// =============================================================
(function(){
  'use strict';

  const VERSION='49.0';
  const state={status:'idle',promise:null,loaded:new Set(),bundles:new Set(),startedAt:0,finishedAt:0,error:null,retries:0,warmed:false,lastReason:null,lastRole:null};
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
    'assets/css/v25-control-center.css',
    'assets/css/v45-agent.css',
    'assets/css/v46-processes.css'
  ];

  // Orden histórico: cualquier subconjunto se filtra sobre esta lista.
  const scriptFiles=[
    'assets/js/core/admin-workspace-v35.js',
    'assets/js/core/admin-data-runtime-v33.js',
    'assets/js/core/admin-module-loader-v33.js',
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
    'assets/js/modules/talent/professional-progression-v49.js',
    'assets/js/modules/core/workspaces-command.js',
    'assets/js/modules/talent/zero-friction.js',
    'assets/js/v18-conecta.js',
    'assets/js/v19-workspaces.js',
    'assets/js/v20-organizations-onboarding.js',
    'assets/js/v21-conecta-hub.js',
    'assets/js/v21-conecta-panels.js',
    'assets/js/core/talent-router-v38.js',
    'assets/js/modules/talent/application-dossier-v46.js',
    'assets/js/modules/talent/application-processes-v46.js',
    'assets/js/modules/talent/cv-tailor-engine-v45.js',
    'assets/js/modules/agents/talent-agent-v46.js',
    'assets/js/v22-performance.js',
    'assets/js/v23-runtime.js',
    'assets/js/v24-core.js',
    'assets/js/v24-1-video-gate.js',
    'assets/js/v25-control-center.js',
    'assets/js/v26-health.js',
    'assets/js/modules/core/admin-demand-v33.js',
    'assets/js/core/update-manager-v32.js'
  ];

  const F={
    adminCore:'assets/js/core/admin-workspace-v35.js',
    adminData:'assets/js/core/admin-data-runtime-v33.js',
    adminViews:'assets/js/core/admin-module-loader-v33.js',
    lp:'assets/js/modules/academy/learning-paths-quality.js',
    dev:'assets/js/modules/talent/development.js',
    qa:'assets/js/modules/core/qa-security.js',
    ops:'assets/js/modules/academy/operations.js',
    ux:'assets/js/modules/core/ux-support.js',
    comp:'assets/js/modules/academy/competencies-pro.js',
    compliance:'assets/js/modules/academy/compliance.js',
    teacher:'assets/js/modules/teacher/portal.js',
    super:'assets/js/modules/platform/superplatform.js',
    auto:'assets/js/modules/agents/autopilot.js',
    autoCompany:'assets/js/modules/agents/autopilot-company.js',
    pre:'assets/js/modules/talent/pre-interview.js',
    intel:'assets/js/modules/talent/intelligence-core.js',
    cv:'assets/js/modules/talent/cv-parser.js',
    evidence:'assets/js/modules/talent/evidence-career.js',
    progression49:'assets/js/modules/talent/professional-progression-v49.js',
    workspaceCmd:'assets/js/modules/core/workspaces-command.js',
    zero:'assets/js/modules/talent/zero-friction.js',
    conecta:'assets/js/v18-conecta.js',
    workspaces:'assets/js/v19-workspaces.js',
    org:'assets/js/v20-organizations-onboarding.js',
    hub:'assets/js/v21-conecta-hub.js',
    panels:'assets/js/v21-conecta-panels.js',
    talentRouter:'assets/js/core/talent-router-v38.js',
    dossier46:'assets/js/modules/talent/application-dossier-v46.js',
    processes46:'assets/js/modules/talent/application-processes-v46.js',
    tailor45:'assets/js/modules/talent/cv-tailor-engine-v45.js',
    opportunityDev48:'assets/js/modules/talent/opportunity-development-v48.js',
    talentAgent46:'assets/js/modules/agents/talent-agent-v46.js',
    perf:'assets/js/v22-performance.js',
    runtime:'assets/js/v23-runtime.js',
    core:'assets/js/v24-core.js',
    video:'assets/js/v24-1-video-gate.js',
    control:'assets/js/v25-control-center.js',
    health:'assets/js/v26-health.js',
    adminDemand:'assets/js/modules/core/admin-demand-v33.js'
  };

  const adminBaseSet=new Set([F.adminCore,F.adminData,F.adminViews,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core,F.adminDemand]);
  const companyBaseSet=new Set([F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]);
  const studentBaseSet=new Set([F.comp,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core,F.video]);
  const roleSets={
    // V40: Alumno arranca con el flujo crítico. Rutas/vigencias se hidratan en idle,
    // Actividades y soporte se descargan sólo al abrirlos.
    student:studentBaseSet,
    company_admin:companyBaseSet,
    instructor:new Set([F.teacher,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]),
    admin:adminBaseSet
  };
  const companySectionSets={
    summary:new Set(),
    team:new Set(),
    onboarding:new Set([F.org]),
    training:new Set([F.ops]),
    agenda:new Set(),
    compliance:new Set([F.compliance]),
    development:new Set([F.super]),
    autopilot:new Set([F.super,F.auto,F.autoCompany])
  };
  const featureSets={
    // V38: Conecta abre con navegación + resumen. Cada módulo trae su runtime al hacer clic.
    talent:new Set([F.hub,F.talentRouter]),
    companyConecta:new Set([F.super,F.pre,F.org]),
    publicTalent:new Set([F.super,F.evidence]),
    studentEnhancements:new Set([F.lp,F.compliance]),
    activities:new Set([F.teacher]),
    support:new Set([F.ux])
  };
  const talentSectionSets={
    summary:new Set([F.hub,F.talentRouter]),
    profile:new Set([F.super,F.intel,F.cv,F.zero]),
    jobs:new Set([F.intel,F.super]),
    applications:new Set([F.dossier46,F.processes46]),
    interviews:new Set([F.super,F.pre]),
    organizations:new Set([F.org]),
    career:new Set([F.super,F.intel,F.evidence,F.dossier46,F.progression49]),
    timeline:new Set([F.org]),
    saved:new Set(),
    agent:new Set([F.dossier46,F.talentAgent46]),
    passport:new Set([F.super,F.auto])
  };
  const adminModuleSets={
    overview:new Set(),
    operations:new Set([F.ops]),
    academic:new Set([F.lp,F.ops,F.comp,F.compliance]),
    people:new Set([F.comp,F.compliance]),
    companies:new Set([F.dev,F.org]),
    commercial:new Set([F.super,F.pre]),
    finance:new Set(),
    talent:new Set([F.dev,F.super,F.pre,F.intel,F.cv,F.evidence,F.zero,F.org]),
    communications:new Set([F.ux]),
    system:new Set([F.qa,F.ux,F.control,F.health]),
    development:new Set([F.dev,F.super,F.comp,F.evidence]),
    agents:new Set([F.auto,F.autoCompany,F.control,F.dev])
  };
  const warmSet=new Set([F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]);

  const cssByScript=new Map([
    [F.conecta,['assets/css/v18-conecta.css']],
    [F.core,['assets/css/v24-core.css']],
    [F.video,['assets/css/v24-1-video-gate.css']],
    [F.workspaces,['assets/css/v19-workspaces.css']],
    [F.org,['assets/css/v20-organizations-onboarding.css']],
    [F.hub,['assets/css/v21-conecta-hub.css']],
    [F.panels,['assets/css/v21-conecta-panels.css']],
    [F.perf,['assets/css/v22-performance.css']],
    [F.runtime,['assets/css/v23-runtime.css']],
    [F.control,['assets/css/v25-control-center.css']],
    [F.talentRouter,['assets/css/v18-conecta.css']],
    [F.talentAgent46,['assets/css/v45-agent.css']],
    [F.processes46,['assets/css/v46-processes.css']]
  ]);
  const cssForSet=set=>{const out=new Set();set.forEach(file=>(cssByScript.get(file)||[]).forEach(css=>out.add(css)));return [...out];};

  const ordered=set=>scriptFiles.filter(file=>set.has(file));
  const union=(...sets)=>{const out=new Set();sets.forEach(s=>s&&s.forEach(x=>out.add(x)));return out;};
  const normalizeCaps=c=>({student:Boolean(c?.student),admin:Boolean(c?.admin),company:Boolean(c?.company||c?.companies?.length),instructor:Boolean(c?.instructor)});

  const withVersion=(url,recovery=false)=>`${url}${url.includes('?')?'&':'?'}v=${encodeURIComponent(VERSION)}${recovery?`&r=${Date.now()}`:''}`;

  function ensureBootBar(){
    let bar=document.getElementById('lutminV30BootBar');
    if(bar)return bar;
    bar=document.createElement('div');bar.id='lutminV30BootBar';bar.setAttribute('aria-hidden','true');bar.innerHTML='<span></span>';document.body?.appendChild(bar);return bar;
  }
  function setBootBar(mode){const bar=ensureBootBar();if(!bar)return;bar.dataset.state=mode;if(mode==='loading')requestAnimationFrame(()=>bar.classList.add('is-visible'));else setTimeout(()=>bar.classList.remove('is-visible'),mode==='ready'?160:1400);}

  function loadCssOnce(file){
    const key=`v30-css:${file}`;if(state.loaded.has(key))return Promise.resolve(true);
    const existing=[...document.styleSheets].some(s=>String(s.href||'').includes(file));if(existing){state.loaded.add(key);return Promise.resolve(true);}
    return new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=withVersion(file);link.dataset.lutminV30='css';let settled=false;const done=()=>{if(settled)return;settled=true;state.loaded.add(key);resolve(true);};link.onload=done;link.onerror=()=>{console.warn('[Lutmin V46] CSS no disponible:',file);done();};document.head.appendChild(link);setTimeout(done,4500);});
  }

  function preload(files){
    state.warmed=true;
    // V40: no prepriorizamos un bundle entero. Chrome advertía decenas de preloads
    // no utilizados y se competía con los recursos realmente visibles.
    ordered(new Set(files)).slice(0,2).forEach(file=>{if(document.head.querySelector(`link[data-lutmin-v30-preload="${file}"]`))return;const link=document.createElement('link');link.rel='preload';link.as='script';link.href=withVersion(file);link.dataset.lutminV30Preload=file;document.head.appendChild(link);});
  }
  function clearPreloads(){document.head.querySelectorAll('link[data-lutmin-v30-preload]').forEach(x=>x.remove());}

  async function clearRuntimeCaches(){
    try{if(window.LutminV30Update?.clearRuntimeCaches)return await window.LutminV30Update.clearRuntimeCaches();if(!('caches' in window))return false;const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));return true;}catch(_){return false;}
  }
  function appendScript(file,recovery=false){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=withVersion(file,recovery);script.async=false;script.dataset.lutminV30='module';script.dataset.lutminSource=file;script.onload=()=>resolve(true);script.onerror=()=>{script.remove();reject(new Error(`No se pudo cargar ${file}`));};document.body.appendChild(script);});}
  async function loadScriptOnce(file){
    const key=`v30-js:${file}`;if(state.loaded.has(key))return true;
    const existing=[...document.scripts].find(s=>String(s.src||'').includes(file));if(existing){state.loaded.add(key);return true;}
    try{await appendScript(file,false);state.loaded.add(key);return true;}catch(firstError){state.retries+=1;window.dispatchEvent(new CustomEvent('lutmin:v30:asset-retry',{detail:{file}}));await clearRuntimeCaches();await appendScript(file,true);state.loaded.add(key);return true;}
  }

  async function withLateDomReadyCompatibility(task){
    if(document.readyState==='loading')return task();
    const nativeAdd=document.addEventListener.bind(document);
    document.addEventListener=function(type,listener,options){if(type==='DOMContentLoaded'&&typeof listener==='function'){queueMicrotask(()=>{try{listener.call(document,new Event('DOMContentLoaded'));}catch(err){setTimeout(()=>{throw err;},0);}});return;}return nativeAdd(type,listener,options);};
    try{return await task();}finally{document.addEventListener=nativeAdd;}
  }

  async function loadSet(set,reason='runtime',bundleName='custom'){
    // V33: serializa lotes concurrentes y recalcula faltantes después de esperar.
    // Evita descargar dos veces el mismo runtime si el usuario cambia rápido de módulo.
    if(state.promise)await state.promise;
    const files=ordered(set).filter(file=>!state.loaded.has(`v30-js:${file}`));
    if(!files.length){state.bundles.add(bundleName);return true;}
    state.status='loading';state.startedAt=performance.now();state.error=null;state.lastReason=reason;document.documentElement.dataset.lutminModules='loading';setBootBar('loading');preload(files);
    state.promise=withLateDomReadyCompatibility(async()=>{
      await Promise.all(cssForSet(set).map(loadCssOnce));
      for(const file of files)await loadScriptOnce(file);
      state.bundles.add(bundleName);state.status='ready';state.finishedAt=performance.now();document.documentElement.dataset.lutminModules='ready';setBootBar('ready');clearPreloads();
      window.dispatchEvent(new CustomEvent('lutmin:v30:modules-ready',{detail:{reason,bundle:bundleName,duration_ms:Math.round(state.finishedAt-state.startedAt),loaded_now:files.length,loaded_total:[...state.loaded].filter(x=>x.startsWith('v30-js:')).length,total_available:scriptFiles.length,retries:state.retries}}));return true;
    }).catch(err=>{state.status='error';state.error=String(err?.message||err);document.documentElement.dataset.lutminModules='error';setBootBar('error');window.dispatchEvent(new CustomEvent('lutmin:v30:modules-error',{detail:{reason,bundle:bundleName,error:state.error}}));console.error('[Lutmin V30] Error cargando módulos:',err);return false;}).finally(()=>{state.promise=null;});
    return state.promise;
  }

  function setForAccess(role,capabilities){
    // V36: las capacidades disponibles NO definen qué runtime se descarga.
    // Sólo el workspace activo lo hace. Así un administrador que entra como Empresa
    // no arrastra Administración/Alumno dentro del mismo DOM/runtime.
    void capabilities;
    return new Set(roleSets[role]||roleSets.student);
  }

  async function ensureAuthenticated(options={}){
    const role=options?.role||'student';state.lastRole=role;
    const set=setForAccess(role,options?.capabilities||{});
    const ok=await loadSet(set,`authenticated:${role}`,`access:${role}`);
    // La vista Admin puede haberse montado antes de que su loader exista.
    // Forzamos el fragment activo una vez que el runtime lazy ya está listo.
    if(ok&&role==='admin')await window.LutminV33AdminViews?.ensureActive?.();
    return ok;
  }

  async function ensureFeature(name,options={}){
    if(name==='talent')return loadSet(featureSets.talent,'feature:talent','feature:talent');
    if(name==='company-conecta')return loadSet(featureSets.companyConecta,'feature:company-conecta','feature:company-conecta');
    if(name==='public-talent')return loadSet(featureSets.publicTalent,'feature:public-talent','feature:public-talent');
    if(name==='student-enhancements')return loadSet(featureSets.studentEnhancements,'feature:student-enhancements','feature:student-enhancements');
    if(name==='activities')return loadSet(featureSets.activities,'feature:activities','feature:activities');
    if(name==='support')return loadSet(featureSets.support,'feature:support','feature:support');
    if(name==='full')return loadSet(new Set(scriptFiles),'fallback:full','full');
    return true;
  }
  async function ensureTalentSection(section='summary'){
    const extra=talentSectionSets[section]||new Set();
    return loadSet(union(featureSets.talent,extra),`talent:${section}`,`talent:${section}`);
  }
  async function ensureAdminModule(module='overview'){
    const extra=adminModuleSets[module]||new Set();
    return loadSet(union(adminBaseSet,extra),`admin:${module}`,`admin:${module}`);
  }
  async function ensureCompanySection(section='summary'){
    const extra=companySectionSets[section]||new Set();
    return loadSet(union(companyBaseSet,extra),`company:${section}`,`company:${section}`);
  }
  async function ensureTalentCvParser(){
    return loadSet(new Set([F.cv]),'talent:cv-parser','talent:cv-parser');
  }
  async function ensureTalentAgentEngine(){
    return loadSet(new Set([F.tailor45,F.opportunityDev48]),'talent:agent-engine','talent:agent-engine');
  }
  async function ensureFeatureForTab(tab,role){
    if(tab==='talent'&&role==='student')return ensureFeature('talent',{role});
    if(tab==='company-conecta'&&role==='company_admin')return ensureFeature('company-conecta',{role});
    if(tab==='activities'&&role==='student')return ensureFeature('activities',{role});
    if(tab==='support')return ensureFeature('support',{role});
    if(tab==='admin'&&role==='admin')return ensureAdminModule((document.getElementById('adminModuleHostV32')?.dataset?.adminModuleV32)||localStorage.getItem('lutmin-admin-module-v19')||'overview');
    return true;
  }

  // Antes del login sólo calentamos un núcleo chico; V28 descargaba 28 módulos.
  function warm(reason='intent'){preload(warmSet);cssForSet(warmSet).forEach(loadCssOnce);window.dispatchEvent(new CustomEvent('lutmin:v30:warm',{detail:{reason,count:warmSet.size}}));return Promise.resolve(true);}
  async function loadAll(reason='manual'){return loadSet(new Set(scriptFiles),reason,'full');}

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)||location.protocol==='file:')return false;
    try{
      const reg=await navigator.serviceWorker.register(`./sw.js?v=${VERSION}`,{scope:'./'});
      // V36: el gestor de actualización no bloquea el arranque. Se descarga
      // después de registrar el SW y recibe el registro ya resuelto.
      await loadScriptOnce('assets/js/core/update-manager-v32.js');
      window.dispatchEvent(new CustomEvent('lutmin:v30:sw-registered',{detail:{registration:reg}}));
      reg.update().catch(()=>{});return reg;
    }catch(err){console.warn('[Lutmin V43] Service Worker no disponible:',err?.message||err);return false;}
  }

  function canAdaptivePrefetch(){
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(c?.saveData)return false;
    const type=String(c?.effectiveType||'').toLowerCase();
    return !['slow-2g','2g'].includes(type);
  }
  function prefetchFeature(name){
    if(!canAdaptivePrefetch())return false;
    const set=featureSets[name];if(!set)return false;preload(set);return true;
  }
  const api={version:VERSION,ensureAuthenticated,ensureFeature,ensureFeatureForTab,ensureTalentSection,ensureTalentCvParser,ensureTalentAgentEngine,ensureAdminModule,ensureCompanySection,warm,loadAll,prefetchFeature,status:()=>({...state,loaded:[...state.loaded],bundles:[...state.bundles],loadedScripts:[...state.loaded].filter(x=>x.startsWith('v30-js:')).length,totalScripts:scriptFiles.length,adminBaseScripts:adminBaseSet.size,companyBaseScripts:companyBaseSet.size,adminModuleSets:Object.fromEntries(Object.entries(adminModuleSets).map(([k,v])=>[k,[...v]])),companySectionSets:Object.fromEntries(Object.entries(companySectionSets).map(([k,v])=>[k,[...v]])),talentSectionSets:Object.fromEntries(Object.entries(talentSectionSets).map(([k,v])=>[k,[...v]]))}),files:{css:[...cssFiles],scripts:[...scriptFiles]},registerServiceWorker,clearRuntimeCaches};
  window.LutminV30Modules=api;
  // Alias temporal: el core histórico sigue llamando V29 mientras terminamos de modularizarlo.
  window.LutminV29Modules=api;

  const publicTalent=new URL(location.href).searchParams.get('talento');
  if(publicTalent){const boot=()=>ensureFeature('public-talent');if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',registerServiceWorker,{once:true});else registerServiceWorker();
})();
