// =========================================================
// LUTMIN V37.0 LEGACY · CONECTA STUDENT MODULE NAV
// Un acceso en sidebar; módulos internos arriba; un panel activo.
// =========================================================
(function(){
  'use strict';
  const targetMapV342={
    summary:'conectaHubV210',profile:'talentProfilePanelV342',jobs:'conectaJobsV182',applications:'conectaApplicationsV182',
    interviews:'conectaInterviewsV182',agent:'talentAgentV100',career:'talentEvidenceCareerV150',
    saved:'conectaSavedV182',organizations:'conectaOrganizationsV200',timeline:'conectaTimelineV200',passport:'personalAutopilotV110'
  };
  let activeConectaV342='summary';
  let navBusyV342=false;

  function setTalentModuleV342(key){
    const valid=document.querySelector(`[data-talent-module-panel="${key}"]`)?key:'summary';
    activeConectaV342=valid;
    document.querySelectorAll('[data-talent-module-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.talentModulePanel!==valid));
    document.querySelectorAll('[data-talent-module-key]').forEach(btn=>{
      const on=btn.dataset.talentModuleKey===valid;
      btn.setAttribute('aria-current',on?'page':'false');
      btn.setAttribute('aria-selected',on?'true':'false');
      btn.dataset.lutminActive=on?'true':'false';
      btn.tabIndex=on?0:-1;
    });
    try{sessionStorage.setItem('lutmin-talent-module-v342',valid)}catch(_){ }
    window.dispatchEvent(new CustomEvent('lutmin:navigation-change',{detail:{scope:'talent',key:valid}}));
    return valid;
  }
  window.setTalentModuleV342=setTalentModuleV342;

  async function prepareConectaDynamicV342(key){
    if(key==='agent' && typeof ensureTalentAgentV100==='function'){
      ensureTalentAgentV100();
      if(typeof refreshTalentAgentOptionsV100==='function')refreshTalentAgentOptionsV100();
    }
    if(key==='career' && typeof ensureStudentEngineV150==='function'){
      ensureStudentEngineV150();
      if(typeof loadV150StudentData==='function'){
        try{if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent:career',()=>loadV150StudentData(),{ttl:20000});else await loadV150StudentData();}catch(_){ }
      }
    }
  }

  window.openConectaSectionV182=async function(key){
    if(navBusyV342||currentLutminUser?.role!=='student')return;
    navBusyV342=true;
    try{
      if(typeof goToCampusTab==='function')goToCampusTab('talent');
      if(typeof loadTalentCenter==='function'){
        try{if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent',()=>loadTalentCenter(),{ttl:18000});else await loadTalentCenter();}catch(_){ }
      }
      await prepareConectaDynamicV342(key);
      setTalentModuleV342(key);
    }finally{navBusyV342=false;}
  };

  function initTalentModulesV342(){
    if(currentLutminUser?.role!=='student')return;
    let saved='summary';try{saved=sessionStorage.getItem('lutmin-talent-module-v342')||'summary'}catch(_){ }
    // Al entrar a Conecta se conserva el último módulo si todavía existe.
    setTalentModuleV342(saved);
  }

  window.addEventListener('lutmin:v32:view-ready',e=>{if(e?.detail?.view==='talent')setTimeout(initTalentModulesV342,0)});
  window.addEventListener('lutmin:v30:modules-ready',()=>setTimeout(initTalentModulesV342,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initTalentModulesV342,{once:true});else initTalentModulesV342();
})();
