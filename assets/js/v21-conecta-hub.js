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
    const host=document.getElementById('talentSummaryHostV342');
    const hub=document.createElement('div');hub.id='conectaHubV210';hub.className='conecta-hub-v210 conecta-hub-section-v210';
    hub.innerHTML=`
      <div class="conecta-summary-v210 mt-0">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><p class="text-[9px] uppercase tracking-widest font-black text-cyan-200">Resumen personal</p><h3 class="mt-1 text-xl font-black">Qué está pasando en tu perfil profesional.</h3><p class="mt-1 text-xs text-slate-300">Perfil, oportunidades, postulaciones y próximos pasos en una sola vista.</p></div><div class="flex flex-wrap gap-2"><button onclick="quickImportCvV210()" class="px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black"><i class="fa-solid fa-file-arrow-up mr-1"></i>Analizar CV</button><button onclick="refreshConectaHubV210()" class="px-3 py-2 rounded-xl bg-white text-lutmin-dark text-[10px] font-black"><i class="fa-solid fa-rotate mr-1"></i>Actualizar</button></div></div>
        <div id="conectaSummaryStatsV210" class="conecta-summary-grid-v210 mt-4"></div>
        <div id="conectaNextActionV210" class="conecta-next-v210"><p class="eyebrow">Siguiente mejor acción</p><h4>Cargando...</h4><p>Lutmin está revisando tu información disponible.</p></div>
      </div>`;
    if(host)host.appendChild(hub);else panel.insertAdjacentElement('afterbegin',hub);
    V210.installed=true;
  }

  function setConectaActiveV210(key){
    V210.active=key;
    window.setTalentModuleV342?.(key);
    try{sessionStorage.setItem('lutmin-talent-module-v342',key)}catch(_){ }
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
    ensureConectaHubV210();
    if(typeof goToCampusTab==='function')goToCampusTab('talent');
    if(key==='summary'){setConectaActiveV210('summary');renderConectaSummaryV210();return;}
    if(key==='organizations'){if(typeof openConectaV200==='function')await openConectaV200('organizations');return;}
    if(key==='timeline'){if(typeof openConectaV200==='function')await openConectaV200('timeline');return;}
    if(key==='passport'){
      try{if(typeof ensurePersonalAutopilotV110==='function')ensurePersonalAutopilotV110();if(typeof loadPersonalAutopilotV110==='function')await loadPersonalAutopilotV110();if(typeof setPersonalAgentTabV110==='function')setPersonalAgentTabV110('passport');}catch(_){ }
      return setConectaActiveV210('passport');
    }
    if(typeof openConectaSectionV182==='function')await openConectaSectionV182(key);
    setConectaActiveV210(key);
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
    if(tab)setTimeout(()=>{ensureConectaHubV210();renderConectaSummaryV210();setConectaActiveV210('summary');},80);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV210,1000));else setTimeout(installV210,1000);
})();
