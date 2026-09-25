
// =============================================================
// LUTMIN V13.0 · ENTREVISTA PREVIA INTELIGENTE · API IA $0
// Preguntas generadas localmente según título + descripción + requisitos.
// La puntuación es sólo de preparación del candidato, no un ranking laboral.
// =============================================================

let talentPreInterviewsV130=[];
let activePreInterviewV130=null;
const V130_VERSION='13.0';

function v130Esc(v){return typeof v100Esc==='function'?v100Esc(v):escapeHtml(String(v??''));}
function v130Norm(v){return typeof v100Norm==='function'?v100Norm(v):String(v||'').toLowerCase();}
function v130Job(jobId){return (talentData?.jobs||[]).find(x=>x.id===jobId)||null;}
function v130Saved(jobId){return (talentPreInterviewsV130||[]).find(x=>x.job_id===jobId)||null;}
function v130App(jobId){return (talentData?.applications||[]).find(x=>x.job_id===jobId&&x.status!=='withdrawn')||null;}

function inferJobProfileV130(job){
  const text=v130Norm(`${job?.title||''} ${job?.description||''} ${job?.requirements||''}`);
  const has=(rx)=>rx.test(text);
  let family='general',label='Perfil general',seniority='Operativo / profesional';
  if(has(/coordinador|coordinacion|supervisor|supervision|jefe|lider|liderazgo|gerente|manager/)){family='leadership';label='Coordinación y liderazgo';seniority='Conducción / supervisión';}
  else if(has(/mantenimiento|electric|refriger|climat|hvac|plomer|sanitari|fontaner|durlock|albañ|tecnic|mecan|electromec/)){family='technical';label='Técnico / mantenimiento';seniority='Técnico / operativo';}
  else if(has(/venta|comercial|vendedor|cliente|atencion|atención|cuenta|negocio/)){family='commercial';label='Comercial / atención';seniority='Comercial / servicio';}
  else if(has(/rrhh|recursos humanos|seleccion|selección|reclut|capital humano|people/)){family='hr';label='Recursos Humanos';seniority='Profesional / gestión';}
  else if(has(/administr|contab|factur|tesorer|compras|logistica|logística|office|excel/)){family='administrative';label='Administración / soporte';seniority='Administrativo / gestión';}
  if(has(/junior|jr\b|ayudante|auxiliar|inicial|sin experiencia/))seniority='Inicial / junior';
  if(has(/senior|sr\b|especialista|referente/))seniority='Senior / referente';
  const a=typeof buildAgentAnalysisV100==='function'?buildAgentAnalysisV100(job):null;
  return {family,label,seniority,matched:a?.matched||[],missing:a?.missing||[]};
}

