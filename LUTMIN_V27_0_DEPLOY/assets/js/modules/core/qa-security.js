
// =========================================================
// LUTMIN V3.5 — ESTABILIZACIÓN, QA Y SEGURIDAD OPERATIVA
// =========================================================
let adminQualityStateV35 = null;

function friendlyDbErrorV35(error, fallback='No pude completar la acción.') {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === '23505' || /duplicate key/i.test(message)) return 'Ese registro ya existe. No se creó un duplicado.';
  if (code === '23503' || /foreign key/i.test(message)) return 'La acción depende de otro registro que ya no está disponible.';
  if (code === '23514' || /check constraint/i.test(message)) return 'Uno de los datos no cumple las reglas permitidas. Revisá el valor elegido.';
  if (code === '42501' || /permission denied|row-level security|rls/i.test(message)) return 'Tu usuario no tiene permiso para realizar esta acción.';
  if (/infinite recursion/i.test(message)) return 'Detecté un problema de permisos internos. Contactá a Administración.';
  if (/failed to fetch|network/i.test(message)) return 'No pude comunicarme con Supabase. Revisá la conexión y reintentá.';
  return fallback;
}

function qualityStatusMetaV35(status) {
  if (status === 'ok') return {icon:'fa-circle-check',box:'bg-green-50 border-green-100',text:'text-green-700',label:'OK'};
  if (status === 'critical') return {icon:'fa-circle-xmark',box:'bg-red-50 border-red-100',text:'text-red-700',label:'CRÍTICO'};
  return {icon:'fa-triangle-exclamation',box:'bg-amber-50 border-amber-100',text:'text-amber-700',label:'REVISAR'};
}

function integrityRowsV35(data) {
  const i = data?.integrity || {};
  return [
    {key:'profiles_without_email',label:'Perfiles sin email',value:Number(i.profiles_without_email||0),kind:'warning',detail:'Conviene corregirlos porque el email identifica el acceso.'},
    {key:'students_without_courses',label:'Alumnos activos sin cursos',value:Number(i.students_without_courses||0),kind:'info',detail:'Puede ser normal si todavía no les asignaste formación.'},
    {key:'published_courses_without_lessons',label:'Cursos publicados sin clases',value:Number(i.published_courses_without_lessons||0),kind:'warning',detail:'El alumno podría ver un curso sin contenido.'},
    {key:'stale_competency_attempts',label:'Intentos vencidos todavía abiertos',value:Number(i.stale_competency_attempts||0),kind:'warning',detail:'El mantenimiento seguro puede cerrarlos como vencidos.'},
    {key:'certificates_without_private_legend',label:'Certificados válidos sin leyenda privada',value:Number(i.certificates_without_private_legend||0),kind:'warning',detail:'Revisar para mantener clara la naturaleza privada de la constancia.'},
    {key:'certificates_expiring_30d',label:'Certificados por vencer en 30 días',value:Number(i.certificates_expiring_30d||0),kind:'info',detail:'No es un error; sirve para preparar recertificaciones.'},
    {key:'company_members_without_profile',label:'Miembros de empresa sin perfil',value:Number(i.company_members_without_profile||0),kind:'warning',detail:'Relaciones corporativas que quedaron sin una ficha de usuario.'},
    {key:'pending_public_talent_requests',label:'Altas públicas pendientes',value:Number(i.pending_public_talent_requests||0),kind:'info',detail:'Solicitudes nuevas esperando tu aprobación o rechazo.'},
    {key:'pending_talent_profile_requests',label:'Perfiles Conecta pendientes',value:Number(i.pending_talent_profile_requests||0),kind:'info',detail:'Alumnos que enviaron su perfil para revisión.'}
  ];
}

