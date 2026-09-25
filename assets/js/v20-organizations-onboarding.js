(()=>{
  // =========================================================
  // LUTMIN V20.0 · ORGANIZACIONES + ONBOARDING AUTOPILOT
  // Todo funciona con datos propios, JavaScript y Supabase. API IA externa: $0.
  // =========================================================
  const V200={organizations:[],timeline:[],timelineFilter:'all',companyInterests:[],onboarding:null,development:null,myOnboarding:[]};
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtDate=v=>{if(!v)return '';try{return new Date(String(v).length<=10?`${v}T12:00:00`:v).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}catch(_){return String(v)}};
  const activeCompanyId=()=>{try{if(typeof companyActiveIdV130==='function')return companyActiveIdV130();}catch(_){ }return companyPortalData?.company?.id||null;};
  const orgLogoUrl=o=>{try{return typeof companyBrandingPublicUrl==='function'?companyBrandingPublicUrl(o.logo_path):''}catch(_){return ''}};
  const initials=n=>String(n||'Organización').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'OR';

  // ---------------------------------------------------------
  // 1) LUTMIN CONECTA · ORGANIZACIONES
  // ---------------------------------------------------------
  function ensureOrganizationsUi(){
    const panel=document.querySelector('section[data-campus-panel="talent"]');if(!panel)return;
    if(!document.getElementById('conectaOrganizationsV200')){
      const anchor=document.getElementById('conectaJobsV182');
      const box=document.createElement('div');box.id='conectaOrganizationsV200';box.className='conecta-anchor-v182 mt-6 bg-white rounded-3xl border border-slate-100 overflow-hidden';
      box.innerHTML=`<div class="p-5 sm:p-6 border-b border-slate-100"><div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-cyan-700">Organizaciones</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Seguí empresas aunque hoy no tengan una búsqueda abierta.</h3><p class="mt-1 text-xs text-slate-500 max-w-2xl">Guardá organizaciones que te interesan y, si querés, manifestá interés laboral de forma directa. La empresa sólo ve ese interés porque vos lo decidiste.</p></div><div class="flex gap-2 flex-wrap"><input id="orgSearchV200" oninput="renderOrganizationsV200()" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs min-w-[210px]" placeholder="Buscar organización"><label class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold flex items-center gap-2"><input id="orgFollowOnlyV200" type="checkbox" onchange="renderOrganizationsV200()"> Sólo seguidas</label></div></div><div id="orgStatsV200" class="mt-5 grid grid-cols-3 gap-3"></div></div><div id="organizationsGridV200" class="p-5 sm:p-6 grid md:grid-cols-2 xl:grid-cols-3 gap-4"><div class="md:col-span-2 xl:col-span-3 text-sm text-slate-500">Cargando organizaciones...</div></div>`;
      if(anchor)anchor.insertAdjacentElement('beforebegin',box);else panel.appendChild(box);
    }
    const sub=document.getElementById('studentConectaSubnavV183');
    if(sub&&!document.getElementById('conectaOrganizationsNavV200')){
      const jobs=sub.querySelector('[data-conecta-key-v182="jobs"]');
      jobs?.insertAdjacentHTML('beforebegin','<button id="conectaOrganizationsNavV200" type="button" class="conecta-subitem-v183" data-conecta-v200="organizations" onclick="openConectaV200(\'organizations\')"><i class="fa-regular fa-building"></i><span>Organizaciones</span></button>');
    }
    const mobile=document.getElementById('conectaMobileNavV182');
    if(mobile&&!document.getElementById('conectaOrganizationsMobileV200')){
      const jobs=mobile.querySelector('[data-conecta-mobile-key-v182="jobs"]');
      jobs?.insertAdjacentHTML('beforebegin','<button id="conectaOrganizationsMobileV200" type="button" class="conecta-mobile-btn-v182" data-conecta-mobile-v200="organizations" onclick="openConectaV200(\'organizations\')">Organizaciones</button>');
    }
  }

  async function loadOrganizationsV200(){
    if(!supabaseClient||currentLutminUser?.role!=='student')return;
    const root=document.getElementById('organizationsGridV200');if(root)root.innerHTML='<div class="md:col-span-2 xl:col-span-3 text-sm text-slate-500">Cargando organizaciones...</div>';
    const {data,error}=await supabaseClient.rpc('my_organizations_v200');
    if(error){console.warn('V20 organizaciones',error);if(root)root.innerHTML='<div class="md:col-span-2 xl:col-span-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">Organizaciones todavía no está disponible en este entorno.</div>';return;}
    V200.organizations=Array.isArray(data)?data:[];renderOrganizationsV200();
  }

  window.renderOrganizationsV200=function(){
    const root=document.getElementById('organizationsGridV200');if(!root)return;
    const q=(document.getElementById('orgSearchV200')?.value||'').trim().toLowerCase();
    const followed=!!document.getElementById('orgFollowOnlyV200')?.checked;
    const all=V200.organizations||[];
    const rows=all.filter(o=>(!followed||o.following)&&(!q||`${o.display_name||o.name||''} ${o.industry||''} ${o.address||''}`.toLowerCase().includes(q)));
    const stats=document.getElementById('orgStatsV200');if(stats)stats.innerHTML=[['Organizaciones',all.length,'text-lutmin-dark'],['Seguidas',all.filter(x=>x.following).length,'text-blue-600'],['Interés enviado',all.filter(x=>x.interested).length,'text-emerald-600']].map(x=>`<div class="rounded-2xl bg-slate-50 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">${x[0]}</p><p class="mt-1 text-xl font-black ${x[2]}">${x[1]}</p></div>`).join('');
    if(!rows.length){root.innerHTML='<div class="md:col-span-2 xl:col-span-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No encontré organizaciones con esos filtros.</div>';return;}
    root.innerHTML=rows.map(o=>{const name=o.display_name||o.name||'Organización',logo=orgLogoUrl(o);return `<article class="v200-soft-card v200-org-card p-5"><div class="flex items-start justify-between gap-3"><div class="flex gap-3 min-w-0"><div class="v200-logo">${logo?`<img src="${esc(logo)}" alt="${esc(name)}">`:`<span class="font-black text-lutmin-dark">${esc(initials(name))}</span>`}</div><div class="min-w-0"><h4 class="font-black text-lutmin-dark truncate">${esc(name)}</h4><p class="mt-1 text-[11px] text-slate-500">${esc(o.industry||'Organización en Lutmin')}</p>${o.address?`<p class="mt-1 text-[10px] text-slate-400 truncate"><i class="fa-solid fa-location-dot mr-1"></i>${esc(o.address)}</p>`:''}</div></div><button onclick="toggleOrganizationFollowV200('${o.id}')" class="w-9 h-9 rounded-xl ${o.following?'bg-blue-50 text-blue-600':'bg-slate-100 text-slate-400'}" title="${o.following?'Dejar de seguir':'Seguir'}"><i class="fa-${o.following?'solid':'regular'} fa-bookmark"></i></button></div><div class="mt-4 flex flex-wrap gap-2"><span class="v200-chip bg-slate-100 text-slate-600"><i class="fa-solid fa-briefcase"></i>${Number(o.open_jobs||0)} búsqueda(s) abierta(s)</span>${o.interested?`<span class="v200-chip bg-emerald-50 text-emerald-700"><i class="fa-solid fa-circle-check"></i>Interés enviado</span>`:''}</div><div class="mt-4 grid grid-cols-2 gap-2"><button onclick="openOrganizationJobsV200('${o.id}')" class="px-3 py-2.5 rounded-xl bg-lutmin-dark text-white text-[11px] font-bold" ${Number(o.open_jobs||0)?'':'disabled style="opacity:.45"'}>Ver oportunidades</button><button onclick="toggleOrganizationInterestV200('${o.id}')" class="px-3 py-2.5 rounded-xl ${o.interested?'bg-slate-100 text-slate-600':'bg-cyan-50 text-cyan-700'} text-[11px] font-bold">${o.interested?'Retirar interés':'Me interesa trabajar acá'}</button></div>${o.website?`<a href="${esc(o.website)}" target="_blank" rel="noopener" class="mt-3 inline-flex text-[10px] font-bold text-blue-600"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Sitio de la organización</a>`:''}</article>`}).join('');
  };

  window.toggleOrganizationFollowV200=async function(id){const {data,error}=await supabaseClient.rpc('toggle_company_follow_v200',{p_company_id:id});if(error)return showToast(error.message||'No pude actualizar la organización.');const o=V200.organizations.find(x=>x.id===id);if(o)o.following=!!data;renderOrganizationsV200();};
  window.toggleOrganizationInterestV200=async function(id){const o=V200.organizations.find(x=>x.id===id);if(!o)return;if(o.interested&&!confirm('¿Querés retirar tu interés en esta organización?'))return;let message=null;if(!o.interested)message=window.prompt('Opcional: ¿qué tipo de oportunidad te interesa?','')||null;const {data,error}=await supabaseClient.rpc('set_company_interest_v200',{p_company_id:id,p_interested:!o.interested,p_message:message});if(error)return showToast(error.message||'No pude registrar tu interés.');o.interested=data?.status!=='withdrawn';o.interest_status=data?.status;showToast(o.interested?'Interés registrado. La organización podrá ver tu perfil porque vos lo autorizaste.':'Interés retirado.');renderOrganizationsV200();};
  window.openOrganizationJobsV200=async function(id){const o=V200.organizations.find(x=>x.id===id);await openConectaSectionV182('jobs');setTimeout(()=>{const jobs=(talentData?.jobs||[]).filter(j=>j.company_id===id||(!j.company_id&&String(j.company_name||'').toLowerCase()===String(o?.display_name||o?.name||'').toLowerCase()));const el=jobs[0]?document.querySelector(`[data-talent-job="${jobs[0].id}"]`):null;if(el)el.scrollIntoView({behavior:'smooth',block:'center'});else showToast('No encontré una búsqueda abierta de esta organización en este momento.');},160);};

  // ---------------------------------------------------------
  // 2) TRAYECTORIA PROFESIONAL AUTOMÁTICA
  // ---------------------------------------------------------
  function ensureTimelineUi(){
    const panel=document.querySelector('section[data-campus-panel="talent"]');if(!panel)return;
    if(!document.getElementById('conectaTimelineV200')){
      const anchor=document.getElementById('conectaOrganizationsV200')||document.getElementById('conectaJobsV182');
      const box=document.createElement('div');box.id='conectaTimelineV200';box.className='conecta-anchor-v182 mt-6 bg-white rounded-3xl border border-slate-100 overflow-hidden';
      box.innerHTML=`<div class="p-5 sm:p-6 border-b border-slate-100"><div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-violet-600">Perfil vivo</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Mi trayectoria profesional</h3><p class="mt-1 text-xs text-slate-500">Experiencia, formación, certificados y procesos laborales ordenados automáticamente en una sola historia.</p></div><select id="timelineFilterV200" onchange="renderCareerTimelineV200()" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"><option value="all">Toda la trayectoria</option><option value="work">Experiencia</option><option value="learning">Formación</option><option value="career">Empleo</option></select></div><div id="timelineStatsV200" class="mt-5 grid grid-cols-3 gap-3"></div></div><div id="careerTimelineV200" class="p-5 sm:p-6"><div class="text-sm text-slate-500">Preparando trayectoria...</div></div>`;
      if(anchor)anchor.insertAdjacentElement('beforebegin',box);else panel.appendChild(box);
    }
    const sub=document.getElementById('studentConectaSubnavV183');
    if(sub&&!document.getElementById('conectaTimelineNavV200')){
      const career=sub.querySelector('[data-conecta-key-v182="career"]');career?.insertAdjacentHTML('afterend','<button id="conectaTimelineNavV200" type="button" class="conecta-subitem-v183" data-conecta-v200="timeline" onclick="openConectaV200(\'timeline\')"><i class="fa-solid fa-timeline"></i><span>Mi trayectoria</span></button>');
    }
    const mobile=document.getElementById('conectaMobileNavV182');
    if(mobile&&!document.getElementById('conectaTimelineMobileV200'))mobile.insertAdjacentHTML('beforeend','<button id="conectaTimelineMobileV200" type="button" class="conecta-mobile-btn-v182" data-conecta-mobile-v200="timeline" onclick="openConectaV200(\'timeline\')">Trayectoria</button>');
  }

  async function loadCareerTimelineV200(){
    if(!supabaseClient||currentLutminUser?.role!=='student')return;
    const [eduRes,docRes]=await Promise.all([
      supabaseClient.from('talent_education_v140').select('institution,title,level,start_date,end_date,current,description,source_type').eq('user_id',currentLutminUser.id).order('start_date',{ascending:false}),
      supabaseClient.from('talent_documents_v150').select('document_type,title,issuer,issue_date,expires_at,duration_hours,status').eq('user_id',currentLutminUser.id).eq('status','confirmed').order('issue_date',{ascending:false})
    ]);
    const events=[];
    (talentData?.experiences||[]).forEach(x=>events.push({type:'work',date:x.start_date||x.created_at,title:x.position_title||'Experiencia laboral',subtitle:x.company_name||'',detail:x.description||'',icon:'fa-briefcase'}));
    (eduRes.data||[]).forEach(x=>events.push({type:'learning',date:x.start_date||x.end_date,title:x.title||'Formación',subtitle:x.institution||'',detail:x.level||'',icon:'fa-graduation-cap'}));
    (talentData?.certificates||[]).forEach(x=>events.push({type:'learning',date:x.issued_at,title:`Certificado: ${x.course_title||'Capacitación'}`,subtitle:'Lutmin',detail:x.score!=null?`Calificación ${Math.round(Number(x.score))}%`:'',icon:'fa-certificate'}));
    (docRes.data||[]).forEach(x=>events.push({type:'learning',date:x.issue_date,title:x.title||'Documento profesional',subtitle:x.issuer||'Evidencia externa',detail:x.duration_hours?`${x.duration_hours} h`:'',icon:'fa-file-shield'}));
    const jobs=[...(talentData?.jobs||[]),...(publicJobsData||[])];
    (talentData?.applications||[]).forEach(a=>{const j=jobs.find(x=>x.id===a.job_id);events.push({type:'career',date:a.created_at,title:`Postulación: ${j?.title||'Búsqueda laboral'}`,subtitle:j?.company_name||'Lutmin Conecta',detail:jobStatusLabel(a.status),icon:'fa-paper-plane'});});
    (talentData?.applicationDetails?.interviews||[]).forEach(i=>events.push({type:'career',date:i.scheduled_at,title:`Entrevista: ${i.job_title||'Proceso laboral'}`,subtitle:i.company_name||'',detail:`${i.modality||'Entrevista'} · ${i.status==='completed'?'Realizada':'Programada'}`,icon:'fa-calendar-check'}));
    V200.timeline=events.filter(x=>x.date).sort((a,b)=>new Date(b.date)-new Date(a.date));renderCareerTimelineV200();
  }
  window.renderCareerTimelineV200=function(){
    const root=document.getElementById('careerTimelineV200');if(!root)return;const f=document.getElementById('timelineFilterV200')?.value||'all';const all=V200.timeline||[],rows=f==='all'?all:all.filter(x=>x.type===f);
    const stats=document.getElementById('timelineStatsV200');if(stats)stats.innerHTML=[['Experiencias',all.filter(x=>x.type==='work').length],['Formación',all.filter(x=>x.type==='learning').length],['Movimientos laborales',all.filter(x=>x.type==='career').length]].map(x=>`<div class="rounded-2xl bg-slate-50 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">${x[0]}</p><p class="mt-1 text-xl font-black text-lutmin-dark">${x[1]}</p></div>`).join('');
    if(!rows.length){root.innerHTML='<div class="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay eventos para mostrar en esta categoría.</div>';return;}
    let year='';root.innerHTML='<div class="v200-timeline">'+rows.map(e=>{const y=new Date(e.date).getFullYear();const head=String(y)!==year?(year=String(y),`<p class="mb-3 -ml-2 text-[10px] font-black tracking-widest text-slate-400">${y}</p>`):'';const tone=e.type==='work'?'bg-blue-50 text-blue-700':e.type==='learning'?'bg-emerald-50 text-emerald-700':'bg-violet-50 text-violet-700';return `${head}<div class="v200-timeline-item"><span class="v200-timeline-dot"></span><div class="rounded-2xl border border-slate-100 p-4"><div class="flex items-start justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark text-sm">${esc(e.title)}</p><p class="mt-1 text-[11px] text-slate-500">${esc(e.subtitle)}</p></div><span class="v200-chip ${tone}"><i class="fa-solid ${e.icon}"></i>${fmtDate(e.date)}</span></div>${e.detail?`<p class="mt-2 text-xs text-slate-600 leading-relaxed">${esc(e.detail)}</p>`:''}</div></div>`}).join('')+'</div>';
  };

  // Apertura de submódulos V20 sin tocar la navegación estable V18/V19.
  window.openConectaV200=async function(key){
    if(currentLutminUser?.role!=='student')return;ensureOrganizationsUi();ensureTimelineUi();
    if(typeof goToCampusTab==='function')goToCampusTab('talent');
    if(typeof loadTalentCenter==='function')try{if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent',()=>loadTalentCenter(),{ttl:18000});else await loadTalentCenter()}catch(_){ }
    document.querySelectorAll('[data-conecta-key-v182],[data-conecta-mobile-key-v182]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('[data-conecta-v200],[data-conecta-mobile-v200]').forEach(x=>x.classList.toggle('active',x.dataset.conectaV200===key||x.dataset.conectaMobileV200===key));
    const parent=document.getElementById('studentConectaParentV183'),sub=document.getElementById('studentConectaSubnavV183');if(parent&&sub){parent.setAttribute('aria-expanded','true');sub.classList.remove('is-collapsed');}
    if(key==='organizations'){if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent:organizations',()=>loadOrganizationsV200(),{ttl:30000});else await loadOrganizationsV200();document.getElementById('conectaOrganizationsV200')?.scrollIntoView({behavior:'smooth',block:'start'});}
    if(key==='timeline'){if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent:timeline',()=>loadCareerTimelineV200(),{ttl:30000});else await loadCareerTimelineV200();document.getElementById('conectaTimelineV200')?.scrollIntoView({behavior:'smooth',block:'start'});}
  };

  // Si se navega a un submódulo anterior, quitamos el estado activo V20.
  if(typeof openConectaSectionV182==='function'){
    const old=openConectaSectionV182;window.openConectaSectionV182=async function(){document.querySelectorAll('[data-conecta-v200],[data-conecta-mobile-v200]').forEach(x=>x.classList.remove('active'));return old.apply(this,arguments);};
  }

  // ---------------------------------------------------------
  // 3) EMPRESA · TALENTO QUE MOSTRÓ INTERÉS
  // ---------------------------------------------------------
  function ensureCompanyInterestUi(){
    const panel=document.querySelector('section[data-campus-panel="company-conecta"]');if(!panel)return;
    if(!document.querySelector('[data-company-conecta-view="interest"]')){
      const view=document.createElement('div');view.dataset.companyConectaView='interest';view.className='company-conecta-view hidden mt-6';
      view.innerHTML=`<div class="bg-white rounded-3xl border border-slate-100 overflow-hidden"><div class="p-5 sm:p-6 border-b border-slate-100"><div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-cyan-700">Talento opt-in</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Personas interesadas en tu organización</h3><p class="mt-1 text-xs text-slate-500">No son candidatos seleccionados por un algoritmo: son personas que decidieron explícitamente acercarse a tu empresa.</p></div><button onclick="loadCompanyInterestsV200()" class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button></div><div id="companyInterestStatsV200" class="mt-5 grid grid-cols-3 gap-3"></div></div><div id="companyInterestListV200" class="p-5 sm:p-6 grid md:grid-cols-2 gap-4"><div class="md:col-span-2 text-sm text-slate-500">Cargando...</div></div></div>`;
      panel.appendChild(view);
    }
    const tree=document.getElementById('companyConectaTreeV190');
    if(tree&&!tree.querySelector('[data-v190-key="interest"]')){
      tree.insertAdjacentHTML('beforeend','<button type="button" class="workspace-tree-item-v190" data-v190-scope="companyConecta" data-v190-key="interest" onclick="openWorkspaceSectionV190(\'companyConecta\',\'interest\',event)"><i class="fa-solid fa-handshake-angle"></i><span>Talento interesado</span></button>');
    }
    const inline=document.querySelector('.company-conecta-nav')?.parentElement;
    if(inline&&!inline.querySelector('[data-company-conecta-nav="interest"]'))inline.insertAdjacentHTML('beforeend','<button onclick="setCompanyConectaView(\'interest\')" data-company-conecta-nav="interest" class="company-conecta-nav px-4 py-2.5 rounded-xl text-slate-600 text-xs font-bold"><i class="fa-solid fa-handshake-angle mr-2"></i>Talento interesado</button>');
  }
  window.loadCompanyInterestsV200=async function(){
    if(!supabaseClient||currentLutminUser?.role!=='company_admin')return;ensureCompanyInterestUi();const root=document.getElementById('companyInterestListV200');if(root)root.innerHTML='<div class="md:col-span-2 text-sm text-slate-500">Cargando...</div>';
    const args={};const cid=activeCompanyId();if(cid)args.p_company_id=cid;const {data,error}=await supabaseClient.rpc('company_interest_pool_v200',args);if(error){console.warn('V20 interest pool',error);if(root)root.innerHTML='<div class="md:col-span-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Este módulo todavía no está disponible en este entorno.</div>';return;}V200.companyInterests=Array.isArray(data)?data:[];renderCompanyInterestsV200();
  };
  function renderCompanyInterestsV200(){
    const root=document.getElementById('companyInterestListV200');if(!root)return;const rows=V200.companyInterests||[];const stats=document.getElementById('companyInterestStatsV200');if(stats)stats.innerHTML=[['Interesados',rows.length],['Nuevos',rows.filter(x=>x.interest_status==='active').length],['Contactados',rows.filter(x=>x.interest_status==='contacted').length]].map(x=>`<div class="rounded-2xl bg-slate-50 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">${x[0]}</p><p class="mt-1 text-xl font-black text-lutmin-dark">${x[1]}</p></div>`).join('');
    if(!rows.length){root.innerHTML='<div class="md:col-span-2 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Todavía nadie manifestó interés espontáneo en esta organización.</div>';return;}
    root.innerHTML=rows.map(x=>`<article class="v200-soft-card p-5"><div class="flex justify-between gap-3"><div><p class="font-black text-lutmin-dark">${esc(x.full_name||'Perfil profesional')}</p><p class="mt-1 text-xs text-slate-500">${esc(x.headline||x.desired_role||'Perfil profesional')} · ${esc([x.city,x.province].filter(Boolean).join(', ')||'Sin ubicación')}</p></div><span class="v200-chip ${x.interest_status==='contacted'?'bg-blue-50 text-blue-700':'bg-emerald-50 text-emerald-700'}">${x.interest_status==='contacted'?'Contactado':'Nuevo interés'}</span></div>${x.message?`<div class="mt-3 rounded-xl bg-cyan-50 p-3 text-xs text-cyan-900">“${esc(x.message)}”</div>`:''}<div class="mt-3 flex flex-wrap gap-1.5">${(x.skills||[]).slice(0,6).map(s=>`<span class="v200-chip bg-slate-100 text-slate-600">${esc(s.skill)} · ${Number(s.level||0)}/5</span>`).join('')}</div><p class="mt-3 text-[10px] text-slate-400">${Number(x.certificates||0)} certificado(s) Lutmin · interés ${fmtDate(x.interested_at)}</p>${x.email||x.phone?`<p class="mt-2 text-[11px] text-slate-600">${x.email?esc(x.email):''}${x.email&&x.phone?' · ':''}${x.phone?esc(x.phone):''}</p>`:''}<div class="mt-4 flex flex-wrap gap-2"><button onclick="openCompanyCandidateProfile('${x.user_id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Ver perfil</button>${x.interest_status==='active'?`<button onclick="updateCompanyInterestV200('${x.user_id}','contacted')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Marcar contactado</button>`:''}<button onclick="updateCompanyInterestV200('${x.user_id}','closed')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">Cerrar interés</button></div></article>`).join('');
  }
  window.updateCompanyInterestV200=async function(userId,status){const args={p_user_id:userId,p_status:status};const cid=activeCompanyId();if(cid)args.p_company_id=cid;const {error}=await supabaseClient.rpc('company_update_interest_v200',args);if(error)return showToast(error.message||'No pude actualizar el interés.');showToast(status==='contacted'?'Marcado como contactado.':'Interés cerrado.');await loadCompanyInterestsV200();};

  if(typeof setCompanyConectaView==='function'){
    const old=setCompanyConectaView;window.setCompanyConectaView=function(view){ensureCompanyInterestUi();const r=old.apply(this,arguments);if(view==='interest'){if(window.LutminV29Data?.load)window.LutminV29Data.load('company:interests',()=>loadCompanyInterestsV200(),{ttl:20000});else loadCompanyInterestsV200();}return r;};
  }

  // ---------------------------------------------------------
  // 4) ONBOARDING AUTOPILOT EMPRESA
  // ---------------------------------------------------------
  function ensureCompanyOnboardingUi(){
    const panel=document.querySelector('section[data-campus-panel="company"]');if(!panel)return;
    if(!document.getElementById('companyOnboardingV200')){
      const agenda=document.getElementById('companyPortalAgenda')?.parentElement;
      const box=document.createElement('div');box.id='companyOnboardingV200';box.className='mt-6 bg-white rounded-3xl border border-slate-100 overflow-hidden';
      box.innerHTML=`<div class="p-5 sm:p-6 border-b border-slate-100"><div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-emerald-700">Onboarding Autopilot</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Incorporaciones guiadas por el perfil de puesto</h3><p class="mt-1 text-xs text-slate-500 max-w-2xl">Lutmin convierte requisitos de puesto en pasos concretos y los cierra automáticamente cuando detecta perfil completo, cursos aprobados o competencias alcanzadas.</p></div><button onclick="loadCompanyOnboardingV200()" class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button></div><div id="onboardingStatsV200" class="mt-5 grid grid-cols-3 gap-3"></div><div class="mt-4 grid md:grid-cols-[1fr_1fr_130px] gap-2"><select id="onboardingMemberV200" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"></select><select id="onboardingRoleV200" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"></select><button onclick="createOnboardingV200()" class="px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Generar plan</button></div></div><div id="onboardingPlansV200" class="p-5 sm:p-6 space-y-4"><div class="text-sm text-slate-500">Cargando incorporaciones...</div></div>`;
      if(agenda)agenda.insertAdjacentElement('beforebegin',box);else panel.appendChild(box);
    }
    const tree=document.getElementById('companyTreeV190');
    if(tree&&!tree.querySelector('[data-v200-company-onboarding]')){
      const team=tree.querySelector('[data-v190-key="team"]');team?.insertAdjacentHTML('afterend','<button type="button" class="workspace-tree-item-v190" data-v190-scope="company" data-v200-company-onboarding="1" onclick="openCompanyOnboardingV200(event)"><i class="fa-solid fa-user-plus"></i><span>Onboarding</span></button>');
    }
  }
  window.openCompanyOnboardingV200=async function(event){event?.stopPropagation?.();if(typeof goToCampusTab==='function')goToCampusTab('company');ensureCompanyOnboardingUi();document.querySelectorAll('[data-v190-scope="company"]').forEach(b=>b.classList.toggle('active',!!b.dataset.v200CompanyOnboarding));const parent=document.getElementById('companyDesktopTab'),tree=document.getElementById('companyTreeV190');if(parent&&tree){parent.setAttribute('aria-expanded','true');tree.classList.remove('is-collapsed');}if(window.LutminV29Data?.load)await window.LutminV29Data.load('company:onboarding',()=>loadCompanyOnboardingV200(),{ttl:20000});else await loadCompanyOnboardingV200();document.getElementById('companyOnboardingV200')?.scrollIntoView({behavior:'smooth',block:'start'});};

  window.loadCompanyOnboardingV200=async function(){
    if(!supabaseClient||currentLutminUser?.role!=='company_admin')return;ensureCompanyOnboardingUi();const cid=activeCompanyId();const args={};if(cid)args.p_company_id=cid;
    const [o,d]=await Promise.all([supabaseClient.rpc('company_onboarding_overview_v200',args),supabaseClient.rpc('development_center_v100',args)]);
    if(o.error){console.warn('V20 onboarding',o.error);document.getElementById('onboardingPlansV200').innerHTML='<div class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Onboarding todavía no está disponible en este entorno.</div>';return;}
    V200.onboarding=o.data||{plans:[]};V200.development=d.error?{role_profiles:[]}:(d.data||{});renderCompanyOnboardingV200();
  };
  function renderCompanyOnboardingV200(){
    const plans=V200.onboarding?.plans||[],members=companyPortalData?.members||[],roles=(V200.development?.role_profiles||[]).filter(x=>x.active!==false);
    const msel=document.getElementById('onboardingMemberV200'),rsel=document.getElementById('onboardingRoleV200');if(msel){const v=msel.value;msel.innerHTML='<option value="">Elegí colaborador</option>'+members.map(x=>`<option value="${x.user_id}">${esc(x.full_name||x.email||'Colaborador')}</option>`).join('');if([...msel.options].some(o=>o.value===v))msel.value=v;}if(rsel){const v=rsel.value;rsel.innerHTML='<option value="">Usar perfil asignado</option>'+roles.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if([...rsel.options].some(o=>o.value===v))rsel.value=v;}
    const active=plans.filter(x=>x.status==='active').length,completed=plans.filter(x=>x.status==='completed').length,attention=plans.filter(x=>x.status==='active'&&Number(x.progress||0)<50).length;document.getElementById('onboardingStatsV200').innerHTML=[['En curso',active],['Completados',completed],['Requieren atención',attention]].map(x=>`<div class="rounded-2xl bg-slate-50 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">${x[0]}</p><p class="mt-1 text-xl font-black text-lutmin-dark">${x[1]}</p></div>`).join('');
    const root=document.getElementById('onboardingPlansV200');if(!plans.length){root.innerHTML='<div class="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No hay planes de incorporación todavía. Al asignar un perfil de puesto a una nueva persona, Lutmin puede generarlo automáticamente.</div>';return;}
    root.innerHTML=plans.map(p=>{const items=p.items||[],pct=Number(p.progress||0);return `<article class="v200-soft-card p-5"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><h4 class="font-black text-lutmin-dark">${esc(p.full_name||'Colaborador')}</h4><span class="v200-chip ${p.status==='completed'?'bg-emerald-50 text-emerald-700':'bg-blue-50 text-blue-700'}">${p.status==='completed'?'Completado':'En curso'}</span></div><p class="mt-1 text-xs text-slate-500">${esc(p.role_name||'Sin perfil de puesto')} · objetivo ${fmtDate(p.target_date)}</p></div><div class="min-w-[150px]"><div class="flex justify-between text-[10px] font-bold"><span>Progreso</span><strong>${pct}%</strong></div><div class="v200-progress mt-1"><span style="width:${pct}%"></span></div></div></div><div class="mt-4 grid xl:grid-cols-2 gap-2">${items.map(i=>{const done=i.status==='completed'||i.status==='skipped',automatic=i.item_type!=='manual';const icon=done?'fa-check':i.item_type==='course'?'fa-graduation-cap':i.item_type==='competency'?'fa-bolt':i.item_type==='profile'?'fa-id-card':i.item_type==='cv'?'fa-file-lines':'fa-list-check';return `<div class="v200-onboarding-item"><div class="v200-onboarding-icon ${done?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-blue-600'}"><i class="fa-solid ${icon}"></i></div><div><p class="text-xs font-extrabold text-lutmin-dark ${done?'line-through opacity-60':''}">${esc(i.title)}</p><p class="mt-1 text-[10px] text-slate-400">${automatic?'Se actualiza automáticamente':'Confirmación del equipo'}${i.due_date?' · '+fmtDate(i.due_date):''}</p></div>${!automatic&&!done?`<button data-v200-action onclick="setOnboardingItemV200('${i.id}','completed')" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold">Completar</button>`:`<span data-v200-action class="text-[10px] font-bold ${done?'text-emerald-600':'text-slate-400'}">${done?'OK':'Pendiente'}</span>`}</div>`}).join('')}</div></article>`}).join('');
  }
  window.createOnboardingV200=async function(){const userId=document.getElementById('onboardingMemberV200')?.value,roleId=document.getElementById('onboardingRoleV200')?.value||null;if(!userId)return showToast('Elegí un colaborador.');const args={p_user_id:userId,p_role_profile_id:roleId,p_target_days:30};const cid=activeCompanyId();if(cid)args.p_company_id=cid;const {error}=await supabaseClient.rpc('company_create_onboarding_v200',args);if(error)return showToast(error.message||'No pude generar el onboarding.');showToast('Plan de incorporación generado y conectado con el perfil de puesto.');await loadCompanyOnboardingV200();};
  window.setOnboardingItemV200=async function(id,status){const args={p_item_id:id,p_status:status};const cid=activeCompanyId();if(cid)args.p_company_id=cid;const {error}=await supabaseClient.rpc('company_set_onboarding_item_v200',args);if(error)return showToast(error.message||'No pude actualizar el paso.');await loadCompanyOnboardingV200();};

  // ---------------------------------------------------------
  // 5) ALUMNO · MI INCORPORACIÓN (sólo aparece si existe)
  // ---------------------------------------------------------
  function ensureStudentOnboardingPanel(){
    if(document.getElementById('studentOnboardingPanelV200'))return;
    const host=document.querySelector('#campusModal .overflow-y-auto.modal-scroll.flex-1');if(!host)return;
    const panel=document.createElement('section');panel.id='studentOnboardingPanelV200';panel.className='campus-panel hidden';panel.dataset.campusPanel='onboarding-v200';panel.innerHTML=`<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-emerald-700">Mi incorporación</p><h2 class="mt-1 text-2xl sm:text-3xl font-black text-lutmin-dark">Tu llegada, ordenada paso a paso.</h2><p class="mt-2 text-sm text-slate-500">Lutmin actualiza automáticamente lo que ya cumpliste. No necesitás informar cursos, perfil o competencias que el sistema ya conoce.</p></div><button onclick="loadMyOnboardingV200()" class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button></div><div id="myOnboardingListV200" class="mt-6 space-y-4"></div>`;host.appendChild(panel);
  }
  function ensureStudentOnboardingNav(show){
    const nav=document.getElementById('campusSidebarNavV183');if(!nav)return;let btn=document.getElementById('studentOnboardingNavV200');if(!btn){btn=document.createElement('button');btn.id='studentOnboardingNavV200';btn.dataset.studentOnly='true';btn.dataset.campusTab='onboarding-v200';btn.className='campus-tab w-full text-left p-3 rounded-xl text-slate-300 hover:bg-white/10';btn.innerHTML='<i class="fa-solid fa-person-circle-check w-7"></i>Mi incorporación';btn.onclick=()=>{goToCampusTab('onboarding-v200');loadMyOnboardingV200();};const conecta=document.getElementById('studentConectaParentV183');conecta?.insertAdjacentElement('beforebegin',btn);}btn.classList.toggle('hidden',!show);
    const mobileWrap=document.querySelector('#campusModal .lg\\:hidden .flex.overflow-x-auto');if(mobileWrap){let mb=document.getElementById('studentOnboardingMobileV200');if(!mb){mb=document.createElement('button');mb.id='studentOnboardingMobileV200';mb.dataset.studentOnly='true';mb.dataset.campusTab='onboarding-v200';mb.className='campus-tab whitespace-nowrap px-4 py-2 rounded-xl text-slate-300 text-xs';mb.textContent='Incorporación';mb.onclick=()=>{goToCampusTab('onboarding-v200');loadMyOnboardingV200();};mobileWrap.appendChild(mb);}mb.classList.toggle('hidden',!show);}
  }
  window.loadMyOnboardingV200=async function(){if(!supabaseClient||currentLutminUser?.role!=='student')return;ensureStudentOnboardingPanel();const {data,error}=await supabaseClient.rpc('my_onboarding_v200');if(error){console.warn('V20 my onboarding',error);ensureStudentOnboardingNav(false);return;}V200.myOnboarding=Array.isArray(data)?data:[];ensureStudentOnboardingNav(V200.myOnboarding.length>0);renderMyOnboardingV200();};
  function renderMyOnboardingV200(){const root=document.getElementById('myOnboardingListV200');if(!root)return;const plans=V200.myOnboarding||[];if(!plans.length){root.innerHTML='<div class="rounded-3xl bg-white border border-slate-100 p-6 text-sm text-slate-500">No tenés un plan de incorporación activo.</div>';return;}root.innerHTML=plans.map(p=>{const items=p.items||[],pct=Number(p.progress||0);return `<article class="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-bold text-emerald-600">${esc(p.company_name||'Empresa')}</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">${esc(p.role_name||p.title||'Plan de incorporación')}</h3><p class="mt-1 text-xs text-slate-500">Objetivo ${fmtDate(p.target_date)}</p></div><div class="min-w-[150px]"><div class="flex justify-between text-[10px] font-bold"><span>Progreso</span><strong>${pct}%</strong></div><div class="v200-progress mt-1"><span style="width:${pct}%"></span></div></div></div><div class="mt-5 grid md:grid-cols-2 gap-2">${items.map(i=>{const done=i.status==='completed'||i.status==='skipped';return `<div class="v200-onboarding-item"><div class="v200-onboarding-icon ${done?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-blue-600'}"><i class="fa-solid ${done?'fa-check':'fa-arrow-right'}"></i></div><div><p class="text-xs font-bold text-lutmin-dark ${done?'line-through opacity-60':''}">${esc(i.title)}</p><p class="mt-1 text-[10px] text-slate-400">${done?'Completado':'Pendiente'}${i.due_date?' · '+fmtDate(i.due_date):''}</p></div></div>`}).join('')}</div></article>`}).join('');}

  // ---------------------------------------------------------
  // 6) Integración segura con cargas existentes
  // ---------------------------------------------------------
  function installV200(){
    ensureOrganizationsUi();ensureTimelineUi();ensureCompanyInterestUi();ensureCompanyOnboardingUi();ensureStudentOnboardingPanel();
    if(currentLutminUser?.role==='student'){if(window.LutminV29Data?.load)window.LutminV29Data.load('student:onboarding',()=>loadMyOnboardingV200(),{ttl:30000});else loadMyOnboardingV200();}
    if(currentLutminUser?.role==='company_admin'){if(window.LutminV29Data?.load){window.LutminV29Data.load('company:interests',()=>loadCompanyInterestsV200(),{ttl:20000});window.LutminV29Data.load('company:onboarding',()=>loadCompanyOnboardingV200(),{ttl:20000});}else{loadCompanyInterestsV200();loadCompanyOnboardingV200();}}
  }

  if(typeof loadTalentCenter==='function'){
    const old=loadTalentCenter;window.loadTalentCenter=async function(){const r=await old.apply(this,arguments);ensureOrganizationsUi();ensureTimelineUi();return r;};
  }
  if(typeof loadCompanyPortalData==='function'){
    const old=loadCompanyPortalData;window.loadCompanyPortalData=async function(){const r=await old.apply(this,arguments);ensureCompanyOnboardingUi();setTimeout(()=>{if(window.LutminV29Data?.load)window.LutminV29Data.load('company:onboarding',()=>loadCompanyOnboardingV200(),{ttl:20000});else loadCompanyOnboardingV200();},80);return r;};
  }
  if(typeof loadCompanyConectaData==='function'){
    const old=loadCompanyConectaData;window.loadCompanyConectaData=async function(){const r=await old.apply(this,arguments);ensureCompanyInterestUi();setTimeout(()=>{if(window.LutminV29Data?.load)window.LutminV29Data.load('company:interests',()=>loadCompanyInterestsV200(),{ttl:20000});else loadCompanyInterestsV200();},80);return r;};
  }
  if(typeof paintCurrentLutminUser==='function'){
    const old=paintCurrentLutminUser;window.paintCurrentLutminUser=function(){const r=old.apply(this,arguments);setTimeout(installV200,120);return r;};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV200,900));else setTimeout(installV200,900);
})();