function buildPreInterviewQuestionsV130(job){
  const profile=inferJobProfileV130(job),a=typeof buildAgentAnalysisV100==='function'?buildAgentAnalysisV100(job):null;
  const focus=(a?.matched?.[0]||a?.missing?.[0]||profile.label).replace(/_/g,' ');
  const second=(a?.missing?.[0]||a?.matched?.[1]||'las responsabilidades principales del puesto').replace(/_/g,' ');
  const q=[];
  const add=(id,category,prompt,hint)=>{if(!q.some(x=>x.id===id))q.push({id,category,prompt,hint});};

  add('experience','Experiencia',`¿Qué experiencia concreta de tu recorrido se relaciona mejor con el puesto de ${job.title}?`,'Contá dónde fue, qué responsabilidad tenías y qué hiciste personalmente.');
  add('evidence','Evidencia',`La búsqueda pone foco en ${focus}. Contá un ejemplo real donde hayas aplicado ese conocimiento o capacidad.`,'Si podés, describí situación, acción y resultado.');

  if(profile.family==='leadership'){
    add('team','Liderazgo','Contá una situación en la que tuviste que coordinar personas con prioridades, ritmos o criterios diferentes. ¿Cómo organizaste el trabajo?','Buscamos entender tu forma de conducir y comunicar, no una respuesta “correcta”.');
    add('priority','Decisión','Imaginá que aparecen dos urgencias operativas al mismo tiempo y el equipo no alcanza para resolver ambas de inmediato. ¿Cómo priorizarías?','Explicá qué información mirarías y cómo comunicarías la decisión.');
  }else if(profile.family==='technical'){
    add('diagnosis','Resolución técnica','Describí una falla o problema técnico que hayas tenido que diagnosticar. ¿Cómo encontraste la causa y cómo verificaste la solución?','Priorizá el procedimiento y la evidencia concreta.');
    add('safety','Seguridad','Antes de intervenir sobre una tarea técnica con riesgo, ¿qué controles o verificaciones hacés?','Mencioná prácticas reales que utilices.');
  }else if(profile.family==='commercial'){
    add('customer','Cliente','Contá una situación con un cliente difícil o una necesidad poco clara. ¿Cómo entendiste el problema y qué hiciste?','Incluí el resultado si lo recordás.');
    add('objective','Resultados','¿Cómo organizás tu trabajo cuando tenés objetivos comerciales o varias oportunidades abiertas al mismo tiempo?','Podés mencionar seguimiento, prioridades o métricas que uses.');
  }else if(profile.family==='hr'){
    add('people','Personas','Contá una situación en la que tuviste que entender una necesidad de una persona o líder y convertirla en una acción concreta de RR.HH.','Puede ser selección, desempeño, clima, capacitación u otro proceso.');
    add('criteria','Criterio','¿Cómo ordenás información y criterios cuando tenés que comparar perfiles o tomar una decisión de proceso?','Explicá cómo evitás basarte sólo en impresiones.');
  }else if(profile.family==='administrative'){
    add('organization','Organización','Contá cómo te organizás cuando tenés varias tareas con vencimientos diferentes y aparecen urgencias nuevas.','Mencioná herramientas o criterios concretos si los usás.');
    add('control','Control','Describí un error o diferencia que hayas detectado en un proceso administrativo. ¿Cómo lo encontraste y qué hiciste después?','Buscamos entender tu método de control.');
  }else{
    add('problem','Resolución','Contá un problema laboral concreto que hayas resuelto. ¿Qué hiciste y cuál fue el resultado?','Elegí un ejemplo relevante para este puesto.');
    add('priority','Prioridades','¿Cómo organizás tu trabajo cuando tenés varias responsabilidades al mismo tiempo?','Explicá tu criterio de prioridad.');
  }

  if(second&&second!==focus)add('gap','Profundización',`En la descripción aparece ${second}. ¿Qué experiencia real tenés con ese tema y qué necesitarías aprender o reforzar?`,'Podés decir que no tenés experiencia; lo importante es dar contexto real.');
  add('result','Resultados','Elegí un logro laboral del que estés conforme. ¿Qué cambió gracias a tu intervención y cómo lo comprobaste?','Si existe un dato, plazo, mejora o resultado observable, incluilo.');
  add('motivation','Interés',`¿Qué te interesa específicamente de esta búsqueda de ${job.title} y qué parte del desafío sentís más alineada con tu experiencia?`,'No hace falta una respuesta extensa; priorizá lo concreto.');

  return q.slice(0,7);
}

function answerStrengthV130(answer,job){
  const text=String(answer||'').trim();if(!text)return 0;
  let score=Math.min(55,Math.round(text.length/4));
  if(/\b(logr|resultado|mejor|redu|aument|evit|resolv|implement|organic|coordin|diagnostic|verifi|entreg|cumpl)/i.test(text))score+=12;
  if(/\d/.test(text))score+=8;
  if(/\b(porque|entonces|despues|después|finalmente|resultado|para que|por eso)\b/i.test(text))score+=7;
  const target=typeof v100Vector==='function'?v100Vector([[job?.title,4],[job?.requirements,3],[job?.description,1]]):new Map();
  const answerTokens=new Set(typeof v100Tokens==='function'?v100Tokens(text):v130Norm(text).split(/\s+/));
  let relevance=0;for(const [t] of target)if(answerTokens.has(t))relevance++;
  score+=Math.min(18,relevance*4);
  return Math.max(0,Math.min(100,score));
}

