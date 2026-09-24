
// =========================================================
// LUTMIN V3.8 — UX, PRIVACIDAD Y RENDIMIENTO
// Mesa de ayuda privada · Entrevistas protagonistas · actividad
// Carga progresiva y medición de módulos
// =========================================================
let notificationFilterV37='all';
let v37Perf={};
let v37ActiveLoads=0;

function v37InitProgress(){
  if(document.getElementById('v37Progress'))return;
  const el=document.createElement('div');el.id='v37Progress';el.className='fixed top-0 left-0 right-0 z-[200] h-1 pointer-events-none hidden';
  el.innerHTML='<div class="h-full bg-lutmin-light animate-pulse" style="width:72%"></div>';document.body.appendChild(el);
}
function v37Loading(on){v37InitProgress();v37ActiveLoads=Math.max(0,v37ActiveLoads+(on?1:-1));document.getElementById('v37Progress')?.classList.toggle('hidden',v37ActiveLoads===0);}
async function v37Measure(name,fn){const t=performance.now();v37Loading(true);try{return await fn();}finally{v37Loading(false);v37Perf[name]=Math.round(performance.now()-t);renderPerfV37();}}
function v37PerfClass(ms){return ms<600?'text-emerald-600':ms<1400?'text-amber-600':'text-red-600';}
function initPerfV37(){
  const host=document.getElementById('adminSystemGuideV19');if(!host||document.getElementById('v37PerfPanel'))return;
  const box=document.createElement('div');box.id='v37PerfPanel';box.className='border-t border-slate-100 p-5 sm:p-6';
  box.innerHTML='<div class="flex items-center justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-600">V3.7 · RENDIMIENTO</p><h4 class="mt-1 font-extrabold text-lutmin-dark">Tiempos de carga de esta sesión</h4><p class="mt-1 text-xs text-slate-500">Mide los módulos en este navegador para encontrar dónde está la demora real.</p></div><button onclick="v37Perf={};renderPerfV37()" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Limpiar</button></div><div id="v37PerfRows" class="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-2"></div>';
  host.appendChild(box);renderPerfV37();
}
function renderPerfV37(){const root=document.getElementById('v37PerfRows');if(!root)return;const rows=Object.entries(v37Perf).sort((a,b)=>b[1]-a[1]);root.innerHTML=rows.length?rows.map(([n,ms])=>`<div class="rounded-xl bg-slate-50 px-3 py-3 flex items-center justify-between gap-3"><span class="text-xs font-bold text-slate-700">${escapeHtml(n)}</span><strong class="text-xs ${v37PerfClass(ms)}">${ms} ms</strong></div>`).join(''):'<p class="text-xs text-slate-500 sm:col-span-2">Todavía no hay mediciones. Abrí distintos módulos y los tiempos aparecerán acá.</p>';}

