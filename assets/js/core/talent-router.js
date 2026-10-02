// =========================================================
// LUTMIN · CONECTA STUDENT ROUTER
// Un único router para módulos superiores. Evita wrappers legacy
// que competían entre sí y deja cada runtime bajo demanda.
// =========================================================
(function(){
  'use strict';
  const KEYS=new Set(['summary','profile','jobs','applications','interviews','organizations','career','timeline','saved','agent','passport']);
  let active='summary';
  let seq=0;

  function normalize(key){return KEYS.has(key)?key:'summary';}
  const cached=(key,loader,ttl=45000)=>window.LutminData?.load?window.LutminData.load(`talent:${key}`,loader,{ttl}):loader();
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
    const ok=await window.LutminModules?.ensureTalentSection?.(key);
    if(ok===false)throw new Error('No pude preparar el módulo de Conecta.');

    if(key==='summary'){
      try{ensureConectaHubV210?.();renderConectaSummaryV210?.();}catch(_){ }
    }
    if(key==='profile'){
      try{ensureV140StudentUI?.();await cached('profile-data',()=>loadV140ProfileData?.(),45000);}catch(e){console.warn('V44 profile',e);}
    }
    if(key==='jobs'){
      try{ensureV140StudentUI?.();await cached('profile-data',()=>loadV140ProfileData?.(),45000);renderOpportunityRadarV140?.();}catch(e){console.warn('V44 jobs',e);}
    }
    if(key==='applications'){
      try{window.LutminProcessesV46?.render?.();}catch(e){console.warn('V46 processes',e);}
    }
    if(key==='interviews'){
      try{await cached('interviews',()=>loadTalentPreInterviewsV130?.(),30000);}catch(e){console.warn('V44 interviews',e);}
    }
    if(key==='organizations'){
      try{ensureOrganizationsUi?.();await cached('organizations',()=>loadOrganizationsV200?.(),60000);}catch(e){console.warn('V44 organizations',e);}
    }
    if(key==='timeline'){
      try{ensureTimelineUi?.();await cached('timeline',()=>loadCareerTimelineV200?.(),60000);}catch(e){console.warn('V44 timeline',e);}
    }
    if(key==='career'){
      try{ensureV140StudentUI?.();ensureStudentEngineV150?.();await Promise.all([cached('profile-data',()=>loadV140ProfileData?.(),45000),cached('career-evidence',()=>loadV150StudentData?.(),45000)]);window.LutminProgressionV49?.render?.();}catch(e){console.warn('V49 career',e);}
    }
    if(key==='agent'){
      try{ensureTalentAgentV40?.();refreshTalentAgentV40?.();}catch(e){console.warn('V44 agent',e);}
    }
    if(key==='passport'){
      try{ensurePersonalAutopilotV110?.();await cached('passport',()=>loadPersonalAutopilotV110?.(),45000);setPersonalAgentTabV110?.('passport');window.LutminPassportV50?.render?.();}catch(e){console.warn('V50 passport',e);window.LutminPassportV50?.render?.();}
    }
  }

  // Los runtimes de cada módulo se precargan por intención (hover/foco), no todos
  // juntos al entrar a Conecta. Así el módulo activo conserva prioridad de red.


  async function open(key,{skipLoad=false}={}){
    if(currentLutminUser?.role!=='student')return false;
    key=normalize(key);const my=++seq;
    goToCampusTab?.('talent');
    // Cambiamos de módulo antes de esperar red o runtimes. El contenido ya cargado
    // aparece instantáneamente y lo faltante se completa detrás.
    setActive(key);
    const panel=document.querySelector(`[data-talent-module-panel="${key}"]`);
    panel?.setAttribute('aria-busy','true');
    try{
      const jobs=[];
      if(!skipLoad&&typeof loadTalentCenter==='function'&&!window.LutminData?.fresh?.('talent',30000)){
        jobs.push(window.LutminData?.load?window.LutminData.load('talent',()=>window.LutminTalentCenterBase?.load?window.LutminTalentCenterBase.load():loadTalentCenter(),{ttl:30000}):(window.LutminTalentCenterBase?.load?window.LutminTalentCenterBase.load():loadTalentCenter()));
      }
      jobs.push(prepare(key));
      await Promise.all(jobs);
      if(my!==seq)return false;
      if(key==='summary')try{renderConectaSummaryV210?.();}catch(_){ }
      return true;
    }catch(e){
      console.error('[Lutmin V56] Conecta navigation',e);
      showToast?.('No pude terminar de cargar este módulo. Intentá nuevamente.');
      return false;
    }finally{panel?.removeAttribute('aria-busy');}
  }

  window.LutminTalentRouter={open,setActive,get active(){return active;}};
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

  // Delegación única + precarga por intención: hover/foco descarga el runtime
  // antes del clic, sin ejecutar todavía módulos que el usuario no abrió.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-talent-module-key]');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();
    open(btn.dataset.talentModuleKey);
  },true);
  const prewarm=e=>{const btn=e.target.closest?.('[data-talent-module-key]');if(!btn)return;window.LutminModules?.prefetchTalentSection?.(btn.dataset.talentModuleKey);};
  document.addEventListener('pointerover',prewarm,{passive:true});
  document.addEventListener('focusin',prewarm);

  window.addEventListener('lutmin:v32:view-ready',e=>{if(e?.detail?.view==='talent')setTimeout(init,0)});
  window.addEventListener('lutmin:v30:modules-ready',()=>setTimeout(init,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
