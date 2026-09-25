
// =============================================================
// LUTMIN V17.0 · ZERO FRICTION PROFILE
// Perfil vivo, autolimpieza, importación incremental y cero revisión
// humana por problemas que el sistema puede resolver por sí mismo.
// API IA $0.
// =============================================================

let v170Maintenance=[];
const normV170=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function sameExpV170(a,b){
  return normV170(a?.company_name||a?.company)===normV170(b?.company_name||b?.company) &&
         normV170(a?.position_title||a?.position)===normV170(b?.position_title||b?.position) &&
         String(a?.start_date||a?.start||'')===String(b?.start_date||b?.start||'');
}
function sameEduV170(a,b){
  return normV170(a?.institution)===normV170(b?.institution) &&
         normV170(a?.title)===normV170(b?.title) &&
         String(a?.start_date||a?.start||'')===String(b?.start_date||b?.start||'');
}
function canonicalSkillV170(s){
  const n=normV170(s);
  const map=[
    [/^(liderazgo|liderazgo de equipos|lider de equipos)$/,'Liderazgo de equipos'],
    [/^(atencion al publico|atencion al cliente|servicio al cliente)$/,'Atención al cliente'],
    [/^(electricidad|electricidad domiciliaria|instalaciones electricas)$/,'Electricidad'],
    [/^(refrigeracion|climatizacion|aire acondicionado|hvac)$/,'Refrigeración'],
    [/^(rrhh|recursos humanos|capital humano)$/,'Recursos Humanos'],
    [/^(seleccion|seleccion de personal|reclutamiento)$/,'Selección de personal']
  ];
  for(const [re,label] of map)if(re.test(n))return label;
  return String(s||'').trim();
}
function dedupeSkillsV170(items){
  const m=new Map();
  for(const x of items||[]){
    const label=canonicalSkillV170(x.skill),k=normV170(label);
    if(!k)continue;
    const prev=m.get(k);
    if(!prev||Number(x.confidence||0)>Number(prev.confidence||0))m.set(k,{...x,skill:label});
  }
  return [...m.values()];
}

// Deduplicación semántica de sugerencias del parser: evita mostrar dos veces
// la misma competencia con distinto nombre.
if(typeof analyzeCvTextV140==='function'){
  const _analyzeCvTextV170=analyzeCvTextV140;
  analyzeCvTextV140=function(){
    const a=_analyzeCvTextV170.apply(this,arguments);
    if(a)a.skills=dedupeSkillsV170(a.skills||[]);
    return a;
  };
}

async function loadProfileMaintenanceV170(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  try{
    const {data,error}=await supabaseClient.rpc('my_profile_maintenance_v170');
    if(!error)v170Maintenance=Array.isArray(data)?data:[];
  }catch(_){ }
}

// V17: la tarjeta deja de ser una "validación" y se convierte en estado de un perfil vivo.
renderTalentApprovalState=function(){
  const p=talentData?.profile||{},d=v140State?.intelligence||{};
  const score=Number(d.score??p.auto_validation_score??0);
  const active=(d.status||p.auto_validation_status)==='active'||p.approval_status==='approved';
  const title=document.getElementById('talentApprovalTitle'),text=document.getElementById('talentApprovalText'),badge=document.getElementById('talentApprovalBadge'),btn=document.getElementById('talentSubmitReviewBtn'),reason=document.getElementById('talentApprovalReason');
  if(!title||!text||!badge)return;
  const card=document.getElementById('talentApprovalCard');
  const eyebrow=card?.querySelector('p.text-blue-500');if(eyebrow)eyebrow.textContent='AUTOPILOT DE PERFIL';
  if(active){
    title.textContent='Tu perfil está listo y se mantiene ordenado automáticamente';
    text.textContent='Lutmin evita duplicados exactos, sincroniza nuevas evidencias y mantiene el perfil utilizable sin mandarlo a una cola de revisión.';
    badge.textContent='ACTIVO';badge.className='px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold';
    if(btn){btn.classList.remove('hidden');btn.innerHTML='<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Mejorar con mi CV';btn.onclick=()=>document.getElementById('talentCvFileV140')?.click();}
  }else{
    title.textContent=`Perfil ${score}% completo`;
    text.textContent='No necesitás enviar nada a revisión. Completá lo que falta o cargá tu CV y Lutmin hace el resto.';
    badge.textContent='EN CONSTRUCCIÓN';badge.className='px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold';
    if(btn){btn.classList.remove('hidden');btn.innerHTML='<i class="fa-solid fa-file-arrow-up mr-2"></i>Completar desde mi CV';btn.onclick=()=>document.getElementById('talentCvFileV140')?.click();}
  }
  if(reason){
    const last=v170Maintenance?.[0],n=Number(last?.affected_count||0);
    if(n>0){reason.className='mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800';reason.textContent=`Lutmin ordenó automáticamente ${n} registro${n===1?'':'s'} duplicado${n===1?'':'s'} o inconsistente${n===1?'':'s'} sin pedirte intervención.`;}
    else{reason.className='hidden';reason.textContent='';}
  }
  const visible=document.getElementById('talentVisible');if(visible)visible.disabled=false;
  const label=document.getElementById('talentVisibleLabel');if(label)label.textContent=active?'Mostrarme a empresas':'Mostrarme a empresas cuando el perfil esté completo';
};