// ---------------------------------------------------------
// MESA DE AYUDA V3.7: listado liviano y conversación bajo demanda
// ---------------------------------------------------------
loadSupportCenter=async function(){
  if(!supabaseClient||!currentLutminUser)return;
  return v37Measure('Mesa de ayuda',async()=>{
    const {data,error}=await supabaseClient.rpc('get_support_center_v37',{p_limit:currentLutminUser.role==='admin'?250:80});
    if(error){console.error(error);return showToast('No pude cargar la Mesa de ayuda. Revisá la configuración del módulo.');}
    supportTickets=Array.isArray(data)?data:[];supportMessages=[];renderSupportCenterV37();
  });
};
function renderSupportCenterV37(){
  const root=document.getElementById('supportTicketsList');if(!root)return;
  const isAdmin=currentLutminUser?.role==='admin';const intro=document.getElementById('supportIntro');
  if(intro)intro.textContent=isAdmin?'Ves todas las consultas. Cada usuario y empresa solamente puede ver las consultas creadas por su propia cuenta.':'Tus consultas son privadas: solamente vos y Administración de Lutmin pueden verlas.';
  if(!supportTickets.length){root.innerHTML='<div class="p-6 text-sm text-slate-500">Todavía no hay consultas.</div>';return;}
  root.innerHTML=supportTickets.map(t=>{const date=new Date(t.updated_at||t.created_at).toLocaleString('es-AR');const ticket=String(t.id||'').slice(0,8).toUpperCase();return `<button onclick="openSupportThread('${t.id}')" class="w-full p-5 text-left hover:bg-slate-50"><div class="flex items-start justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap gap-2"><span class="px-2 py-1 rounded-full ${supportStatusClass(t.status)} text-[10px] font-bold">${supportStatusLabel(t.status)}</span><span class="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">#${ticket}</span>${t.priority==='alta'?'<span class="px-2 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">ALTA</span>':''}</div><p class="mt-2 font-extrabold text-sm text-lutmin-dark">${escapeHtml(t.subject)}</p>${isAdmin?`<p class="mt-1 text-[11px] font-bold text-blue-700">${escapeHtml(t.requester_name||t.requester_email||'Usuario')}${t.company_name?' · '+escapeHtml(t.company_name):''}</p>`:''}<p class="mt-1 text-xs text-slate-500 line-clamp-1">${escapeHtml(t.last_message||'')}</p><p class="mt-1 text-[10px] text-slate-400">${Number(t.message_count||0)} mensaje(s)</p></div><span class="text-[10px] text-slate-400 shrink-0">${date}</span></div></button>`}).join('');
}
openSupportThread=async function(ticketId){
  const {data,error}=await supabaseClient.rpc('get_support_thread_v37',{p_ticket_id:ticketId});
  if(error||!data)return showToast(error?.message||'No pude abrir la consulta.');
  const t=data.ticket;const msgs=Array.isArray(data.messages)?data.messages:[];supportMessages=msgs;
  const local=supportTickets.find(x=>x.id===ticketId);if(local)Object.assign(local,t);
  document.getElementById('supportActiveTicket').value=t.id;document.getElementById('supportThreadTitle').textContent=`#${String(t.id).slice(0,8).toUpperCase()} · ${t.subject}`;document.getElementById('supportThreadStatus').value=t.status;
  document.getElementById('supportAdminStatusWrap').classList.toggle('hidden',currentLutminUser?.role!=='admin');
  document.getElementById('supportThreadMessages').innerHTML=msgs.map(m=>{const mine=m.sender_id===currentLutminUser.id;return `<div class="flex ${mine?'justify-end':'justify-start'}"><div class="max-w-[85%] rounded-2xl ${mine?'bg-lutmin-dark text-white':'bg-slate-100 text-slate-700'} px-4 py-3"><p class="text-[10px] font-bold ${mine?'text-slate-300':'text-slate-400'}">${escapeHtml(mine?'Vos':m.sender_name||'Lutmin')}</p><p class="mt-1 text-sm whitespace-pre-wrap">${escapeHtml(m.message)}</p><p class="mt-1 text-[9px] ${mine?'text-slate-300':'text-slate-400'}">${new Date(m.created_at).toLocaleString('es-AR')}</p></div></div>`}).join('')||'<div class="text-sm text-slate-500">Sin mensajes.</div>';
  openModal('supportThreadModal');
};

