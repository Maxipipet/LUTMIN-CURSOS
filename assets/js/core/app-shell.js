// =============================================================
// LUTMIN · AUTHENTICATED APP SHELL LOADER
// V56: mantiene el shell fuera del index, pero lo precarga en idle para
// que Acceso Alumno/Empresa no pague una espera de red al hacer clic.
// =============================================================
(function(){
  'use strict';
  const VERSION='59.0';
  const URL=`assets/views/campus-shell.html?v=${encodeURIComponent(VERSION)}`;
  let promise=null;
  let prefetchPromise=null;
  let prefetchedHtml='';
  let status='idle';
  let bytes=0;
  let loadedAt=null;
  let prefetchedAt=null;
  let error=null;

  function mounted(){return Boolean(document.getElementById('campusModal'));}
  function canPrefetch(){
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(c?.saveData)return false;
    return !['slow-2g','2g'].includes(String(c?.effectiveType||'').toLowerCase());
  }
  async function fetchShell(){
    if(prefetchedHtml)return prefetchedHtml;
    if(prefetchPromise)return prefetchPromise;
    prefetchPromise=(async()=>{
      const res=await fetch(URL,{credentials:'same-origin',cache:'force-cache'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const html=await res.text();
      if(!html.trim())throw new Error('Shell vacío');
      prefetchedHtml=html;
      bytes=new Blob([html]).size;
      prefetchedAt=Date.now();
      return html;
    })().catch(err=>{
      error=String(err?.message||err);
      prefetchedHtml='';
      throw err;
    }).finally(()=>{prefetchPromise=null;});
    return prefetchPromise;
  }
  async function preload(){
    if(mounted()||prefetchedHtml)return true;
    if(!canPrefetch())return false;
    try{await fetchShell();return true;}catch(err){console.warn('[Lutmin V56] No pude precargar el shell:',err?.message||err);return false;}
  }
  async function ensureCampus(){
    if(mounted()){status='ready';return true;}
    if(promise)return promise;
    status='loading';error=null;
    promise=(async()=>{
      try{
        const html=await fetchShell();
        const host=document.createElement('div');
        host.id='lutminAuthenticatedShellHost';
        host.dataset.lutminShell='campus';
        host.innerHTML=html;
        document.body.appendChild(host);
        if(!mounted())throw new Error('No se pudo montar el Campus');
        status='ready';loadedAt=Date.now();
        window.dispatchEvent(new CustomEvent('lutmin:campus-shell-ready',{detail:{bytes,version:VERSION,prefetchedAt}}));
        return true;
      }catch(err){
        error=String(err?.message||err);status='error';console.error('[Lutmin V56] No pude cargar el shell autenticado:',err);return false;
      }finally{promise=null;}
    })();
    return promise;
  }
  function reset(){
    document.getElementById('lutminAuthenticatedShellHost')?.remove();
    status='idle';loadedAt=null;error=null;promise=null;
    // Conservamos el HTML prefetched: cerrar sesión no justifica volver a descargarlo.
  }
  function inspect(){return {version:VERSION,status,bytes,loadedAt,prefetchedAt,error,mounted:mounted(),prefetched:Boolean(prefetchedHtml)};}
  window.LutminAppShell={version:VERSION,ensureCampus,preload,reset,status:inspect};

  // La precarga es oportunista: no bloquea el primer render y se evita en conexiones lentas/save-data.
  const idlePreload=()=>preload();
  if('requestIdleCallback' in window)requestIdleCallback(idlePreload,{timeout:1800});
  else setTimeout(idlePreload,900);
})();
