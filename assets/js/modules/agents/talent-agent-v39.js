// =========================================================
// LUTMIN V39.0 · AGENTE DE EMPLEABILIDAD GUIADO
// Interpretación estructurada de CV + preguntas determinísticas. API $0.
// No inventa antecedentes, no decide contrataciones y no postula solo.
// =========================================================
(function(){
  'use strict';
  const STORE='lutmin-agent-v39'; const LEGACY_STORE='lutmin-agent-v38';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>window.LutminCvV38?.normalize?.(v)||String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+#. ]+/g,' ').replace(/\s+/g,' ').trim();
  const now=()=>new Date().toISOString();
  const STOP=new Set('que como cual cuales donde cuando cuanto cuantos tengo tiene mi mis del de la el los las un una y o en para por con sin sobre hacia desde experiencia cv curriculum trabajo puesto empresa formacion formación habilidad habilidades competencia competencias'.split(/\s+/));

  function state(){try{const current=localStorage.getItem(STORE),legacy=localStorage.getItem(LEGACY_STORE);return JSON.parse(current||legacy||'{}')||{}}catch(_){return{}}}
  function save(patch){try{localStorage.setItem(STORE,JSON.stringify({...state(),...patch,updated_at:now()}))}catch(_){ }}
  function selectedJob(){const id=document.getElementById('agentJobSelectV100')?.value||state().last_job_id;return (talentData?.jobs||[]).find(j=>j.id===id)||null;}
  function profileScore(){try{return calculateTalentProfileStrength(talentData?.profile||{},talentData?.skills||[],talentData?.experiences||[],talentData?.certificates||[])}catch(_){return{score:0,missing:[]}}}
  function currentCv(){return window.LutminCvV38?.snapshot?.()||null;}
  function educationRows(){try{return Array.isArray(v140State?.education)?v140State.education:[]}catch(_){return[]}}
  function appFor(job){return (talentData?.applications||[]).find(a=>a.job_id===job?.id)||null;}
  function upcomingInterview(job){const app=appFor(job),rows=talentData?.applicationDetails?.interviews||[];return rows.find(i=>(!app||i.application_id===app.id)&&(!i.scheduled_at||new Date(i.scheduled_at)>=new Date()))||null;}
  function evidenceCounts(){return {skills:(talentData?.skills||[]).length,experiences:(talentData?.experiences||[]).length,certificates:(talentData?.certificates||[]).length};}

  function structuredCvFallback(){
    const ex=(talentData?.experiences||[]).map(x=>({position:x.position_title||'',company:x.company_name||'',start:x.start_date||null,end:x.end_date||null,current:!!x.current_job,description:x.description||'',confidence:1,needs_company:false}));
    const edu=educationRows().map(x=>({institution:x.institution,title:x.title,start:x.start_date,end:x.end_date,current:!!x.current,level:x.level||'',confidence:1}));
    const skills=(talentData?.skills||[]).map(x=>({skill:x.skill,confidence:1,kind:'confirmed',excerpt:x.skill}));
    const career=window.LutminCvV38?.careerSummary?.(ex)||{years:0,roles:ex.length,companies:new Set(ex.map(x=>norm(x.company)).filter(Boolean)).size};
    const p=talentData?.profile||{};
    return {file:null,parser:'profile-structured',quality:{score:100,warnings:[],experience_confidence:100},career,experiences:ex,education:edu,courses:[],skills,fields:{headline:p.headline||'',bio:p.bio||'',city:p.city||'',province:p.province||'',email:'',phone:'',linkedin:p.linkedin_url||''},sections:[],text:[p.headline,p.bio,...ex.map(x=>`${x.position} ${x.company} ${x.description}`),...skills.map(x=>x.skill),...edu.map(x=>`${x.title} ${x.institution}`)].join('\n')};
  }
  function cvContext(){return currentCv()||structuredCvFallback();}

  const baseAnalysis=typeof window.buildAgentAnalysisV100==='function'?window.buildAgentAnalysisV100:null;
  function cvJobTerms(job){
    if(!job)return[];const raw=[job.title,job.requirements,job.description].filter(Boolean).join(' ');let toks=[];
    if(typeof window.v100Tokens==='function')toks=window.v100Tokens(raw);else toks=norm(raw).split(/\s+/).filter(x=>x.length>3&&!STOP.has(x));
    return [...new Set(toks)].slice(0,40);
  }
  function termRelevance(text,terms){const n=norm(text);return terms.reduce((s,t)=>s+(n.includes(norm(t))?1:0),0);}
  function cvEvidenceForJob(cv,terms){
    const experiences=(cv?.experiences||[]).map(x=>({
      ...x,
      position_title:x.position||x.position_title||'',
      company_name:x.company||x.company_name||'',
      start_date:x.start||x.start_date||null,
      end_date:x.end||x.end_date||null,
      current_job:!!(x.current||x.current_job),
      _r:termRelevance(`${x.position||x.position_title||''} ${x.company||x.company_name||''} ${x.description||''}`,terms),
      _source:'cv'
    })).sort((a,b)=>b._r-a._r||String(b.start_date||'').localeCompare(String(a.start_date||'')));
    const skills=(cv?.skills||[]).map(x=>({...x,level:Number(x.level||3),_r:termRelevance(`${x.skill||''} ${x.excerpt||''}`,terms),_source:'cv'})).sort((a,b)=>b._r-a._r);
    const education=(cv?.education||[]).map(x=>({...x,_r:termRelevance(`${x.title||''} ${x.institution||''} ${x.level||''}`,terms),_source:'cv'})).sort((a,b)=>b._r-a._r);
    return {experiences,skills,education};
  }
  function mergeEvidence(primary,secondary,keyFn){const seen=new Set(),out=[];for(const x of [...(primary||[]),...(secondary||[])]){const key=norm(keyFn(x));if(key&&seen.has(key))continue;if(key)seen.add(key);out.push(x);}return out;}
  function enhancedAnalysis(job){
    const base=baseAnalysis?baseAnalysis(job):null;if(!job)return base;
    const cv=currentCv();if(!cv)return base;
    const terms=cvJobTerms(job),ev=cvEvidenceForJob(cv,terms);
    const hay=norm([cv.text,...ev.experiences.map(x=>`${x.position_title} ${x.company_name} ${x.description||''}`),...ev.skills.map(x=>`${x.skill||''} ${x.excerpt||''}`),...ev.education.map(x=>`${x.title||''} ${x.institution||''}`)].join(' '));
    const cvHits=terms.filter(t=>hay.includes(norm(t)));
    const matched=[...new Set([...(base?.matched||[]),...cvHits])].slice(0,14);
    const missing=terms.filter(t=>!matched.includes(t)&&!hay.includes(norm(t))).slice(0,10);
    const cvCoverage=terms.length?Math.round((cvHits.length*100)/terms.length):0;
    const baseScore=Number(base?.score||0);
    const score=Math.min(100,Math.max(baseScore,Math.round(cvCoverage*.78)));
    const experiences=mergeEvidence(ev.experiences,base?.experiences||[],x=>`${x.position_title||x.position||''}|${x.company_name||x.company||''}|${x.start_date||x.start||''}`);
    const skills=mergeEvidence(ev.skills,base?.skills||[],x=>x.skill||'');
    const best=experiences.find(x=>Number(x._r||0)>0);
    const questions=[
      best?`En tu CV figura ${best.position_title}${best.company_name?` en ${best.company_name}`:''}. ¿Qué resultado concreto lograste allí que se relacione con ${job.title}?`:`¿Qué experiencia real tuya se relaciona mejor con el rol de ${job.title}?`,
      missing[0]?`La búsqueda menciona ${missing[0]} y no encuentro evidencia clara en el CV. ¿Tuviste experiencia real con ese tema?`:`¿Qué parte de esta búsqueda requeriría mayor aprendizaje al incorporarte?`,
      `Contá una situación concreta donde aplicaste ${matched[0]||'una competencia relevante'} y cómo verificaste el resultado.`,
      `¿Qué evidencia verificable de tu CV respalda mejor esta postulación?`,
      `¿Qué responsabilidad de ${job.title} se parece más a algo que ya hiciste?`
    ];
    return {...(base||{}),job,score,matched,missing,experiences,skills,education:ev.education,questions,cv_hits:cvHits,cv_quality:Number(cv.quality?.score||0),cv_coverage:cvCoverage,cv_source:true};
  }
  if(baseAnalysis)window.buildAgentAnalysisV100=enhancedAnalysis;
  function analysis(job){try{return enhancedAnalysis(job)}catch(_){return baseAnalysis?.(job)||null}}

  function fmtDate(v){if(!v)return'';try{return new Date(v+'T00:00:00').toLocaleDateString('es-AR',{year:'numeric',month:'short'})}catch(_){return v}}
  function expLabel(x){return `${x.position||x.position_title||'Puesto'}${x.company||x.company_name?' · '+(x.company||x.company_name):''}${x.start||x.start_date?` · ${fmtDate(x.start||x.start_date)} — ${x.current||x.current_job?'Actualidad':fmtDate(x.end||x.end_date)||'?'}`:''}`;}

  function queryTerms(q){return [...new Set(norm(q).split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)))];}
  function searchCv(q){
    const cv=cvContext(),terms=queryTerms(q);if(!terms.length)return[];const entries=[];
    for(const x of cv.experiences||[])entries.push({type:'experiencia',title:expLabel(x),text:`${x.position||''} ${x.company||''} ${x.description||''}`,excerpt:x.description||x.evidence_excerpt||''});
    for(const x of cv.education||[])entries.push({type:'formación',title:`${x.title} · ${x.institution}`,text:`${x.title} ${x.institution} ${x.level||''}`,excerpt:x.excerpt||''});
    for(const x of cv.skills||[])entries.push({type:'competencia',title:x.skill,text:`${x.skill} ${x.excerpt||''}`,excerpt:x.excerpt||''});
    return entries.map(e=>({...e,score:terms.reduce((s,t)=>s+(norm(e.text).includes(t)?1:0),0)})).filter(e=>e.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  }

  function cvSummaryAnswer(){
    const cv=cvContext(),q=cv.quality||{},career=cv.career||{};const source=currentCv()?'el CV que cargaste':'tu perfil estructurado';const ex=(cv.experiences||[]).slice(0,5).map(expLabel);
    return `De ${source} interpreto ${cv.experiences?.length||0} experiencia(s), ${cv.education?.length||0} formación(es) y ${cv.skills?.length||0} competencia(s).${career.years?` La trayectoria con fechas suma aproximadamente ${career.years} años sin duplicar períodos superpuestos.`:''}${currentCv()?` Calidad de lectura: ${q.score||0}%.`:''}\n\n${ex.length?'Experiencia principal:\n• '+ex.join('\n• '):'No pude estructurar experiencia laboral.'}${q.warnings?.length?'\n\nDudas de lectura:\n• '+q.warnings.join('\n• '):''}`;
  }
  function experienceAnswer(){const cv=cvContext(),rows=cv.experiences||[];if(!rows.length)return'No encuentro experiencias laborales estructuradas. Si acabás de subir un CV, revisá la lectura antes de incorporarlo.';return `${cv.career?.years?`Trayectoria fechada aproximada: ${cv.career.years} años.\n`:''}${rows.slice(0,8).map(x=>`• ${expLabel(x)}${x.description?`\n  ${x.description.slice(0,220)}`:''}`).join('\n')}`;}
  function educationAnswer(){const rows=cvContext().education||[];return rows.length?rows.slice(0,10).map(x=>`• ${x.title} · ${x.institution}${x.start?` · ${fmtDate(x.start)} — ${x.current?'Actualidad':fmtDate(x.end)||'?'}`:''}`).join('\n'):'No encuentro formación académica estructurada en el CV/perfil.';}
  function skillsAnswer(){const rows=cvContext().skills||[];if(!rows.length)return'No encontré competencias suficientemente claras.';return rows.slice(0,15).map(x=>`• ${x.skill}${x.kind==='inferred'?' (mención inferida por texto)':x.kind==='explicit'?' (declarada explícitamente)':''}${x.excerpt&&x.excerpt!==x.skill?` — evidencia: ${x.excerpt.slice(0,150)}`:''}`).join('\n');}
  function doubtsAnswer(){const cv=currentCv();if(!cv)return'No hay un CV cargado en esta sesión. Puedo analizar uno acá mismo sin enviarlo a una API externa.';const warnings=cv.quality?.warnings||[];const missing=(cv.experiences||[]).filter(x=>!x.company||!x.position);const lines=[...warnings];if(missing.length)lines.push(`${missing.length} experiencia(s) necesitan confirmar puesto o empresa.`);if(!cv.fields?.headline)lines.push('No pude identificar un título profesional claro.');return lines.length?'Lo que no tomaría como seguro automáticamente:\n• '+lines.join('\n• '):'La lectura no muestra inconsistencias estructurales importantes. Igual conviene confirmar nombres de empresas, fechas y descripciones antes de incorporarlas.';}
  function answerQuestion(q){
    const n=norm(q),job=selectedJob();
    if(/entrevista|entrevistar|preguntas/.test(n)){
      if(!job)return `Para preparar una entrevista necesito que selecciones una oportunidad. Mientras tanto, las experiencias que pude estructurar son:
${experienceAnswer()}`;
      const a=analysis(job),best=(a?.experiences||[]).filter(x=>Number(x._r||0)>0).slice(0,3);return `Para una entrevista de ${job.title}, usaría evidencia concreta de estas experiencias:
${best.length?best.map(x=>`• ${x.position_title} · ${x.company_name}${x.description?` — ${x.description.slice(0,180)}`:''}`).join('\n'):'• No encontré una experiencia claramente relacionada; conviene revisar el CV/perfil antes.'}

Preguntas para practicar:
• ${(a?.questions||[]).slice(0,5).join('\n• ')}`;
    }
    if(job&&/falta|brecha|requisito|coincid|afinidad/.test(n)){const a=analysis(job);return `Para ${job.title}:
• Evidencia encontrada: ${(a?.matched||[]).slice(0,8).join(', ')||'sin coincidencias fuertes'}
• Sin evidencia clara: ${(a?.missing||[]).slice(0,8).join(', ')||'sin brechas textuales principales'}

Que algo figure como faltante significa que no lo encuentro documentado; no significa que no sepas hacerlo.`;}
    if(/no entend|duda|error|inconsisten|mal interpret|revis/.test(n))return doubtsAnswer();
    if(/experien|trayectoria|trabaj|empresa|anos|años/.test(n))return experienceAnswer();
    if(/formacion|formación|estudio|educacion|educación|titulo|título|universidad/.test(n))return educationAnswer();
    if(/habilidad|skill|competencia|conocimiento|fortaleza/.test(n))return skillsAnswer();
    if(/resum|entendiste|interpreta|interpretaste|mi cv|curriculum/.test(n))return cvSummaryAnswer();
    const hits=searchCv(q);if(hits.length)return `Encontré estas evidencias relacionadas con tu pregunta:
• ${hits.map(h=>`${h.type}: ${h.title}${h.excerpt?` — ${h.excerpt.slice(0,180)}`:''}`).join('\n• ')}`;
    if(job){const a=analysis(job);return `Para ${job.title}, encuentro coincidencias documentales en: ${(a?.matched||[]).slice(0,7).join(', ')||'ningún término fuerte todavía'}. No encuentro evidencia clara para: ${(a?.missing||[]).slice(0,6).join(', ')||'sin brechas textuales principales'}. Esto describe documentación disponible; no evalúa ni predice una contratación.`;}
    return 'No encontré evidencia suficiente para responder eso con seguridad. Probá preguntarme por experiencia, formación, competencias o cargá el CV para que pueda buscar evidencia concreta.';
  }

  function plan(job){
    const out=[],p=talentData?.profile||{},ps=profileScore(),a=analysis(job),app=appFor(job),iv=upcomingInterview(job),cv=currentCv();
    if(!cv)out.push({key:'cv',tone:'violet',title:'Leer tu CV en el agente',detail:'Puedo estructurar experiencia, fechas, formación y competencias localmente, sin API paga.',action:'cv-upload'});
    else if(Number(cv.quality?.score||0)<70||cv.quality?.warnings?.length)out.push({key:'cv-review',tone:'amber',title:'Revisar interpretación del CV',detail:`Calidad ${cv.quality?.score||0}%. ${cv.quality?.warnings?.[0]||'Hay campos que conviene confirmar.'}`,action:'cv-review'});
    if(!p.approval_status||p.approval_status!=='approved')out.push({key:'profile',tone:'amber',title:'Consolidar el perfil',detail:'El perfil todavía no está habilitado para postulaciones asistidas.',action:'profile'});
    else if(ps.score<80)out.push({key:'profile-quality',tone:'blue',title:'Completar información faltante',detail:`Calidad estructural del perfil ${ps.score}%. ${ps.missing?.slice(0,3).join(' · ')||'Hay datos que pueden completarse.'}`,action:'profile'});
    if(job&&a?.missing?.length)out.push({key:'gaps',tone:'amber',title:'Brechas documentales',detail:`No encuentro evidencia clara para: ${a.missing.slice(0,4).join(', ')}. Puede existir en tu experiencia pero no estar documentada.`,action:a.relatedCourses?.length?'courses':'profile'});
    if(iv)out.push({key:'interview',tone:'violet',title:'Preparar entrevista',detail:'Hay una entrevista próxima. Puedo usar el CV y la búsqueda para preparar evidencia concreta.',action:'interviews'});
    else if(app&&!['rejected','hired','withdrawn'].includes(app.status))out.push({key:'application',tone:'blue',title:'Seguir el proceso activo',detail:`Tu postulación está en estado ${app.status||'activo'}.`,action:'applications'});
    else if(job&&p.approval_status==='approved')out.push({key:'apply',tone:'green',title:'Preparar postulación asistida',detail:'El CV adaptado sólo reorganiza información confirmada.',action:'apply'});
    return out.slice(0,6);
  }


  function jobOptions(selected){const jobs=talentData?.jobs||[];return `<option value="">Elegí una oportunidad</option>${jobs.map(j=>`<option value="${esc(j.id)}" ${j.id===selected?'selected':''}>${esc(j.title)} · ${esc(j.company_name||'Lutmin')}</option>`).join('')}`;}
  function goal(){const s=state();return s.goal||'start';}
  function setGoal(next){save({goal:next});render();}
  function sourceSummary(cv,ev){if(cv){const career=cv.career||{};return `${cv.experiences?.length||0} experiencias${career.years?` · ${career.years} años de trayectoria`:''} · ${cv.education?.length||0} formaciones · ${cv.skills?.length||0} competencias`;}return `${ev.experiences||0} experiencias · ${ev.skills||0} competencias · ${ev.certificates||0} certificados cargados en tu perfil`;}
  function goalCards(active){const items=[
    ['job','fa-briefcase','Analizar una oportunidad','Compará tu experiencia y tu CV con una búsqueda concreta.'],
    ['cv','fa-file-lines','Mejorar mi CV','Revisá qué entendió el agente y qué conviene ordenar o completar.'],
    ['interview','fa-comments','Preparar una entrevista','Practicá preguntas basadas en tu experiencia real y en la búsqueda.'],
    ['profile','fa-user-check','Revisar mi perfil','Detectá información faltante y próximos pasos para fortalecerlo.']
  ];return items.map(([key,icon,title,desc])=>`<button type="button" class="agent-v39-goal ${active===key?'is-active':''}" data-agent-v39-goal="${key}" aria-pressed="${active===key?'true':'false'}"><span class="agent-v39-goal-icon"><i class="fa-solid ${icon}"></i></span><span><strong>${title}</strong><small>${desc}</small></span><i class="fa-solid fa-chevron-right agent-v39-chevron"></i></button>`).join('');}
  function progressHtml(cv,active){const sourceDone=!!cv||(evidenceCounts().experiences+evidenceCounts().skills>0),goalDone=active!=='start';return `<div class="agent-v39-progress" aria-label="Progreso del análisis"><div class="${sourceDone?'is-done':'is-current'}"><span>1</span><b>Tu información</b></div><i></i><div class="${goalDone?'is-done':'is-current'}"><span>2</span><b>Tu objetivo</b></div><i></i><div class="${goalDone?'is-current':''}"><span>3</span><b>Resultado</b></div></div>`;}
  function compactEvidence(a){if(!a)return'';const matched=(a.matched||[]).slice(0,6),missing=(a.missing||[]).slice(0,5);return `<div class="agent-v39-evidence-grid"><div><span>Encontré evidencia de</span><div>${matched.length?matched.map(x=>`<b class="is-positive">${esc(x)}</b>`).join(''):'<em>Todavía no encontré coincidencias claras.</em>'}</div></div><div><span>Conviene revisar</span><div>${missing.length?missing.map(x=>`<b class="is-warning">${esc(x)}</b>`).join(''):'<em>No detecté brechas textuales principales.</em>'}</div></div></div>`;}
  function actionsHtml(job){const actions=plan(job).slice(0,3);if(!actions.length)return'';return `<div class="agent-v39-next"><h5>Próximos pasos sugeridos</h5>${actions.map(x=>`<article><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p></div><button type="button" data-agent-v39-action="${esc(x.action)}" data-job-id="${esc(job?.id||'')}">${esc(({profile:'Ir al perfil',courses:'Ver cursos',interviews:'Entrevistas',applications:'Postulaciones',jobs:'Oportunidades',apply:'Preparar postulación','cv-upload':'Cargar CV','cv-review':'Revisar lectura'})[x.action]||'Abrir')}</button></article>`).join('')}</div>`;}
  function resultJob(job,a){if(!job)return `<div class="agent-v39-empty"><i class="fa-solid fa-briefcase"></i><div><strong>Elegí una oportunidad</strong><p>Seleccioná una búsqueda para comparar sus requisitos con tu experiencia documentada.</p></div></div>`;return `<div class="agent-v39-result-head"><div><span>Oportunidad seleccionada</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Lutmin')}</p></div><div class="agent-v39-match"><strong>${Number(a?.score||0)}%</strong><span>coincidencia documental</span></div></div>${compactEvidence(a)}${actionsHtml(job)}<div class="agent-v39-primary-row"><button type="button" class="agent-v39-primary" data-agent-v39-apply="${esc(job.id)}"><i class="fa-solid fa-file-circle-check"></i> Preparar postulación</button><button type="button" class="agent-v39-secondary" data-agent-v39-download="${esc(job.id)}"><i class="fa-solid fa-file-pdf"></i> CV adaptado</button></div><p class="agent-v39-note">La coincidencia describe evidencia disponible. No decide ni predice una contratación.</p>`;}
  function resultCv(cv,ev){if(!cv)return `<div class="agent-v39-empty"><i class="fa-solid fa-file-arrow-up"></i><div><strong>Cargá tu CV para empezar</strong><p>El agente va a ordenar experiencia, formación y competencias sin agregar información que no exista.</p><button type="button" class="agent-v39-primary" data-agent-v39-upload>Cargar mi CV</button></div></div>`;const career=cv.career||{};return `<div class="agent-v39-result-head"><div><span>CV interpretado</span><h4>${esc(cv.file?.name||'Tu CV')}</h4><p>${sourceSummary(cv,ev)}</p></div><div class="agent-v39-ready"><i class="fa-solid fa-circle-check"></i> Listo para revisar</div></div><div class="agent-v39-summary-cards"><div><span>Experiencias</span><strong>${cv.experiences?.length||0}</strong></div><div><span>Trayectoria</span><strong>${career.years?career.years+' años':'—'}</strong></div><div><span>Formación</span><strong>${cv.education?.length||0}</strong></div><div><span>Competencias</span><strong>${cv.skills?.length||0}</strong></div></div>${cv.quality?.warnings?.length?`<div class="agent-v39-alert"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Hay datos para confirmar</strong><p>${esc(cv.quality.warnings.slice(0,2).join(' · '))}</p></div></div>`:''}<div class="agent-v39-primary-row"><button type="button" class="agent-v39-primary" data-agent-v39-review>Revisar lo que entendió</button><button type="button" class="agent-v39-secondary" data-agent-v39-upload>Cambiar CV</button></div>`;}
  function resultInterview(job){if(!job)return `<div class="agent-v39-empty"><i class="fa-solid fa-comments"></i><div><strong>Elegí la búsqueda de la entrevista</strong><p>Así las preguntas se basan en el puesto y en tu experiencia real.</p></div></div>`;const a=analysis(job),qs=(a?.questions||[]).slice(0,5);return `<div class="agent-v39-result-head"><div><span>Preparación de entrevista</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Lutmin')}</p></div></div><div class="agent-v39-interview">${qs.map((q,i)=>`<article><span>${i+1}</span><p>${esc(q)}</p></article>`).join('')}</div><button type="button" class="agent-v39-secondary" data-agent-v39-question="¿Cómo preparo la entrevista para esta búsqueda?">Ver guía completa</button>`;}
  function resultProfile(ps,ev){const missing=ps.missing||[];return `<div class="agent-v39-result-head"><div><span>Estado del perfil</span><h4>${Number(ps.score||0)}% completo</h4><p>${ev.experiences} experiencias · ${ev.skills} competencias · ${ev.certificates} certificados</p></div></div>${missing.length?`<div class="agent-v39-checklist"><h5>Lo que conviene completar</h5>${missing.slice(0,6).map(x=>`<div><i class="fa-regular fa-circle"></i><span>${esc(x)}</span></div>`).join('')}</div>`:`<div class="agent-v39-success"><i class="fa-solid fa-circle-check"></i><div><strong>Tu perfil tiene una base sólida</strong><p>Podés enfocarte en adaptar evidencia a cada oportunidad.</p></div></div>`}<button type="button" class="agent-v39-primary" data-agent-v39-action="profile">Ir a mi perfil</button>`;}
  function questionSuggestions(active,job){let qs=[];if(active==='job')qs=['¿Qué debería destacar?','¿Qué me falta para esta búsqueda?','¿Qué experiencia conviene priorizar?'];else if(active==='interview')qs=['¿Qué preguntas debería practicar?','¿Qué experiencia usaría como ejemplo?','¿Qué me pueden preguntar sobre mis brechas?'];else if(active==='cv')qs=['¿Qué entendiste de mi CV?','¿Qué experiencia encontraste?','¿Qué datos no son seguros?'];else qs=['¿Qué debería completar primero?','¿Qué competencias detectaste?','¿Qué experiencia tengo documentada?'];return `<div class="agent-v39-suggestions">${qs.map(q=>`<button type="button" data-agent-v39-question="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;}
  function resultFor(active,cv,job,a,ps,ev){if(active==='job')return resultJob(job,a);if(active==='cv')return resultCv(cv,ev);if(active==='interview')return resultInterview(job);if(active==='profile')return resultProfile(ps,ev);return `<div class="agent-v39-empty agent-v39-welcome"><i class="fa-solid fa-arrow-up"></i><div><strong>Elegí qué querés hacer</strong><p>El agente va a mostrar sólo las herramientas que necesitás para ese objetivo.</p></div></div>`;}
  function render(){
    const host=document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38');if(!host)return;const cv=currentCv(),job=selectedJob(),a=analysis(job),ps=profileScore(),ev=evidenceCounts(),active=goal();
    host.innerHTML=`<div class="agent-v39">
      <header class="agent-v39-header"><div class="agent-v39-title"><span><i class="fa-solid fa-wand-magic-sparkles"></i></span><div><p>Agente de empleabilidad</p><h3>¿Qué querés hacer hoy?</h3><small>Usa únicamente tu información cargada. No inventa experiencia ni toma decisiones por vos.</small></div></div></header>
      ${progressHtml(cv,active)}
      <section class="agent-v39-source"><div class="agent-v39-source-icon ${cv?'is-ready':''}"><i class="fa-solid ${cv?'fa-file-circle-check':'fa-file-arrow-up'}"></i></div><div><span>Tu información</span><strong>${cv?esc(cv.file?.name||'CV listo'):'Todavía no analizaste un CV'}</strong><p>${sourceSummary(cv,ev)}</p></div><div class="agent-v39-source-actions"><input id="agentCvFileV38" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg" hidden><button type="button" class="${cv?'agent-v39-secondary':'agent-v39-primary'}" data-agent-v39-upload>${cv?'Cambiar CV':'Cargar mi CV'}</button>${cv?'<button type="button" class="agent-v39-link" data-agent-v39-review>Revisar lectura</button>':''}</div></section>
      <section class="agent-v39-goals"><div class="agent-v39-section-title"><span>Paso 2</span><h4>Elegí tu objetivo</h4></div><div class="agent-v39-goal-grid">${goalCards(active)}</div></section>
      <section class="agent-v39-result"><div class="agent-v39-section-title"><span>Paso 3</span><h4>${active==='start'?'Resultado':({job:'Análisis de oportunidad',cv:'Revisión de CV',interview:'Preparación de entrevista',profile:'Revisión de perfil'})[active]}</h4></div>${['job','interview'].includes(active)?`<div class="agent-v39-job-select"><label for="agentJobSelectV100">Oportunidad</label><select id="agentJobSelectV100">${jobOptions(job?.id||state().last_job_id||'')}</select></div>`:''}<div class="agent-v39-result-body">${resultFor(active,cv,job,a,ps,ev)}</div></section>
      ${active!=='start'?`<section class="agent-v39-ask"><div><span>¿Querés profundizar?</span><h4>Preguntale al agente</h4></div>${questionSuggestions(active,job)}<form id="agentQuestionFormV39"><input id="agentQuestionV100" autocomplete="off" placeholder="Escribí una pregunta sobre tu CV, experiencia o esta oportunidad"><button type="submit"><i class="fa-solid fa-arrow-right"></i></button></form><div id="agentAnswerV100" class="agent-v39-answer hidden"></div></section>`:''}
    </div>`;
  }

  function remember(jobId){const s=state(),history=Array.isArray(s.history)?s.history:[],job=(talentData?.jobs||[]).find(j=>j.id===jobId);if(!job)return;const a=analysis(job),entry={job_id:job.id,title:job.title,company:job.company_name||null,score:Number(a?.score||0),at:now()};save({last_job_id:jobId,history:[entry,...history.filter(x=>x.job_id!==jobId)].slice(0,8)});}
  async function runAction(action,jobId){if(action==='cv-upload'){document.getElementById('agentCvFileV38')?.click();return;}if(action==='cv-review'){const cv=currentCv();if(cv)openCvReviewV140?.(cv);return;}if(action==='courses'){goToCampusTab?.('courses');return;}if(action==='apply'&&typeof openSmartApplyV100==='function')return openSmartApplyV100(jobId);if(window.openTalentModuleV38)return window.openTalentModuleV38(action);if(window.openTalentModuleV37)return window.openTalentModuleV37(action);}
  async function readAgentCv(file){if(!file)return;const host=document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38');try{if(host)host.dataset.busy='true';const cv=await window.LutminCvV38?.analyzeFile?.(file,{openReview:false});if(!cv)throw new Error('No pude interpretar el CV.');save({goal:'cv'});render();showAgentAnswerV39('Listo. Ya ordené lo que pude interpretar del CV. Revisá el resumen y, si querés, confirmá la lectura antes de usarlo para una búsqueda.');}catch(e){console.error(e);showToast?.(e.message||'No pude interpretar el CV.');}finally{if(host)host.dataset.busy='false';}}
  function showAgentAnswerV39(text){const root=document.getElementById('agentAnswerV100');if(!root)return;root.classList.remove('hidden');root.innerHTML=`<p>${esc(text).replace(/\n/g,'<br>')}</p>`;root.scrollIntoView?.({behavior:'smooth',block:'nearest'});}

  window.askAgentV100=function(e){e?.preventDefault?.();const q=document.getElementById('agentQuestionV100')?.value?.trim()||'';if(!q)return;showAgentAnswerV39(answerQuestion(q));};
  window.agentAskPresetV100=function(kind){const map={cv:'¿Qué entendiste de mi CV?',gap:'¿Qué me falta para esta búsqueda?',interview:'¿Cómo preparo la entrevista para esta búsqueda?',course:'¿Qué formación encontraste?'};showAgentAnswerV39(answerQuestion(map[kind]||kind));};
  window.ensureTalentAgentV39=function(){const card=document.getElementById('talentAgentV100');if(!card)return;let host=document.getElementById('talentAgentV39');if(!host){host=document.createElement('div');host.id='talentAgentV39';card.appendChild(host);}render();};
  window.refreshTalentAgentV39=render;window.ensureTalentAgentV38=window.ensureTalentAgentV39;window.refreshTalentAgentV38=render;window.ensureTalentAgentV37=window.ensureTalentAgentV39;window.refreshTalentAgentV37=render;
  const oldSelect=window.selectAgentJobV100;if(typeof oldSelect==='function')window.selectAgentJobV100=function(id){const r=oldSelect.apply(this,arguments);if(id){save({last_job_id:id});remember(id);}setTimeout(render,0);return r;};
  window.addEventListener('lutmin:cv-analyzed',()=>setTimeout(render,0));

  document.addEventListener('click',e=>{
    const g=e.target.closest?.('[data-agent-v39-goal]');if(g){e.preventDefault();setGoal(g.dataset.agentV39Goal);return;}
    const q=e.target.closest?.('[data-agent-v39-question]');if(q){e.preventDefault();showAgentAnswerV39(answerQuestion(q.dataset.agentV39Question));return;}
    const up=e.target.closest?.('[data-agent-v39-upload]');if(up){e.preventDefault();document.getElementById('agentCvFileV38')?.click();return;}
    const rv=e.target.closest?.('[data-agent-v39-review]');if(rv){e.preventDefault();const cv=currentCv();if(cv)openCvReviewV140?.(cv);return;}
    const a=e.target.closest?.('[data-agent-v39-action]');if(a){e.preventDefault();runAction(a.dataset.agentV39Action,a.dataset.jobId);return;}
    const apply=e.target.closest?.('[data-agent-v39-apply]');if(apply){e.preventDefault();runAction('apply',apply.dataset.agentV39Apply);return;}
    const dl=e.target.closest?.('[data-agent-v39-download]');if(dl){e.preventDefault();if(typeof downloadSmartCvV100==='function')downloadSmartCvV100(dl.dataset.agentV39Download);return;}
  });
  document.addEventListener('change',e=>{if(e.target?.id==='agentCvFileV38')readAgentCv(e.target.files?.[0]);if(e.target?.id==='agentJobSelectV100'){const id=e.target.value;save({last_job_id:id||null});try{selectAgentJobV100?.(id)}catch(_){render();}}});
  document.addEventListener('submit',e=>{if(e.target?.id==='agentQuestionFormV39'){e.preventDefault();window.askAgentV100(e);}});
  window.LutminAgentV39={version:'39.0',answer:answerQuestion,searchCv,cvContext,analysis,render,setGoal};window.LutminAgentV38=window.LutminAgentV39;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(window.ensureTalentAgentV39,0),{once:true});else setTimeout(window.ensureTalentAgentV39,0);
})();