// No existe más "enviar a revisión". El botón legado sólo recalcula y autolimpia.
submitTalentProfileForReview=async function(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  const d=await refreshMyProfileV140(false);
  await loadProfileMaintenanceV170();
  renderTalentApprovalState();
  showToast(d?.status==='active'?'Perfil actualizado automáticamente.':'Perfil actualizado. Te mostramos sólo lo que todavía falta.');
};

// Importación incremental: el CV muestra sólo novedades seleccionables.
function enhanceCvReviewV170(a){
  const modal=document.getElementById('cvReviewModalV140');if(!modal)return;
  let newCount=0,existingCount=0;
  const exps=talentData?.experiences||[],skills=talentData?.skills||[],edu=v140State?.education||[];
  (a.experiences||[]).forEach((x,i)=>{
    const ch=modal.querySelector(`[data-v140-exp="${i}"]`),row=modal.querySelector(`[data-v140-exp-row="${i}"]`);if(!ch||!row)return;
    const exists=exps.some(e=>sameExpV170(e,x));
    if(exists){existingCount++;ch.checked=false;ch.disabled=true;row.classList.add('opacity-60');row.insertAdjacentHTML('afterbegin','<div class="mb-2 inline-flex px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black">YA ESTÁ EN TU PERFIL</div>');}else newCount++;
  });
  (a.skills||[]).forEach((x,i)=>{
    const ch=modal.querySelector(`[data-v140-skill="${i}"]`);if(!ch)return;
    const exists=skills.some(s=>normV170(canonicalSkillV170(s.skill))===normV170(canonicalSkillV170(x.skill)) || (x.competency_id&&s.competency_id===x.competency_id));
    if(exists){existingCount++;ch.checked=false;ch.disabled=true;ch.closest('label')?.classList.add('opacity-50');ch.closest('label')?.insertAdjacentHTML('beforeend','<span class="ml-1 text-[8px] font-black">YA CARGADA</span>');}else newCount++;
  });
  (a.education||[]).forEach((x,i)=>{
    const ch=modal.querySelector(`[data-v140-edu="${i}"]`),row=modal.querySelector(`[data-v140-edu-row="${i}"]`);if(!ch||!row)return;
    const exists=edu.some(e=>sameEduV170(e,x));
    if(exists){existingCount++;ch.checked=false;ch.disabled=true;row.classList.add('opacity-60');row.insertAdjacentHTML('afterbegin','<div class="mb-2 inline-flex px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black">YA ESTÁ EN TU PERFIL</div>');}else newCount++;
  });
  const h=modal.querySelector('h2');if(h)h.textContent=newCount?`Encontré ${newCount} novedad${newCount===1?'':'es'} para tu perfil.`:'Tu perfil ya contiene lo principal de este CV.';
  const p=h?.nextElementSibling;if(p)p.insertAdjacentHTML('afterend',`<div class="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800"><strong>Sincronización incremental:</strong> ${newCount} dato${newCount===1?'':'s'} nuevo${newCount===1?'':'s'} · ${existingCount} ya estaba${existingCount===1?'':'n'} cargado${existingCount===1?'':'s'}. Lutmin no vuelve a crear lo que ya existe.</div>`);
  const eyebrow=modal.querySelector('p.text-blue-600');if(eyebrow)eyebrow.textContent='AGENTE DE CV · SINCRONIZACIÓN INCREMENTAL';
}
if(typeof openCvReviewV140==='function'){
  const _openCvReviewV170=openCvReviewV140;
  openCvReviewV140=function(a){const r=_openCvReviewV170.apply(this,arguments);setTimeout(()=>enhanceCvReviewV170(a),0);return r;};
}
if(typeof applyCvAnalysisV140==='function'){
  const _applyCvAnalysisV170=applyCvAnalysisV140;
  applyCvAnalysisV140=async function(){const r=await _applyCvAnalysisV170.apply(this,arguments);try{await refreshMyProfileV140(false);await loadProfileMaintenanceV170();renderTalentApprovalState();}catch(_){}return r;};
}

// Postularse sólo requiere que el perfil tenga los mínimos; advertencias de calidad no bloquean.
if(typeof openSmartApplyV100==='function'){
  const _openSmartApplyV170=openSmartApplyV100;
  openSmartApplyV100=async function(jobId){const d=await refreshMyProfileV140(false);if(d?.status==='building'){showToast('Completá los datos mínimos o cargá tu CV para poder postularte.');document.getElementById('talentApprovalCard')?.scrollIntoView({behavior:'smooth',block:'center'});return;}return _openSmartApplyV170.apply(this,arguments);};
}
if(typeof applyTalentJob==='function'){
  const _applyTalentJobV170=applyTalentJob;
  applyTalentJob=async function(jobId){const d=await refreshMyProfileV140(false);if(d?.status==='building'){showToast('Completá los datos mínimos del perfil para postularte.');return;}return _applyTalentJobV170.apply(this,arguments);};
}

