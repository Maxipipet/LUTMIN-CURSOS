
// =============================================================
// LUTMIN V12.0 · AUTOPILOT PLUS · CONTEXTO EMPRESA + ACCIONES
// Mantiene costo API $0: reglas, SQL y JavaScript propios.
// =============================================================

let companyBriefV120=null;
function v120CompanyId(){
  return companyPortalData?.company?.id || currentAccessContext?.companies?.[0]?.id || null;
}
function v120Esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function v120CompanyRequiredMessage(rootId){const r=document.getElementById(rootId);if(r)r.innerHTML='<div class="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">No pude identificar la empresa activa. Cerrá y volvé a abrir Acceso Empresa.</div>';}

// FIX raíz: todo el módulo V10/V11 recibe el company_id real del acceso activo.
devCompanyArgV100=function(mode){return mode==='admin'?(adminDevV100.companyId||null):v120CompanyId();};

loadCompanyDevelopmentV100=async function(){
  if(currentLutminUser?.role!=='company_admin'||!supabaseClient)return;
  ensureCompanyDevelopmentPanelV100();
  const cid=v120CompanyId();
  if(!cid)return v120CompanyRequiredMessage('companyDevBodyV100');
  try{
    const refresh=await supabaseClient.rpc('refresh_company_automation_v100',{p_company_id:cid});
    if(refresh.error)throw refresh.error;
    const r=await fetchDevelopmentV100('company');
    companyDevV100.data=r.data;companyDevV100.gaps=r.gaps;renderDevelopmentV100('company');
  }catch(e){
    console.error('Gestión de talento',e);
    const root=document.getElementById('companyDevBodyV100');
    if(root)root.innerHTML='<div class="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"><strong>No pude cargar Gestión de Talento.</strong><br>Reintentá con “Actualizar motor”. Si persiste, Administración puede revisar el diagnóstico del sistema.</div>';
  }
};

loadCompanyAutopilotV110=async function(recalculate=true){
  if(currentLutminUser?.role!=='company_admin'||!supabaseClient)return;
  ensureCompanyAutopilotV110();
  const cid=v120CompanyId(),body=document.getElementById('companyAutopilotBodyV110');
  if(!cid)return v120CompanyRequiredMessage('companyAutopilotBodyV110');
  if(body)body.innerHTML='<p class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Analizando datos propios de la empresa...</p>';
  try{
    if(recalculate){const rr=await supabaseClient.rpc('run_company_autopilot_v110',{p_company_id:cid});if(rr.error)throw rr.error;}
    const [center,jobs,brief]=await Promise.all([
      supabaseClient.rpc('company_agent_center_v110',{p_company_id:cid}),
      supabaseClient.from('job_posts').select('id,title,description,requirements,status,location,modality,created_at').eq('company_id',cid).order('created_at',{ascending:false}),
      supabaseClient.rpc('company_brief_v120',{p_company_id:cid})
    ]);
    if(center.error)throw center.error;
    if(brief.error)throw brief.error;
    companyAgentsV110.data=center.data||{};companyAgentsV110.jobs=jobs.data||[];companyBriefV120=brief.data||{};
    if(!companyAgentsV110.tab||companyAgentsV110.tab==='actions')companyAgentsV110.tab='briefing';
    renderCompanyAutopilotV110();
  }catch(e){
    console.error('Autopilot',e);
    if(body)body.innerHTML='<div class="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"><strong>No pude iniciar Autopilot.</strong><br>Volvé a intentar. El detalle técnico queda registrado en la consola para Administración.</div>';
  }
};

