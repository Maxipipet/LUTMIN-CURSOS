// =========================================================
// LUTMIN V37.0 · AGENTE DE EMPLEABILIDAD LOCAL
// Reglas + datos estructurados propios. Costo API $0.
// No inventa experiencia, no decide contrataciones y no postula solo.
// =========================================================
(function(){
  'use strict';
  const STORE='lutmin-agent-v37';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const now=()=>new Date().toISOString();

  function state(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch(_){return{}}}
  function save(patch){try{localStorage.setItem(STORE,JSON.stringify({...state(),...patch,updated_at:now()}))}catch(_){ }}
  function selectedJob(){const id=document.getElementById('agentJobSelectV100')?.value||state().last_job_id;return (talentData?.jobs||[]).find(j=>j.id===id)||null;}
  function profileScore(){try{return calculateTalentProfileStrength(talentData?.profile||{},talentData?.skills||[],talentData?.experiences||[],talentData?.certificates||[])}catch(_){return{score:0,missing:[]}}}
  function analysis(job){try{return typeof buildAgentAnalysisV100==='function'?buildAgentAnalysisV100(job):null}catch(_){return null}}
  function appFor(job){return (talentData?.applications||[]).find(a=>a.job_id===job?.id)||null;}
  function upcomingInterview(job){const app=appFor(job),rows=talentData?.applicationDetails?.interviews||[];return rows.find(i=>(!app||i.application_id===app.id)&&(!i.scheduled_at||new Date(i.scheduled_at)>=new Date()))||null;}
  function evidenceCounts(){return {skills:(talentData?.skills||[]).length,experiences:(talentData?.experiences||[]).length,certificates:(talentData?.certificates||[]).length};}

  function plan(job){
    const out=[],p=talentData?.profile||{},ps=profileScore(),a=analysis(job),app=appFor(job),iv=upcomingInterview(job);
    if(!p.approval_status||p.approval_status!=='approved')out.push({key:'profile',tone:'amber',title:'Completar y consolidar el perfil',detail:'El perfil todavía no está aprobado para postularse de forma asistida.',action:'profile'});
    else if(ps.score<80)out.push({key:'profile-quality',tone:'blue',title:'Mejorar información faltante',detail:`Calidad estructural ${ps.score}%. ${ps.missing?.slice(0,3).join(' · ')||'Hay datos que pueden completarse.'}`,action:'profile'});
    if(job&&a?.missing?.length)out.push({key:'gaps',tone:'amber',title:'Revisar brechas antes de postularte',detail:`No encontré evidencia clara para: ${a.missing.slice(0,4).join(', ')}. No significa que no tengas esa experiencia; puede faltar documentarla.`,action:a.relatedCourses?.length?'courses':'profile'});
    if(iv)out.push({key:'interview',tone:'violet',title:'Preparar entrevista',detail:'Existe una entrevista próxima vinculada a tu proceso. El agente puede generar preguntas usando la búsqueda y tu evidencia real.',action:'interviews'});
    else if(app&&!['rejected','hired','withdrawn'].includes(app.status))out.push({key:'application',tone:'blue',title:'Seguir el proceso activo',detail:`Tu postulación está en estado ${app.status||'activo'}. Revisá historial y próximos pasos.`,action:'applications'});
    else if(job&&p.approval_status==='approved')out.push({key:'apply',tone:'green',title:'Preparar postulación asistida',detail:'Podés generar un CV adaptado que reordena únicamente información ya cargada y luego decidir si enviarlo.',action:'apply'});
    if(!job&&(talentData?.jobs||[]).length)out.push({key:'choose',tone:'blue',title:'Elegir una oportunidad',detail:'Seleccioná una búsqueda para obtener un análisis explicable y un plan específico.',action:'jobs'});
    return out.slice(0,5);
  }

  function actionButton(x,job){
    const labels={profile:'Ir al perfil',courses:'Ver cursos',interviews:'Ver entrevistas',applications:'Ver postulaciones',jobs:'Ver oportunidades',apply:'Preparar postulación'};
    return `<button type="button" data-agent-v37-action="${esc(x.action)}" data-job-id="${esc(job?.id||'')}" class="agent-v37-action">${esc(labels[x.action]||'Abrir')}</button>`;
  }

  function render(){
    const host=document.getElementById('talentAgentV37');if(!host)return;
    const job=selectedJob(),a=analysis(job),ps=profileScore(),ev=evidenceCounts(),actions=plan(job),hist=state().history||[];
    host.innerHTML=`
      <div class="agent-v37-head"><div><p class="agent-v37-kicker">Motor determinístico · API $0</p><h4>Plan de empleabilidad explicable</h4><p>Usa perfil, experiencia, competencias, certificados y estado de postulaciones. No inventa datos ni decide contrataciones.</p></div><span class="agent-v37-zero">$0 / análisis</span></div>
      <div class="agent-v37-stats">
        <div><span>Perfil</span><strong>${Number(ps.score||0)}%</strong></div>
        <div><span>Competencias</span><strong>${ev.skills}</strong></div>
        <div><span>Experiencias</span><strong>${ev.experiences}</strong></div>
        <div><span>Certificados</span><strong>${ev.certificates}</strong></div>
      </div>
      ${job?`<div class="agent-v37-context"><div><span>Analizando</span><strong>${esc(job.title)}</strong><small>${esc(job.company_name||'Lutmin')} · afinidad documental ${Number(a?.score||0)}%</small></div><button type="button" data-agent-v37-remember="${esc(job.id)}">Recordar búsqueda</button></div>`:''}
      <div class="agent-v37-grid">
        <section><h5>Próximas acciones</h5><div class="agent-v37-actions">${actions.length?actions.map(x=>`<article data-tone="${x.tone}"><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p></div>${actionButton(x,job)}</article>`).join(''):'<p class="agent-v37-empty">No detecté una acción urgente. Podés explorar oportunidades o actualizar tu perfil.</p>'}</div></section>
        <section><h5>Trazabilidad del análisis</h5>${job&&a?`<div class="agent-v37-evidence"><p><b>Coincidencias:</b> ${esc((a.matched||[]).slice(0,6).join(' · ')||'sin coincidencias textuales fuertes')}</p><p><b>Sin evidencia clara:</b> ${esc((a.missing||[]).slice(0,6).join(' · ')||'ninguna brecha textual relevante')}</p><p><b>Fuentes:</b> ${ev.skills} competencias · ${ev.experiences} experiencias · ${ev.certificates} certificados.</p></div>`:'<p class="agent-v37-empty">Seleccioná una oportunidad para ver por qué el agente llega a cada sugerencia.</p>'}<div class="agent-v37-history"><span>Análisis locales recientes</span><strong>${hist.length}</strong></div></section>
      </div>`;
  }

  function remember(jobId){
    const s=state(),history=Array.isArray(s.history)?s.history:[];
    const job=(talentData?.jobs||[]).find(j=>j.id===jobId);if(!job)return;
    const a=analysis(job),entry={job_id:job.id,title:job.title,company:job.company_name||null,score:Number(a?.score||0),at:now()};
    const next=[entry,...history.filter(x=>x.job_id!==jobId)].slice(0,8);save({last_job_id:jobId,history:next});render();
    showToast?.('Análisis guardado localmente en este dispositivo.');
  }

  async function runAction(action,jobId){
    if(action==='courses'){goToCampusTab?.('courses');return;}
    if(action==='apply'){if(typeof openSmartApplyV100==='function')return openSmartApplyV100(jobId);}
    if(window.openTalentModuleV37)return window.openTalentModuleV37(action);
  }

  window.ensureTalentAgentV37=function(){
    const card=document.getElementById('talentAgentV100');if(!card)return;
    let host=document.getElementById('talentAgentV37');
    if(!host){host=document.createElement('div');host.id='talentAgentV37';host.className='agent-v37';card.appendChild(host);}
    const saved=state().last_job_id,sel=document.getElementById('agentJobSelectV100');
    if(sel&&!sel.value&&saved&&(talentData?.jobs||[]).some(j=>j.id===saved)){sel.value=saved;try{selectAgentJobV100?.(saved)}catch(_){ }}
    render();
  };
  window.refreshTalentAgentV37=render;

  const oldRender=window.renderAgentAnalysisV100;
  if(typeof oldRender==='function')window.renderAgentAnalysisV100=function(){const r=oldRender.apply(this,arguments);setTimeout(render,0);return r;};
  const oldSelect=window.selectAgentJobV100;
  if(typeof oldSelect==='function')window.selectAgentJobV100=function(id){const r=oldSelect.apply(this,arguments);if(id)save({last_job_id:id});setTimeout(render,0);return r;};

  document.addEventListener('click',e=>{
    const a=e.target.closest?.('[data-agent-v37-action]');if(a){e.preventDefault();runAction(a.dataset.agentV37Action,a.dataset.jobId);return;}
    const r=e.target.closest?.('[data-agent-v37-remember]');if(r){e.preventDefault();remember(r.dataset.agentV37Remember);}
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(window.ensureTalentAgentV37,0),{once:true});else setTimeout(window.ensureTalentAgentV37,0);
})();