// ---------------------------------------------------------
// NOTIFICACIONES: Centro de actividad con filtros
// ---------------------------------------------------------
function v37NotificationGroup(item){const k=String(item.kind||'');const tab=String(item.action_tab||'');if(['job','interview'].includes(k)||tab==='talent'||tab==='company-conecta')return 'conecta';if(['course','certificate'].includes(k)||['courses','certificates','agenda'].includes(tab))return 'academy';if(k==='support'||tab==='support')return 'support';return 'system';}
function initNotificationFiltersV37(){
  const list=document.getElementById('notificationCenterList');if(!list||document.getElementById('v37NotificationFilters'))return;
  const bar=document.createElement('div');bar.id='v37NotificationFilters';bar.className='mt-6 bg-white rounded-2xl border border-slate-100 p-2 flex flex-wrap gap-2';
  bar.innerHTML=[['all','Todas'],['conecta','Conecta'],['academy','Academia'],['support','Ayuda'],['system','Sistema']].map(([k,l])=>`<button data-v37-notif="${k}" onclick="setNotificationFilterV37('${k}')" class="px-3 py-2 rounded-xl text-xs font-bold ${k==='all'?'bg-lutmin-dark text-white':'text-slate-600'}">${l}</button>`).join('');list.parentNode.insertBefore(bar,list);
}
function setNotificationFilterV37(v){notificationFilterV37=v;document.querySelectorAll('[data-v37-notif]').forEach(b=>{const a=b.dataset.v37Notif===v;b.classList.toggle('bg-lutmin-dark',a);b.classList.toggle('text-white',a);b.classList.toggle('text-slate-600',!a)});renderNotificationCenter();}
renderNotificationCenter=function(){
  initNotificationFiltersV37();const root=document.getElementById('notificationCenterList');if(!root)return;
  const direct=notificationCenterData.notifications||[],announcements=notificationCenterData.announcements||[];
  document.getElementById('notificationDirectStat').textContent=String(direct.length);document.getElementById('notificationAnnouncementStat').textContent=String(announcements.length);paintNotificationBadges();
  let rows=[...direct.map(x=>({...x,sortDate:x.created_at})),...announcements.map(x=>({...x,sortDate:x.created_at}))].sort((a,b)=>new Date(b.sortDate)-new Date(a.sortDate));
  if(notificationFilterV37!=='all')rows=rows.filter(x=>v37NotificationGroup(x)===notificationFilterV37);
  if(!rows.length){root.innerHTML='<div class="p-8 text-center"><div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto"><i class="fa-regular fa-bell"></i></div><p class="mt-3 font-bold text-lutmin-dark">No hay novedades en este filtro</p></div>';renderV37Pulses();return;}
  root.innerHTML=rows.map(item=>{const [icon,bg,text]=notificationKindMeta(item.kind||(item.source==='announcement'?'system':'info'));const unread=!item.read;const group=v37NotificationGroup(item);const label={conecta:'Conecta',academy:'Academia',support:'Ayuda',system:'Sistema'}[group]||'Novedad';return `<button onclick="openNotificationItem('${item.source}','${item.id}','${escapeHtml(item.action_tab||'')}')" class="w-full text-left p-5 sm:p-6 hover:bg-slate-50 transition ${unread?'bg-blue-50/30':''}"><div class="flex gap-4"><div class="w-11 h-11 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0"><i class="fa-solid ${icon}"></i></div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark">${escapeHtml(item.title||'Novedad')}</p>${unread?'<span class="w-2 h-2 rounded-full bg-red-500"></span>':''}<span class="text-[10px] uppercase font-bold text-slate-400">${label}</span></div><p class="mt-1 text-sm text-slate-600 leading-relaxed">${escapeHtml(item.body||'')}</p><p class="mt-2 text-[10px] text-slate-400">${notificationDate(item.created_at)}</p></div></div></button>`}).join('');renderV37Pulses();
};

