// =============================================================
// LUTMIN · ACTIVE-WORKSPACE MODULE LOADER
// Carga sólo el runtime necesario para cada acceso y deja Conecta
// pesado bajo demanda. Mantiene costo API $0 y fallback completo.
// =============================================================
(function(){
  'use strict';

  const VERSION='56.0';
  const state={status:'idle',promise:null,loaded:new Set(),bundles:new Set(),startedAt:0,finishedAt:0,error:null,retries:0,warmed:false,lastReason:null,lastRole:null};
  const cssFiles=[
    'assets/css/conecta-navigation.css',
    'assets/css/async-core.css',
    'assets/css/video-gate.css',
    'assets/css/workspace-sections.css',
    'assets/css/organizations-onboarding.css',
    'assets/css/conecta-hub.css',
    'assets/css/conecta-panels.css',
    'assets/css/performance.css',
    'assets/css/app-runtime.css',
    'assets/css/control-center.css',
    'assets/css/conecta-agent.css',
    'assets/css/conecta-processes.css'
  ];

  // Orden determinístico: cualquier subconjunto se filtra sobre esta lista.
  const scriptFiles=[
    'assets/js/core/account-services.js',
    'assets/js/core/student-campus.js',
    'assets/js/core/company-portal.js',
    'assets/js/core/talent-center.js',
    'assets/js/core/admin-workspace.js',
    'assets/js/core/admin-data-runtime.js',
    'assets/js/core/admin-module-loader.js',
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
    'assets/js/modules/talent/professional-progression.js',
    'assets/js/modules/talent/professional-passport.js',
    'assets/js/modules/core/workspaces-command.js',
    'assets/js/modules/talent/zero-friction.js',
    'assets/js/modules/talent/conecta-navigation.js',
    'assets/js/core/workspace-sections.js',
    'assets/js/modules/platform/organizations-onboarding.js',
    'assets/js/modules/talent/conecta-hub.js',
    'assets/js/modules/talent/conecta-panels.js',
    'assets/js/core/talent-router.js',
    'assets/js/modules/talent/application-dossier.js',
    'assets/js/modules/talent/application-processes.js',
    'assets/js/modules/talent/cv-tailor-engine.js',
    'assets/js/modules/talent/opportunity-development.js',
    'assets/js/modules/agents/talent-agent.js',
    'assets/js/core/single-flight.js',
    'assets/js/core/app-runtime.js',
    'assets/js/core/async-core.js',
    'assets/js/modules/academy/video-gate.js',
    'assets/js/modules/core/control-center.js',
    'assets/js/modules/core/runtime-health.js',
    'assets/js/modules/core/admin-demand.js',
    'assets/js/core/update-manager.js'
  ];

  const F={
    accountServices:'assets/js/core/account-services.js',
    studentCampus:'assets/js/core/student-campus.js',
    companyPortal:'assets/js/core/company-portal.js',
    talentCenter:'assets/js/core/talent-center.js',
    adminCore:'assets/js/core/admin-workspace.js',
    adminData:'assets/js/core/admin-data-runtime.js',
    adminViews:'assets/js/core/admin-module-loader.js',
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
    progression:'assets/js/modules/talent/professional-progression.js',
    passport:'assets/js/modules/talent/professional-passport.js',
    workspaceCmd:'assets/js/modules/core/workspaces-command.js',
    zero:'assets/js/modules/talent/zero-friction.js',
    conecta:'assets/js/modules/talent/conecta-navigation.js',
    workspaces:'assets/js/core/workspace-sections.js',
    org:'assets/js/modules/platform/organizations-onboarding.js',
    hub:'assets/js/modules/talent/conecta-hub.js',
    panels:'assets/js/modules/talent/conecta-panels.js',
    talentRouter:'assets/js/core/talent-router.js',
    dossier:'assets/js/modules/talent/application-dossier.js',
    processes:'assets/js/modules/talent/application-processes.js',
    tailor:'assets/js/modules/talent/cv-tailor-engine.js',
    opportunityDevelopment:'assets/js/modules/talent/opportunity-development.js',
    talentAgent:'assets/js/modules/agents/talent-agent.js',
    perf:'assets/js/core/single-flight.js',
    runtime:'assets/js/core/app-runtime.js',
    core:'assets/js/core/async-core.js',
    video:'assets/js/modules/academy/video-gate.js',
    control:'assets/js/modules/core/control-center.js',
    health:'assets/js/modules/core/runtime-health.js',
    adminDemand:'assets/js/modules/core/admin-demand.js'
  };

  const adminBaseSet=new Set([F.accountServices,F.adminCore,F.adminData,F.adminViews,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core,F.adminDemand]);
  const companyBaseSet=new Set([F.accountServices,F.companyPortal,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]);
  const studentBaseSet=new Set([F.accountServices,F.studentCampus,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core,F.video]);
  const roleSets={
    // V40: Alumno arranca con el flujo crítico. Rutas/vigencias se hidratan en idle,
    // Actividades y soporte se descargan sólo al abrirlos.
    student:studentBaseSet,
    company_admin:companyBaseSet,
    instructor:new Set([F.accountServices,F.teacher,F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]),
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
    talent:new Set([F.talentCenter,F.hub,F.talentRouter]),
    companyConecta:new Set([F.talentCenter,F.super,F.pre,F.org]),
    publicTalent:new Set([F.super,F.evidence]),
    studentEnhancements:new Set([F.lp,F.comp,F.compliance]),
    activities:new Set([F.teacher]),
    support:new Set([F.ux])
  };
  const talentSectionSets={
    summary:new Set([F.hub,F.talentRouter]),
    profile:new Set([F.super,F.intel,F.cv,F.zero]),
    jobs:new Set([F.intel,F.super]),
    applications:new Set([F.dossier,F.processes]),
    interviews:new Set([F.super,F.pre]),
    organizations:new Set([F.org]),
    career:new Set([F.super,F.intel,F.evidence,F.dossier,F.progression]),
    timeline:new Set([F.org]),
    saved:new Set(),
    agent:new Set([F.dossier,F.talentAgent]),
    passport:new Set([F.super,F.auto,F.evidence,F.dossier,F.passport])
  };
  const adminModuleSets={
    overview:new Set(),
    operations:new Set([F.ops]),
    academic:new Set([F.lp,F.ops,F.comp,F.compliance]),
    people:new Set([F.comp,F.compliance]),
    companies:new Set([F.dev,F.org]),
    commercial:new Set([F.super,F.pre]),
    finance:new Set(),
    talent:new Set([F.talentCenter,F.dev,F.super,F.pre,F.intel,F.cv,F.evidence,F.zero,F.org]),
    communications:new Set([F.ux]),
    system:new Set([F.qa,F.ux,F.control,F.health]),
    development:new Set([F.dev,F.super,F.comp,F.evidence]),
    agents:new Set([F.auto,F.autoCompany,F.control,F.dev])
  };
  const warmSet=new Set([F.workspaceCmd,F.workspaces,F.perf,F.runtime,F.core]);

  const cssByScript=new Map([
    [F.conecta,['assets/css/conecta-navigation.css']],
    [F.core,['assets/css/async-core.css']],
    [F.video,['assets/css/video-gate.css']],
    [F.workspaces,['assets/css/workspace-sections.css']],
    [F.org,['assets/css/organizations-onboarding.css']],
    [F.hub,['assets/css/conecta-hub.css']],
    [F.panels,['assets/css/conecta-panels.css']],
    [F.perf,['assets/css/performance.css']],
    [F.runtime,['assets/css/app-runtime.css']],
    [F.control,['assets/css/control-center.css']],
    [F.talentRouter,['assets/css/conecta-navigation.css']],
    [F.talentAgent,['assets/css/conecta-agent.css']],
    [F.processes,['assets/css/conecta-processes.css']]
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
    return new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=withVersion(file);link.dataset.lutminV30='css';let settled=false;const done=()=>{if(settled)return;settled=true;state.loaded.add(key);resolve(true);};link.onload=done;link.onerror=()=>{console.warn('[Lutmin V56] CSS no disponible:',file);done();};document.head.appendChild(link);setTimeout(done,4500);});
  }

  function preload(files,limit=2){
    state.warmed=true;
    // V56: un warm especulativo sigue limitado, pero cuando el bundle YA fue pedido
    // prepriorizamos todos sus archivos. Así la red descarga en paralelo mientras
    // la ejecución conserva el orden determinístico de loadScriptOnce().
    const list=ordered(new Set(files));
    const take=Number.isFinite(limit)?Math.max(0,limit):list.length;
    list.slice(0,take).forEach(file=>{if(document.head.querySelector(`link[data-lutmin-v30-preload="${file}"]`))return;const link=document.createElement('link');link.rel='preload';link.as='script';link.href=withVersion(file);link.dataset.lutminV30Preload=file;document.head.appendChild(link);});
  }
  function clearPreloads(files=null){
    const wanted=files?new Set(files):null;
    document.head.querySelectorAll('link[data-lutmin-v30-preload]').forEach(x=>{
      if(!wanted||wanted.has(x.dataset.lutminV30Preload))x.remove();
    });
  }

  function prefetchLow(files,limit=Infinity){
    if(!canAdaptivePrefetch())return false;
    const list=ordered(new Set(files)).filter(file=>!state.loaded.has(`v30-js:${file}`));
    list.slice(0,Number.isFinite(limit)?Math.max(0,limit):list.length).forEach(file=>{
      if(document.head.querySelector(`link[data-lutmin-v56-prefetch="${file}"]`))return;
      const link=document.createElement('link');link.rel='prefetch';link.as='script';link.href=withVersion(file);link.dataset.lutminV56Prefetch=file;document.head.appendChild(link);
    });
    return true;
  }

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
    // La ejecución sigue serializada para conservar el orden de los módulos legacy,
    // pero la DESCARGA del siguiente bundle empieza inmediatamente. En V54/V56 un
    // segundo clic esperaba a que terminara el bundle anterior antes incluso de pedir
    // sus archivos, haciendo que navegar rápido se sintiera bloqueado.
    const speculative=ordered(set).filter(file=>!state.loaded.has(`v30-js:${file}`));
    if(speculative.length)preload(speculative,speculative.length);

    // Más de una navegación puede quedar esperando el mismo lote. Revalidamos en bucle:
    // el primer waiter toma el lock; los demás ven el nuevo state.promise y esperan.
    while(state.promise)await state.promise;
    const files=ordered(set).filter(file=>!state.loaded.has(`v30-js:${file}`));
    if(!files.length){state.bundles.add(bundleName);clearPreloads(speculative);return true;}
    state.status='loading';state.startedAt=performance.now();state.error=null;state.lastReason=reason;document.documentElement.dataset.lutminModules='loading';setBootBar('loading');
    state.promise=withLateDomReadyCompatibility(async()=>{
      await Promise.all(cssForSet(set).map(loadCssOnce));
      for(const file of files)await loadScriptOnce(file);
      state.bundles.add(bundleName);state.status='ready';state.finishedAt=performance.now();document.documentElement.dataset.lutminModules='ready';setBootBar('ready');clearPreloads(files);
      window.dispatchEvent(new CustomEvent('lutmin:v30:modules-ready',{detail:{reason,bundle:bundleName,duration_ms:Math.round(state.finishedAt-state.startedAt),loaded_now:files.length,loaded_total:[...state.loaded].filter(x=>x.startsWith('v30-js:')).length,total_available:scriptFiles.length,retries:state.retries}}));return true;
    }).catch(err=>{state.status='error';state.error=String(err?.message||err);document.documentElement.dataset.lutminModules='error';setBootBar('error');clearPreloads(files);window.dispatchEvent(new CustomEvent('lutmin:v30:modules-error',{detail:{reason,bundle:bundleName,error:state.error}}));console.error('[Lutmin V56] Error cargando módulos:',err);return false;}).finally(()=>{state.promise=null;});
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
    if(ok&&role==='admin')await window.LutminAdminViews?.ensureActive?.();
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
    return loadSet(new Set([F.tailor,F.opportunityDevelopment]),'talent:agent-engine','talent:agent-engine');
  }
  async function ensureFeatureForTab(tab,role){
    if(tab==='talent'&&role==='student')return ensureFeature('talent',{role});
    if(tab==='company-conecta'&&role==='company_admin')return ensureFeature('company-conecta',{role});
    // Rutas, encuestas, competencias y vigencias pesan ~100 KB. No forman parte
    // del arranque del Alumno: se ejecutan cuando Cursos/Certificados las necesitan.
    if((tab==='courses'||tab==='certificates')&&role==='student')return ensureFeature('student-enhancements',{role});
    if(tab==='activities'&&role==='student')return ensureFeature('activities',{role});
    if(tab==='support')return ensureFeature('support',{role});
    if(tab==='admin'&&role==='admin')return ensureAdminModule((document.getElementById('adminModuleHostV32')?.dataset?.adminModuleV32)||localStorage.getItem('lutmin-admin-module-v19')||'overview');
    return true;
  }

  // Antes del login sólo calentamos un núcleo chico; V28 descargaba 28 módulos.
  function warm(reason='intent'){preload(warmSet,2);cssForSet(warmSet).forEach(loadCssOnce);window.dispatchEvent(new CustomEvent('lutmin:v30:warm',{detail:{reason,count:warmSet.size}}));return Promise.resolve(true);}
  function warmAccess(role='student'){
    const set=setForAccess(role,{});
    // Sólo precarga: no ejecuta runtimes ni toca el DOM autenticado.
    preload(set,set.size);
    cssForSet(set).forEach(loadCssOnce);
    window.dispatchEvent(new CustomEvent('lutmin:v56:access-warm',{detail:{role,count:set.size}}));
    return Promise.resolve(true);
  }
  function idleWarmStudent(){
    // Sólo descarga con prioridad baja. No ejecuta nada ni dispara consultas.
    prefetchLow(union(featureSets.talent,new Set([F.lp])),8);
    return true;
  }
  async function loadAll(reason='manual'){return loadSet(new Set(scriptFiles),reason,'full');}

  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)||location.protocol==='file:')return false;
    try{
      const reg=await navigator.serviceWorker.register(`./sw.js?v=${VERSION}`,{scope:'./'});
      // V36: el gestor de actualización no bloquea el arranque. Se descarga
      // después de registrar el SW y recibe el registro ya resuelto.
      await loadScriptOnce('assets/js/core/update-manager.js');
      window.dispatchEvent(new CustomEvent('lutmin:v30:sw-registered',{detail:{registration:reg}}));
      return reg;
    }catch(err){console.warn('[Lutmin V56] Service Worker no disponible:',err?.message||err);return false;}
  }

  function canAdaptivePrefetch(){
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(c?.saveData)return false;
    const type=String(c?.effectiveType||'').toLowerCase();
    return !['slow-2g','2g'].includes(type);
  }
  function prefetchFeature(name){
    if(!canAdaptivePrefetch())return false;
    const set=featureSets[name];if(!set)return false;preload(set,set.size);cssForSet(set).forEach(loadCssOnce);return true;
  }
  function prefetchFeatureForTab(tab,role){
    if(!canAdaptivePrefetch())return false;
    let set=null;
    if(tab==='talent'&&role==='student')set=featureSets.talent;
    else if(tab==='company-conecta'&&role==='company_admin')set=featureSets.companyConecta;
    else if((tab==='courses'||tab==='certificates')&&role==='student')set=featureSets.studentEnhancements;
    else if(tab==='activities'&&role==='student')set=featureSets.activities;
    else if(tab==='support')set=featureSets.support;
    else if(tab==='admin'&&role==='admin')set=union(adminBaseSet,adminModuleSets[(document.getElementById('adminModuleHostV32')?.dataset?.adminModuleV32)||localStorage.getItem('lutmin-admin-module-v19')||'overview']);
    if(!set)return false;preload(set,set.size);cssForSet(set).forEach(loadCssOnce);return true;
  }
  function prefetchTalentSection(section='summary'){
    if(!canAdaptivePrefetch())return false;
    const set=union(featureSets.talent,talentSectionSets[section]||new Set());
    preload(set,set.size);cssForSet(set).forEach(loadCssOnce);return true;
  }
  const api={version:VERSION,ensureAuthenticated,ensureFeature,ensureFeatureForTab,ensureTalentSection,ensureTalentCvParser,ensureTalentAgentEngine,ensureAdminModule,ensureCompanySection,warm,warmAccess,idleWarmStudent,loadAll,prefetchFeature,prefetchFeatureForTab,prefetchTalentSection,status:()=>({...state,loaded:[...state.loaded],bundles:[...state.bundles],loadedScripts:[...state.loaded].filter(x=>x.startsWith('v30-js:')).length,totalScripts:scriptFiles.length,adminBaseScripts:adminBaseSet.size,companyBaseScripts:companyBaseSet.size,adminModuleSets:Object.fromEntries(Object.entries(adminModuleSets).map(([k,v])=>[k,[...v]])),companySectionSets:Object.fromEntries(Object.entries(companySectionSets).map(([k,v])=>[k,[...v]])),talentSectionSets:Object.fromEntries(Object.entries(talentSectionSets).map(([k,v])=>[k,[...v]]))}),files:{css:[...cssFiles],scripts:[...scriptFiles]},registerServiceWorker,clearRuntimeCaches};
  window.LutminModules=api;
  window.LutminV30Modules=api;
  // Alias de compatibilidad para extensiones históricas todavía desplegadas.
  window.LutminV29Modules=api;

  const publicTalent=new URL(location.href).searchParams.get('talento');
  if(publicTalent){const boot=()=>ensureFeature('public-talent');if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}
  // El Service Worker no forma parte del primer render ni del login. Registrarlo en
  // DOMContentLoaded competía por red/CPU con Acceso Alumno en conexiones normales.
  const scheduleServiceWorker=()=>{
    const run=()=>registerServiceWorker();
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:5000});else setTimeout(run,2400);
  };
  if(document.readyState==='complete')scheduleServiceWorker();else window.addEventListener('load',scheduleServiceWorker,{once:true});
})();