function evaluatePreInterviewV130(job,questions,answers){
  const map=new Map((answers||[]).map(x=>[x.question_id,x]));
  let answered=0,totalStrength=0,rated=0;
  for(const q of questions){
    const a=map.get(q.id)||{};const text=String(a.answer||'').trim();
    if(text){answered++;totalStrength+=answerStrengthV130(text,job);}
    const r=Number(a.self_rating||0);if(r>0)rated+=Math.min(5,Math.max(1,r));
  }
  const completion=questions.length?Math.round(answered*100/questions.length):0;
  const strength=answered?Math.round(totalStrength/answered):0;
  const self=rated&&answered?Math.round((rated/(answered*5))*100):0;
  const preparation=Math.round(completion*.45+strength*.45+self*.10);
  return {answered,total:questions.length,completion,strength,self,preparation:Math.max(0,Math.min(100,preparation))};
}

function collectPreInterviewAnswersV130(){
  const root=document.getElementById('preInterviewQuestionsV130');if(!root)return [];
  return [...root.querySelectorAll('[data-v130-question]')].map(box=>({
    question_id:box.dataset.v130Question,
    answer:box.querySelector('textarea')?.value.trim()||'',
    self_rating:Number(box.querySelector('select')?.value||0)
  }));
}

function existingAnswersMapV130(saved){return new Map((saved?.answers||[]).map(x=>[x.question_id,x]));}