// ---------------------------------------------------------
// CONECTA: entrevistas y actividad toman protagonismo
// ---------------------------------------------------------
function initConectaPulseV37(){
  const approval=document.getElementById('talentApprovalCard');if(approval&&!document.getElementById('v37TalentPulse')){const el=document.createElement('div');el.id='v37TalentPulse';el.className='mt-5';approval.parentNode.insertBefore(el,approval);}
  const overview=document.querySelector('[data-company-conecta-view="overview"]');if(overview&&!document.getElementById('v37CompanyPulse')){const el=document.createElement('div');el.id='v37CompanyPulse';el.className='mb-5';overview.insertBefore(el,overview.firstChild);}
}
function v37UpcomingInterviews(rows){const now=Date.now();return (rows||[]).filter(i=>i.status==='scheduled'&&new Date(i.scheduled_at).getTime()>=now).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));}
function renderV37TalentPulse(){const root=document.getElementById('v37TalentPulse');if(!root||currentLutminUser?.role!=='student')return;const upcoming=v37UpcomingInterviews(talentData.applicationDetails?.interviews||[]);const next=upcoming[0];const conectaUnread=(notificationCenterData.notifications||[]).filter(n=>!n.read&&v37NotificationGroup(n)==='conecta').length;root.innerHTML=`<div class="rounded-3xl bg-gradient-to-r from-violet-950 to-lutmin-dark text-white p-5 sm:p-6"><div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"><div><p class="text-[10px] uppercase tracking-[.2em] font-extrabold text-violet-200">Conecta hoy</p>${next?`<h3 class="mt-2 text-xl sm:text-2xl font-black">Tu próxima entrevista · ${new Date(next.scheduled_at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})}</h3><p class="mt-1 text-sm text-slate-300">${escapeHtml(next.job_title||'Búsqueda')} · ${escapeHtml(next.company_name||'Empresa')} · ${escapeHtml(next.modality||'')}</p>`:`<h3 class="mt-2 text-xl font-black">Tu actividad laboral en un solo lugar</h3><p class="mt-1 text-sm text-slate-300">Postulaciones, entrevistas y novedades importantes de Conecta.</p>`}</div><div class="flex flex-wrap gap-2">${next?.meeting_url?`<a href="${escapeHtml(next.meeting_url)}" target="_blank" rel="noopener" class="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-xs font-extrabold"><i class="fa-solid fa-video mr-2"></i>Abrir entrevista</a>`:''}<button onclick="document.getElementById('talentInterviewsList')?.scrollIntoView({behavior:'smooth'})" class="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold">Entrevistas (${upcoming.length})</button><button onclick="goToCampusTab('notifications');loadNotificationCenter()" class="px-4 py-2.5 rounded-xl bg-white text-lutmin-dark text-xs font-extrabold">Novedades${conectaUnread?` · ${conectaUnread}`:''}</button></div></div></div>`;}
function renderV37CompanyPulse(){const root=document.getElementById('v37CompanyPulse');if(!root||currentLutminUser?.role!=='company_admin')return;const all=companyJobPipelineData?.interviews||[];const upcoming=v37UpcomingInterviews(all);const today=new Date().toISOString().slice(0,10);const todayRows=upcoming.filter(i=>new Date(i.scheduled_at).toISOString().slice(0,10)===today);const next=upcoming[0];root.innerHTML=`<div class="rounded-3xl bg-gradient-to-r from-violet-950 to-lutmin-dark text-white p-5 sm:p-6"><div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5"><div><p class="text-[10px] uppercase tracking-[.2em] font-extrabold text-violet-200">Entrevistas · Conecta</p><h3 class="mt-2 text-xl sm:text-2xl font-black">${todayRows.length?`${todayRows.length} entrevista(s) para hoy`:(next?'Próxima entrevista programada':'Todavía no hay entrevistas próximas')}</h3>${next?`<p class="mt-1 text-sm text-slate-300">${escapeHtml(next.full_name||'Candidato')} · ${escapeHtml(next.job_title||'Búsqueda')} · ${new Date(next.scheduled_at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})}</p>`:'<p class="mt-1 text-sm text-slate-300">Cuando programes una entrevista aparecerá destacada acá.</p>'}</div><div class="flex flex-wrap gap-2"><button onclick="setCompanyConectaView('interviews')" class="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-xs font-extrabold"><i class="fa-solid fa-calendar-check mr-2"></i>Ver agenda (${upcoming.length})</button><button onclick="goToCampusTab('notifications');loadNotificationCenter()" class="px-4 py-2.5 rounded-xl bg-white text-lutmin-dark text-xs font-extrabold"><i class="fa-solid fa-bell mr-2"></i>Actividad</button></div></div></div>`;
  const nav=document.querySelector('[data-company-conecta-nav="interviews"]');if(nav){let badge=nav.querySelector('[data-v37-int-badge]');if(!badge){badge=document.createElement('span');badge.dataset.v37IntBadge='1';badge.className='ml-2 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[9px] font-black';nav.appendChild(badge);}badge.textContent=String(upcoming.length);}
}
function renderV37Pulses(){initConectaPulseV37();renderV37TalentPulse();renderV37CompanyPulse();}

