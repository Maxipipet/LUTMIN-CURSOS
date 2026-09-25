
// =============================================================
// LUTMIN V2.6 · ACADEMIA AVANZADA
// Rutas de aprendizaje + Encuestas / NPS
// Base visual protegida: V2.1/V2.4
// =============================================================
let v25Paths=[];
let v25PathCourses=[];
let v25PathAssignments=[];
let v25Surveys=[];
let v25SurveyResponses=[];
let v25UiReady=false;

function initV25Ui(){
  if(v25UiReady) return;
  v25UiReady=true;

  const coursesPanel=document.querySelector('section[data-campus-panel="courses"]');
  if(coursesPanel && !document.getElementById('studentLearningPathsV25')){
    coursesPanel.insertAdjacentHTML('beforeend', `
      <div id="studentLearningPathsV25" class="mt-7 bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-100">
          <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-route"></i></div><div><h3 class="font-extrabold text-lutmin-dark">Mis rutas de aprendizaje</h3><p class="mt-1 text-xs text-slate-500">Programas formados por varios cursos con un objetivo común.</p></div></div>
        </div>
        <div id="studentLearningPathsListV25" class="p-5 sm:p-6 grid lg:grid-cols-2 gap-4"><p class="text-sm text-slate-500 lg:col-span-2">Todavía no tenés rutas asignadas.</p></div>
      </div>`);
  }

  const certPanel=document.querySelector('section[data-campus-panel="certificates"]');
  if(certPanel && !document.getElementById('studentSurveysV25')){
    certPanel.insertAdjacentHTML('beforeend', `
      <div id="studentSurveysV25" class="mt-7 bg-white rounded-3xl border border-slate-100 overflow-hidden hidden">
        <div class="p-5 sm:p-6 border-b border-slate-100"><h3 class="font-extrabold text-lutmin-dark">Tu opinión sobre las capacitaciones</h3><p class="mt-1 text-xs text-slate-500">Las respuestas ayudan a mejorar contenidos, docentes y experiencia.</p></div>
        <div id="studentSurveyListV25" class="p-5 sm:p-6 space-y-4"></div>
      </div>`);
  }

  const admin=document.querySelector('section[data-campus-panel="admin"]');
  if(admin && !document.getElementById('adminAcademicV25')){
    admin.insertAdjacentHTML('beforeend', `
      <div id="adminAcademicV25" data-admin-module-v19="academic" class="mt-6 space-y-6">
        <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-route"></i></div><div><h3 class="font-extrabold text-lutmin-dark text-lg">Rutas de aprendizaje</h3><p class="mt-1 text-xs text-slate-500">Agrupá varios cursos en programas y asigná el recorrido completo a una persona.</p></div></div>
            <span class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">ACADEMIA AVANZADA</span>
          </div>
          <div class="p-5 sm:p-6 grid xl:grid-cols-[.8fr_1.2fr] gap-5">
            <form id="createPathFormV25" class="rounded-2xl bg-slate-50 p-4 space-y-3">
              <h4 class="font-extrabold text-lutmin-dark">Crear ruta</h4>
              <input id="pathNameV25" required maxlength="140" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm" placeholder="Ej: Técnico de Mantenimiento">
              <textarea id="pathDescriptionV25" rows="3" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm" placeholder="Objetivo y alcance"></textarea>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600"><input id="pathPublishedV25" type="checkbox"> Publicar / habilitar para alumnos asignados</label>
              <button class="w-full px-4 py-3 rounded-xl bg-lutmin-dark text-white text-sm font-extrabold">Crear ruta</button>
            </form>
            <div>
              <div id="adminPathsListV25" class="space-y-3"><p class="text-sm text-slate-500">Cargando rutas...</p></div>
            </div>
          </div>
          <div class="border-t border-slate-100 p-5 sm:p-6 grid lg:grid-cols-2 gap-5">
            <form id="pathCourseFormV25" class="rounded-2xl border border-slate-100 p-4 space-y-3">
              <h4 class="font-extrabold text-lutmin-dark">Agregar curso a una ruta</h4>
              <select id="pathCoursePathV25" required class="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"></select>
              <select id="pathCourseCourseV25" required class="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"></select>
              <input id="pathCourseOrderV25" type="number" min="1" value="1" class="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Orden">
              <button class="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-extrabold">Agregar curso</button>
            </form>
            <form id="assignPathFormV25" class="rounded-2xl border border-slate-100 p-4 space-y-3">
              <h4 class="font-extrabold text-lutmin-dark">Asignar ruta a un alumno</h4>
              <select id="assignPathPathV25" required class="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"></select>
              <select id="assignPathStudentV25" required class="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"></select>
              <div><label class="text-[11px] font-bold text-slate-500">Fecha objetivo (opcional)</label><input id="assignPathDueV25" type="date" class="mt-1 w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"></div>
              <button class="w-full px-4 py-3 rounded-xl bg-lutmin-light text-white text-sm font-extrabold">Asignar ruta completa</button>
            </form>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div class="p-5 sm:p-6 border-b border-slate-100"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-face-smile"></i></div><div><h3 class="font-extrabold text-lutmin-dark text-lg">Calidad académica · Encuestas y NPS</h3><p class="mt-1 text-xs text-slate-500">Pedí feedback únicamente a alumnos que ya obtuvieron su certificado.</p></div></div></div>
          <div class="p-5 sm:p-6 grid xl:grid-cols-[.75fr_1.25fr] gap-5">
            <form id="surveyConfigFormV25" class="rounded-2xl bg-slate-50 p-4 space-y-3">
              <h4 class="font-extrabold text-lutmin-dark">Configurar encuesta</h4>
              <select id="surveyCourseV25" required class="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 text-sm"></select>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600"><input id="surveyEnabledV25" type="checkbox"> Encuesta activa</label>
              <button class="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-extrabold">Guardar configuración</button>
            </form>
            <div>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="rounded-2xl bg-emerald-50 p-4"><p class="text-[10px] font-bold text-emerald-600">RESPUESTAS</p><p id="qualityResponsesV25" class="mt-1 text-2xl font-black text-emerald-700">0</p></div>
                <div class="rounded-2xl bg-blue-50 p-4"><p class="text-[10px] font-bold text-blue-600">SATISFACCIÓN</p><p id="qualitySatisfactionV25" class="mt-1 text-2xl font-black text-blue-700">-</p></div>
                <div class="rounded-2xl bg-violet-50 p-4"><p class="text-[10px] font-bold text-violet-600">NPS PROM.</p><p id="qualityNpsV25" class="mt-1 text-2xl font-black text-violet-700">-</p></div>
              </div>
              <div id="qualityCoursesV25" class="space-y-2"><p class="text-sm text-slate-500">Sin respuestas todavía.</p></div>
            </div>
          </div>
        </div>
      </div>`);
  }

  bindV25Events();
}

function v25Students(){
  return (typeof adminProfiles!=='undefined'?adminProfiles:[]).filter(p=>typeof adminIsStudent==='function'?adminIsStudent(p):p.role==='student');
}

