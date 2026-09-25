
// =========================================================
// LUTMIN V4.0 · VIGENCIAS Y CUMPLIMIENTO
// =========================================================
let studentComplianceV40={summary:{},items:[]};
let companyComplianceV40={summary:{},items:[]};
let adminComplianceV40={summary:{},items:[]};

function complianceMetaV40(state){
  return ({
    valid:{label:'Vigente',cls:'bg-emerald-50 text-emerald-700 border-emerald-100',icon:'fa-circle-check'},
    expiring:{label:'Vence pronto',cls:'bg-amber-50 text-amber-700 border-amber-100',icon:'fa-clock'},
    expired:{label:'Vencido',cls:'bg-red-50 text-red-700 border-red-100',icon:'fa-triangle-exclamation'},
    revoked:{label:'Revocado',cls:'bg-rose-50 text-rose-700 border-rose-100',icon:'fa-ban'},
    inactive:{label:'No vigente',cls:'bg-slate-100 text-slate-600 border-slate-200',icon:'fa-circle-minus'}
  })[state]||{label:String(state||'Sin estado'),cls:'bg-slate-100 text-slate-600 border-slate-200',icon:'fa-circle-info'};
}
function complianceDateV40(value){if(!value)return 'Sin vencimiento';try{return new Date(value).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(_){return String(value);}}
function complianceDaysV40(item){
  if(item?.expires_at==null)return 'Sin vencimiento configurado';
  const d=Number(item?.days_remaining);
  if(!Number.isFinite(d))return `Vence ${complianceDateV40(item.expires_at)}`;
  if(d<0)return `Venció hace ${Math.abs(d)} día${Math.abs(d)===1?'':'s'}`;
  if(d===0)return 'Vence hoy';
  return `Vence en ${d} día${d===1?'':'s'} · ${complianceDateV40(item.expires_at)}`;
}
function complianceTypeV40(type){return type==='competency'?'Competencia':'Certificado';}
function complianceKpisV40(summary,mode='student'){
  const s=summary||{};
  const extra=mode==='student'?Number(s.without_expiry||0):Number(s.affected_people||0);
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="rounded-2xl bg-emerald-50 p-4 border border-emerald-100"><p class="text-[10px] font-bold uppercase text-emerald-600">Vigentes</p><p class="mt-1 text-2xl font-black text-emerald-700">${Number(s.valid||0)}</p></div>
    <div class="rounded-2xl bg-amber-50 p-4 border border-amber-100"><p class="text-[10px] font-bold uppercase text-amber-600">Vencen pronto</p><p class="mt-1 text-2xl font-black text-amber-700">${Number(s.expiring||0)}</p></div>
    <div class="rounded-2xl bg-red-50 p-4 border border-red-100"><p class="text-[10px] font-bold uppercase text-red-600">Vencidos</p><p class="mt-1 text-2xl font-black text-red-700">${Number(s.expired||0)}</p></div>
    <div class="rounded-2xl bg-slate-50 p-4 border border-slate-100"><p class="text-[10px] font-bold uppercase text-slate-500">${mode==='student'?'Sin vencimiento':'Personas con alerta'}</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${extra}</p></div>
  </div>`;
}

// ---------------------------------------------------------
// Alumno
// ---------------------------------------------------------
function initStudentComplianceV40(){
  const dash=document.querySelector('[data-campus-panel="dashboard"]');
  if(dash&&!document.getElementById('studentComplianceV40')){
    const box=document.createElement('div');box.id='studentComplianceV40';box.className='mt-6 sm:mt-8 bg-white rounded-3xl border border-slate-100 overflow-hidden';
    box.innerHTML=`<div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-600">V4.0 · Vigencias</p><h3 class="mt-1 text-lg font-extrabold text-lutmin-dark">Mi centro de vigencias</h3><p class="mt-1 text-xs text-slate-500">Certificados y validaciones que requieren atención antes de vencer.</p></div><button onclick="loadStudentComplianceV40()" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold"><i class="fa-solid fa-rotate mr-1"></i>Actualizar</button></div><div id="studentComplianceBodyV40" class="p-5 sm:p-6"><p class="text-sm text-slate-500">Cargando vigencias...</p></div>`;
    dash.appendChild(box);
  }
  const cert=document.querySelector('[data-campus-panel="certificates"]');
  if(cert&&!document.getElementById('studentComplianceCertV40')){
    const box=document.createElement('div');box.id='studentComplianceCertV40';box.className='mt-6 bg-white rounded-3xl border border-slate-100 p-5 sm:p-6';
    box.innerHTML='<div class="flex items-center justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-600">Vigencia consolidada</p><h3 class="mt-1 font-extrabold text-lutmin-dark">Estado de mis acreditaciones</h3></div><i class="fa-solid fa-shield-halved text-cyan-600 text-xl"></i></div><div id="studentComplianceCertBodyV40" class="mt-4"></div>';
    cert.appendChild(box);
  }
}
function renderStudentComplianceV40(){
  initStudentComplianceV40();const d=studentComplianceV40||{},items=Array.isArray(d.items)?d.items:[];
  const alerts=items.filter(x=>['expired','expiring','revoked'].includes(x.state));
  const renderAlerts=alerts.length?alerts.slice(0,8).map(x=>{const m=complianceMetaV40(x.state);return `<div class="rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><span class="text-[9px] uppercase font-bold text-slate-400">${complianceTypeV40(x.type)}</span><span class="px-2 py-1 rounded-full border text-[9px] font-extrabold ${m.cls}"><i class="fa-solid ${m.icon} mr-1"></i>${m.label}</span></div><p class="mt-1 font-extrabold text-sm text-lutmin-dark">${escapeHtml(x.subject_name||'Acreditación')}</p><p class="mt-1 text-[11px] text-slate-500">${escapeHtml(complianceDaysV40(x))}${x.score_value!=null?` · ${x.type==='competency'?Number(x.score_value).toFixed(1)+'/10':Math.round(Number(x.score_value))+'%'}`:''}</p></div><div class="shrink-0">${x.type==='competency'&&typeof startCompetencyValidationV33==='function'?`<button onclick="startCompetencyValidationV33('${x.subject_id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold">${x.state==='expired'?'Revalidar':'Ver validación'}</button>`:`<button onclick="goToCampusTab('certificates')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Ver certificado</button>`}</div></div>`;}).join(''):'<div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800"><strong>Todo al día.</strong> No tenés acreditaciones vencidas ni próximas a vencer dentro de la ventana configurada.</div>';
  const body=document.getElementById('studentComplianceBodyV40');if(body)body.innerHTML=`${complianceKpisV40(d.summary,'student')}<div class="mt-4 space-y-2">${renderAlerts}</div>`;
  const cert=document.getElementById('studentComplianceCertBodyV40');if(cert)cert.innerHTML=`${complianceKpisV40(d.summary,'student')}<p class="mt-3 text-[11px] text-slate-500">Se consideran certificados privados Lutmin y validaciones internas de competencias. Una competencia adquirida por curso sin validación teórica no se cuenta como validación vigente.</p>`;
}
async function loadStudentComplianceV40(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;initStudentComplianceV40();
  const {data,error}=await supabaseClient.rpc('my_compliance_center_v40',{p_window_days:60});
  if(error){console.error('V4.0 alumno',error);const r=document.getElementById('studentComplianceBodyV40');if(r)r.innerHTML='<p class="text-sm text-slate-500">El Centro de vigencias todavía no está habilitado. Contactá a Administración.</p>';return;}
  studentComplianceV40=data||{summary:{},items:[]};renderStudentComplianceV40();
}

// ---------------------------------------------------------
// Empresa
// ---------------------------------------------------------
function initCompanyComplianceV40(){
  const panel=document.querySelector('[data-campus-panel="company"]');if(!panel||document.getElementById('companyComplianceV40'))return;
  const box=document.createElement('div');box.id='companyComplianceV40';box.className='mt-6 bg-white rounded-3xl border border-cyan-100 overflow-hidden';
  box.innerHTML=`<div class="p-5 sm:p-6 border-b border-cyan-100 bg-cyan-50/40"><div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-700">V4.0 · Cumplimiento</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Vigencias del equipo</h3><p class="mt-1 text-xs text-slate-600">Detectá certificados y validaciones vencidas o próximas a vencer antes de que se conviertan en un problema operativo.</p></div><div class="flex flex-wrap gap-2"><button onclick="exportCompanyComplianceV40()" class="px-3 py-2.5 rounded-xl bg-white border border-cyan-100 text-cyan-700 text-xs font-bold"><i class="fa-solid fa-file-csv mr-2"></i>Exportar</button><button onclick="loadCompanyComplianceV40()" class="px-3 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button></div></div></div><div class="p-5 sm:p-6"><div id="companyComplianceStatsV40"></div><div class="mt-4 grid md:grid-cols-[1fr_180px_180px] gap-2"><input id="companyComplianceQueryV40" oninput="renderCompanyComplianceV40()" class="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Buscar persona o acreditación"><select id="companyComplianceStateV40" onchange="renderCompanyComplianceV40()" class="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="alert">Solo alertas</option><option value="">Todos los estados</option><option value="expired">Vencidos</option><option value="expiring">Vencen pronto</option><option value="valid">Vigentes</option><option value="revoked">Revocados</option></select><select id="companyComplianceTypeV40" onchange="renderCompanyComplianceV40()" class="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="">Certificados + competencias</option><option value="certificate">Certificados</option><option value="competency">Competencias</option></select></div><div id="companyComplianceRowsV40" class="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden"></div></div>`;
  panel.prepend(box);
}
function filteredCompanyComplianceV40(){
  const q=String(document.getElementById('companyComplianceQueryV40')?.value||'').trim().toLowerCase(),state=document.getElementById('companyComplianceStateV40')?.value||'alert',type=document.getElementById('companyComplianceTypeV40')?.value||'';
  return (companyComplianceV40.items||[]).filter(x=>(!q||`${x.full_name||''} ${x.email||''} ${x.subject_name||''}`.toLowerCase().includes(q))&&(!type||x.type===type)&&(state==='alert'?['expired','expiring','revoked'].includes(x.state):(!state||x.state===state)));
}
function renderCompanyComplianceV40(){
  initCompanyComplianceV40();const stats=document.getElementById('companyComplianceStatsV40'),root=document.getElementById('companyComplianceRowsV40');if(stats)stats.innerHTML=complianceKpisV40(companyComplianceV40.summary,'company');if(!root)return;
  const rows=filteredCompanyComplianceV40();root.innerHTML=rows.length?rows.slice(0,250).map(x=>{const m=complianceMetaV40(x.state);return `<div class="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div class="min-w-0"><p class="font-extrabold text-sm text-lutmin-dark">${escapeHtml(x.full_name||x.email||'Colaborador')}</p><p class="mt-1 text-[10px] text-slate-400">${escapeHtml(x.email||'')}</p><div class="mt-2 flex flex-wrap items-center gap-2"><span class="text-[9px] uppercase font-bold text-slate-400">${complianceTypeV40(x.type)}</span><span class="text-xs font-bold text-slate-700">${escapeHtml(x.subject_name||'Acreditación')}</span></div><p class="mt-1 text-[11px] text-slate-500">${escapeHtml(complianceDaysV40(x))}</p></div><div class="flex flex-wrap items-center gap-2 shrink-0"><span class="px-3 py-1.5 rounded-full border text-[10px] font-extrabold ${m.cls}"><i class="fa-solid ${m.icon} mr-1"></i>${m.label}</span>${typeof openMember360V34==='function'?`<button onclick="openMember360V34('${x.user_id}')" class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold">Ficha 360°</button>`:''}</div></div>`;}).join(''):'<div class="p-6 text-sm text-slate-500">No hay registros para estos filtros.</div>';
}
async function loadCompanyComplianceV40(){
  if(!supabaseClient||currentLutminUser?.role!=='company_admin')return;initCompanyComplianceV40();
  const {data,error}=await supabaseClient.rpc('company_compliance_center_v40',{p_window_days:60});
  if(error){console.error('V4.0 empresa',error);const r=document.getElementById('companyComplianceRowsV40');if(r)r.innerHTML='<div class="p-5 text-sm text-slate-500">Este módulo todavía no está habilitado. Contactá a Administración.</div>';return;}
  companyComplianceV40=data||{summary:{},items:[]};renderCompanyComplianceV40();
}
function exportCompanyComplianceV40(){
  const rows=filteredCompanyComplianceV40();if(!rows.length)return showToast('No hay datos para exportar.');
  const out=[['Persona','Email','Tipo','Acreditación','Estado','Vencimiento','Días restantes']];rows.forEach(x=>out.push([x.full_name||'',x.email||'',complianceTypeV40(x.type),x.subject_name||'',complianceMetaV40(x.state).label,x.expires_at?complianceDateV40(x.expires_at):'Sin vencimiento',x.days_remaining??'']));
  downloadComplianceCsvV40(out,'Lutmin_cumplimiento_empresa');
}

// ---------------------------------------------------------
// Administración
// ---------------------------------------------------------
function initAdminComplianceV40(){
  const admin=document.querySelector('[data-campus-panel="admin"]');if(!admin||document.getElementById('adminComplianceV40'))return;
  const anchor=document.getElementById('adminStudentsStat')?.closest('.grid')||admin;
  const box=document.createElement('div');box.id='adminComplianceV40';box.setAttribute('data-admin-module-v19','overview');box.className='mt-6 bg-white rounded-3xl border border-slate-100 overflow-hidden';
  box.innerHTML=`<div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-700">Control global</p><h3 class="mt-1 text-lg font-black text-lutmin-dark">Vigencias y cumplimiento</h3><p class="mt-1 text-xs text-slate-500">Una vista global de certificados y validaciones que vencieron o están por vencer.</p></div><div class="flex flex-wrap gap-2"><button onclick="exportAdminComplianceV40()" class="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold"><i class="fa-solid fa-file-csv mr-2"></i>Exportar</button><button onclick="loadAdminComplianceV40()" class="px-3 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Actualizar</button></div></div><div class="p-5 sm:p-6"><div id="adminComplianceStatsV40"></div><div class="mt-4 grid lg:grid-cols-[1fr_180px] gap-2"><input id="adminComplianceQueryV40" oninput="renderAdminComplianceV40()" class="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Buscar persona, empresa o acreditación"><select id="adminComplianceStateV40" onchange="renderAdminComplianceV40()" class="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="alert">Solo alertas</option><option value="">Todos</option><option value="expired">Vencidos</option><option value="expiring">Vencen pronto</option><option value="valid">Vigentes</option><option value="revoked">Revocados</option></select></div><div id="adminComplianceRowsV40" class="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden"></div></div>`;
  anchor.insertAdjacentElement('afterend',box);
}
function filteredAdminComplianceV40(){
  const q=String(document.getElementById('adminComplianceQueryV40')?.value||'').trim().toLowerCase(),state=document.getElementById('adminComplianceStateV40')?.value||'alert';
  return (adminComplianceV40.items||[]).filter(x=>(!q||`${x.full_name||''} ${x.email||''} ${x.company_name||''} ${x.subject_name||''}`.toLowerCase().includes(q))&&(state==='alert'?['expired','expiring','revoked'].includes(x.state):(!state||x.state===state)));
}
function renderAdminComplianceV40(){
  initAdminComplianceV40();const stats=document.getElementById('adminComplianceStatsV40'),root=document.getElementById('adminComplianceRowsV40');if(stats)stats.innerHTML=complianceKpisV40(adminComplianceV40.summary,'admin');if(!root)return;
  const rows=filteredAdminComplianceV40();root.innerHTML=rows.length?rows.slice(0,300).map(x=>{const m=complianceMetaV40(x.state);return `<div class="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="font-extrabold text-sm text-lutmin-dark">${escapeHtml(x.full_name||x.email||'Persona')}</p><p class="mt-1 text-[10px] text-cyan-700 font-bold">${escapeHtml(x.company_name||'Particular')}</p><p class="mt-1 text-xs text-slate-600">${complianceTypeV40(x.type)} · ${escapeHtml(x.subject_name||'Acreditación')}</p><p class="mt-1 text-[10px] text-slate-400">${escapeHtml(complianceDaysV40(x))}</p></div><span class="px-3 py-1.5 rounded-full border text-[10px] font-extrabold ${m.cls}"><i class="fa-solid ${m.icon} mr-1"></i>${m.label}</span></div>`;}).join(''):'<div class="p-6 text-sm text-slate-500">No hay registros para estos filtros.</div>';
}
async function loadAdminComplianceV40(){
  if(!supabaseClient||currentLutminUser?.role!=='admin')return;initAdminComplianceV40();
  const {data,error}=await supabaseClient.rpc('admin_compliance_center_v40',{p_window_days:60});
  if(error){console.error('V4.0 admin',error);const r=document.getElementById('adminComplianceRowsV40');if(r)r.innerHTML='<div class="p-5 text-sm text-slate-500">Este módulo todavía no está habilitado. Contactá a Administración.</div>';return;}
  adminComplianceV40=data||{summary:{},items:[]};renderAdminComplianceV40();
}
function exportAdminComplianceV40(){
  const rows=filteredAdminComplianceV40();if(!rows.length)return showToast('No hay datos para exportar.');
  const out=[['Persona','Email','Empresa','Tipo','Acreditación','Estado','Vencimiento','Días restantes']];rows.forEach(x=>out.push([x.full_name||'',x.email||'',x.company_name||'',complianceTypeV40(x.type),x.subject_name||'',complianceMetaV40(x.state).label,x.expires_at?complianceDateV40(x.expires_at):'Sin vencimiento',x.days_remaining??'']));
  downloadComplianceCsvV40(out,'Lutmin_cumplimiento_global');
}
function downloadComplianceCsvV40(rows,name){const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${name}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);}

// ---------------------------------------------------------
// Perfil público: quitar el "Próximamente" que ya quedó viejo.
// ---------------------------------------------------------
function updatePublicProfileButtonV40(){
  const panel=document.querySelector('[data-campus-panel="profile"]');if(!panel)return;
  const buttons=[...panel.querySelectorAll('button')];const btn=buttons.find(b=>(b.textContent||'').includes('Perfil público'));
  if(!btn)return;const p=typeof talentData!=='undefined'?talentData?.profile:null;
  btn.disabled=false;btn.className='w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm sm:text-base hover:bg-blue-100';
  btn.setAttribute('onclick','openMyPublicProfileV40()');
  btn.innerHTML=p?.visible&&p?.public_slug?'<i class="fa-solid fa-eye mr-2"></i>Ver perfil público':'<i class="fa-solid fa-id-card mr-2"></i>Configurar perfil público';
}
async function openMyPublicProfileV40(){
  if((!talentData?.profile)&&typeof loadTalentCenter==='function')await loadTalentCenter();
  const p=talentData?.profile;
  if(p?.visible&&p?.public_slug&&typeof showPublicTalentProfile==='function')return showPublicTalentProfile(p.public_slug);
  goToCampusTab('talent');showToast('Completá y habilitá tu perfil en Lutmin Conecta para verlo públicamente.');
}

// Integración con los loaders existentes sin reemplazar la lógica previa.
const _loadCampusDataV40=loadCampusData;
loadCampusData=async function(){const r=await _loadCampusDataV40.apply(this,arguments);if(currentLutminUser?.role==='student'){await loadStudentComplianceV40();updatePublicProfileButtonV40();}return r;};
const _loadCompanyPortalDataV40=loadCompanyPortalData;
loadCompanyPortalData=async function(){const r=await _loadCompanyPortalDataV40.apply(this,arguments);if(currentLutminUser?.role==='company_admin')await loadCompanyComplianceV40();return r;};
const _loadAdminDataV40=loadAdminData;
loadAdminData=async function(){const r=await _loadAdminDataV40.apply(this,arguments);if(currentLutminUser?.role==='admin')await loadAdminComplianceV40();return r;};
if(typeof renderTalentCenter==='function'){
  const _renderTalentCenterV40=renderTalentCenter;
  renderTalentCenter=function(){const r=_renderTalentCenterV40.apply(this,arguments);updatePublicProfileButtonV40();return r;};
}
function initV40(){
  if(currentLutminUser?.role==='student'){initStudentComplianceV40();updatePublicProfileButtonV40();loadStudentComplianceV40();}
  if(currentLutminUser?.role==='company_admin'){initCompanyComplianceV40();loadCompanyComplianceV40();}
  if(currentLutminUser?.role==='admin'){initAdminComplianceV40();loadAdminComplianceV40();}
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV40,900),{once:true});