function v120SummaryCard(label,value,cls='text-lutmin-dark'){return `<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4"><p class="text-[9px] uppercase tracking-widest font-bold text-slate-400">${v120Esc(label)}</p><p class="mt-1 text-2xl font-black ${cls}">${Number(value||0)}</p></div>`;}
function renderCompanyBriefingV120(root){
  const b=companyBriefV120||{},s=b.summary||{},setup=b.setup||{},top=b.top_actions||[],hist=b.recent_executions||[];
  let next='';
  if(Number(setup.role_profiles||0)===0)next=`<div class="rounded-2xl bg-blue-50 border border-blue-100 p-5"><p class="text-[10px] uppercase font-black text-blue-600">Primer paso recomendado</p><h5 class="mt-1 font-black text-lutmin-dark">Definí al menos un perfil de puesto</h5><p class="mt-2 text-xs text-slate-600">Autopilot necesita saber qué competencias o cursos requiere cada puesto para poder detectar brechas reales.</p><button onclick="setDevTabV100('company','roles');document.getElementById('companyDevelopmentV100')?.scrollIntoView({behavior:'smooth'})" class="mt-3 px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Configurar perfiles</button></div>`;
  else if(Number(setup.assignments||0)<Number(setup.members||0))next=`<div class="rounded-2xl bg-violet-50 border border-violet-100 p-5"><p class="text-[10px] uppercase font-black text-violet-600">Siguiente paso recomendado</p><h5 class="mt-1 font-black text-lutmin-dark">Asigná perfiles al equipo</h5><p class="mt-2 text-xs text-slate-600">Hay ${Math.max(0,Number(setup.members||0)-Number(setup.assignments||0))} persona(s) sin perfil de puesto asignado. Sin esa relación no podemos calcular su brecha.</p><button onclick="setDevTabV100('company','roles');document.getElementById('companyDevelopmentV100')?.scrollIntoView({behavior:'smooth'})" class="mt-3 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold">Asignar puestos</button></div>`;
  else if(Number(s.critical||0)>0||Number(s.high||0)>0)next=`<div class="rounded-2xl bg-red-50 border border-red-100 p-5"><p class="text-[10px] uppercase font-black text-red-600">Atención prioritaria</p><h5 class="mt-1 font-black text-lutmin-dark">Hay ${Number(s.critical||0)+Number(s.high||0)} situación(es) de prioridad alta/crítica</h5><p class="mt-2 text-xs text-slate-600">Autopilot ya las separó del resto. Podés convertirlas en necesidades, rutas de desarrollo o posponerlas con trazabilidad.</p><button onclick="setCompanyAgentTabV110('actions')" class="mt-3 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold">Revisar prioridades</button></div>`;
  else if(Number(setup.open_needs||0)>0&&Number(setup.plans||0)===0)next=`<div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-5"><p class="text-[10px] uppercase font-black text-emerald-600">Siguiente paso recomendado</p><h5 class="mt-1 font-black text-lutmin-dark">Convertí necesidades en un plan anual</h5><p class="mt-2 text-xs text-slate-600">Hay ${Number(setup.open_needs||0)} necesidades abiertas y todavía no existe un plan activo.</p><button onclick="setCompanyAgentTabV110('demand')" class="mt-3 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Ver demanda</button></div>`;
  else next=`<div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-5"><p class="text-[10px] uppercase font-black text-emerald-600">Estado controlado</p><h5 class="mt-1 font-black text-lutmin-dark">No aparecen desvíos prioritarios nuevos</h5><p class="mt-2 text-xs text-slate-600">Autopilot seguirá recalculando frente a cambios de cursos, competencias, asistencia, vencimientos y puestos.</p></div>`;
  root.innerHTML=`<div><p class="text-[10px] uppercase tracking-widest font-black text-lutmin-light">Briefing Autopilot</p><h4 class="mt-1 text-xl font-black text-lutmin-dark">Qué requiere atención ahora</h4><p class="mt-1 text-xs text-slate-500">Resumen determinístico construido con datos propios. Sin API generativa.</p></div><div class="mt-4 grid grid-cols-2 xl:grid-cols-5 gap-3">${v120SummaryCard('Acciones abiertas',s.open_actions)}${v120SummaryCard('Brechas',s.gaps,'text-amber-600')}${v120SummaryCard('Riesgo académico',s.academic,'text-violet-600')}${v120SummaryCard('Cobertura',s.coverage,'text-red-600')}${v120SummaryCard('Vigencias',s.vigency,'text-blue-600')}</div><div class="mt-4 grid xl:grid-cols-[.75fr_1.25fr] gap-4">${next}<div class="rounded-2xl border border-slate-100 overflow-hidden"><div class="p-4 border-b border-slate-100"><h5 class="font-extrabold text-lutmin-dark">Prioridades detectadas</h5></div><div class="divide-y divide-slate-100">${top.length?top.map(a=>`<div class="p-4"><div class="flex justify-between gap-3"><div><span class="text-[9px] uppercase font-black ${a.priority==='critica'?'text-red-600':a.priority==='alta'?'text-orange-600':'text-slate-500'}">${v120Esc(a.priority)}</span><p class="mt-1 text-sm font-extrabold text-lutmin-dark">${v120Esc(a.title)}</p><p class="mt-1 text-xs text-slate-500">${a.full_name?v120Esc(a.full_name)+' · ':''}${v120Esc(a.description||'')}</p></div><button onclick="setCompanyAgentTabV110('actions')" class="h-fit px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Abrir</button></div></div>`).join(''):'<div class="p-6 text-sm text-slate-500">Sin prioridades abiertas.</div>'}</div></div></div>${hist.length?`<div class="mt-4 rounded-2xl bg-slate-50 p-4"><p class="text-[10px] uppercase font-black text-slate-400">Trazabilidad reciente</p><div class="mt-3 grid md:grid-cols-2 gap-2">${hist.slice(0,6).map(x=>`<div class="rounded-xl bg-white border border-slate-100 p-3"><p class="text-xs font-bold text-lutmin-dark">${v120Esc((x.result||{}).message||x.intent)}</p><p class="mt-1 text-[10px] text-slate-500">${x.executed_by?v120Esc(x.executed_by)+' · ':''}${x.created_at?new Date(x.created_at).toLocaleString('es-AR'):''}</p></div>`).join('')}</div></div>`:''}`;
}