// Administración: eliminar trabajo manual de excepciones de perfil.
function simplifyAdminTalentV170(){
  const list=document.getElementById('adminTalentProfileRequestsList');
  if(list?.parentElement)list.parentElement.classList.add('hidden');
  const oldStat=document.getElementById('adminTalentRequestsStat');if(oldStat?.parentElement)oldStat.parentElement.classList.add('hidden');
}
if(typeof renderAdminConecta==='function'){
  const _renderAdminConectaV170=renderAdminConecta;
  renderAdminConecta=function(){const r=_renderAdminConectaV170.apply(this,arguments);setTimeout(simplifyAdminTalentV170,0);return r;};
}

// Centro de decisión: sustituimos "excepciones de perfil" por postulaciones activas,
// que sí son trabajo humano real.
if(typeof renderAdminCommandCenterV160==='function'){
  renderAdminCommandCenterV160=function(){
    const root=document.getElementById('adminCommandCenterV160');if(!root||currentLutminUser?.role!=='admin')return;
    const num=id=>{const n=Number((document.getElementById(id)?.textContent||'0').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;};
    const pay=num('adminPaymentsPendingStat'),leads=num('adminLeadsStat'),apps=num('adminApplicationsStat'),openings=num('adminOpenOfferingsStat');
    const signals=[
      {n:pay,label:'pagos pendientes',icon:'fa-wallet',tone:pay?'amber':'emerald',module:'finance',detail:pay?'Requieren confirmación o seguimiento.':'Sin pagos pendientes.'},
      {n:leads,label:'interesados activos',icon:'fa-bullseye',tone:leads?'violet':'emerald',module:'commercial',detail:leads?'Consultas comerciales para trabajar.':'Sin interesados pendientes.'},
      {n:apps,label:'postulaciones activas',icon:'fa-user-check',tone:apps?'blue':'emerald',module:'talent',detail:apps?'Procesos donde sí puede hacer falta una decisión humana.':'Sin postulaciones activas.'},
      {n:openings,label:'ediciones abiertas',icon:'fa-calendar-days',tone:'blue',module:'academic',detail:'Oferta académica abierta.'}
    ];
    const priority=signals.filter(x=>x.n>0&&x.module!=='academic').reduce((a,b)=>a+b.n,0),cls={amber:'bg-amber-50 text-amber-700 border-amber-100',violet:'bg-violet-50 text-violet-700 border-violet-100',blue:'bg-blue-50 text-blue-700 border-blue-100',emerald:'bg-emerald-50 text-emerald-700 border-emerald-100'};
    root.innerHTML=`<div class="rounded-[2rem] bg-lutmin-dark text-white overflow-hidden"><div class="p-5 sm:p-7 grid xl:grid-cols-[1.05fr_.95fr] gap-6"><div><div class="flex flex-wrap items-center gap-2"><span class="v160-workspace-chip bg-cyan-400/10 text-cyan-200"><i class="fa-solid fa-wand-magic-sparkles"></i>Centro de decisión</span><span class="v160-workspace-chip bg-white/10 text-slate-200">sólo trabajo humano real</span></div><h3 class="mt-4 text-2xl sm:text-3xl font-black">${priority?`${priority} situación${priority===1?'':'es'} para atender`:'La operación está al día'}</h3><p class="mt-2 text-sm text-slate-300 max-w-xl">Lutmin resuelve por sí solo limpieza de perfiles, duplicados y mantenimiento de datos. Acá quedan decisiones comerciales, académicas y de selección que sí necesitan personas.</p><div class="mt-5 flex flex-wrap gap-2"><button onclick="setAdminModuleV19('operations')" class="px-4 py-2.5 rounded-xl bg-white text-lutmin-dark text-xs font-extrabold">Ver prioridades</button><button onclick="setAdminModuleV19('talent')" class="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold">Talento</button></div></div><div class="grid grid-cols-2 gap-3">${signals.map(x=>`<button onclick="setAdminModuleV19('${x.module}')" class="v160-action-card text-left rounded-2xl border p-4 ${cls[x.tone]}"><div class="flex items-center justify-between gap-2"><i class="fa-solid ${x.icon}"></i><strong class="text-2xl">${x.n}</strong></div><p class="mt-3 text-[10px] uppercase font-black tracking-wider">${x.label}</p><p class="mt-1 text-[10px] opacity-80 leading-relaxed">${x.detail}</p></button>`).join('')}</div></div></div>`;
  };
}

// V17 también evita nomenclatura de revisión en el modal del CV.
function polishV170(){
  // V22: sin recorrer todo el DOM ni consultar perfil en segundo plano.
  simplifyAdminTalentV170();
  if(!new URL(location.href).searchParams.get('talento'))document.title='Lutmin | Plataforma';
}

// Cargar junto con el centro de talento.
if(typeof loadTalentCenter==='function'){
  const _loadTalentCenterV170=loadTalentCenter;
  loadTalentCenter=async function(){const r=await _loadTalentCenterV170.apply(this,arguments);await loadProfileMaintenanceV170();renderTalentApprovalState();return r;};
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(polishV170,5600),{once:true});
