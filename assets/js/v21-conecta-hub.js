(()=>{
  // =========================================================
  // LUTMIN V21.0 · CONECTA HUB
  // Navegación superior modular + resumen inteligente.
  // Sin SQL nuevo, sin APIs externas y costo adicional $0.
  // =========================================================
  const V210={active:'summary',installed:false};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  const modulesV210=[
    ['summary','Resumen','fa-house'],
    ['profile','Perfil profesional','fa-id-card'],
    ['jobs','Oportunidades','fa-magnifying-glass'],
    ['applications','Mis postulaciones','fa-file-circle-check'],
    ['interviews','Entrevistas','fa-calendar-check'],
    ['organizations','Organizaciones','fa-building'],
    ['saved','Guardadas','fa-bookmark'],
    ['agent','Agente de empleabilidad','fa-wand-magic-sparkles'],
    ['career','Carrera y evidencias','fa-route'],
    ['timeline','Mi trayectoria','fa-timeline'],
    ['passport','Pasaporte profesional','fa-address-card']
  ];

  function moduleButtonV210([key,label,icon]){
    return `<button type="button" class="conecta-hub-btn-v210" data-v210-module="${key}" data-v210-label="${esc(label.toLowerCase())}" onclick="openConectaModuleV210('${key}')"><i class="fa-solid ${icon}"></i><span>${esc(label)}</span><span class="badge-v210 hidden" data-v210-badge="${key}"></span></button>`;
  }

  function ensureConectaHubV210(){
    const panel=document.querySelector('section[data-campus-panel="talent"]');
    if(!panel||document.getElementById('conectaHubV210'))return;
    const hub=document.createElement('div');hub.id='conectaHubV210';hub.className='conecta-hub-v210 conecta-hub-section-v210';
    hub.innerHTML=`
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><p class="text-[10px] uppercase tracking-[.16em] font-black text-lutmin-light">Lutmin Conecta</p><h2 class="mt-1 text-2xl sm:text-3xl font-black text-lutmin-dark">Tu espacio profesional.</h2><p class="mt-1 text-sm text-slate-500">Perfil, oportunidades, carrera, evidencia y organizaciones en un mismo lugar.</p></div>
        <button onclick="refreshConectaHubV210()" class="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-lutmin-dark"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button>
      </div>
      <div class="conecta-hub-card-v210 mt-5">
        <div class="flex items-center justify-between gap-3"><div><p class="text-[9px] uppercase tracking-widest font-black text-lutmin-light">Módulos de Conecta</p><p class="mt-1 text-[10px] text-slate-500">Entrá directo a la herramienta que necesitás.</p></div><button onclick="openConectaModuleV210('summary')" class="px-3 py-2 rounded-xl bg-lutmin-light text-white text-[10px] font-black">Inicio Conecta</button></div>
        <div id="conectaHubGridV210" class="conecta-hub-grid-v210 mt-3">${modulesV210.map(moduleButtonV210).join('')}</div>
        <div class="conecta-hub-toolbar-v210">
          <div class="conecta-hub-search-wrap-v210"><i class="fa-solid fa-magnifying-glass"></i><input id="conectaModuleSearchV210" oninput="filterConectaModulesV210(this.value)" class="conecta-hub-search-v210" placeholder="Buscar módulo o función..."></div>
          <button onclick="quickImportCvV210()" class="conecta-hub-action-v210 primary"><i class="fa-solid fa-file-arrow-up"></i>Analizar CV</button>
          <button onclick="openMyPublicProfileV40?.()" class="conecta-hub-action-v210"><i class="fa-solid fa-id-card"></i>Perfil público</button>
        </div>
      </div>
      <div id="conectaSummaryV210" class="conecta-summary-v210 conecta-hub-section-v210">
        <div class="flex items-start justify-between gap-3"><div><p class="text-[9px] uppercase tracking-widest font-black text-cyan-200">Resumen personal</p><h3 class="mt-1 text-xl font-black">Qué está pasando en tu perfil profesional.</h3></div><span class="px-3 py-1.5 rounded-full bg-white/10 text-[9px] font-black text-cyan-100">API $0</span></div>
        <div id="conectaSummaryStatsV210" class="conecta-summary-grid-v210 mt-4"></div>
        <div id="conectaNextActionV210" class="conecta-next-v210"><p class="eyebrow">Siguiente mejor acción</p><h4>Cargando...</h4><p>Lutmin está revisando tu información disponible.</p></div>
      </div>`;
    panel.insertAdjacentElement('afterbegin',hub);
    // El encabezado viejo queda como encabezado de Perfil, no como encabezado general.
    const old=document.getElementById('conectaProfileV182');if(old)old.classList.add('mt-6','conecta-hub-section-v210');
    V210.installed=true;
    setConectaActiveV210('summary');
  }

  function setConectaActiveV210(key){
    V210.active=key;
    document.querySelectorAll('[data-v210-module]').forEach(b=>b.classList.toggle('active',b.dataset.v210Module===key));
    try{localStorage.setItem('lutmin-v210-conecta-active',key)}catch(_){ }
  }

  function scrollConectaV210(el){
    if(!el)return;
    const root=document.querySelector('#campusModal .overflow-y-auto.modal-scroll.flex-1')||document.querySelector('#campusModal .modal-scroll.flex-1');
    if(root){const top=root.scrollTop+el.getBoundingClientRect().top-root.getBoundingClientRect().top-14;root.scrollTo({top:Math.max(0,top),behavior:'smooth'});}else el.scrollIntoView({behavior:'smooth',block:'start'});
    el.classList.add('conecta-hub-focus-v210');setTimeout(()=>el.classList.remove('conecta-hub-focus-v210'),850);
  }

  function setBadgeV210(key,value){
    const el=document.querySelector(`[data-v210-badge="${key}"]`);if(!el)return;
    const n=Number(value||0);el.textContent=n>99?'99+':String(n);el.classList.toggle('hidden',n<=0);
  }

  function renderConectaSummaryV210(){
    const stats=document.getElementById('conectaSummaryStatsV210'),next=document.getElementById('conectaNextActionV210');if(!stats||!next)return;
    const profile=talentData?.profile||{},jobs=talentData?.jobs||[],apps=talentData?.applications||[],saved=talentData?.savedJobs||talentData?.saved||[],interviews=talentData?.applicationDetails?.interviews||[];
    const strength=Number(document.getElementById('talentProfileStrength')?.textContent?.replace(/\D/g,'')||0);
    const openJobs=jobs.filter(j=>j.status==='published'||!j.status).length;
    const activeApps=apps.filter(a=>!['rejected','hired','withdrawn'].includes(a.status)).length;
    const upcoming=interviews.filter(i=>!i.scheduled_at||new Date(i.scheduled_at)>=new Date()).length;
    stats.innerHTML=[['Perfil',`${strength}%`],['Oportunidades',openJobs],['Postulaciones',activeApps],['Entrevistas',upcoming]].map(x=>`<div class="conecta-summary-stat-v210"><p>${x[0]}</p><strong>${x[1]}</strong></div>`).join('');
    setBadgeV210('jobs',openJobs);setBadgeV210('applications',activeApps);setBadgeV210('interviews',upcoming);setBadgeV210('saved',Array.isArray(saved)?saved.length:0);
    const orgs=window.V200?.organizations||[];setBadgeV210('organizations',orgs.filter?.(x=>x.following)?.length||0);
    let title='Explorá oportunidades',detail='Tu perfil está listo para empezar a comparar oportunidades con evidencia real.',action='jobs';
    if(strength<70){title='Completá tu perfil profesional';detail='Cuanto más estructurado esté tu perfil, mejor funcionan el matching, el CV dinámico y la carrera.';action='profile';}
    else if(upcoming>0){title='Prepará tu próxima entrevista';detail=`Tenés ${upcoming} entrevista${upcoming===1?'':'s'} próxima${upcoming===1?'':'s'}. Revisá las preguntas y evidencia del puesto.`;action='interviews';}
    else if(activeApps>0){title='Revisá tus procesos activos';detail=`Tenés ${activeApps} postulación${activeApps===1?'':'es'} en curso.`;action='applications';}
    else if(openJobs>0){title='Analizá una oportunidad con el Agente';detail='Elegí una búsqueda y generá un CV adaptado usando sólo datos reales de tu perfil.';action='agent';}
    else if(!profile?.visible){title='Activá tu perfil público cuando quieras';detail='Podés decidir qué mostrar y compartirlo con una URL verificable de Lutmin.';action='profile';}
    next.innerHTML=`<p class="eyebrow">Siguiente mejor acción</p><h4>${esc(title)}</h4><p>${esc(detail)}</p><button onclick="openConectaModuleV210('${action}')" class="mt-3 px-3 py-2 rounded-xl bg-lutmin-dark text-white text-[10px] font-black">Ir ahora</button>`;
  }

  window.filterConectaModulesV210=function(value){
    const q=String(value||'').trim().toLowerCase();
    document.querySelectorAll('[data-v210-module]').forEach(btn=>btn.classList.toggle('hidden',!!q&&!String(btn.dataset.v210Label||'').includes(q)));
  };

  window.quickImportCvV210=function(){
    try{if(typeof ensureV140StudentUI==='function')ensureV140StudentUI();}catch(_){ }
    const input=document.getElementById('talentCvFileV140');if(input)input.click();else{openConectaModuleV210('profile');setTimeout(()=>document.getElementById('talentCvFileV140')?.click(),180);}
  };

  window.openConectaModuleV210=async function(key){
    if(currentLutminUser?.role!=='student')return;
    ensureConectaHubV210();setConectaActiveV210(key);
    if(typeof goToCampusTab==='function')goToCampusTab('talent');
    if(key==='summary'){renderConectaSummaryV210();return scrollConectaV210(document.getElementById('conectaSummaryV210'));}
    if(key==='organizations'){if(typeof openConectaV200==='function')await openConectaV200('organizations');return setTimeout(()=>scrollConectaV210(document.getElementById('conectaOrganizationsV200')),80);}
    if(key==='timeline'){if(typeof openConectaV200==='function')await openConectaV200('timeline');return setTimeout(()=>scrollConectaV210(document.getElementById('conectaTimelineV200')),80);}
    if(key==='passport'){
      try{if(typeof ensurePersonalAutopilotV110==='function')ensurePersonalAutopilotV110();if(typeof loadPersonalAutopilotV110==='function')await loadPersonalAutopilotV110();if(typeof setPersonalAgentTabV110==='function')setPersonalAgentTabV110('passport');}catch(_){ }
      return setTimeout(()=>scrollConectaV210(document.getElementById('personalAutopilotV110')),100);
    }
    if(typeof openConectaSectionV182==='function')await openConectaSectionV182(key);
    const map={profile:'conectaProfileV182',jobs:'conectaJobsV182',applications:'conectaApplicationsV182',interviews:'conectaInterviewsV182',saved:'conectaSavedV182',agent:'talentAgentV100',career:'talentEvidenceCareerV150'};
    setTimeout(()=>scrollConectaV210(document.getElementById(map[key])),90);
  };

  window.refreshConectaHubV210=async function(){
    if(currentLutminUser?.role!=='student')return;
    try{if(typeof loadTalentCenter==='function')await loadTalentCenter();}catch(_){ }
    try{if(typeof loadV140ProfileData==='function')await loadV140ProfileData();}catch(_){ }
    try{if(typeof loadOrganizationsV200==='function')await loadOrganizationsV200();}catch(_){ }
    renderConectaSummaryV210();
  };

  function polishStudentSidebarV210(){
    const p=document.getElementById('studentConectaParentV183');if(p){p.setAttribute('aria-expanded','false');p.removeAttribute('aria-controls');}
    const sub=document.getElementById('studentConectaSubnavV183');if(sub)sub.setAttribute('aria-hidden','true');
  }

  function installV210(){
    polishStudentSidebarV210();ensureConectaHubV210();
    if(currentLutminUser?.role==='student')setTimeout(renderConectaSummaryV210,180);
  }

  // Sincronizar con cargas existentes.
  if(typeof loadTalentCenter==='function'){
    const oldLoadTalentV210=loadTalentCenter;
    window.loadTalentCenter=async function(){const r=await oldLoadTalentV210.apply(this,arguments);ensureConectaHubV210();setTimeout(renderConectaSummaryV210,60);return r;};
  }
  if(typeof renderTalentCenter==='function'){
    const oldRenderTalentV210=renderTalentCenter;
    window.renderTalentCenter=function(){const r=oldRenderTalentV210.apply(this,arguments);ensureConectaHubV210();setTimeout(renderConectaSummaryV210,30);return r;};
  }
  if(typeof paintCurrentLutminUser==='function'){
    const oldPaintV210=paintCurrentLutminUser;
    window.paintCurrentLutminUser=function(){const r=oldPaintV210.apply(this,arguments);setTimeout(installV210,120);return r;};
  }

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#studentConectaParentV183');
    if(tab)setTimeout(()=>{ensureConectaHubV210();renderConectaSummaryV210();setConectaActiveV210('summary');scrollConectaV210(document.getElementById('conectaHubV210'));},80);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV210,1000));else setTimeout(installV210,1000);
})();
