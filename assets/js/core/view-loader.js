// =============================================================
// LUTMIN · HTML VIEW LOADER
// Separa los paneles pesados del index y monta sólo el workspace usado.
// =============================================================
(function(){
  'use strict';
  const VERSION='54.0';
  const paths={
    talent:'assets/views/talent.html',
    'company-conecta':'assets/views/company-conecta.html',
    company:'assets/views/company.html',
    instructor:'assets/views/instructor.html',
    admin:'assets/views/admin.html'
  };
  const state=new Map();
  const roleView={admin:'admin',company_admin:'company',instructor:'instructor'};
  function panel(name){return document.querySelector(`[data-campus-panel="${name}"]`);}
  function loaded(name){return state.get(name)?.status==='ready'||panel(name)?.dataset.lutminViewState==='ready';}
  function url(name){const p=paths[name];return p?`${p}?v=${encodeURIComponent(VERSION)}`:null;}
  async function fetchView(name){
    const src=url(name);if(!src)return true;
    if(!panel(name)){const shellReady=await window.LutminAppShell?.ensureCampus?.();if(shellReady===false)return false;}
    const target=panel(name);if(!target)return false;if(loaded(name))return true;
    const existing=state.get(name);if(existing?.promise)return existing.promise;
    target.dataset.lutminViewState='loading';
    const promise=(async()=>{
      try{
        const res=await fetch(src,{credentials:'same-origin',cache:'force-cache'});if(!res.ok)throw new Error(`HTTP ${res.status}`);
        const html=await res.text();if(!html.trim())throw new Error('Vista vacía');
        target.innerHTML=html;target.dataset.lutminViewState='ready';state.set(name,{status:'ready',promise:null,bytes:new Blob([html]).size,loadedAt:Date.now()});
        // Los bindings también son lazy y se esperan antes de publicar la vista lista.
        const bindings=window.LutminCoreBindings||window.LutminV32CoreBindings||window.LutminV31CoreBindings;
        if(bindings?.bind){const bound=await bindings.bind(name);if(bound===false)console.warn('[Lutmin V54] bindings no disponibles para',name);}
        window.dispatchEvent(new CustomEvent('lutmin:v32:view-ready',{detail:{view:name}}));return true;
      }catch(err){
        console.error('[Lutmin V54] Vista no disponible:',name,err);target.dataset.lutminViewState='error';
        target.innerHTML=`<div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>No pude cargar esta sección.</strong><br><span class="text-xs">Revisá la conexión y volvé a intentar.</span><div class="mt-3"><button type="button" onclick="window.LutminViews.retry('${name}')" class="px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-bold">Reintentar</button></div></div>`;
        state.set(name,{status:'error',promise:null,error:String(err?.message||err)});return false;
      }
    })();state.set(name,{status:'loading',promise});return promise;
  }
  async function ensureForRole(role){const name=roleView[role];return name?fetchView(name):true;}
  async function ensureForTab(tab){return paths[tab]?fetchView(tab):true;}
  async function retry(name){state.delete(name);const target=panel(name);if(target){target.dataset.lutminViewState='idle';}return fetchView(name);}
  function prefetch(name){const src=url(name);if(!src||loaded(name)||document.head.querySelector(`link[data-v32-view-prefetch="${name}"]`))return false;const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(c?.saveData||/2g/.test(String(c?.effectiveType||'')))return false;const l=document.createElement('link');l.rel='prefetch';l.as='fetch';l.href=src;l.dataset.v32ViewPrefetch=name;document.head.appendChild(l);return true;}
  function status(){return {version:VERSION,views:Object.fromEntries([...state.entries()].map(([k,v])=>[k,{status:v.status,bytes:v.bytes||0,loadedAt:v.loadedAt||null,error:v.error||null}]))};}
  window.LutminViews={version:VERSION,ensure:fetchView,ensureForRole,ensureForTab,retry,prefetch,isLoaded:loaded,status};
  window.LutminV32Views=window.LutminViews;
  window.LutminV31Views=window.LutminV32Views;
})();