function renderPreInterviewQuestionsV130(job,questions,saved){
  const amap=existingAnswersMapV130(saved);
  return questions.map((q,i)=>{const a=amap.get(q.id)||{};return `<div data-v130-question="${v130Esc(q.id)}" class="rounded-2xl border border-slate-100 p-4 sm:p-5 bg-white"><div class="flex gap-3"><span class="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">${i+1}</span><div class="flex-1"><p class="text-[10px] uppercase tracking-widest font-black text-blue-600">${v130Esc(q.category)}</p><p class="mt-1 text-sm font-extrabold text-lutmin-dark">${v130Esc(q.prompt)}</p><p class="mt-1 text-[11px] text-slate-500">${v130Esc(q.hint||'')}</p></div></div><textarea rows="4" maxlength="1800" oninput="updatePreInterviewMeterV130()" class="mt-3 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Tu respuesta...">${v130Esc(a.answer||'')}</textarea><div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2"><label class="text-[10px] uppercase font-bold text-slate-400">Tu nivel de experiencia en este tema</label><select onchange="updatePreInterviewMeterV130()" class="sm:ml-auto px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"><option value="0">Sin indicar</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(a.self_rating)===n?'selected':''}>${n}/5 · ${['','Inicial','Básica','Intermedia','Sólida','Muy sólida'][n]}</option>`).join('')}</select></div></div>`}).join('');
}

function preInterviewMeterHtmlV130(ev){
  const cls=ev.preparation>=75?'text-emerald-700 bg-emerald-50 border-emerald-100':ev.preparation>=50?'text-blue-700 bg-blue-50 border-blue-100':'text-amber-700 bg-amber-50 border-amber-100';
  return `<div class="grid grid-cols-3 gap-2"><div class="rounded-xl bg-white border border-slate-100 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">Respondidas</p><p class="mt-1 text-xl font-black text-lutmin-dark">${ev.answered}/${ev.total}</p></div><div class="rounded-xl bg-white border border-slate-100 p-3"><p class="text-[9px] uppercase font-bold text-slate-400">Completitud</p><p class="mt-1 text-xl font-black text-blue-600">${ev.completion}%</p></div><div class="rounded-xl border p-3 ${cls}"><p class="text-[9px] uppercase font-bold">Preparación</p><p class="mt-1 text-xl font-black">${ev.preparation}%</p></div></div><p class="mt-2 text-[10px] text-slate-500">El índice de preparación sirve para ayudarte a completar respuestas concretas. No compara personas ni decide quién avanza.</p>`;
}

function updatePreInterviewMeterV130(){
  if(!activePreInterviewV130)return;const answers=collectPreInterviewAnswersV130(),ev=evaluatePreInterviewV130(activePreInterviewV130.job,activePreInterviewV130.questions,answers);const root=document.getElementById('preInterviewMeterV130');if(root)root.innerHTML=preInterviewMeterHtmlV130(ev);
}

async function loadTalentPreInterviewsV130(){
  if(!supabaseClient||currentLutminUser?.role!=='student'){talentPreInterviewsV130=[];return;}
  const {data,error}=await supabaseClient.rpc('my_job_preinterviews_v130');
  if(error){console.warn('Entrevista previa no disponible',error);talentPreInterviewsV130=[];return;}
  talentPreInterviewsV130=Array.isArray(data)?data:[];
}

function preInterviewStatusCardV130(jobId,compact=false){
  const s=v130Saved(jobId),app=v130App(jobId);
  if(s?.status==='completed')return `<div class="${compact?'':'mt-3 '}rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><p class="text-[10px] font-black text-emerald-700"><i class="fa-solid fa-circle-check mr-1"></i>Entrevista previa completada</p><p class="mt-1 text-[10px] text-emerald-700/80">Preparación ${Math.round(Number(s.preparation_score||0))}% · ${app?'adjunta a tu postulación':'lista para adjuntar cuando te postules'}.</p></div><button onclick="openJobPreInterviewV130('${jobId}')" class="px-3 py-2 rounded-xl bg-white text-emerald-700 border border-emerald-100 text-[10px] font-bold">Revisar</button></div>`;
  if(s)return `<div class="${compact?'':'mt-3 '}rounded-xl bg-amber-50 border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><p class="text-[10px] font-black text-amber-700">Entrevista previa en borrador · ${Math.round(Number(s.completion_percent||0))}%</p><p class="mt-1 text-[10px] text-amber-700/80">Completala para sumar contexto real a tu postulación.</p></div><button onclick="openJobPreInterviewV130('${jobId}')" class="px-3 py-2 rounded-xl bg-white text-amber-700 border border-amber-100 text-[10px] font-bold">Continuar</button></div>`;
  return `<div class="${compact?'':'mt-3 '}rounded-xl bg-blue-50 border border-blue-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><p class="text-[10px] font-black text-blue-700"><i class="fa-solid fa-comments mr-1"></i>Entrevista previa opcional</p><p class="mt-1 text-[10px] text-slate-600">Mostrá ejemplos que quizá no entran en el CV. Una postulación con más contexto puede ser más fácil de evaluar.</p></div><button onclick="openJobPreInterviewV130('${jobId}')" class="px-3 py-2 rounded-xl bg-white text-blue-700 border border-blue-100 text-[10px] font-bold whitespace-nowrap">Completar</button></div>`;
}

function enhanceTalentJobsV130(){
  const root=document.getElementById('talentJobsList');if(!root)return;
  root.querySelectorAll('[data-talent-job]').forEach(card=>{const jobId=card.dataset.talentJob;if(!jobId||card.querySelector('[data-v130-preinterview]'))return;const box=document.createElement('div');box.dataset.v130Preinterview='1';box.innerHTML=preInterviewStatusCardV130(jobId,true);card.appendChild(box);});
  enhanceTalentApplicationsV130();
}

