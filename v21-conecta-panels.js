(()=>{
  // =========================================================
  // LUTMIN V21.2 · CONECTA ESTABLE POR PANELES
  // No reubica nodos. Solo controla visibilidad del contenido
  // existente, igual que Administración.
  // =========================================================
  const KEYS=['summary','profile','jobs','applications','interviews','organizations','saved','agent','career','timeline','passport'];
  const S={active:'summary',busy:false,observer:null};
  const legacyOpenSection=window.openConectaSectionV182;
  const legacyOpenV200=window.openConectaV200;

  function panel(){return document.querySelector('section[data-campus-panel="talent"]');}
  function directChild(el){
    const p=panel(); if(!el||!p)return null;
    let n=el; while(n&&n.parentElement!==p)n=n.parentElement;
    return n&&n.parentElement===p?n:null;
  }
  function uniq(arr){return [...new Set(arr.filter(Boolean))];}

  function ensureModules(){
    // V22: núcleo liviano. Los módulos pesados se crean recién al abrirlos.
    try{if(typeof ensureV140StudentUI==='function')ensureV140StudentUI();}catch(_){ }
  }

  function roots(){
    const jobs=document.getElementById('conectaJobsV182');
    const apps=document.getElementById('conectaApplicationsV182');
    const jobsAppsWrap=jobs?.parentElement===apps?.parentElement?jobs?.parentElement:null;
    return {
      summary:uniq([document.getElementById('conectaSummaryV210')]),
      profile:uniq([
        document.getElementById('conectaProfileV182'),
        directChild(document.getElementById('talentProfileStrength')),
        directChild(document.getElementById('talentProfileMissing')),
        directChild(document.getElementById('talentApprovalCard')),
        directChild(document.getElementById('talentProfileForm')),
        directChild(document.getElementById('talentCvAgentV140')),
        directChild(document.getElementById('talentDocumentAgentV150'))
      ]),
      jobs:uniq([jobsAppsWrap,directChild(document.getElementById('talentOpportunityRadarV140'))]),
      applications:uniq([jobsAppsWrap]),
      interviews:uniq([directChild(document.getElementById('conectaInterviewsV182'))]),
      organizations:uniq([directChild(document.getElementById('conectaOrganizationsV200'))]),
      saved:uniq([directChild(document.getElementById('conectaSavedV182'))]),
      agent:uniq([directChild(document.getElementById('talentAgentV100'))]),
      career:uniq([
        directChild(document.getElementById('talentEvidenceV140')),
        directChild(document.getElementById('talentEvidenceCareerV150'))
      ]),
      timeline:uniq([directChild(document.getElementById('conectaTimelineV200'))]),
      passport:uniq([directChild(document.getElementById('personalAutopilotV110'))])
    };
  }

  function allManaged(r){return uniq(KEYS.flatMap(k=>r[k]||[]));}

  function setActiveButton(key){
    document.querySelectorAll('[data-v210-module]').forEach(btn=>btn.classList.toggle('active',btn.dataset.v210Module===key));
    try{localStorage.setItem('lutmin-v212-conecta-active',key);}catch(_){ }
  }

  function applyVisibility(key=S.active){
    if(!KEYS.includes(key))key='summary';
    const p=panel(); if(!p)return;
    ensureModules();
    const r=roots();
    allManaged(r).forEach(el=>{el.classList.add('v212-conecta-off');el.classList.remove('v212-conecta-visible');});

    // Oportunidades y postulaciones comparten una grilla heredada.
    const jobs=document.getElementById('conectaJobsV182');
    const apps=document.getElementById('conectaApplicationsV182');
    const shared=jobs&&apps&&jobs.parentElement===apps.parentElement?jobs.parentElement:null;
    if(shared){
      shared.classList.toggle('v212-conecta-single-grid',key==='jobs'||key==='applications');
      if(key==='jobs'){jobs.classList.remove('hidden','v212-conecta-off');apps.classList.add('v212-conecta-off');}
      else if(key==='applications'){apps.classList.remove('hidden','v212-conecta-off');jobs.classList.add('v212-conecta-off');}
      else{jobs.classList.remove('v212-conecta-off');apps.classList.remove('v212-conecta-off');}
    }

    (r[key]||[]).forEach(el=>{el.classList.remove('v212-conecta-off');el.classList.add('v212-conecta-visible');});
    S.active=key;setActiveButton(key);
  }

  async function prepare(key){
    try{
      if(key==='organizations'){
        if(typeof ensureOrganizationsUi==='function')ensureOrganizationsUi();
        if(typeof loadOrganizationsV200==='function')await loadOrganizationsV200();
      }
      if(key==='timeline'){
        if(typeof ensureTimelineUi==='function')ensureTimelineUi();
        if(typeof loadCareerTimelineV200==='function')await loadCareerTimelineV200();
      }
      if(key==='agent'){
        if(typeof ensureTalentAgentV100==='function')ensureTalentAgentV100();
        if(typeof refreshTalentAgentOptionsV100==='function')refreshTalentAgentOptionsV100();
      }
      if(key==='career'){
        if(typeof ensureV140StudentUI==='function')ensureV140StudentUI();
        if(typeof ensureStudentEngineV150==='function')ensureStudentEngineV150();
        if(typeof loadV140ProfileData==='function')await loadV140ProfileData();
        if(typeof loadV150StudentData==='function')await loadV150StudentData();
      }
      if(key==='passport'){
        if(typeof ensurePersonalAutopilotV110==='function')ensurePersonalAutopilotV110();
        if(typeof loadPersonalAutopilotV110==='function')await loadPersonalAutopilotV110();
        if(typeof setPersonalAgentTabV110==='function')setPersonalAgentTabV110('passport');
      }
      if(key==='profile'&&typeof loadV140ProfileData==='function')await loadV140ProfileData();
    }catch(e){console.warn('V21.2 Conecta prepare',key,e);}
  }

  window.openConectaModuleV210=async function(key){
    if(currentLutminUser?.role!=='student')return;
    if(!KEYS.includes(key))key='summary';
    if(S.busy)return; S.busy=true;
    try{
      if(typeof goToCampusTab==='function')goToCampusTab('talent');
      try{if(typeof ensureConectaHubV210==='function')ensureConectaHubV210();}catch(_){ }
      await prepare(key);
      applyVisibility(key);
      if(key==='summary'&&typeof renderConectaSummaryV210==='function')renderConectaSummaryV210();
      // Sin scroll automático: el contenido cambia debajo del selector.
    }finally{S.busy=false;}
  };

  // Cualquier llamada vieja de Conecta usa la navegación nueva.
  window.openConectaSectionV182=async function(key){
    if(currentLutminUser?.role==='student'&&KEYS.includes(key))return window.openConectaModuleV210(key);
    return typeof legacyOpenSection==='function'?legacyOpenSection.apply(this,arguments):undefined;
  };
  window.openConectaV200=async function(key){
    if(currentLutminUser?.role==='student'&&(key==='organizations'||key==='timeline'))return window.openConectaModuleV210(key);
    return typeof legacyOpenV200==='function'?legacyOpenV200.apply(this,arguments):undefined;
  };

  function install(){
    if(currentLutminUser?.role!=='student')return;
    try{if(typeof ensureConectaHubV210==='function')ensureConectaHubV210();}catch(_){ }
    ensureModules();
    applyVisibility('summary');
    try{if(typeof renderConectaSummaryV210==='function')renderConectaSummaryV210();}catch(_){ }
    const p=panel();
    if(p&&!S.observer){
      let timer=null;
      S.observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>applyVisibility(S.active),20);});
      S.observer.observe(p,{childList:true});
    }
  }

  if(typeof loadTalentCenter==='function'){
    const oldLoad=loadTalentCenter;
    window.loadTalentCenter=async function(){const r=await oldLoad.apply(this,arguments);setTimeout(()=>{applyVisibility(S.active);if(S.active==='summary'&&typeof renderConectaSummaryV210==='function')renderConectaSummaryV210();},30);return r;};
  }
  if(typeof renderTalentCenter==='function'){
    const oldRender=renderTalentCenter;
    window.renderTalentCenter=function(){const r=oldRender.apply(this,arguments);setTimeout(()=>applyVisibility(S.active),20);return r;};
  }
  if(typeof paintCurrentLutminUser==='function'){
    const oldPaint=paintCurrentLutminUser;
    window.paintCurrentLutminUser=function(){const r=oldPaint.apply(this,arguments);setTimeout(install,180);return r;};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1300));else setTimeout(install,1300);
})();
