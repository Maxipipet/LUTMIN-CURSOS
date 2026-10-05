// =============================================================
// LUTMIN · LAZY VIEW BINDINGS
// El arranque público no descarga handlers de Administración/Conecta.
// Se cargan una única vez cuando una vista realmente los necesita.
// =============================================================
(function(){
  'use strict';
  const VERSION='59.0';
  const SOURCE='assets/js/core/bindings/workspace-bindings.js';
  let promise=null;
  let error=null;
  let loadedAt=null;

  function hasRuntime(){return Boolean(window.LutminWorkspaceBindings?.bind);}
  function loadRuntime(){
    if(hasRuntime())return Promise.resolve(true);
    if(promise)return promise;
    promise=new Promise(resolve=>{
      const existing=[...document.scripts].find(s=>String(s.src||'').includes(SOURCE));
      if(existing){
        if(hasRuntime()){resolve(true);return;}
        existing.addEventListener('load',()=>resolve(hasRuntime()),{once:true});
        existing.addEventListener('error',()=>resolve(false),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=`${SOURCE}?v=${encodeURIComponent(VERSION)}`;
      script.async=false;
      script.dataset.lutminBindings='workspace';
      script.onload=()=>{loadedAt=Date.now();resolve(hasRuntime());};
      script.onerror=()=>{error=`No se pudo cargar ${SOURCE}`;script.remove();resolve(false);};
      document.body.appendChild(script);
    }).finally(()=>{promise=null;});
    return promise;
  }
  async function bind(view){
    if(!['talent','company-conecta','admin'].includes(view))return true;
    if(!(await loadRuntime()))return false;
    return window.LutminWorkspaceBindings.bind(view);
  }
  function status(){return {version:VERSION,loaded:hasRuntime(),loadedAt,error,pending:Boolean(promise)};}
  window.LutminCoreBindings={version:VERSION,bind,status};
  window.LutminV32CoreBindings=window.LutminCoreBindings;
  window.LutminV31CoreBindings=window.LutminCoreBindings;
})();