function enhanceTalentApplicationsV130(){
  const root=document.getElementById('talentApplicationsList');if(!root)return;
  const apps=talentData?.applications||[];
  [...root.children].forEach((el,i)=>{const app=apps[i];if(!app||el.querySelector('[data-v130-application-interview]'))return;const s=v130Saved(app.job_id);const btn=document.createElement('button');btn.dataset.v130ApplicationInterview='1';btn.className=`mt-3 ml-2 text-[11px] font-bold ${s?.status==='completed'?'text-emerald-700':'text-blue-700'}`;btn.innerHTML=s?.status==='completed'?'<i class="fa-solid fa-comments mr-1"></i>Entrevista previa enviada':'<i class="fa-regular fa-comments mr-1"></i>Completar entrevista previa';btn.onclick=()=>openJobPreInterviewV130(app.job_id);el.appendChild(btn);});
}

async function openJobPreInterviewV130(jobId){
  const job=v130Job(jobId);if(!job)return showToast('No pude encontrar la búsqueda.');
  const saved=v130Saved(jobId);const profile=inferJobProfileV130(job);const questions=saved?.question_set?.length?saved.question_set:buildPreInterviewQuestionsV130(job);
  activePreInterviewV130={job,questions,saved};
  const m=ensureV100Modal('preInterviewModalV130','max-w-4xl');m.classList.remove('z-[170]');m.classList.add('z-[190]');
  const b=m.querySelector('[data-v100-body]');
  b.innerHTML=`<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-blue-600">Agente de entrevista · motor local · API $0</p><h2 class="mt-2 text-2xl sm:text-3xl font-black text-lutmin-dark">Entrevista previa · ${v130Esc(job.title)}</h2><p class="mt-2 text-sm text-slate-500">Perfil detectado: <strong>${v130Esc(profile.label)}</strong> · ${v130Esc(profile.seniority)}</p></div><span class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black whitespace-nowrap">OPCIONAL</span></div><div class="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900 leading-relaxed"><strong>¿Por qué completarla?</strong> Permite mostrar situaciones y experiencia que un CV no siempre refleja. La empresa podrá leer tus respuestas junto con tu postulación. Puede darte más oportunidad de mostrar tu experiencia, pero no garantiza avanzar ni reemplaza la decisión humana.</div><div id="preInterviewMeterV130" class="mt-4"></div><div id="preInterviewQuestionsV130" class="mt-5 space-y-3">${renderPreInterviewQuestionsV130(job,questions,saved)}</div><div class="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-[11px] text-slate-600"><i class="fa-solid fa-shield-halved text-blue-600 mr-2"></i>Respondé sólo sobre experiencia y capacidades laborales. Lutmin no necesita datos sobre salud, familia, religión, política u otra información personal sensible para esta autoevaluación.</div><div class="mt-5 grid sm:grid-cols-3 gap-2"><button onclick="savePreInterviewV130(false)" class="py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">Guardar borrador</button><button onclick="hideV100Modal('preInterviewModalV130')" class="py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm">Seguir después</button><button onclick="savePreInterviewV130(true)" class="py-3 rounded-xl bg-lutmin-dark text-white font-extrabold text-sm"><i class="fa-solid fa-circle-check mr-2"></i>Completar entrevista</button></div>`;
  updatePreInterviewMeterV130();showV100Modal('preInterviewModalV130');
}