function v25FillSelects(){
  const pathOptions='<option value="">Seleccionar ruta</option>'+v25Paths.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  ['pathCoursePathV25','assignPathPathV25'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=pathOptions;});
  const courseOptions='<option value="">Seleccionar curso</option>'+(typeof adminCourses!=='undefined'?adminCourses:[]).map(c=>`<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
  ['pathCourseCourseV25','surveyCourseV25'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=courseOptions;});
  const studentOptions='<option value="">Seleccionar alumno</option>'+v25Students().map(p=>`<option value="${p.id}">${escapeHtml(p.full_name||p.email)} · ${escapeHtml(p.email||'')}</option>`).join('');
  const st=document.getElementById('assignPathStudentV25');if(st)st.innerHTML=studentOptions;
}

async function loadAdminV25(){
  if(!supabaseClient||currentLutminUser?.role!=='admin') return;
  initV25Ui();
  const [paths,pcs,assigns,surveys,responses,quality]=await Promise.all([
    supabaseClient.from('learning_paths').select('*').order('created_at',{ascending:false}),
    supabaseClient.from('learning_path_courses').select('*,course:courses(id,title)').order('sort_order'),
    supabaseClient.from('learning_path_assignments').select('*').order('assigned_at',{ascending:false}),
    supabaseClient.from('course_surveys').select('*'),
    supabaseClient.from('course_survey_responses').select('*').order('created_at',{ascending:false}),
    supabaseClient.from('course_quality_summary').select('*')
  ]);
  const err=[paths,pcs,assigns,surveys,responses,quality].find(x=>x.error)?.error;
  if(err){console.warn('V2.5 no disponible:',err.message);const root=document.getElementById('adminPathsListV25');if(root)root.innerHTML='<div class="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm">Academia avanzada todavía no está configurada. Contactá a Administración.</div>';return;}
  v25Paths=paths.data||[];v25PathCourses=pcs.data||[];v25PathAssignments=assigns.data||[];v25Surveys=surveys.data||[];v25SurveyResponses=responses.data||[];
  v25FillSelects();renderAdminPathsV25();renderQualityV25(quality.data||[]);
}

function renderAdminPathsV25(){
  const root=document.getElementById('adminPathsListV25');if(!root)return;
  if(!v25Paths.length){root.innerHTML='<div class="p-4 rounded-2xl bg-slate-50 text-sm text-slate-500">Todavía no hay rutas creadas.</div>';return;}
  root.innerHTML=v25Paths.map(p=>{
    const items=v25PathCourses.filter(x=>x.path_id===p.id).sort((a,b)=>a.sort_order-b.sort_order);
    const assigned=v25PathAssignments.filter(x=>x.path_id===p.id&&x.status!=='cancelled').length;
    return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap gap-2 items-center"><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(p.name)}</h4><span class="text-[10px] px-2 py-1 rounded-full ${p.published?'bg-green-50 text-green-700':'bg-slate-100 text-slate-500'} font-bold">${p.published?'Publicada':'Borrador'}</span></div><p class="mt-1 text-xs text-slate-500">${escapeHtml(p.description||'Sin descripción')}</p></div><button onclick="togglePathV25('${p.id}',${!p.published})" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">${p.published?'Ocultar':'Publicar'}</button></div><div class="mt-3 flex flex-wrap gap-2">${items.map(x=>`<span class="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold">${x.sort_order}. ${escapeHtml(x.course?.title||'Curso')}</span>`).join('')||'<span class="text-xs text-slate-400">Sin cursos todavía</span>'}</div><p class="mt-3 text-[10px] text-slate-400">${items.length} curso${items.length===1?'':'s'} · ${assigned} alumno${assigned===1?'':'s'} asignado${assigned===1?'':'s'}</p></div>`;
  }).join('');
}

function renderQualityV25(rows){
  const total=v25SurveyResponses.length;
  const sat=total?v25SurveyResponses.reduce((s,r)=>s+Number(r.satisfaction||0),0)/total:null;
  const nps=total?v25SurveyResponses.reduce((s,r)=>s+Number(r.nps||0),0)/total:null;
  document.getElementById('qualityResponsesV25').textContent=String(total);
  document.getElementById('qualitySatisfactionV25').textContent=sat?`${sat.toFixed(1)}/5`:'-';
  document.getElementById('qualityNpsV25').textContent=nps?nps.toFixed(1):'-';
  const root=document.getElementById('qualityCoursesV25');if(!root)return;
  root.innerHTML=rows.length?rows.map(r=>`<div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p class="text-xs font-bold text-lutmin-dark">${escapeHtml(r.course_title)}</p><p class="text-[10px] text-slate-500">${r.responses||0} respuestas · ${r.enabled?'Activa':'Inactiva'}</p></div><div class="text-right"><p class="text-xs font-black text-blue-700">${r.satisfaction_avg?`${r.satisfaction_avg}/5`:'-'}</p><p class="text-[10px] text-violet-600">NPS ${r.nps_avg??'-'}</p></div></div>`).join(''):'<p class="text-sm text-slate-500">Sin encuestas configuradas.</p>';
}

function bindV25Events(){
  document.getElementById('createPathFormV25')?.addEventListener('submit',async e=>{e.preventDefault();const name=document.getElementById('pathNameV25').value.trim();if(!name)return;const {error}=await supabaseClient.from('learning_paths').insert({name,description:document.getElementById('pathDescriptionV25').value.trim(),published:document.getElementById('pathPublishedV25').checked,active:true,created_by:currentLutminUser.id});if(error)return showToast(error.message||'No pude crear la ruta.');e.target.reset();showToast('Ruta creada.');await loadAdminV25();});
  document.getElementById('pathCourseFormV25')?.addEventListener('submit',async e=>{e.preventDefault();const path_id=document.getElementById('pathCoursePathV25').value,course_id=document.getElementById('pathCourseCourseV25').value,sort_order=Math.max(1,Number(document.getElementById('pathCourseOrderV25').value||1));const {error}=await supabaseClient.from('learning_path_courses').upsert({path_id,course_id,sort_order,required:true},{onConflict:'path_id,course_id'});if(error)return showToast(error.message||'No pude agregar el curso.');showToast('Curso agregado a la ruta.');await loadAdminV25();});
  document.getElementById('assignPathFormV25')?.addEventListener('submit',async e=>{e.preventDefault();const p_path_id=document.getElementById('assignPathPathV25').value,p_user_id=document.getElementById('assignPathStudentV25').value,p_due_date=document.getElementById('assignPathDueV25').value||null;const {data,error}=await supabaseClient.rpc('admin_assign_learning_path',{p_path_id,p_user_id,p_due_date});if(error)return showToast(error.message||'No pude asignar la ruta.');showToast(`Ruta asignada. Cursos nuevos: ${data?.courses_enrolled||0}.`);await loadAdminData();await loadAdminV25();});
  document.getElementById('surveyConfigFormV25')?.addEventListener('submit',async e=>{e.preventDefault();const course_id=document.getElementById('surveyCourseV25').value,enabled=document.getElementById('surveyEnabledV25').checked;const {error}=await supabaseClient.from('course_surveys').upsert({course_id,enabled,updated_at:new Date().toISOString()},{onConflict:'course_id'});if(error)return showToast(error.message||'No pude guardar la encuesta.');showToast('Encuesta actualizada.');await loadAdminV25();});
  document.getElementById('surveyCourseV25')?.addEventListener('change',e=>{const row=v25Surveys.find(x=>x.course_id===e.target.value);document.getElementById('surveyEnabledV25').checked=Boolean(row?.enabled);});
}

