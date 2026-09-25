// =============================================================
// LUTMIN V30.0 · UI LIFECYCLE RUNTIME
// Paneles activos, scroll persistente, inert y precarga adaptativa.
// =============================================================
(function(){
  'use strict';
  const VERSION='30.0';
  const S={activeTab:null,changes:0,restores:0,prefetches:0,lastChangeAt:0};
  const scrollMemory=new Map();
  let scroller=null;

  function getScroller(){
    if(scroller&&document.contains(scroller))return scroller;
    scroller=document.querySelector('#campusModal .modal-scroll');
    if(scroller&&!scroller.id)scroller.id='campusMainScrollerV30';
    return scroller;
  }
  function getUser(){try{return typeof currentLutminUser!=='undefined'?currentLutminUser:null;}catch(_){return null;}}
  function key(tab){const role=(getUser()?.role||'guest');return `${role}:${tab||'unknown'}`;}
  function remember(tab){const el=getScroller();if(!el||!tab)return;scrollMemory.set(key(tab),el.scrollTop||0);}
  function restore(tab){const el=getScroller();if(!el||!tab)return;const top=scrollMemory.get(key(tab));if(top==null){el.scrollTop=0;return;}requestAnimationFrame(()=>{el.scrollTop=top;S.restores+=1;});}
  function applyPanelState(tab){
    document.querySelectorAll('.campus-panel').forEach(panel=>{
      const active=panel.dataset.campusPanel===tab;
      panel.setAttribute('aria-hidden',active?'false':'true');
      if('inert' in panel)panel.inert=!active;
      panel.dataset.lutminV30Active=active?'true':'false';
    });
  }
  function emit(tab,previous,source='navigation'){
    S.activeTab=tab;S.changes+=1;S.lastChangeAt=Date.now();
    document.documentElement.dataset.lutminActiveTab=tab||'';
    window.dispatchEvent(new CustomEvent('lutmin:v30:tab-change',{detail:{tab,previous,source}}));
  }
  function detectActive(){return document.querySelector('.campus-panel:not(.hidden)')?.dataset.campusPanel||null;}
  function installTabLifecycle(){
    const base=window.goToCampusTab;if(typeof base!=='function'||base.__lutminV30)return false;
    const wrapped=function(tab){
      const previous=S.activeTab||detectActive();remember(previous);
      const out=base.apply(this,arguments);
      const active=detectActive()||tab;applyPanelState(active);restore(active);emit(active,previous,'goToCampusTab');
      return out;
    };
    wrapped.__lutminV30=true;window.goToCampusTab=wrapped;
    const initial=detectActive();if(initial){S.activeTab=initial;applyPanelState(initial);}
    return true;
  }
  function adaptivePrefetch(){
    const user=getUser();if(!user)return;
    const run=()=>{
      if(document.visibilityState!=='visible')return;
      const modules=window.LutminV30Modules;if(!modules?.prefetchFeature)return;
      if(user.role==='student'&&modules.prefetchFeature('talent'))S.prefetches+=1;
      if(user.role==='company_admin'&&modules.prefetchFeature('companyConecta'))S.prefetches+=1;
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:3500});else setTimeout(run,1800);
  }
  function installVisibilityLifecycle(){
    document.addEventListener('visibilitychange',()=>window.dispatchEvent(new CustomEvent('lutmin:v30:visibility',{detail:{visible:document.visibilityState==='visible'}})));
    window.addEventListener('beforeunload',()=>remember(S.activeTab));
  }
  function install(){installTabLifecycle();installVisibilityLifecycle();adaptivePrefetch();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lutmin:v30:modules-ready',()=>{installTabLifecycle();adaptivePrefetch();});
  window.LutminV30UI={version:VERSION,status:()=>({...S,scrollEntries:scrollMemory.size}),remember,restore,applyPanelState};
})();
