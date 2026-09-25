(function(){
  const targetMapV182={
    profile:'conectaProfileV182',
    jobs:'conectaJobsV182',
    applications:'conectaApplicationsV182',
    interviews:'conectaInterviewsV182',
    agent:'talentAgentV100',
    career:'talentEvidenceCareerV150',
    saved:'conectaSavedV182'
  };
  let activeConectaV182='profile';
  let navBusyV182=false;

  function setConectaActiveV182(key){
    activeConectaV182=key;
    document.querySelectorAll('[data-conecta-key-v182]').forEach(btn=>btn.classList.toggle('active',btn.dataset.conectaKeyV182===key));
    document.querySelectorAll('[data-conecta-mobile-key-v182]').forEach(btn=>btn.classList.toggle('active',btn.dataset.conectaMobileKeyV182===key));
  }

  function focusConectaTargetV182(el){
    if(!el)return;
    const root=document.querySelector('#campusModal .overflow-y-auto.modal-scroll.flex-1') || document.querySelector('#campusModal .modal-scroll.flex-1');
    if(root){
      const top=root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 18;
      root.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    }else{
      el.scrollIntoView({behavior:'smooth',block:'start'});
    }
    el.classList.add('conecta-nav-focus-v182');
    setTimeout(()=>el.classList.remove('conecta-nav-focus-v182'),900);
  }

  async function prepareConectaDynamicV182(key){
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
    if(navBusyV182)return;
    if(currentLutminUser?.role!=='student')return;
    navBusyV182=true;
    try{
      if(typeof goToCampusTab==='function')goToCampusTab('talent');
      if(typeof loadTalentCenter==='function'){
        try{if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent',()=>loadTalentCenter(),{ttl:18000});else await loadTalentCenter();}catch(_){ }
      }
      await prepareConectaDynamicV182(key);
      setConectaActiveV182(key);
      let el=document.getElementById(targetMapV182[key]||targetMapV182.profile);
      if(!el){
        await new Promise(r=>setTimeout(r,120));
        await prepareConectaDynamicV182(key);
        el=document.getElementById(targetMapV182[key]||targetMapV182.profile);
      }
      if(el)focusConectaTargetV182(el);
    }finally{
      navBusyV182=false;
    }
  };

  function setConectaMenuOpenV183(open){
    const parent=document.getElementById('studentConectaParentV183');
    const sub=document.getElementById('studentConectaSubnavV183');
    if(!parent||!sub)return;
    parent.setAttribute('aria-expanded',open?'true':'false');
    sub.classList.toggle('is-collapsed',!open);
  }

  function installConectaV182(){
    const parent=document.getElementById('studentConectaParentV183');
    if(parent&&!parent.dataset.v183Bound){
      parent.dataset.v183Bound='1';
      parent.addEventListener('click',()=>{
        const open=parent.getAttribute('aria-expanded')==='true';
        setConectaMenuOpenV183(!open);
        if(!open)setTimeout(()=>setConectaActiveV182(activeConectaV182||'profile'),0);
      });
    }

    // Al cambiar a otro módulo principal, el desplegable se cierra.
    document.querySelectorAll('#campusSidebarNavV183 .campus-tab').forEach(btn=>{
      if(btn===parent||btn.dataset.v183CollapseBound)return;
      btn.dataset.v183CollapseBound='1';
      btn.addEventListener('click',()=>setConectaMenuOpenV183(false));
    });

    setConectaActiveV182(activeConectaV182);
    setConectaMenuOpenV183(false);
  }

  // Los accesos internos siempre abren el árbol de Conecta.
  const originalOpenConectaSectionV182=window.openConectaSectionV182;
  window.openConectaSectionV182=async function(key){
    setConectaMenuOpenV183(true);
    return originalOpenConectaSectionV182(key);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installConectaV182);
  else installConectaV182();
})();
