// =========================================================
// LUTMIN V40.0 · CV ADAPTADO POR OPORTUNIDAD + AGENTE DE EMPLEABILIDAD
// Interpretación estructurada de CV + preguntas determinísticas. API $0.
// No inventa antecedentes, no decide contrataciones y no postula solo.
// =========================================================
(function(){
  'use strict';
  const STORE='lutmin-agent-v40'; const LEGACY_STORE='lutmin-agent-v39';
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



  // =========================================================
  // V40 · CV ADAPTADO COMO FLUJO PRINCIPAL
  // =========================================================
  const V40_VERSION='40.0';
  function jobOptions(selected){const jobs=talentData?.jobs||[];return `<option value="">Elegí una oportunidad</option>${jobs.map(j=>`<option value="${esc(j.id)}" ${j.id===selected?'selected':''}>${esc(j.title)} · ${esc(j.company_name||'Lutmin')}</option>`).join('')}`;}
  function mode(){const s=state();return s.mode||'tailor';}
  function setMode(next){save({mode:next||'tailor'});render();}
  function sourceSummary(cv,ev){if(cv){const career=cv.career||{};return `${cv.experiences?.length||0} experiencias${career.years?` · ${career.years} años de trayectoria`:''} · ${cv.education?.length||0} formaciones · ${cv.skills?.length||0} competencias`;}return `${ev.experiences||0} experiencias · ${ev.skills||0} competencias · ${ev.certificates||0} certificados cargados en tu perfil`;}

  function normalizeExperience(x){return {company_name:x.company_name||x.company||'',position_title:x.position_title||x.position||'',start_date:x.start_date||x.start||null,end_date:x.end_date||x.end||null,current_job:!!(x.current_job||x.current),description:x.description||'',relevance:Number(x._r||x.relevance||0)};}
  function normalizeEducation(x){return {institution:x.institution||'',title:x.title||'',level:x.level||'',start_date:x.start_date||x.start||null,end_date:x.end_date||x.end||null,current:!!(x.current||x.current_job),relevance:Number(x._r||x.relevance||0)};}
  function buildTailoredCvV40(job){
    if(!job)return null;
    const a=analysis(job)||{},cv=cvContext(),p=talentData?.profile||{},fields=cv?.fields||{};
    const experiences=(a.experiences||cv?.experiences||[]).map(normalizeExperience).sort((x,y)=>y.relevance-x.relevance||String(y.start_date||'').localeCompare(String(x.start_date||'')));
    const skills=(a.skills||cv?.skills||[]).map(x=>({skill:x.skill||'',level:Number(x.level||3),relevance:Number(x._r||x.relevance||0),excerpt:x.excerpt||''})).filter(x=>x.skill).sort((x,y)=>y.relevance-x.relevance||x.skill.localeCompare(y.skill));
    const education=(a.education||cv?.education||educationRows()||[]).map(normalizeEducation).sort((x,y)=>y.relevance-x.relevance||String(y.end_date||y.start_date||'').localeCompare(String(x.end_date||x.start_date||'')));
    const certificates=(a.certs||talentData?.certificates||[]).map(c=>({course_title:c.course_title||'',duration_hours:c.duration_hours||null,score:c.score??null,code:c.code||'',issued_at:c.issued_at||null,relevance:Number(c._r||c.relevance||0)})).sort((x,y)=>y.relevance-x.relevance);
    const focus=[...new Set((a.matched||[]).filter(Boolean))].slice(0,8);
    const missing=[...new Set((a.missing||[]).filter(Boolean))].slice(0,7);
    const headline=fields.headline||p.headline||p.desired_role||experiences[0]?.position_title||'Perfil profesional';
    const bio=fields.bio||p.bio||'';
    const email=fields.email||currentLutminUser?.email||'';
    const phone=fields.phone||p.phone||'';
    const city=fields.city||p.city||'';
    const province=fields.province||p.province||'';
    return {
      version:'LUTMIN-CV-TAILORED-V40',generated_at:now(),job:{id:job.id,title:job.title,company_name:job.company_name||'Lutmin',location:job.location||''},
      source:{name:currentCv()?.file?.name||'Perfil Lutmin',cv_loaded:!!currentCv()},
      person:{name:currentLutminUser?.fullName||'Perfil profesional',headline,bio,email,phone,city,province,linkedin:fields.linkedin||fields.linkedin_url||p.linkedin_url||''},
      focus,missing,skills,experiences,education,certificates,score:Number(a.score||0)
    };
  }

  function tailoredPreviewHtml(job){
    if(!job)return `<div class="agent-v40-empty"><i class="fa-solid fa-arrow-up"></i><div><strong>Elegí la oportunidad</strong><p>Ese es el único dato que falta para preparar una versión específica de tu CV.</p></div></div>`;
    const t=buildTailoredCvV40(job),cv=currentCv();
    const topExp=t.experiences.slice(0,3),topSkills=t.skills.slice(0,7),focus=t.focus.slice(0,6);
    return `<div class="agent-v40-tailor-card">
      <div class="agent-v40-tailor-head"><div><span>CV PERSONALIZADO PARA ESTA POSTULACIÓN</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Lutmin')}${job.location?` · ${esc(job.location)}`:''}</p></div><i class="fa-solid fa-file-circle-check"></i></div>
      <div class="agent-v40-promise"><i class="fa-solid fa-wand-magic-sparkles"></i><div><strong>Lutmin prepara una versión distinta de tu CV para esta búsqueda.</strong><p>Reordena experiencia y competencias según la oportunidad, pero conserva empresas, cargos, fechas y antecedentes tal como existen en tu información.</p></div></div>
      ${!cv?`<div class="agent-v40-cv-warning"><i class="fa-solid fa-circle-info"></i><div><strong>Podemos trabajar con tu perfil, pero el resultado mejora si cargás tu CV.</strong><button type="button" data-agent-v40-upload>Cargar CV ahora</button></div></div>`:''}
      <div class="agent-v40-preview-grid">
        <div><span>Enfoque que va a destacar</span>${focus.length?`<div class="agent-v40-tags">${focus.map(x=>`<b>${esc(x)}</b>`).join('')}</div>`:'<p>No hay coincidencias textuales fuertes; se mantendrá un enfoque general y verificable.</p>'}</div>
        <div><span>Experiencia que sube primero</span>${topExp.length?topExp.map((x,i)=>`<article><em>${i+1}</em><div><strong>${esc(x.position_title||'Experiencia')}</strong><p>${esc(x.company_name||'Empresa por confirmar')}</p></div></article>`).join(''):'<p>No hay experiencia estructurada todavía.</p>'}</div>
        <div><span>Competencias que prioriza</span>${topSkills.length?`<div class="agent-v40-tags is-skills">${topSkills.map(x=>`<b>${esc(x.skill)}</b>`).join('')}</div>`:'<p>No hay competencias estructuradas todavía.</p>'}</div>
      </div>
      <div class="agent-v40-main-actions"><button type="button" class="agent-v40-download" data-agent-v40-download="${esc(job.id)}"><i class="fa-solid fa-file-pdf"></i><span><strong>Descargar CV adaptado</strong><small>PDF listo para esta postulación</small></span></button><button type="button" class="agent-v40-apply" data-agent-v40-apply="${esc(job.id)}"><i class="fa-solid fa-paper-plane"></i> Preparar postulación con este CV</button></div>
      <div class="agent-v40-safety"><i class="fa-solid fa-shield-halved"></i><span>No inventa experiencia. No cambia fechas ni empresas. No decide contrataciones.</span></div>
    </div>`;
  }

  function interviewHtml(job){if(!job)return `<div class="agent-v40-empty"><i class="fa-solid fa-comments"></i><div><strong>Elegí una oportunidad</strong><p>Voy a preparar preguntas usando esa búsqueda y tu experiencia real.</p></div></div>`;const a=analysis(job),qs=(a?.questions||[]).slice(0,5);return `<div class="agent-v40-tool-head"><span>Preparación de entrevista</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Lutmin')}</p></div><div class="agent-v40-interview">${qs.map((q,i)=>`<article><span>${i+1}</span><p>${esc(q)}</p></article>`).join('')}</div>`;}
  function profileHtml(){const ps=profileScore(),ev=evidenceCounts(),missing=ps.missing||[];return `<div class="agent-v40-tool-head"><span>Estado del perfil</span><h4>${Number(ps.score||0)}% completo</h4><p>${ev.experiences} experiencias · ${ev.skills} competencias · ${ev.certificates} certificados</p></div>${missing.length?`<div class="agent-v40-checklist">${missing.slice(0,6).map(x=>`<div><i class="fa-regular fa-circle"></i><span>${esc(x)}</span></div>`).join('')}</div>`:`<div class="agent-v40-ok"><i class="fa-solid fa-circle-check"></i><span>Tu perfil tiene una base sólida.</span></div>`}<button type="button" class="agent-v40-small-primary" data-agent-v40-action="profile">Ir a mi perfil</button>`;}
  function cvReviewHtml(){const cv=currentCv(),ev=evidenceCounts();if(!cv)return `<div class="agent-v40-empty"><i class="fa-solid fa-file-arrow-up"></i><div><strong>Cargá tu CV</strong><p>Voy a interpretar experiencia, formación y competencias para usarlo en cada postulación.</p><button type="button" class="agent-v40-small-primary" data-agent-v40-upload>Cargar CV</button></div></div>`;const career=cv.career||{};return `<div class="agent-v40-tool-head"><span>CV interpretado</span><h4>${esc(cv.file?.name||'Tu CV')}</h4><p>${sourceSummary(cv,ev)}</p></div><div class="agent-v40-stats"><div><span>Experiencias</span><strong>${cv.experiences?.length||0}</strong></div><div><span>Trayectoria</span><strong>${career.years?career.years+' años':'—'}</strong></div><div><span>Formación</span><strong>${cv.education?.length||0}</strong></div><div><span>Competencias</span><strong>${cv.skills?.length||0}</strong></div></div><div class="agent-v40-inline-actions"><button type="button" data-agent-v40-review>Revisar lectura</button><button type="button" data-agent-v40-upload>Cambiar CV</button></div>`;}

  function secondaryTools(active){const items=[['tailor','fa-file-circle-check','CV adaptado'],['interview','fa-comments','Entrevista'],['cv','fa-file-lines','Revisar CV'],['profile','fa-user-check','Perfil']];return items.map(([key,icon,label])=>`<button type="button" class="${active===key?'is-active':''}" data-agent-v40-mode="${key}"><i class="fa-solid ${icon}"></i>${label}</button>`).join('');}
  function questionSuggestions(){return ['¿Qué debería destacar para esta búsqueda?','¿Qué experiencia conviene poner primero?','¿Qué me falta documentar?'];}

  function render(){
    const host=document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38')||document.getElementById('talentAgentV40');if(!host)return;
    if(host.id!=='talentAgentV40')host.id='talentAgentV40';
    const cv=currentCv(),job=selectedJob(),active=mode();
    const tool=active==='interview'?interviewHtml(job):active==='cv'?cvReviewHtml():active==='profile'?profileHtml():tailoredPreviewHtml(job);
    host.innerHTML=`<div class="agent-v40">
      <header class="agent-v40-hero"><div><p>AGENTE LUTMIN</p><h3>Un CV distinto para cada oportunidad</h3><span>Elegí una búsqueda y Lutmin prepara una versión de tu CV enfocada en esa postulación usando sólo información real.</span></div><div class="agent-v40-hero-icon"><i class="fa-solid fa-file-circle-check"></i></div></header>
      <section class="agent-v40-setup"><div class="agent-v40-field"><label for="agentJobSelectV100"><b>1</b><span>Elegí la oportunidad</span></label><select id="agentJobSelectV100">${jobOptions(job?.id||state().last_job_id||'')}</select></div><div class="agent-v40-source"><div><b>2</b><span>${cv?'CV listo':'Tu información'}</span><strong>${cv?esc(cv.file?.name||'CV cargado'):'Usando perfil Lutmin'}</strong><small>${cv?sourceSummary(cv,evidenceCounts()):'Podés cargar tu CV para una adaptación más completa.'}</small></div><input id="agentCvFileV38" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg" hidden><button type="button" data-agent-v40-upload>${cv?'Cambiar CV':'Cargar CV'}</button></div></section>
      <nav class="agent-v40-tools" aria-label="Herramientas del agente">${secondaryTools(active)}</nav>
      <section class="agent-v40-result">${tool}</section>
      <details class="agent-v40-help"><summary><i class="fa-solid fa-message"></i> Preguntarle al agente sobre esta búsqueda</summary><div class="agent-v40-help-body"><div class="agent-v40-suggestions">${questionSuggestions().map(q=>`<button type="button" data-agent-v40-question="${esc(q)}">${esc(q)}</button>`).join('')}</div><form id="agentQuestionFormV40"><input id="agentQuestionV100" autocomplete="off" placeholder="Ej.: ¿Qué experiencia conviene poner primero?"><button type="submit"><i class="fa-solid fa-arrow-right"></i></button></form><div id="agentAnswerV100" class="agent-v40-answer hidden"></div></div></details>
    </div>`;
  }

  async function ensureJsPdfV40(){
    if(window.jspdf?.jsPDF)return true;
    if(typeof window.ensureJsPdfLib==='function'){try{if(await window.ensureJsPdfLib())return true;}catch(_){ }}
    return await new Promise(resolve=>{const existing=[...document.scripts].find(s=>String(s.src||'').includes('jspdf.umd.min.js'));if(existing){let n=0;const t=setInterval(()=>{n++;if(window.jspdf?.jsPDF){clearInterval(t);resolve(true)}else if(n>40){clearInterval(t);resolve(false)}},100);return;}const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.async=true;s.onload=()=>resolve(Boolean(window.jspdf?.jsPDF));s.onerror=()=>resolve(false);document.head.appendChild(s);});
  }
  function addPdfText(doc,text,x,y,width,lineHeight=4){const lines=doc.splitTextToSize(String(text||''),width);doc.text(lines,x,y);return y+Math.max(1,lines.length)*lineHeight;}
  async function downloadTailoredCvV40(jobId=null){
    const job=(talentData?.jobs||[]).find(x=>x.id===(jobId||state().last_job_id));if(!job){showToast?.('Elegí una oportunidad primero.');return false;}
    const snap=buildTailoredCvV40(job);if(!snap){showToast?.('No pude preparar el CV.');return false;}
    const ok=await ensureJsPdfV40();if(!ok){showToast?.('No se pudo cargar el generador de PDF.');return false;}
    try{
      const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});let y=17;const page=(need=18)=>{if(y+need>278){doc.addPage();y=18;}};
      doc.setFont('helvetica','bold');doc.setFontSize(21);doc.setTextColor(10,24,79);doc.text(snap.person.name,18,y);y+=7;
      doc.setFontSize(11);doc.setTextColor(37,99,235);doc.text(snap.person.headline||'Perfil profesional',18,y);y+=5;
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(92);const contact=[snap.person.email,snap.person.phone,[snap.person.city,snap.person.province].filter(Boolean).join(', ')].filter(Boolean).join(' · ');if(contact){doc.text(contact,18,y);y+=4;}
      doc.setTextColor(110);doc.text(`CV adaptado para: ${job.title}${job.company_name?' · '+job.company_name:''}`,18,y);y+=8;
      if(snap.focus.length){doc.setFillColor(239,246,255);doc.roundedRect(18,y-3,174,12,2,2,'F');doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);doc.setFontSize(8);doc.text('ENFOQUE DE ESTA POSTULACIÓN',22,y+1);doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(7.5);y=addPdfText(doc,snap.focus.join(' · '),22,y+5,165,3.5)+4;}
      if(snap.person.bio){page(20);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text('Perfil profesional',18,y);y+=5;doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8.5);y=addPdfText(doc,snap.person.bio,18,y,174,4)+5;}
      if(snap.skills.length){page(16);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text('Competencias priorizadas para esta búsqueda',18,y);y+=5;doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8);y=addPdfText(doc,snap.skills.slice(0,12).map(x=>x.skill).join(' · '),18,y,174,4)+6;}
      if(snap.experiences.length){page(18);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text('Experiencia',18,y);y+=6;for(const [i,x] of snap.experiences.entries()){page(22);doc.setFont('helvetica','bold');doc.setTextColor(45);doc.setFontSize(9);doc.text(`${x.position_title||'Experiencia'}${x.company_name?' · '+x.company_name:''}`,18,y);if(i===0&&x.relevance>0){doc.setFontSize(6.5);doc.setTextColor(37,99,235);doc.text('MÁS RELACIONADA CON LA BÚSQUEDA',135,y);}y+=4.5;doc.setFont('helvetica','normal');doc.setTextColor(105);doc.setFontSize(7.5);const dates=[x.start_date||'',x.current_job?'Actualidad':x.end_date||''].filter(Boolean).join(' — ');if(dates){doc.text(dates,18,y);y+=4;}if(x.description){doc.setTextColor(70);doc.setFontSize(8);y=addPdfText(doc,x.description,18,y,171,3.7)+4;}else y+=2;}}
      if(snap.education.length){page(16);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text('Formación',18,y);y+=6;for(const x of snap.education){page(12);doc.setFont('helvetica','bold');doc.setTextColor(50);doc.setFontSize(8.5);doc.text(`${x.title||'Formación'}${x.institution?' · '+x.institution:''}`,18,y);y+=4;doc.setFont('helvetica','normal');doc.setTextColor(105);doc.setFontSize(7.5);const dates=[x.start_date||'',x.current?'Actualidad':x.end_date||''].filter(Boolean).join(' — ');if(dates)doc.text(dates,18,y);y+=5;}}
      if(snap.certificates.length){page(16);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text('Certificaciones',18,y);y+=6;doc.setFont('helvetica','normal');doc.setTextColor(70);doc.setFontSize(8);for(const c of snap.certificates.slice(0,10)){page(7);y=addPdfText(doc,`• ${c.course_title}${c.duration_hours?' · '+c.duration_hours+' h':''}${c.code?' · '+c.code:''}`,18,y,171,3.7)+1;}}
      const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(6.5);doc.setTextColor(145);doc.text(`Lutmin · CV adaptado para ${job.title} · usa sólo información existente · pág. ${p}/${pages}`,18,289);}
      const slug=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();
      doc.save(`CV_${slug(snap.person.name||'lutmin')}_${slug(job.title||'oportunidad')}.pdf`);
      save({last_job_id:job.id,last_cv_download:{job_id:job.id,at:now()}});showToast?.('CV adaptado generado.');return true;
    }catch(e){console.error('[Lutmin V40] CV adaptado',e);showToast?.('No pude generar el CV adaptado. Revisá la consola para más detalle.');return false;}
  }
  // El snapshot que queda asociado a la postulación usa la misma priorización del PDF V40.
  const legacySnapshotV100=typeof window.buildCvSnapshotV100==='function'?window.buildCvSnapshotV100:null;
  window.buildCvSnapshotV100=function(a){
    const job=a?.job||selectedJob();const t=job?buildTailoredCvV40(job):null;
    if(!t)return legacySnapshotV100?legacySnapshotV100(a):{};
    return {version:t.version,job:t.job,generated_at:t.generated_at,profile:{headline:t.person.headline,city:t.person.city||null,province:t.person.province||null,availability:talentData?.profile?.availability||null,willing_travel:!!talentData?.profile?.willing_travel,bio:t.person.bio||null},focus_terms:t.focus,skills:t.skills,experiences:t.experiences,education:t.education,certificates:t.certificates,source:t.source};
  };
  window.downloadSmartCvV100=downloadTailoredCvV40;
  window.downloadTailoredCvV40=downloadTailoredCvV40;
  window.buildTailoredCvV40=buildTailoredCvV40;

  function remember(jobId){const s=state(),history=Array.isArray(s.history)?s.history:[],job=(talentData?.jobs||[]).find(j=>j.id===jobId);if(!job)return;const a=analysis(job),entry={job_id:job.id,title:job.title,company:job.company_name||null,score:Number(a?.score||0),at:now()};save({last_job_id:jobId,history:[entry,...history.filter(x=>x.job_id!==jobId)].slice(0,8)});}
  async function runAction(action,jobId){if(action==='profile'){window.openTalentModuleV38?.('profile');return;}if(action==='applications'){window.openTalentModuleV38?.('applications');return;}if(action==='jobs'){window.openTalentModuleV38?.('jobs');return;}if(action==='apply'&&typeof window.openSmartApplyV100==='function')return window.openSmartApplyV100(jobId);}
  async function readAgentCv(file){if(!file)return;const host=document.getElementById('talentAgentV40');try{if(host)host.dataset.busy='true';const cv=await window.LutminCvV38?.analyzeFile?.(file,{openReview:false});if(!cv)throw new Error('No pude interpretar el CV.');save({mode:'tailor'});render();showToast?.('CV leído. Elegí una oportunidad para adaptarlo.');}catch(e){console.error(e);showToast?.(e.message||'No pude interpretar el CV.');}finally{if(host)host.dataset.busy='false';}}
  function showAnswer(text){const root=document.getElementById('agentAnswerV100');if(!root)return;root.classList.remove('hidden');root.innerHTML=`<p>${esc(text).replace(/\n/g,'<br>')}</p>`;root.scrollIntoView?.({behavior:'smooth',block:'nearest'});}

  window.askAgentV100=function(e){e?.preventDefault?.();const q=document.getElementById('agentQuestionV100')?.value?.trim()||'';if(!q)return;showAnswer(answerQuestion(q));};
  window.agentAskPresetV100=function(kind){const map={cv:'¿Qué entendiste de mi CV?',gap:'¿Qué me falta para esta búsqueda?',interview:'¿Cómo preparo la entrevista para esta búsqueda?',course:'¿Qué formación encontraste?'};showAnswer(answerQuestion(map[kind]||kind));};
  window.ensureTalentAgentV40=function(){const card=document.getElementById('talentAgentV100');if(!card)return;card.classList.add('agent-v40-card');let host=document.getElementById('talentAgentV40')||document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38');if(!host){host=document.createElement('div');host.id='talentAgentV40';card.appendChild(host);}else host.id='talentAgentV40';render();};
  window.refreshTalentAgentV40=render;window.ensureTalentAgentV39=window.ensureTalentAgentV40;window.refreshTalentAgentV39=render;window.ensureTalentAgentV38=window.ensureTalentAgentV40;window.refreshTalentAgentV38=render;window.ensureTalentAgentV37=window.ensureTalentAgentV40;window.refreshTalentAgentV37=render;
  const oldSelect=window.selectAgentJobV100;if(typeof oldSelect==='function')window.selectAgentJobV100=function(id){const r=oldSelect.apply(this,arguments);if(id){save({last_job_id:id});remember(id);}setTimeout(render,0);return r;};
  window.addEventListener('lutmin:cv-analyzed',()=>setTimeout(render,0));

  document.addEventListener('click',e=>{
    const m=e.target.closest?.('[data-agent-v40-mode]');if(m){e.preventDefault();setMode(m.dataset.agentV40Mode);return;}
    const q=e.target.closest?.('[data-agent-v40-question]');if(q){e.preventDefault();showAnswer(answerQuestion(q.dataset.agentV40Question));return;}
    const up=e.target.closest?.('[data-agent-v40-upload]');if(up){e.preventDefault();document.getElementById('agentCvFileV38')?.click();return;}
    const rv=e.target.closest?.('[data-agent-v40-review]');if(rv){e.preventDefault();const cv=currentCv();if(cv)window.openCvReviewV140?.(cv);return;}
    const dl=e.target.closest?.('[data-agent-v40-download]');if(dl){e.preventDefault();downloadTailoredCvV40(dl.dataset.agentV40Download);return;}
    const apply=e.target.closest?.('[data-agent-v40-apply]');if(apply){e.preventDefault();runAction('apply',apply.dataset.agentV40Apply);return;}
    const a=e.target.closest?.('[data-agent-v40-action]');if(a){e.preventDefault();runAction(a.dataset.agentV40Action,a.dataset.jobId);return;}
  });
  document.addEventListener('change',e=>{if(e.target?.id==='agentCvFileV38')readAgentCv(e.target.files?.[0]);if(e.target?.id==='agentJobSelectV100'){const id=e.target.value;save({last_job_id:id||null,mode:'tailor'});try{window.selectAgentJobV100?.(id)}catch(_){render();}setTimeout(render,0);}});
  document.addEventListener('submit',e=>{if(e.target?.id==='agentQuestionFormV40'){e.preventDefault();window.askAgentV100(e);}});
  window.LutminAgentV40={version:V40_VERSION,answer:answerQuestion,searchCv,cvContext,analysis,render,setMode,buildTailoredCv:buildTailoredCvV40,downloadTailoredCv:downloadTailoredCvV40};window.LutminAgentV39=window.LutminAgentV40;window.LutminAgentV38=window.LutminAgentV40;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(window.ensureTalentAgentV40,0),{once:true});else setTimeout(window.ensureTalentAgentV40,0);
})();