renderCompanyAutopilotV110=function(){
  const d=companyAgentsV110.data||{},actions=d.actions||[],coverage=d.coverage||[];
  const critical=actions.filter(x=>x.priority==='critica').length,high=actions.filter(x=>x.priority==='alta').length,zero=coverage.filter(x=>(x.covered_by||[]).length===0).length,single=coverage.filter(x=>(x.covered_by||[]).length===1).length;
  const sum=document.getElementById('companyAutopilotSummaryV110');if(sum)sum.innerHTML=[['Acciones abiertas',actions.length,'text-white'],['Críticas',critical,'text-red-300'],['Alta prioridad',high,'text-orange-300'],['Sin cobertura',zero,'text-red-300'],['Cobertura única',single,'text-amber-300']].map(x=>`<div class="rounded-2xl bg-white/10 border border-white/10 p-4"><p class="text-[9px] uppercase tracking-widest font-bold text-blue-200">${x[0]}</p><p class="mt-1 text-2xl font-black ${x[2]}">${x[1]}</p></div>`).join('');
  const tabs=document.getElementById('companyAutopilotTabsV110');if(tabs)tabs.innerHTML=companyAgentTabButtonV110('briefing','Briefing','fa-compass')+companyAgentTabButtonV110('actions','Prioridades','fa-bolt')+companyAgentTabButtonV110('coverage','Cobertura','fa-shield-halved')+companyAgentTabButtonV110('simulation','Simulador','fa-flask')+companyAgentTabButtonV110('demand','Demanda','fa-chart-column')+companyAgentTabButtonV110('development','Desarrollo','fa-route')+companyAgentTabButtonV110('matching','Matching','fa-briefcase');
  const root=document.getElementById('companyAutopilotBodyV110');if(!root)return;
  if(companyAgentsV110.tab==='briefing')return renderCompanyBriefingV120(root);
  if(companyAgentsV110.tab==='coverage')return renderCompanyCoverageV110(root,d);
  if(companyAgentsV110.tab==='simulation')return renderCompanySimulationV110(root,d);
  if(companyAgentsV110.tab==='demand')return renderCompanyDemandV110(root,d);
  if(companyAgentsV110.tab==='development')return renderCompanyDevelopmentAgentV110(root,d);
  if(companyAgentsV110.tab==='matching')return renderCompanyMatchingV110(root,d);
  renderCompanyActionsV110(root,d);
};