function renderAdminQualityV35(data) {
  adminQualityStateV35 = data || null;
  const status = data?.status || 'warning';
  const meta = qualityStatusMetaV35(status);
  const overall = document.getElementById('v35OverallStat');
  if (overall) {
    overall.textContent = status === 'ok' ? 'ESTABLE' : status === 'critical' ? 'REVISAR AHORA' : 'CON AVISOS';
    overall.className = `mt-1 text-lg font-black ${meta.text}`;
  }
  const crit = document.getElementById('v35CriticalStat'); if (crit) crit.textContent=String(Number(data?.critical_count||0));
  const warn = document.getElementById('v35WarningStat'); if (warn) warn.textContent=String(Number(data?.warning_count||0));
  const ver = document.getElementById('v35VersionStat'); if (ver) ver.textContent=String(data?.version||'V3.5');

  const checks = Array.isArray(data?.checks) ? data.checks : [];
  const checksRoot = document.getElementById('adminQualityChecksV35');
  if (checksRoot) {
    checksRoot.innerHTML = checks.length ? checks.map(row => {
      const m=qualityStatusMetaV35(row.status);
      return `<div class="rounded-xl border ${m.box} p-3"><div class="flex items-start gap-3"><i class="fa-solid ${m.icon} ${m.text} mt-0.5"></i><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><p class="text-xs font-extrabold text-slate-800">${escapeHtml(row.label||'Control')}</p><span class="text-[9px] font-black ${m.text}">${m.label}</span></div><p class="mt-1 text-[10px] text-slate-500 leading-relaxed">${escapeHtml(row.detail||'')}</p></div></div></div>`;
    }).join('') : '<p class="text-xs text-slate-500">No recibí controles del servidor.</p>';
  }

  const integrity = integrityRowsV35(data);
  const integrityRoot = document.getElementById('adminQualityIntegrityV35');
  if (integrityRoot) {
    integrityRoot.innerHTML = integrity.map(row => {
      const has = row.value > 0;
      const tone = !has ? 'bg-green-50 text-green-700 border-green-100' : row.kind==='warning' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100';
      const icon = !has ? 'fa-circle-check' : row.kind==='warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
      return `<div class="rounded-xl border ${tone} p-3"><div class="flex items-start gap-3"><i class="fa-solid ${icon} mt-0.5"></i><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-3"><p class="text-xs font-extrabold">${escapeHtml(row.label)}</p><span class="text-sm font-black">${row.value}</span></div>${has?`<p class="mt-1 text-[10px] opacity-80">${escapeHtml(row.detail)}</p>`:''}</div></div></div>`;
    }).join('');
  }

  const migrations = Array.isArray(data?.migrations) ? data.migrations : [];
  const migrationsRoot = document.getElementById('adminQualityMigrationsV35');
  if (migrationsRoot) {
    migrationsRoot.innerHTML = migrations.length ? migrations.map(m => `<div class="rounded-xl bg-slate-50 p-3"><div class="flex items-center justify-between gap-2"><strong class="text-xs text-lutmin-dark">V${escapeHtml(String(m.version||'').replace(/^V/i,''))}</strong><span class="text-[9px] text-slate-400">${m.applied_at?notificationDate(m.applied_at):''}</span></div><p class="mt-1 text-[10px] text-slate-500">${escapeHtml(m.description||'')}</p></div>`).join('') : '<p class="text-xs text-slate-500">No encontré historial de migraciones.</p>';
  }

  const legacy = document.getElementById('adminDiagnosticsV19');
  if (legacy) {
    legacy.innerHTML = `<div class="flex items-center justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark">${escapeHtml(data?.version||'LUTMIN')}</p><p class="text-[10px] text-slate-500 mt-1">Diagnóstico integral actualizado</p></div><span class="px-3 py-1.5 rounded-full ${meta.box} ${meta.text} text-[10px] font-extrabold">${status==='ok'?'TODO OK':status==='critical'?'CRÍTICO':'REVISAR'}</span></div><div class="mt-3 space-y-2">${checks.map(row=>{const m=qualityStatusMetaV35(row.status);return `<div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 text-xs"><span>${escapeHtml(row.label||'Control')}</span><span class="font-black ${m.text}"><i class="fa-solid ${m.icon}"></i></span></div>`}).join('')}</div>`;
  }
}

