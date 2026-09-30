// =============================================================
// LUTMIN · AUTHENTICATED APP SHELL LOADER
// Monta el Campus sólo cuando existe una sesión/acceso válido.
// Mantiene el index público más liviano y evita DOM autenticado inútil.
// =============================================================
(function(){
  'use strict';
  const VERSION='53.0';
  const URL=`assets/views/campus-shell.html?v=${encodeURIComponent(VERSION)}`;
  let promise=null;
  let status='idle';
  let bytes=0;
  let loadedAt=null;
  let error=null;

  function mounted(){return Boolean(document.getElementById('campusModal'));}
  async function ensureCampus(){
    if(mounted()){status='ready';return true;}
    if(promise)return promise;
    status='loading';error=null;
    promise=(async()=>{
      try{
        const res=await fetch(URL,{credentials:'same-origin',cache:'force-cache'});
        if(!res.ok)throw new Error(`HTTP ${res.status}`);
        const html=await res.text();
        if(!html.trim())throw new Error('Shell vacío');
        bytes=new Blob([html]).size;
        const host=document.createElement('div');
        host.id='lutminAuthenticatedShellHost';
        host.dataset.lutminShell='campus';
        host.innerHTML=html;
        document.body.appendChild(host);
        if(!mounted())throw new Error('No se pudo montar el Campus');
        status='ready';loadedAt=Date.now();
        window.dispatchEvent(new CustomEvent('lutmin:campus-shell-ready',{detail:{bytes,version:VERSION}}));
        return true;
      }catch(err){
        error=String(err?.message||err);status='error';console.error('[Lutmin V53] No pude cargar el shell autenticado:',err);return false;
      }finally{promise=null;}
    })();
    return promise;
  }
  function reset(){
    document.getElementById('lutminAuthenticatedShellHost')?.remove();
    status='idle';bytes=0;loadedAt=null;error=null;promise=null;
  }
  function inspect(){return {version:VERSION,status,bytes,loadedAt,error,mounted:mounted()};}
  window.LutminAppShell={version:VERSION,ensureCampus,reset,status:inspect};
})();