function v120ActionButtons(a){
  const development=a.user_id?`<button onclick="executeCompanyActionV120('${a.id}','development_plan')" class="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold">Crear ruta</button>`:'';
  return `<div class="flex flex-wrap gap-2">${development}<button onclick="executeCompanyActionV120('${a.id}','create_need')" class="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-[10px] font-bold">Crear necesidad</button><button onclick="executeCompanyActionV120('${a.id}','snooze_7')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-bold">+7 días</button><button onclick="executeCompanyActionV120('${a.id}','resolve')" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold">Resolver</button><button onclick="executeCompanyActionV120('${a.id}','dismiss')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold">Ignorar</button></div>`;
}
renderCompanyActionsV110=function(root,d){const actions=d.actions||[];root.innerHTML=`<div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-black text-lutmin-light">Bandeja automática ejecutable</p><h4 class="mt-1 text-xl font-black text-lutmin-dark">Detectar ya no alcanza: convertí cada señal en una acción.</h4><p class="mt-1 text-xs text-slate-500">Crear necesidad, generar una ruta de desarrollo, posponer o cerrar. Todo queda registrado.</p></div><span class="text-[10px] text-slate-400">Las decisiones laborales siguen siendo humanas.</span></div><div class="mt-4 space-y-3">${actions.length?actions.map(a=>`<div class="rounded-2xl border border-slate-100 p-4"><div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4"><div class="flex-1"><div class="flex flex-wrap gap-2">${v110ActionBadge(a)}</div><p class="mt-2 text-sm font-extrabold text-lutmin-dark">${v120Esc(a.title)}</p><p class="mt-1 text-xs text-slate-500">${a.user_id?v120Esc(v110MemberName(a.user_id))+' · ':''}${v120Esc(a.description||'')}${a.due_at?' · objetivo '+new Date(a.due_at).toLocaleDateString('es-AR'):''}</p></div>${v120ActionButtons(a)}</div></div>`).join(''):'<div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 text-sm font-bold text-emerald-700"><i class="fa-solid fa-circle-check mr-2"></i>No hay acciones pendientes.</div>'}</div>`;};

async function executeCompanyActionV120(id,intent){
  const cid=v120CompanyId();if(!cid)return showToast('No pude identificar la empresa activa.');
  const {data,error}=await supabaseClient.rpc('execute_company_action_v120',{p_company_id:cid,p_action_id:id,p_intent:intent});
  if(error)return showToast(error.message||'No pude ejecutar la acción.');
  showToast(data?.result?.message||'Acción ejecutada.');
  await Promise.all([loadCompanyAutopilotV110(false),loadCompanyDevelopmentV100()]);
}

// Reemplazos de funciones V11 que todavía enviaban company_id = null.
setCompanyAgentActionV110=async function(id,status){return executeCompanyActionV120(id,status==='dismissed'?'dismiss':'resolve');};
createNeedFromAgentActionV110=async function(id){return executeCompanyActionV120(id,'create_need');};
runTeamSimulationV110=async function(){const id=document.getElementById('teamSimulationPersonV110')?.value;if(!id)return;const cid=v120CompanyId(),root=document.getElementById('teamSimulationResultV110');if(!cid)return;root.innerHTML='<p class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Simulando...</p>';const {data,error}=await supabaseClient.rpc('company_team_simulation_v110',{p_company_id:cid,p_exclude_user_id:id});if(error){root.innerHTML=`<p class="text-sm text-red-600">${v120Esc(error.message)}</p>`;return;}const rows=data||[],critical=rows.filter(x=>Number(x.remaining_coverage||0)===0),single=rows.filter(x=>Number(x.remaining_coverage||0)===1);root.innerHTML=`<p class="text-[10px] uppercase font-black text-violet-600">Escenario: ${v120Esc(v110MemberName(id))}</p><div class="mt-3 grid grid-cols-2 gap-3"><div class="rounded-xl bg-red-50 p-3"><p class="text-[9px] uppercase font-bold text-red-500">Quedan sin cobertura</p><p class="text-2xl font-black text-red-600">${critical.length}</p></div><div class="rounded-xl bg-amber-50 p-3"><p class="text-[9px] uppercase font-bold text-amber-600">Quedan con una sola cobertura</p><p class="text-2xl font-black text-amber-600">${single.length}</p></div></div><div class="mt-3 space-y-2">${critical.concat(single).slice(0,20).map(x=>`<div class="rounded-xl border border-slate-100 p-3 flex justify-between gap-3"><span class="text-xs font-bold text-lutmin-dark">${v120Esc(x.name)}</span><span class="text-[10px] font-black ${Number(x.remaining_coverage)===0?'text-red-600':'text-amber-600'}">${x.remaining_coverage} cobertura(s)</span></div>`).join('')||'<p class="text-sm text-emerald-700 font-bold">No aparecen concentraciones críticas en este escenario.</p>'}</div>`;};

generateAutopilotPlanV110=async function(){const cid=v120CompanyId();if(!cid)return showToast('No pude identificar la empresa.');const year=new Date().getFullYear();const {data,error}=await supabaseClient.rpc('generate_annual_plan_from_demand_v120',{p_company_id:cid,p_year:year});if(error)return showToast(error.message||'No pude generar el plan.');showToast(`Plan sugerido actualizado · ${Number(data?.items_created||0)} nuevo(s) hito(s).`);await Promise.all([loadCompanyDevelopmentV100(),loadCompanyAutopilotV110(false)]);};

runDevelopmentPathV110=async function(){const id=document.getElementById('devPathPersonV110')?.value;if(!id)return;const cid=v120CompanyId(),root=document.getElementById('devPathResultV110');if(!cid)return;root.innerHTML='<p class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Analizando...</p>';const {data,error}=await supabaseClient.rpc('company_development_path_v110',{p_company_id:cid,p_user_id:id});if(error){root.innerHTML=`<p class="text-sm text-red-600">${v120Esc(error.message)}</p>`;return;}const rows=data||[];root.innerHTML=`<p class="text-[10px] uppercase font-black text-blue-600">${v120Esc(v110MemberName(id))}</p><div class="mt-3 space-y-3">${rows.map(r=>`<div class="rounded-2xl bg-slate-50 p-4"><div class="flex justify-between gap-3"><div><p class="font-extrabold text-sm text-lutmin-dark">${v120Esc(r.role_name)}</p><p class="text-[10px] text-slate-500">${v120Esc(r.area||'')}</p></div><span class="text-xl font-black ${Number(r.coverage_percent)>=80?'text-emerald-600':Number(r.coverage_percent)>=50?'text-amber-600':'text-slate-500'}">${r.coverage_percent}%</span></div><div class="mt-3 flex flex-wrap gap-1.5">${(r.gaps||[]).slice(0,8).map(g=>`<span class="px-2 py-1 rounded-lg bg-white border border-slate-100 text-[10px] font-bold text-slate-600">${v120Esc(g.name)}${g.required_level?' · '+g.current_level+'/'+g.required_level:''}</span>`).join('')||'<span class="text-xs text-emerald-700 font-bold">Sin brechas obligatorias detectadas.</span>'}</div>${(r.gaps||[]).length?`<button onclick="createDevelopmentPathV120('${id}','${r.role_profile_id}')" class="mt-3 px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold"><i class="fa-solid fa-route mr-1"></i>Crear ruta automática</button>`:''}</div>`).join('')||'<p class="text-sm text-slate-500">No hay perfiles de puesto activos.</p>'}</div>`;};
async function createDevelopmentPathV120(userId,roleId){const cid=v120CompanyId();if(!cid)return;const {data,error}=await supabaseClient.rpc('create_development_plan_from_gaps_v120',{p_company_id:cid,p_user_id:userId,p_role_profile_id:roleId,p_target_date:null});if(error)return showToast(error.message||'No pude crear la ruta.');showToast(`Ruta creada · ${Number(data?.items_created||0)} acción(es) de desarrollo nuevas.`);await loadCompanyDevelopmentV100();}

// Diagnóstico no invasivo: sólo consola. Evita mensajes técnicos al usuario final.
async function v120CapabilityCheck(){if(!supabaseClient||!currentLutminUser)return;try{const {data,error}=await supabaseClient.rpc('system_capabilities_v120');if(error)console.warn('Lutmin capabilities',error);else console.info('Lutmin capabilities',data);}catch(e){console.warn(e);}}

// Ajuste visual: el siguiente salto se identifica por funciones, no por versiones técnicas en pantalla.
function initV120(){
  if(document.getElementById('companyAutopilotV110')){
    const tag=document.querySelector('#companyAutopilotV110 .inline-flex');if(tag)tag.innerHTML='<i class="fa-solid fa-satellite-dish mr-2"></i>Lutmin Autopilot · agentes internos';
    const h=document.querySelector('#companyAutopilotV110 h3');if(h)h.textContent='Que el sistema detecte, priorice y convierta señales en acciones.';
  }
  v120CapabilityCheck();
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV120,2650),{once:true});
