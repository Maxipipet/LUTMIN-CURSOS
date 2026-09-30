// =========================================================
// LUTMIN V45.0 · CONECTA STUDENT ROUTER
// Un único router para módulos superiores. Evita wrappers legacy
// que competían entre sí y deja cada runtime bajo demanda.
// =========================================================
(function(){
  'use strict';
  const KEYS=new Set(['summary','profile','jobs','applications','interviews','organizations','career','timeline','saved','agent','passport']);
  let active='summary';
  let seq=0;

  function normalize(key){return KEYS.has(key)?key:'summary';}
  function setActive(key){
    key=normalize(key);active=key;
    document.querySelectorAll('[data-talent-module-panel]').forEach(panel=>{
      panel.classList.toggle('hidden',panel.dataset.talentModulePanel!==key);
    });
    document.querySelectorAll('[data-talent-module-key]').forEach(btn=>{
      const on=btn.dataset.talentModuleKey===key;
      btn.setAttribute('aria-current',on?'page':'false');
      btn.setAttribute('aria-selected',on?'true':'false');
      btn.dataset.lutminActive=on?'true':'false';
      btn.tabIndex=on?0:-1;
    });
    try{sessionStorage.setItem('lutmin-talent-module-v38',key)}catch(_){ }
    window.dispatchEvent(new CustomEvent('lutmin:navigation-change',{detail:{scope:'talent',key}}));
    return key;
  }

  async function prepare(key){
    key=normalize(key);
    const ok=await window.LutminV30Modules?.ensureTalentSection?.(key);
    if(ok===false)throw new Error('No pude preparar el módulo de Conecta.');

    if(key==='summary'){
      try{ensureConectaHubV210?.();renderConectaSummaryV210?.();}catch(_){ }
    }
    if(key==='profile'){
      try{ensureV140StudentUI?.();await loadV140ProfileData?.();}catch(e){console.warn('V44 profile',e);}
    }
    if(key==='jobs'){
      try{ensureV140StudentUI?.();await loadV140ProfileData?.();renderOpportunityRadarV140?.();}catch(e){console.warn('V44 jobs',e);}
    }
    if(key==='applications'){
      try{await loadTalentSnapshotsV100?.();enhanceTalentApplicationsV100?.();}catch(e){console.warn('V44 applications',e);}
    }
    if(key==='interviews'){
      try{await loadTalentPreInterviewsV130?.();}catch(e){console.warn('V44 interviews',e);}
    }
    if(key==='organizations'){
      try{ensureOrganizationsUi?.();await loadOrganizationsV200?.();}catch(e){console.warn('V44 organizations',e);}
    }
    if(key==='timeline'){
      try{ensureTimelineUi?.();await loadCareerTimelineV200?.();}catch(e){console.warn('V44 timeline',e);}
    }
    if(key==='career'){
      try{ensureV140StudentUI?.();ensureStudentEngineV150?.();await loadV140ProfileData?.();await loadV150StudentData?.();}catch(e){console.warn('V44 career',e);}
    }
    if(key==='agent'){
      try{ensureTalentAgentV40?.();refreshTalentAgentV40?.();}catch(e){console.warn('V44 agent',e);}
    }
    if(key==='passport'){
      try{ensurePersonalAutopilotV110?.();await loadPersonalAutopilotV110?.();setPersonalAgentTabV110?.('passport');}catch(e){console.warn('V44 passport',e);}
    }
  }

  async function open(key,{skipLoad=false}={}){
    if(currentLutminUser?.role!=='student')return false;
    key=normalize(key);const my=++seq;
    try{
      goToCampusTab?.('talent');
      // Los datos base se deduplican por TTL. No hacemos writes al entrar.
      if(!skipLoad&&typeof loadTalentCenter==='function'){
        if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent',()=>loadTalentCenter(),{ttl:18000});
        else await loadTalentCenter();
      }
      await prepare(key);
      if(my!==seq)return false;
      setActive(key);
      if(key==='summary')try{renderConectaSummaryV210?.();}catch(_){ }
      return true;
    }catch(e){
      console.error('[Lutmin V45] Conecta navigation',e);
      showToast?.('No pude abrir este módulo. Actualizá la vista e intentá nuevamente.');
      return false;
    }
  }

  window.setTalentModuleV342=setActive; // compatibilidad V18/V20
  window.openTalentModuleV38=(key)=>open(key);
  window.openTalentModuleV37=(key)=>open(key);
  window.openConectaModuleV210=(key)=>open(key);
  window.openConectaSectionV182=(key)=>open(key);
  window.openConectaV200=(key)=>open(key);

  function init(){
    if(currentLutminUser?.role!=='student')return;
    let saved='summary';
    try{saved=sessionStorage.getItem('lutmin-talent-module-v38')||sessionStorage.getItem('lutmin-talent-module-v37')||sessionStorage.getItem('lutmin-talent-module-v342')||'summary'}catch(_){ }
    setActive(saved);
  }

  // Delegación única: evita depender de onclicks redefinidos por módulos legacy.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-talent-module-key]');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();
    open(btn.dataset.talentModuleKey);
  },true);

  window.addEventListener('lutmin:v32:view-ready',e=>{if(e?.detail?.view==='talent')setTimeout(init,0)});
  window.addEventListener('lutmin:v30:modules-ready',()=>setTimeout(init,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