async function togglePathV25(id,published){const {error}=await supabaseClient.from('learning_paths').update({published,updated_at:new Date().toISOString()}).eq('id',id);if(error)return showToast(error.message||'No pude actualizar la ruta.');showToast(published?'Ruta publicada.':'Ruta ocultada.');await loadAdminV25();}

async function loadStudentPathsV25(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  initV25Ui();
  const {data:assigns,error}=await supabaseClient.from('learning_path_assignments').select('id,path_id,due_date,status,assigned_at,path:learning_paths(id,name,description,published)').eq('user_id',currentLutminUser.id).neq('status','cancelled').order('assigned_at',{ascending:false});
  const root=document.getElementById('studentLearningPathsListV25');if(!root)return;
  if(error){root.innerHTML='<p class="text-sm text-slate-500 lg:col-span-2">Las rutas todavía no están disponibles.</p>';return;}
  const arr=assigns||[];if(!arr.length){root.innerHTML='<p class="text-sm text-slate-500 lg:col-span-2">Todavía no tenés rutas asignadas.</p>';return;}
  const pathIds=arr.map(x=>x.path_id);const {data:pcs}=await supabaseClient.from('learning_path_courses').select('path_id,sort_order,course:courses(id,title)').in('path_id',pathIds).order('sort_order');
  root.innerHTML=arr.map(a=>{
    const items=(pcs||[]).filter(x=>x.path_id===a.path_id);let total=0;const details=items.map(x=>{const s=campusCourseSummaries.find(c=>c.course.id===x.course?.id);const pct=s?(s.passedAttempt?100:s.percent):0;total+=pct;return {title:x.course?.title||'Curso',pct};});const avg=details.length?Math.round(total/details.length):0;
    return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex items-start justify-between gap-3"><div><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(a.path?.name||'Ruta')}</h4><p class="mt-1 text-xs text-slate-500">${escapeHtml(a.path?.description||'')}</p></div><span class="text-lg font-black text-indigo-600">${avg}%</span></div><div class="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-indigo-500 rounded-full" style="width:${avg}%"></div></div>${a.due_date?`<p class="mt-2 text-[10px] text-slate-400">Fecha objetivo: ${formatCertificateDate(a.due_date+'T12:00:00')}</p>`:''}<div class="mt-3 space-y-2">${details.map(d=>`<div class="flex items-center justify-between gap-3 text-xs"><span class="truncate ${d.pct===100?'text-slate-700 font-bold':'text-slate-500'}">${d.pct===100?'<i class="fa-solid fa-circle-check text-green-500 mr-1"></i>':''}${escapeHtml(d.title)}</span><span class="font-bold">${d.pct}%</span></div>`).join('')}</div></div>`;
  }).join('');
}

async function loadPendingSurveysV25(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  initV25Ui();
  const valid=campusCertificates.filter(c=>c.status==='valid');const wrap=document.getElementById('studentSurveysV25'),root=document.getElementById('studentSurveyListV25');if(!wrap||!root)return;
  if(!valid.length){wrap.classList.add('hidden');return;}
  const courseIds=[...new Set(valid.map(c=>c.course_id))];
  const [{data:surveys},{data:responses}]=await Promise.all([supabaseClient.from('course_surveys').select('*').eq('enabled',true).in('course_id',courseIds),supabaseClient.from('course_survey_responses').select('survey_id').eq('user_id',currentLutminUser.id)]);
  const answered=new Set((responses||[]).map(x=>x.survey_id));const pending=(surveys||[]).filter(s=>!answered.has(s.id));
  wrap.classList.toggle('hidden',pending.length===0);if(!pending.length){root.innerHTML='';return;}
  root.innerHTML=pending.map(s=>{const cert=valid.find(c=>c.course_id===s.course_id);return `<form onsubmit="submitSurveyV25(event,'${s.id}')" class="rounded-2xl bg-slate-50 p-4"><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(cert?.course_title||'Capacitación')}</h4><div class="mt-4 grid md:grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-600">Satisfacción general<select name="satisfaction" required class="mt-2 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200"><option value="">Elegir</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n} / 5</option>`).join('')}</select></label><label class="text-xs font-bold text-slate-600">¿La recomendarías?<select name="nps" required class="mt-2 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200"><option value="">Elegir</option>${Array.from({length:11},(_,n)=>`<option value="${n}">${n} / 10</option>`).join('')}</select></label></div><textarea name="comments" rows="3" class="mt-3 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm" placeholder="Comentario opcional"></textarea><button class="mt-3 px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-extrabold">Enviar opinión</button></form>`;}).join('');
}

async function submitSurveyV25(event,surveyId){event.preventDefault();const fd=new FormData(event.target);const {error}=await supabaseClient.from('course_survey_responses').insert({survey_id:surveyId,user_id:currentLutminUser.id,satisfaction:Number(fd.get('satisfaction')),nps:Number(fd.get('nps')),comments:String(fd.get('comments')||'').trim()});if(error)return showToast(error.message||'No pude guardar tu respuesta.');showToast('¡Gracias por tu opinión!');await loadPendingSurveysV25();}

// Integración sin alterar la base visual ni el flujo existente.
const originalLoadCampusDataV25=loadCampusData;
loadCampusData=async function(){await originalLoadCampusDataV25();await Promise.allSettled([loadStudentPathsV25(),loadPendingSurveysV25()]);};
const originalLoadAdminDataV25=loadAdminData;
loadAdminData=async function(){await originalLoadAdminDataV25();await loadAdminV25();if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();};

document.addEventListener('DOMContentLoaded',()=>{initV25Ui();},{once:true});


// =========================================================
// LUTMIN V3.3 · COMPETENCIAS VALIDADAS
// Validación teórica interna: NO constituye título oficial,
// matrícula, habilitación profesional ni evaluación práctica.
// =========================================================
let competencyDataV33=[];
let adminCompetencyDataV33={catalog:[],stats:{}};
let selectedAdminCompetencyV33=null;
let companyCompetencyDataV33={catalog:[],members:[]};
let currentCompetencyAttemptV33=null;
let competencyTimerV33=null;

function talentSkillTextV33(x){
  if(!x)return '';
  const st=x.validation_status||null;
  if(st==='valid'&&x.validated_score_10!=null)return `${x.skill} (Validada ${Number(x.validated_score_10).toFixed(1)}/10)`;
  if(st==='expired'&&x.validated_score_10!=null)return `${x.skill} (Validación vencida ${Number(x.validated_score_10).toFixed(1)}/10)`;
  return `${x.skill} (Declarada ${x.level||0}/5)`;
}
function talentSkillBadgeHtmlV33(x,mode='public'){
  const st=x?.validation_status||null,score=x?.validated_score_10;
  if(st==='valid'&&score!=null)return `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-100"><i class="fa-solid fa-circle-check text-emerald-500"></i>${escapeHtml(x.skill)} · ${Number(score).toFixed(1)}/10 <span class="font-semibold opacity-70">validada</span></span>`;
  if(st==='expired'&&score!=null)return `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-100"><i class="fa-solid fa-clock"></i>${escapeHtml(x.skill)} · ${Number(score).toFixed(1)}/10 <span class="font-semibold opacity-70">vencida</span></span>`;
  return `<span class="inline-flex items-center gap-1 px-3 py-2 rounded-xl ${mode==='compact'?'bg-white':'bg-blue-50'} text-blue-800 text-xs font-bold">${escapeHtml(x?.skill||'Competencia')} · ${Number(x?.level||0)}/5 <span class="font-semibold opacity-60">declarada</span></span>`;
}
function competencyEffectiveStatusV33(c){
  const v=c?.validation;if(!v)return 'declared';
  if(v.status==='valid'&&v.expires_at&&new Date(v.expires_at)<new Date())return 'expired';
  return v.status||'declared';
}
function competencyExpiryLabelV33(value){
  if(!value)return 'Sin vencimiento configurado';
  const d=new Date(value),days=Math.ceil((d-Date.now())/86400000);
  if(days<0)return `Venció el ${d.toLocaleDateString('es-AR')}`;
  if(days<=30)return `Vence en ${days} día${days===1?'':'s'}`;
  return `Vigente hasta ${d.toLocaleDateString('es-AR')}`;
}

