(()=>{
  // =========================================================
  // V22 · SINGLE-FLIGHT
  // Evita que dos eventos simultáneos repitan la misma consulta.
  // No cachea datos: al terminar, la próxima llamada vuelve a consultar.
  // =========================================================
  function singleFlight(name){
    const original=window[name];
    if(typeof original!=='function'||original.__lutminV220SingleFlight)return;
    let running=null;
    const wrapped=function(){
      if(running)return running;
      try{
        const value=original.apply(this,arguments);
        if(!value||typeof value.then!=='function')return value;
        running=Promise.resolve(value).then(result=>{requestAnimationFrame(()=>optimizeImages());return result;}).finally(()=>{running=null});
        return running;
      }catch(err){running=null;throw err;}
    };
    wrapped.__lutminV220SingleFlight=true;
    wrapped.__lutminV220Original=original;
    window[name]=wrapped;
  }

  function installSingleFlight(){
    ['loadCampusData','loadStudentAgenda','loadNotificationCenter','loadTalentCenter','loadCompanyPortalData','loadCompanyConectaData','loadAdminData','loadInstructorPortalV50','loadSupportCenter'].forEach(singleFlight);
  }

  // Decodificación diferida para imágenes que aparecen dinámicamente.
  function optimizeImages(root=document){
    root.querySelectorAll?.('img:not([data-v220-img])').forEach(img=>{
      img.dataset.v220Img='1';
      if(!img.hasAttribute('decoding'))img.decoding='async';
      const inHero=!!img.closest?.('#inicio');
      if(!inHero&&!img.hasAttribute('loading'))img.loading='lazy';
    });
  }

  function install(){
    // Sin observadores globales permanentes: menos trabajo en cada mutación del DOM.
    installSingleFlight();
    optimizeImages();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