async function savePreInterviewV130(complete){
  if(!activePreInterviewV130)return;const answers=collectPreInterviewAnswersV130(),ev=evaluatePreInterviewV130(activePreInterviewV130.job,activePreInterviewV130.questions,answers);
  if(complete&&ev.answered<ev.total)return showToast(`Respondé las ${ev.total} preguntas para marcar la entrevista como completa. También podés guardarla como borrador.`);
  const profile=inferJobProfileV130(activePreInterviewV130.job),analysis=typeof buildAgentAnalysisV100==='function'?buildAgentAnalysisV100(activePreInterviewV130.job):null;
  const evidence={role_family:profile.family,role_label:profile.label,seniority:profile.seniority,matched_terms:analysis?.matched||[],missing_terms:analysis?.missing||[],answer_strength:ev.strength,answered:ev.answered,total:ev.total};
  const {data,error}=await supabaseClient.rpc('save_job_preinterview_v130',{p_job_id:activePreInterviewV130.job.id,p_question_set:activePreInterviewV130.questions,p_answers:answers,p_preparation_score:ev.preparation,p_evidence_context:evidence,p_complete:!!complete});
  if(error)return showToast(error.message||'No pude guardar la entrevista previa.');
  showToast(complete?'Entrevista previa completada. Quedará adjunta a tu postulación.':'Borrador guardado.');
  await loadTalentPreInterviewsV130();
  hideV100Modal('preInterviewModalV130');activePreInterviewV130=null;
  if(typeof renderTalentCenter==='function')renderTalentCenter();else enhanceTalentJobsV130();
  const p=pendingSmartApplicationV100;if(p)injectSmartApplyPreInterviewV130(p.job.id);
}

function injectSmartApplyPreInterviewV130(jobId){
  const modal=document.getElementById('smartApplyModalV100'),body=modal?.querySelector('[data-v100-body]');if(!body)return;
  body.querySelector('[data-v130-smart-card]')?.remove();const box=document.createElement('div');box.dataset.v130SmartCard='1';box.className='mt-5';box.innerHTML=preInterviewStatusCardV130(jobId,true);const label=body.querySelector('label[for="smartApplyMessageV100"]')||document.getElementById('smartApplyMessageV100')?.previousElementSibling;const ta=document.getElementById('smartApplyMessageV100');if(ta)ta.insertAdjacentElement('beforebegin',box);else body.appendChild(box);
}

// Abrir la entrevista previa también desde el flujo de postulación asistida.
if(typeof openSmartApplyV100==='function'){
  const _openSmartApplyV130=openSmartApplyV100;
  openSmartApplyV100=async function(jobId){const r=await _openSmartApplyV130.apply(this,arguments);setTimeout(()=>injectSmartApplyPreInterviewV130(jobId),0);return r;};
}

// Conserva CV dinámico V10 y adjunta snapshot de entrevista V13 si existe.
if(typeof confirmSmartApplyV100==='function'){
  confirmSmartApplyV100=async function(){
    const p=pendingSmartApplicationV100;if(!p)return;
    const msg=document.getElementById('smartApplyMessageV100')?.value.trim()||null;
    const {data,error}=await supabaseClient.from('job_applications').insert({job_id:p.job.id,user_id:currentLutminUser.id,message:msg}).select('id').single();
    if(error)return showToast(error.code==='23505'?'Ya estás postulado/a a esta búsqueda.':error.message||'No pude registrar la postulación.');
    const tasks=[supabaseClient.rpc('save_application_cv_snapshot_v100',{p_application_id:data.id,p_job_id:p.job.id,p_affinity:p.analysis.score,p_matching_terms:p.analysis.matched,p_gap_terms:p.analysis.missing,p_snapshot:p.snapshot}),supabaseClient.rpc('attach_job_preinterview_v130',{p_job_id:p.job.id,p_application_id:data.id})];
    const [cv,pi]=await Promise.all(tasks);if(cv.error)console.error('Snapshot CV V10',cv.error);if(pi.error)console.warn('Entrevista previa V13',pi.error);
    hideV100Modal('smartApplyModalV100');pendingSmartApplicationV100=null;
    showToast(pi.data?'Postulación enviada con CV dinámico y entrevista previa.':'Postulación enviada. Podés completar la entrevista previa cuando quieras.');
    await loadTalentCenter();
  };
}