const _renderTalentCenterV37=renderTalentCenter;
renderTalentCenter=function(){const r=_renderTalentCenterV37.apply(this,arguments);renderV37TalentPulse();return r;};
const _renderCompanyConectaHubV37=renderCompanyConectaHub;
renderCompanyConectaHub=function(){const r=_renderCompanyConectaHubV37.apply(this,arguments);renderV37CompanyPulse();return r;};

// Agenda de entrevistas mejorada para empresa.
function v37InterviewStatusLabel(s){return({scheduled:'Programada',completed:'Realizada',cancelled:'Cancelada',no_show:'No se presentó',rescheduled:'A reprogramar'})[s]||s;}
renderCompanyInterviews=function(){
  const root=document.getElementById('companyInterviewsList');if(!root)return;const rows=[...(companyJobPipelineData?.interviews||[])].sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));const upcoming=v37UpcomingInterviews(rows);const history=rows.filter(i=>!upcoming.some(u=>u.id===i.id)).sort((a,b)=>new Date(b.scheduled_at)-new Date(a.scheduled_at));
  const card=i=>`<div class="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${i.status==='scheduled'?'bg-violet-50/30':''}"><div><div class="flex flex-wrap gap-2"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${i.status==='scheduled'?'bg-violet-100 text-violet-700':'bg-slate-100 text-slate-600'}">${escapeHtml(v37InterviewStatusLabel(i.status))}</span><span class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(i.job_title||'Búsqueda')}</span></div><h4 class="mt-2 font-extrabold text-lutmin-dark">${escapeHtml(i.full_name||'Candidato')}</h4><p class="mt-1 text-xs text-slate-500">${new Date(i.scheduled_at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})} · ${escapeHtml(i.modality||'')}</p>${i.location?`<p class="mt-1 text-[11px] text-slate-500">${escapeHtml(i.location)}</p>`:''}</div><div class="flex flex-wrap gap-2"><button onclick="openCompanyCandidateProfile('${i.user_id}','${i.application_id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Ver candidato</button>${i.meeting_url&&i.status==='scheduled'?`<a href="${escapeHtml(i.meeting_url)}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Abrir reunión</a>`:''}<button onclick="openInterviewNoteV37('${i.id}')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Nota privada</button>${i.status==='scheduled'?`<button onclick="companyUpdateInterviewStatus('${i.id}','completed')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Realizada</button><button onclick="companyUpdateInterviewStatus('${i.id}','no_show')" class="px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold">No se presentó</button><button onclick="reprogramInterviewV37('${i.id}','${i.user_id}','${i.application_id}')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Reprogramar</button><button onclick="companyUpdateInterviewStatus('${i.id}','cancelled')" class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Cancelar</button>`:''}</div></div>`;
  root.innerHTML=(upcoming.length?`<div class="p-4 bg-violet-50 border-b border-violet-100"><p class="text-xs font-extrabold text-violet-800">PRÓXIMAS · ${upcoming.length}</p></div>${upcoming.map(card).join('')}`:'<div class="p-5 text-sm text-slate-500">No hay entrevistas próximas.</div>')+(history.length?`<div class="p-4 bg-slate-50 border-y border-slate-100"><p class="text-xs font-extrabold text-slate-600">HISTORIAL</p></div>${history.slice(0,30).map(card).join('')}`:'');renderV37CompanyPulse();
};
async function reprogramInterviewV37(id,userId,applicationId){const {error}=await supabaseClient.rpc('company_update_interview_status',{p_interview_id:id,p_status:'rescheduled'});if(error)return showToast(error.message||'No pude marcar la entrevista para reprogramar.');showToast('Entrevista marcada para reprogramar. Elegí la nueva fecha en el perfil del candidato.');await loadCompanyConectaData();await openCompanyCandidateProfile(userId,applicationId);}
async function openInterviewNoteV37(id){
  const {data,error}=await supabaseClient.from('job_interviews').select('id,company_private_notes,outcome').eq('id',id).maybeSingle();if(error)return showToast('No pude abrir la nota privada.');
  let modal=document.getElementById('v37InterviewNoteModal');if(!modal){modal=document.createElement('div');modal.id='v37InterviewNoteModal';modal.className='fixed inset-0 z-[130] hidden items-center justify-center bg-slate-950/60 p-4';modal.innerHTML=`<div class="bg-white rounded-3xl w-full max-w-xl p-6"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-violet-600">Entrevista</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Nota privada de la empresa</h3><p class="mt-1 text-xs text-slate-500">El candidato no puede ver esta observación.</p></div><button onclick="document.getElementById('v37InterviewNoteModal').classList.add('hidden');document.getElementById('v37InterviewNoteModal').classList.remove('flex')" class="w-9 h-9 rounded-xl bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div><input id="v37InterviewNoteId" type="hidden"><textarea id="v37InterviewNoteText" rows="6" class="mt-5 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Impresión de entrevista, próximos pasos..."></textarea><select id="v37InterviewOutcome" class="mt-3 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"><option value="">Sin resultado definido</option><option value="advance">Avanza</option><option value="hold">En espera</option><option value="reject">No continúa</option><option value="hired">Seleccionado/a</option></select><button onclick="saveInterviewNoteV37()" class="mt-4 w-full py-3 rounded-xl bg-lutmin-dark text-white text-sm font-bold">Guardar nota privada</button></div>`;document.body.appendChild(modal);}
  document.getElementById('v37InterviewNoteId').value=id;document.getElementById('v37InterviewNoteText').value=data?.company_private_notes||'';document.getElementById('v37InterviewOutcome').value=data?.outcome||'';modal.classList.remove('hidden');modal.classList.add('flex');
}
async function saveInterviewNoteV37(){const id=document.getElementById('v37InterviewNoteId').value,note=document.getElementById('v37InterviewNoteText').value,outcome=document.getElementById('v37InterviewOutcome').value||null;const {error}=await supabaseClient.rpc('company_save_interview_note_v37',{p_interview_id:id,p_private_notes:note,p_outcome:outcome});if(error)return showToast(error.message||'No pude guardar la nota.');document.getElementById('v37InterviewNoteModal').classList.add('hidden');document.getElementById('v37InterviewNoteModal').classList.remove('flex');showToast('Nota privada guardada.');}

// ---------------------------------------------------------
// Medición de loaders principales. No bloquea ni cambia datos.
// ---------------------------------------------------------
const _loadCampusDataV37=loadCampusData;loadCampusData=async function(){return v37Measure('Campus',()=>_loadCampusDataV37.apply(this,arguments));};
const _loadAdminDataV37=loadAdminData;loadAdminData=async function(){return v37Measure('Administración',()=>_loadAdminDataV37.apply(this,arguments));};
const _loadCompanyPortalDataV37=loadCompanyPortalData;loadCompanyPortalData=async function(){return v37Measure('Mi empresa',()=>_loadCompanyPortalDataV37.apply(this,arguments));};
const _loadCompanyConectaDataV37=loadCompanyConectaData;loadCompanyConectaData=async function(){return v37Measure('Conecta empresa',()=>_loadCompanyConectaDataV37.apply(this,arguments));};
const _loadTalentCenterV37Perf=loadTalentCenter;loadTalentCenter=async function(){return v37Measure('Conecta alumno',()=>_loadTalentCenterV37Perf.apply(this,arguments));};
const _loadNotificationCenterV37=loadNotificationCenter;loadNotificationCenter=async function(){const r=await v37Measure('Notificaciones',()=>_loadNotificationCenterV37.apply(this,arguments));renderV37Pulses();return r;};

// La empresa puede abrir notificaciones que apuntan a Conecta.
const _openNotificationItemV37=openNotificationItem;
openNotificationItem=async function(source,id,actionTab){if(currentLutminUser?.role==='company_admin'&&actionTab==='talent')actionTab='company-conecta';return _openNotificationItemV37(source,id,actionTab);};

function initV37(){initConectaPulseV37();initNotificationFiltersV37();initPerfV37();renderV37Pulses();}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV37,80),{once:true});