function initV33Ui(){
  // Datalist para competencias conocidas sin quitar la posibilidad de competencias libres.
  const skillInput=document.getElementById('talentSkillName');
  if(skillInput&&!document.getElementById('competencyCatalogListV33')){
    const dl=document.createElement('datalist');dl.id='competencyCatalogListV33';document.body.appendChild(dl);skillInput.setAttribute('list','competencyCatalogListV33');
  }
  const skillsList=document.getElementById('talentSkillsList');
  if(skillsList&&!document.getElementById('talentCompetencyValidationV33')){
    const box=document.createElement('div');box.id='talentCompetencyValidationV33';box.className='mt-5 border-t border-slate-100 pt-5';skillsList.parentElement.appendChild(box);
  }

  // Modal de evaluación de competencia.
  if(!document.getElementById('competencyValidationModalV33')){
    const modal=document.createElement('div');
    modal.id='competencyValidationModalV33';modal.className='hidden fixed inset-0 z-[145] bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 flex items-center justify-center';
    modal.innerHTML=`<div class="w-full max-w-4xl bg-white rounded-[2rem] max-h-[94vh] overflow-y-auto modal-scroll shadow-2xl relative"><button onclick="closeCompetencyAssessmentV33()" class="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 text-slate-500 z-10"><i class="fa-solid fa-xmark"></i></button><div id="competencyValidationContentV33" class="p-6 sm:p-9"></div></div>`;
    document.body.appendChild(modal);
  }

  // Matriz en Portal Empresa.
  const members=document.getElementById('companyPortalMembers');
  if(members&&!document.getElementById('companyCompetencyMatrixV33')){
    const block=document.createElement('div');block.id='companyCompetencyMatrixV33';block.className='mt-6 bg-white rounded-3xl border border-emerald-100 overflow-hidden';
    block.innerHTML=`<div class="p-5 sm:p-6 border-b border-emerald-100 bg-emerald-50/50"><div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest text-emerald-600 font-extrabold">Matriz de competencias</p><h3 class="mt-1 font-extrabold text-lutmin-dark text-lg">Competencias declaradas y validadas</h3><p class="mt-1 text-xs text-slate-500">La validación verde corresponde a una evaluación teórica interna de Lutmin. No equivale a matrícula, habilitación profesional ni certificación oficial.</p></div><div class="flex gap-2"><select id="companyCompetencySelectV33" onchange="renderCompanyCompetencyMatrixV33()" class="px-3 py-2.5 rounded-xl bg-white border border-emerald-100 text-xs min-w-[220px]"></select><button onclick="exportCompanyCompetencyCsvV33()" class="px-3 py-2.5 rounded-xl bg-white border border-emerald-100 text-emerald-800 text-xs font-bold"><i class="fa-solid fa-file-csv mr-2"></i>CSV</button></div></div></div><div id="companyCompetencyStatsV33" class="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3"></div><div id="companyCompetencyRowsV33" class="divide-y divide-slate-100"></div>`;
    members.closest('.mt-6.bg-white')?.insertAdjacentElement('beforebegin',block);
  }

  // Panel Administración / Academia.
  const academic=document.getElementById('adminAcademicV25')||document.querySelector('[data-admin-module-v19="academic"]');
  if(academic&&!document.getElementById('adminCompetencyV33')){
    const panel=document.createElement('div');panel.id='adminCompetencyV33';panel.setAttribute('data-admin-module-v19','academic');panel.className='mt-6 space-y-5';
    panel.innerHTML=`
      <div class="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-emerald-100"><div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest text-emerald-600 font-extrabold">Academia Pro · V3.3</p><h3 class="mt-1 text-xl font-black text-lutmin-dark">Competencias validadas</h3><p class="mt-2 text-xs text-slate-600 max-w-3xl">Separá lo que una persona declara saber de lo que pudo demostrar en una evaluación teórica interna. El resultado se expresa sobre 10 y nunca se presenta como habilitación profesional u oficial.</p></div><button onclick="loadAdminCompetencyV33()" class="px-4 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-rotate mr-2"></i>Actualizar</button></div></div>
        <div class="p-5 grid grid-cols-2 xl:grid-cols-4 gap-3"><div class="rounded-2xl bg-white p-4"><p class="text-[10px] text-slate-400 font-bold">COMPETENCIAS</p><p id="adminCompStatCatalogV33" class="mt-1 text-2xl font-black text-lutmin-dark">0</p></div><div class="rounded-2xl bg-white p-4"><p class="text-[10px] text-slate-400 font-bold">VALIDACIONES VIGENTES</p><p id="adminCompStatValidV33" class="mt-1 text-2xl font-black text-emerald-600">0</p></div><div class="rounded-2xl bg-white p-4"><p class="text-[10px] text-slate-400 font-bold">VENCEN EN 30 DÍAS</p><p id="adminCompStatExpiryV33" class="mt-1 text-2xl font-black text-amber-600">0</p></div><div class="rounded-2xl bg-white p-4"><p class="text-[10px] text-slate-400 font-bold">INTENTOS · 30 DÍAS</p><p id="adminCompStatAttemptsV33" class="mt-1 text-2xl font-black text-violet-600">0</p></div></div>
      </div>
      <div class="grid xl:grid-cols-[.72fr_1.28fr] gap-5">
        <div class="bg-white rounded-3xl border border-slate-100 p-5"><div class="flex items-center justify-between gap-3"><div><h4 class="font-extrabold text-lutmin-dark">Catálogo</h4><p class="text-xs text-slate-500">Seleccioná una competencia para configurar su evaluación.</p></div><button onclick="newAdminCompetencyV33()" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>Nueva</button></div><div id="adminCompetencyCatalogV33" class="mt-4 space-y-2"></div></div>
        <div id="adminCompetencyEditorV33" class="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6"><p class="text-sm text-slate-500">Seleccioná una competencia.</p></div>
      </div>`;
    academic.appendChild(panel);
    if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();
  }
}