function companyActiveIdV130(){return typeof v120CompanyId==='function'?v120CompanyId():(currentCompanyPortal?.company?.id||currentCompanyPortal?.company_id||null);}
async function injectCompanyPreInterviewV130(applicationId){
  const root=document.getElementById('companyCandidateContent');if(!root||root.querySelector('[data-v130-company-interview]'))return;
  const {data,error}=await supabaseClient.rpc('company_application_preinterview_v130',{p_application_id:applicationId,p_company_id:companyActiveIdV130()});
  if(error||!data||!data.question_set?.length)return;
  const qs=data.question_set||[],answers=new Map((data.answers||[]).map(x=>[x.question_id,x]));
  const card=document.createElement('div');card.dataset.v130CompanyInterview='1';card.className='mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4';
  card.innerHTML=`<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="text-[10px] uppercase font-black text-blue-700">Entrevista previa voluntaria</p><p class="mt-1 text-sm font-extrabold text-lutmin-dark">${qs.length} respuestas aportadas por el candidato</p><p class="mt-1 text-[10px] text-slate-500">Aporta contexto adicional. No es un ranking, filtro automático ni recomendación de contratación.</p></div><button class="px-3 py-2 rounded-xl bg-white border border-blue-100 text-blue-700 text-xs font-bold">Ver respuestas</button></div>`;
  card.querySelector('button').onclick=()=>{const m=ensureV100Modal('companyPreInterviewModalV130','max-w-4xl');m.classList.remove('z-[170]');m.classList.add('z-[190]');const b=m.querySelector('[data-v100-body]');b.innerHTML=`<p class="text-[10px] uppercase tracking-widest font-black text-blue-600">Entrevista previa · evidencia declarada</p><h2 class="mt-2 text-2xl font-black text-lutmin-dark">Respuestas del candidato</h2><div class="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">Estas respuestas fueron completadas voluntariamente y deben leerse junto con el resto del perfil. No sustituyen una entrevista ni una validación de competencias.</div><div class="mt-5 space-y-3">${qs.map((q,i)=>{const a=answers.get(q.id)||{};return `<div class="rounded-2xl border border-slate-100 p-4"><p class="text-[10px] uppercase font-black text-blue-600">${v130Esc(q.category||'Pregunta')} · ${i+1}/${qs.length}</p><p class="mt-1 text-sm font-extrabold text-lutmin-dark">${v130Esc(q.prompt)}</p><div class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">${v130Esc(a.answer||'Sin respuesta')}</div>${Number(a.self_rating||0)?`<p class="mt-2 text-[10px] text-slate-500">Autoevaluación declarada por la persona: ${Number(a.self_rating)}/5</p>`:''}</div>`}).join('')}</div>`;showV100Modal('companyPreInterviewModalV130');};
  root.firstElementChild?.insertAdjacentElement('afterend',card);
}

if(typeof openCompanyCandidateProfile==='function'){
  const _openCompanyCandidateProfileV130=openCompanyCandidateProfile;
  openCompanyCandidateProfile=async function(userId,applicationId=null){const r=await _openCompanyCandidateProfileV130.apply(this,arguments);if(applicationId)await injectCompanyPreInterviewV130(applicationId);return r;};
}

// Re-render de tarjetas: entrevista visible antes y después de postularse.
if(typeof renderTalentCenter==='function'){
  const _renderTalentCenterV130=renderTalentCenter;
  renderTalentCenter=function(){const r=_renderTalentCenterV130.apply(this,arguments);setTimeout(enhanceTalentJobsV130,0);return r;};
}
if(typeof loadTalentCenter==='function'){
  const _loadTalentCenterV130=loadTalentCenter;
  loadTalentCenter=async function(){const r=await _loadTalentCenterV130.apply(this,arguments);await loadTalentPreInterviewsV130();if(typeof renderTalentCenter==='function')renderTalentCenter();else enhanceTalentJobsV130();return r;};
}

function initV130(){
  // V22: la entrevista previa se carga bajo demanda junto con Lutmin Conecta.
  if(!new URL(location.href).searchParams.get('talento'))document.title='Lutmin | Plataforma';
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV130,3300),{once:true});