async function runAdminQualityV35(options={}) {
  if (!supabaseClient || currentLutminUser?.role !== 'admin') return null;
  if (!options.noNavigate) setAdminModuleV19('system',{noScroll:true});
  const root=document.getElementById('adminQualityChecksV35');
  if(root) root.innerHTML='<div class="text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Revisando base, permisos e integridad...</div>';
  const {data,error}=await supabaseClient.rpc('admin_v35_health_check');
  if(error){
    console.error('V3.5 health check:',error);
    const message=friendlyDbErrorV35(error,'No pude ejecutar el diagnóstico V3.5. Verificá que hayas corrido el SQL de esta versión.');
    if(root) root.innerHTML=`<div class="rounded-xl bg-red-50 text-red-700 p-3 text-xs"><strong>Diagnóstico no disponible.</strong><p class="mt-1">${escapeHtml(message)}</p></div>`;
    const legacy=document.getElementById('adminDiagnosticsV19');
    if(legacy) legacy.innerHTML=`<div class="rounded-xl bg-red-50 text-red-700 p-3 text-xs"><strong>No pude ejecutar el diagnóstico.</strong><p class="mt-1">${escapeHtml(message)}</p></div>`;
    return null;
  }
  renderAdminQualityV35(data);
  if (!options.silent) showToast(data?.status==='ok'?'Control completado: sistema estable.':'Control completado. Revisá los avisos.');
  return data;
}

async function runSafeMaintenanceV35() {
  if (!supabaseClient || currentLutminUser?.role !== 'admin') return;
  const ok=confirm('Este mantenimiento solo cerrará intentos de validación teórica cuyo tiempo ya venció. No elimina datos. ¿Continuar?');
  if(!ok) return;
  const {data,error}=await supabaseClient.rpc('admin_v35_safe_maintenance');
  if(error){showToast(friendlyDbErrorV35(error,'No pude ejecutar el mantenimiento seguro.'));return;}
  showToast(`Mantenimiento listo · ${Number(data?.expired_competency_attempts||0)} intento(s) vencido(s) cerrado(s).`);
  await runAdminQualityV35({silent:true,noNavigate:true});
}

async function downloadAdminDiagnosticsV35() {
  let data=adminQualityStateV35;
  if(!data) data=await runAdminQualityV35({silent:true,noNavigate:true});
  if(!data) return;
  const payload={...data,client_url:location.origin+location.pathname,exported_at:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`LUTMIN_diagnostico_V3_5_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Diagnóstico descargado.');
}

async function copyAdminDiagnosticsV35() {
  let data=adminQualityStateV35;
  if(!data) data=await runAdminQualityV35({silent:true,noNavigate:true});
  if(!data) return;
  const i=data.integrity||{};
  const text=[
    `${data.version||'LUTMIN V3.5'} · ${String(data.status||'').toUpperCase()}`,
    `Críticos: ${Number(data.critical_count||0)} · Advertencias: ${Number(data.warning_count||0)}`,
    `Cursos publicados sin clases: ${Number(i.published_courses_without_lessons||0)}`,
    `Intentos de competencia vencidos abiertos: ${Number(i.stale_competency_attempts||0)}`,
    `Certificados sin leyenda privada: ${Number(i.certificates_without_private_legend||0)}`,
    `Miembros de empresa sin perfil: ${Number(i.company_members_without_profile||0)}`
  ].join('\n');
  try{await navigator.clipboard.writeText(text);showToast('Diagnóstico copiado.');}
  catch(_){showToast('No pude copiar automáticamente. Descargá el diagnóstico.');}
}

window.runAdminDiagnosticsV19 = async function(){
  setAdminModuleV19('system',{noScroll:true});
  await runAdminQualityV35({silent:true,noNavigate:true});
};

const _setAdminModuleV19OriginalV35 = window.setAdminModuleV19;
if (typeof _setAdminModuleV19OriginalV35 === 'function') {
  window.setAdminModuleV19 = function(module,options){
    const result=_setAdminModuleV19OriginalV35(module,options);
    if(module==='system' && currentLutminUser?.role==='admin' && !adminQualityStateV35){
      setTimeout(()=>runAdminQualityV35({silent:true,noNavigate:true}),120);
    }
    return result;
  };
}