async function loadCompetencyDataV33(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  const {data,error}=await supabaseClient.rpc('my_competency_summary_v39');
  if(error){console.error('Competencias V3.3',error);return;}
  competencyDataV33=Array.isArray(data)?data:[];
  // Enriquecer las competencias ya cargadas para CV/PDF y otras vistas del alumno.
  for(const skill of (talentData.skills||[])){
    const c=competencyDataV33.find(x=>x.talent_skill_id===skill.id||String(x.name||'').trim().toLowerCase()===String(skill.skill||'').trim().toLowerCase());
    const st=competencyEffectiveStatusV33(c),v=c?.validation;
    if(c){skill.competency_id=c.competency_id;skill.validation_status=st==='declared'?null:st;skill.validated_score_10=v?.score_10??null;skill.validated_score_percent=v?.score_percent??null;skill.validation_expires_at=v?.expires_at??null;skill.course_evidence=Array.isArray(c.course_evidence)?c.course_evidence:[];}
  }
  renderTalentCompetenciesV33();
}

function renderTalentCompetenciesV33(){
  initV33Ui();
  const dl=document.getElementById('competencyCatalogListV33');if(dl)dl.innerHTML=competencyDataV33.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.category||'')}</option>`).join('');
  const list=document.getElementById('talentSkillsList');
  if(list){
    list.innerHTML=talentData.skills.length?talentData.skills.map(x=>{
      const c=competencyDataV33.find(c=>c.talent_skill_id===x.id||String(c.name||'').toLowerCase()===String(x.skill||'').toLowerCase());
      const st=competencyEffectiveStatusV33(c),v=c?.validation;
      const badge=st==='valid'?`<span class="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px]">VALIDADA ${Number(v.score_10||0).toFixed(1)}/10</span>`:st==='expired'?`<span class="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">VENCIDA ${Number(v.score_10||0).toFixed(1)}/10</span>`:'<span class="ml-1 px-2 py-0.5 rounded-full bg-white/70 text-blue-500 text-[9px]">DECLARADA</span>';
      return `<span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl ${st==='valid'?'bg-emerald-50 text-emerald-800 border border-emerald-100':st==='expired'?'bg-amber-50 text-amber-800 border border-amber-100':'bg-blue-50 text-blue-700'} text-xs font-bold">${escapeHtml(x.skill)} · ${x.level}/5 ${badge}<button onclick="deleteTalentSkill('${x.id}')" class="opacity-50 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button></span>`;
    }).join(''):'<span class="text-xs text-slate-400">Todavía no agregaste competencias.</span>';
  }
  const root=document.getElementById('talentCompetencyValidationV33');if(!root)return;
  const available=competencyDataV33.filter(c=>c.assessment_available);
  root.innerHTML=`<div class="flex items-start justify-between gap-3"><div><h4 class="font-extrabold text-lutmin-dark">Validación teórica de competencias</h4><p class="mt-1 text-[11px] text-slate-500">Opcional. Una competencia autodeclarada muestra tu nivel informado; una validada muestra además el puntaje obtenido en una evaluación interna de Lutmin.</p></div><i class="fa-solid fa-shield-check text-emerald-500 text-xl"></i></div><div class="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-[10px] leading-relaxed text-amber-800"><strong>Alcance:</strong> esta validación es teórica e interna. No constituye título oficial, matrícula, habilitación profesional, certificación oficial ni prueba práctica del oficio.</div><div class="mt-4 grid md:grid-cols-2 gap-3">${available.map(c=>{const st=competencyEffectiveStatusV33(c),v=c.validation,attempts=Number(c.recent_attempts||0),left=Math.max(0,Number(c.max_attempts||3)-attempts);let status='No validada',cls='bg-slate-100 text-slate-600',action='Validar';if(st==='valid'){status=`Validada · ${Number(v.score_10||0).toFixed(1)}/10`;cls='bg-emerald-50 text-emerald-700';action=v.expires_at&&Math.ceil((new Date(v.expires_at)-Date.now())/86400000)<=30?'Renovar':'Volver a validar';}else if(st==='expired'){status=`Vencida · ${Number(v.score_10||0).toFixed(1)}/10`;cls='bg-amber-50 text-amber-700';action='Renovar validación';}return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-slate-400">${escapeHtml(c.category||'Competencia')}</p><p class="mt-1 font-extrabold text-sm text-lutmin-dark">${escapeHtml(c.name)}</p></div><span class="h-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}">${escapeHtml(status)}</span></div>${v?`<p class="mt-2 text-[10px] text-slate-500">${escapeHtml(competencyExpiryLabelV33(v.expires_at))}</p>`:''}<div class="mt-3 flex items-center justify-between gap-3"><span class="text-[10px] text-slate-400">Intentos disponibles: ${left}/${Number(c.max_attempts||3)}</span><button onclick="startCompetencyValidationV33('${c.competency_id}')" ${left<=0?'disabled':''} class="px-3 py-2 rounded-xl ${left<=0?'bg-slate-100 text-slate-400':'bg-lutmin-dark text-white'} text-[11px] font-bold">${escapeHtml(action)}</button></div></div>`;}).join('')}</div>`;
}

function closeCompetencyAssessmentV33(){clearInterval(competencyTimerV33);competencyTimerV33=null;currentCompetencyAttemptV33=null;document.getElementById('competencyValidationModalV33')?.classList.add('hidden');document.body.classList.remove('overflow-hidden');}
async function startCompetencyValidationV33(competencyId){
  const {data,error}=await supabaseClient.rpc('start_competency_assessment',{p_competency_id:competencyId});
  if(error)return showToast(error.message||'No pude iniciar la validación.');
  currentCompetencyAttemptV33=data;const root=document.getElementById('competencyValidationContentV33');if(!root)return;
  const qs=Array.isArray(data.questions)?data.questions:[];
  root.innerHTML=`<p class="text-[10px] uppercase tracking-widest font-extrabold text-emerald-600">Competencia · Validación teórica</p><h2 class="mt-2 text-2xl sm:text-3xl font-black text-lutmin-dark pr-12">${escapeHtml(data.competency_name||'Competencia')}</h2><p class="mt-3 text-sm text-slate-600">${escapeHtml(data.instructions||'Respondé todas las preguntas.')}</p><div class="mt-4 flex flex-wrap gap-2"><span class="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">Aprobación ${Number(data.pass_percent||70)}%</span>${data.time_limit_minutes?`<span id="competencyTimerBadgeV33" class="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">${Number(data.time_limit_minutes)} min</span>`:''}<span class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Intento ${Number(data.attempts_used||0)+1}/${Number(data.max_attempts||3)}</span></div><div class="mt-5 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[11px] text-amber-900 leading-relaxed">${escapeHtml(data.legal_legend||'Validación teórica interna de Lutmin.')}</div><form id="competencyAssessmentFormV33" onsubmit="submitCompetencyAssessmentV33(event)" class="mt-6 space-y-5">${qs.map((q,i)=>`<div class="rounded-2xl border border-slate-100 p-5"><p class="font-extrabold text-sm text-lutmin-dark">${i+1}. ${escapeHtml(q.prompt)}</p><div class="mt-3 space-y-2">${(q.options||[]).map(o=>`<label class="flex gap-3 items-start p-3 rounded-xl bg-slate-50 hover:bg-blue-50 cursor-pointer"><input type="radio" required name="q_${q.id}" value="${escapeHtml(o.key)}" class="mt-0.5"><span class="text-sm text-slate-700"><strong>${escapeHtml(o.key)}.</strong> ${escapeHtml(o.label)}</span></label>`).join('')}</div></div>`).join('')}<button class="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-extrabold">Finalizar y obtener puntaje</button></form>`;
  document.getElementById('competencyValidationModalV33').classList.remove('hidden');document.body.classList.add('overflow-hidden');
  if(data.expires_at){const badge=document.getElementById('competencyTimerBadgeV33');const tick=()=>{if(!badge)return;const sec=Math.max(0,Math.floor((new Date(data.expires_at)-Date.now())/1000));badge.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} restantes`;if(sec<=0){clearInterval(competencyTimerV33);badge.textContent='Tiempo finalizado';}};tick();competencyTimerV33=setInterval(tick,1000);}
}
async function submitCompetencyAssessmentV33(event){
  event.preventDefault();if(!currentCompetencyAttemptV33)return;const fd=new FormData(event.target),answers={};for(const q of currentCompetencyAttemptV33.questions||[])answers[q.id]=fd.get(`q_${q.id}`);const btn=event.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Corrigiendo...';}
  const {data,error}=await supabaseClient.rpc('submit_competency_assessment',{p_attempt_id:currentCompetencyAttemptV33.attempt_id,p_answers:answers});
  if(error){if(btn){btn.disabled=false;btn.textContent='Finalizar y obtener puntaje';}return showToast(error.message||'No pude corregir la evaluación.');}
  clearInterval(competencyTimerV33);const root=document.getElementById('competencyValidationContentV33');const passed=!!data.passed;root.innerHTML=`<div class="text-center py-8"><div class="w-20 h-20 rounded-full ${passed?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'} flex items-center justify-center text-3xl mx-auto"><i class="fa-solid ${passed?'fa-circle-check':'fa-circle-xmark'}"></i></div><p class="mt-5 text-[10px] uppercase tracking-widest font-extrabold ${passed?'text-emerald-600':'text-red-600'}">${passed?'COMPETENCIA VALIDADA':'PUNTAJE INSUFICIENTE'}</p><h2 class="mt-2 text-4xl font-black text-lutmin-dark">${Number(data.score_10||0).toFixed(1)} / 10</h2><p class="mt-2 text-sm text-slate-500">${Number(data.correct_count||0)} de ${Number(data.total_questions||0)} respuestas correctas · ${Number(data.score_percent||0).toFixed(0)}%</p><p class="mt-5 max-w-xl mx-auto text-sm text-slate-600">${escapeHtml(data.message||'')}</p>${passed?`<div class="mt-5 max-w-xl mx-auto rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[11px] text-amber-800">La marca <strong>“Validada”</strong> acredita únicamente el resultado de esta evaluación teórica interna de Lutmin. No implica habilitación profesional ni certificación oficial.</div>`:''}<button onclick="closeCompetencyAssessmentV33()" class="mt-6 px-6 py-3 rounded-xl bg-lutmin-dark text-white font-bold">Cerrar</button></div>`;
  await loadTalentCenter();
}

// ---------- Administración Competencias ----------
async function loadAdminCompetencyV33(){
  if(!supabaseClient||currentLutminUser?.role!=='admin')return;initV33Ui();
  const {data,error}=await supabaseClient.rpc('admin_competency_dashboard');if(error){console.error(error);return showToast('No pude cargar el módulo de competencias.');}
  adminCompetencyDataV33=data||{catalog:[],stats:{}};if(selectedAdminCompetencyV33&&!adminCompetencyDataV33.catalog.some(x=>x.id===selectedAdminCompetencyV33))selectedAdminCompetencyV33=null;renderAdminCompetencyV33();
}
function renderAdminCompetencyV33(){
  initV33Ui();const s=adminCompetencyDataV33.stats||{},set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v??0)};set('adminCompStatCatalogV33',s.competencies);set('adminCompStatValidV33',s.validations);set('adminCompStatExpiryV33',s.expiring_30d);set('adminCompStatAttemptsV33',s.attempts_30d);
  const list=document.getElementById('adminCompetencyCatalogV33');if(list)list.innerHTML=(adminCompetencyDataV33.catalog||[]).map(c=>`<button onclick="selectAdminCompetencyV33('${c.id}')" class="w-full text-left p-3 rounded-xl border ${selectedAdminCompetencyV33===c.id?'border-emerald-300 bg-emerald-50':'border-slate-100 bg-slate-50'}"><div class="flex justify-between gap-2"><div><p class="text-[10px] uppercase font-bold text-slate-400">${escapeHtml(c.category||'General')} · ${escapeHtml(c.code)}</p><p class="mt-1 text-xs font-extrabold text-lutmin-dark">${escapeHtml(c.name)}</p></div><span class="text-[9px] font-bold ${c.assessment?.active?'text-emerald-600':'text-slate-400'}">${c.assessment?.active?'VALIDA':'SIN EVALUACIÓN'}</span></div></button>`).join('')||'<p class="text-xs text-slate-500">Sin competencias.</p>';
  renderAdminCompetencyEditorV33();
}
function newAdminCompetencyV33(){selectedAdminCompetencyV33='new';renderAdminCompetencyV33();}
function selectAdminCompetencyV33(id){selectedAdminCompetencyV33=id;renderAdminCompetencyV33();}
function renderAdminCompetencyEditorV33(){
  const root=document.getElementById('adminCompetencyEditorV33');if(!root)return;const isNew=selectedAdminCompetencyV33==='new';const c=isNew?null:(adminCompetencyDataV33.catalog||[]).find(x=>x.id===selectedAdminCompetencyV33);
  if(!c&&!isNew){root.innerHTML='<p class="text-sm text-slate-500">Seleccioná una competencia.</p>';return;}
  const a=c?.assessment,qs=a?.questions||[];
  root.innerHTML=`<form onsubmit="saveAdminCompetencyV33(event)" class="grid sm:grid-cols-2 gap-3"><input type="hidden" name="id" value="${c?.id||''}"><div><label class="text-[10px] uppercase font-bold text-slate-400">Código</label><input name="code" required value="${escapeHtml(c?.code||'')}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="ELEC"></div><div><label class="text-[10px] uppercase font-bold text-slate-400">Nombre</label><input name="name" required value="${escapeHtml(c?.name||'')}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Electricidad"></div><div><label class="text-[10px] uppercase font-bold text-slate-400">Categoría</label><input name="category" value="${escapeHtml(c?.category||'General')}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"></div><label class="flex items-end gap-2 pb-2 text-xs font-bold"><input type="checkbox" name="active" ${c?.active!==false?'checked':''}> Competencia activa</label><div class="sm:col-span-2"><label class="text-[10px] uppercase font-bold text-slate-400">Descripción</label><textarea name="description" rows="2" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">${escapeHtml(c?.description||'')}</textarea></div><button class="sm:col-span-2 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">${isNew?'Crear competencia':'Guardar competencia'}</button></form>${c?`<div class="mt-6 border-t border-slate-100 pt-5"><h4 class="font-extrabold text-lutmin-dark">Configuración de validación teórica</h4><form onsubmit="saveAdminAssessmentV33(event,'${c.id}')" class="mt-3 grid sm:grid-cols-3 gap-3"><input name="title" value="${escapeHtml(a?.title||`Validación teórica · ${c.name}`)}" class="sm:col-span-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"><label class="text-xs font-bold text-slate-600">Aprobación %<input name="pass" type="number" min="1" max="100" value="${Number(a?.pass_percent||70)}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"></label><label class="text-xs font-bold text-slate-600">Preguntas por intento<input name="count" type="number" min="1" max="100" value="${Number(a?.question_count||5)}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"></label><label class="text-xs font-bold text-slate-600">Intentos / período<input name="max" type="number" min="1" max="20" value="${Number(a?.max_attempts||3)}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"></label><label class="text-xs font-bold text-slate-600">Reinicio intentos (días)<input name="reset" type="number" min="1" value="${Number(a?.attempt_reset_days||30)}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"></label><label class="text-xs font-bold text-slate-600">Tiempo límite (min)<input name="time" type="number" min="0" value="${a?.time_limit_minutes??15}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"><span class="block mt-1 text-[9px] text-slate-400">0 = sin límite operativo</span></label><label class="text-xs font-bold text-slate-600">Vigencia (meses)<input name="validity" type="number" min="0" value="${a?.validity_months??0}" class="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200"><span class="block mt-1 text-[9px] text-slate-400">0 = sin vencimiento</span></label><textarea name="instructions" rows="2" class="sm:col-span-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Instrucciones">${escapeHtml(a?.instructions||'')}</textarea><label class="sm:col-span-3 flex items-center gap-2 text-xs font-bold"><input name="active" type="checkbox" ${a?.active!==false?'checked':''}> Validación disponible para alumnos</label><button class="sm:col-span-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Guardar configuración</button></form></div>${a?`<div class="mt-6 border-t border-slate-100 pt-5"><div class="flex justify-between gap-3"><div><h4 class="font-extrabold text-lutmin-dark">Banco de preguntas</h4><p class="text-xs text-slate-500">Las respuestas correctas nunca se envían al navegador del alumno.</p></div><span class="text-xl font-black text-emerald-600">${qs.length}</span></div><form onsubmit="addAdminQuestionV33(event,'${a.id}')" class="mt-4 grid sm:grid-cols-2 gap-2"><input name="code" required class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Código: ELEC-06"><select name="difficulty" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"><option value="basic">Básica</option><option value="intermediate">Intermedia</option><option value="advanced">Avanzada</option></select><textarea name="prompt" required rows="2" class="sm:col-span-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Pregunta"></textarea>${['A','B','C','D'].map(l=>`<input name="option_${l.toLowerCase()}" required class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Opción ${l}">`).join('')}<select name="correct" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"><option value="A">Correcta: A</option><option value="B">Correcta: B</option><option value="C">Correcta: C</option><option value="D">Correcta: D</option></select><input name="explanation" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Explicación opcional"><button class="sm:col-span-2 py-2.5 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Agregar / actualizar pregunta</button></form><div class="mt-4 space-y-2">${qs.map(q=>`<div class="rounded-xl bg-slate-50 p-3"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase text-slate-400 font-bold">${escapeHtml(q.code)} · correcta ${escapeHtml(q.correct_option)}</p><p class="mt-1 text-xs font-bold text-lutmin-dark">${escapeHtml(q.prompt)}</p></div><button onclick="deleteAdminQuestionV33('${q.id}')" class="text-red-400"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')||'<p class="text-xs text-slate-500">Todavía no hay preguntas.</p>'}</div></div>`:''}`:''}`;
}
async function saveAdminCompetencyV33(event){event.preventDefault();const fd=new FormData(event.target);const {data,error}=await supabaseClient.rpc('admin_save_competency',{p_id:fd.get('id')||null,p_code:fd.get('code'),p_name:fd.get('name'),p_category:fd.get('category'),p_description:fd.get('description'),p_active:fd.get('active')==='on'});if(error)return showToast(error.message||'No pude guardar la competencia.');selectedAdminCompetencyV33=data;showToast('Competencia guardada.');await loadAdminCompetencyV33();}
async function saveAdminAssessmentV33(event,competencyId){event.preventDefault();const fd=new FormData(event.target);const {error}=await supabaseClient.rpc('admin_save_competency_assessment',{p_competency_id:competencyId,p_title:fd.get('title'),p_instructions:fd.get('instructions'),p_pass_percent:Number(fd.get('pass')||70),p_question_count:Number(fd.get('count')||5),p_max_attempts:Number(fd.get('max')||3),p_attempt_reset_days:Number(fd.get('reset')||30),p_time_limit_minutes:Number(fd.get('time')||0),p_validity_months:Number(fd.get('validity')||0),p_active:fd.get('active')==='on'});if(error)return showToast(error.message||'No pude guardar la evaluación.');showToast('Validación configurada.');await loadAdminCompetencyV33();}
async function addAdminQuestionV33(event,assessmentId){event.preventDefault();const fd=new FormData(event.target);const {error}=await supabaseClient.rpc('admin_add_competency_question',{p_assessment_id:assessmentId,p_code:fd.get('code'),p_prompt:fd.get('prompt'),p_option_a:fd.get('option_a'),p_option_b:fd.get('option_b'),p_option_c:fd.get('option_c'),p_option_d:fd.get('option_d'),p_correct_option:fd.get('correct'),p_explanation:fd.get('explanation'),p_difficulty:fd.get('difficulty')});if(error)return showToast(error.message||'No pude guardar la pregunta.');showToast('Pregunta guardada.');event.target.reset();await loadAdminCompetencyV33();}
async function deleteAdminQuestionV33(id){if(!confirm('¿Eliminar esta pregunta?'))return;const {error}=await supabaseClient.rpc('admin_delete_competency_question',{p_question_id:id});if(error)return showToast(error.message||'No pude eliminar la pregunta.');await loadAdminCompetencyV33();}

// ---------- Matriz Empresa ----------
async function loadCompanyCompetencyV33(){if(!supabaseClient||currentLutminUser?.role!=='company_admin')return;initV33Ui();const {data,error}=await supabaseClient.rpc('company_competency_matrix');if(error){console.error(error);return;}companyCompetencyDataV33=data||{catalog:[],members:[]};const sel=document.getElementById('companyCompetencySelectV33');if(sel){const prev=sel.value;sel.innerHTML=(companyCompetencyDataV33.catalog||[]).map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');if(prev&&[...sel.options].some(o=>o.value===prev))sel.value=prev;}renderCompanyCompetencyMatrixV33();}
function renderCompanyCompetencyMatrixV33(){const stats=document.getElementById('companyCompetencyStatsV33'),root=document.getElementById('companyCompetencyRowsV33'),sel=document.getElementById('companyCompetencySelectV33');if(!stats||!root||!sel)return;const cid=sel.value||(companyCompetencyDataV33.catalog||[])[0]?.id;if(!cid){stats.innerHTML='';root.innerHTML='<div class="p-5 text-sm text-slate-500">Todavía no hay competencias configuradas.</div>';return;}const comp=(companyCompetencyDataV33.catalog||[]).find(c=>c.id===cid);const rows=(companyCompetencyDataV33.members||[]).map(m=>{const s=(m.skills||[]).find(x=>x.competency_id===cid),v=s?.validation;let state='none';if(v){state=v.status==='valid'&&v.expires_at&&new Date(v.expires_at)<new Date()?'expired':v.status||'declared';}else if(s)state='declared';return {...m,skill:s,validation:v,state};});const validated=rows.filter(r=>r.state==='valid').length,declared=rows.filter(r=>r.state==='declared').length,expired=rows.filter(r=>r.state==='expired').length,none=rows.filter(r=>r.state==='none').length;stats.innerHTML=`<div class="rounded-2xl bg-emerald-50 p-4"><p class="text-[10px] font-bold text-emerald-600">VALIDADAS</p><p class="mt-1 text-2xl font-black text-emerald-700">${validated}</p></div><div class="rounded-2xl bg-blue-50 p-4"><p class="text-[10px] font-bold text-blue-600">DECLARADAS</p><p class="mt-1 text-2xl font-black text-blue-700">${declared}</p></div><div class="rounded-2xl bg-amber-50 p-4"><p class="text-[10px] font-bold text-amber-600">VENCIDAS</p><p class="mt-1 text-2xl font-black text-amber-700">${expired}</p></div><div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-bold text-slate-400">SIN REGISTRO</p><p class="mt-1 text-2xl font-black text-slate-600">${none}</p></div>`;root.innerHTML=rows.map(r=>{let badge='Sin registro',cls='bg-slate-100 text-slate-600',detail='';if(r.state==='valid'){badge=`Validada ${Number(r.validation.score_10||0).toFixed(1)}/10`;cls='bg-emerald-50 text-emerald-700';detail=competencyExpiryLabelV33(r.validation.expires_at);}else if(r.state==='expired'){badge=`Vencida ${Number(r.validation.score_10||0).toFixed(1)}/10`;cls='bg-amber-50 text-amber-700';detail=competencyExpiryLabelV33(r.validation.expires_at);}else if(r.state==='declared'){badge=`Declarada ${r.skill?.level||0}/5`;cls='bg-blue-50 text-blue-700';detail='Nivel informado por la persona';}return `<div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(r.full_name||r.email||'Colaborador')}</p><p class="mt-1 text-[10px] text-slate-400">${escapeHtml(r.email||'')}</p></div><div class="sm:text-right"><span class="inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${cls}">${escapeHtml(badge)}</span>${detail?`<p class="mt-1 text-[10px] text-slate-400">${escapeHtml(detail)}</p>`:''}</div></div>`;}).join('')||'<div class="p-5 text-sm text-slate-500">Sin colaboradores activos.</div>';}
function exportCompanyCompetencyCsvV33(){const sel=document.getElementById('companyCompetencySelectV33'),cid=sel?.value,comp=(companyCompetencyDataV33.catalog||[]).find(c=>c.id===cid);if(!comp)return;const rows=[['Colaborador','Email','Competencia','Estado','Nivel declarado','Puntaje validación /10','Validado el','Vence']];for(const m of companyCompetencyDataV33.members||[]){const s=(m.skills||[]).find(x=>x.competency_id===cid),v=s?.validation;let state=v?(v.status==='valid'&&v.expires_at&&new Date(v.expires_at)<new Date()?'Vencida':'Validada'):s?'Declarada':'Sin registro';rows.push([m.full_name||'',m.email||'',comp.name,state,s?.level||'',v?.score_10??'',v?.validated_at?new Date(v.validated_at).toLocaleDateString('es-AR'):'',v?.expires_at?new Date(v.expires_at).toLocaleDateString('es-AR'):'']);}const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lutmin_Matriz_${slugifyLutmin(comp.name)}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);}

// Mostrar validaciones destacadas dentro del perfil candidato sin reescribir el perfil entero.
const _renderCompanyCandidateProfileV33=renderCompanyCandidateProfile;
renderCompanyCandidateProfile=function(){_renderCompanyCandidateProfileV33();const root=document.getElementById('companyCandidateContent');if(!root||!companyCandidateData)return;const validated=(companyCandidateData.skills||[]).filter(s=>['valid','expired'].includes(s.validation_status));if(!validated.length)return;const card=document.createElement('div');card.className='mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4';card.innerHTML=`<div class="flex items-start gap-3"><i class="fa-solid fa-shield-check text-emerald-600 mt-1"></i><div><p class="font-extrabold text-sm text-lutmin-dark">Competencias con validación teórica Lutmin</p><p class="mt-1 text-[10px] text-slate-500">Puntajes obtenidos en evaluaciones internas. No equivalen a matrícula, habilitación profesional ni certificación oficial.</p><div class="mt-3 flex flex-wrap gap-2">${validated.map(s=>talentSkillBadgeHtmlV33(s,'company')).join('')}</div></div></div>`;root.firstElementChild?.insertAdjacentElement('afterend',card);};

// Integración con los loaders existentes.
const _renderTalentCenterV33=renderTalentCenter;
renderTalentCenter=function(){_renderTalentCenterV33();renderTalentCompetenciesV33();};
const _loadTalentCenterV33=loadTalentCenter;
loadTalentCenter=async function(){await _loadTalentCenterV33();setTimeout(()=>loadCompetencyDataV33(),80);};
const _loadCompanyPortalDataV33=loadCompanyPortalData;
loadCompanyPortalData=async function(){await _loadCompanyPortalDataV33();setTimeout(()=>loadCompanyCompetencyV33(),120);};
const _loadAdminDataV33=loadAdminData;
loadAdminData=async function(){await _loadAdminDataV33();setTimeout(()=>loadAdminCompetencyV33(),120);if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();};

document.addEventListener('DOMContentLoaded',()=>{initV33Ui();},{once:true});
