// =========================================================
// LUTMIN V41.0 · CV PERSONALIZADO POR EVIDENCIA + AGENTE DE EMPLEABILIDAD
// Interpretación estructurada de CV + preguntas determinísticas. API $0.
// No inventa antecedentes, no decide contrataciones y no postula solo.
// =========================================================
(function(){
  'use strict';
  const STORE='lutmin-agent-v41'; const LEGACY_STORE='lutmin-agent-v40';
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

  // V41: la relevancia laboral no se decide por palabras genéricas sueltas.
  // Una experiencia sólo se presenta como relacionada cuando existe evidencia
  // de dominio suficiente en el cargo o en la descripción real del trabajo.
  const V41_GENERIC=new Set('gestion gestionar tecnico tecnica tecnicos tecnicas formacion universitario universitaria ingenieria experiencia conocimientos conocimiento habilidades habilidad requisito requisitos responsabilidad responsabilidades tareas trabajo trabajos puesto puestos empresa empresas equipo equipos cumplimiento orientacion capacidad capacidades profesional profesionales'.split(/\s+/));
  const V41_QUALIFICATION=new Set('universitario universitaria universidad ingenieria ingeniero ingeniera tecnicatura tecnico tecnica titulo graduado graduada estudiante formacion secundario terciario'.split(/\s+/));
  const V41_FAMILIES={
    maintenance:{label:'Mantenimiento',core:true,aliases:['mantenimiento','mantenim','preventivo','correctivo','facility','facilities','edilicio','infraestructura edilicia','servicios generales','electromecanico','electromecanica']},
    electrical:{label:'Electricidad',core:true,aliases:['electricidad','electrico','electrica','electricista','tablero electrico','cableado','baja tension','instalaciones electricas','electromecanico','electromecanica']},
    hvac:{label:'Climatización / refrigeración',core:true,aliases:['refrigeracion','climatizacion','hvac','aire acondicionado','split','frio']},
    plumbing:{label:'Plomería / fontanería',core:true,aliases:['plomeria','fontaneria','sanitario','sanitarios','caneria','cañeria','agua potable']},
    construction:{label:'Obra / construcción',core:true,aliases:['construccion','obra','albanil','albañil','durlock','pintura','carpinteria','cerramientos']},
    logistics:{label:'Logística / stock',core:true,aliases:['logistica','deposito','almacen','stock','reposicion','repositor','picking','expedicion','carga y descarga','inventario']},
    customer:{label:'Atención al cliente',core:true,aliases:['atencion al cliente','atencion al publico','cliente','clientes','cajero','caja']},
    sales:{label:'Ventas',core:true,aliases:['ventas','vendedor','comercial','venta consultiva','presupuesto comercial']},
    admin:{label:'Administración',core:true,aliases:['administracion','administrativo','facturacion','tesoreria','cuentas corrientes']},
    hr:{label:'Recursos Humanos',core:true,aliases:['recursos humanos','rrhh','seleccion','reclutamiento','liquidacion de sueldos','talento']},
    it:{label:'Tecnología / software',core:true,aliases:['software','desarrollo web','desarrollador','programacion','javascript','typescript','react','node','sql','sistemas']},
    quality:{label:'Calidad',core:true,aliases:['calidad','iso 9001','auditoria','sistema de gestion','procedimientos']},
    safety:{label:'Seguridad e higiene',core:true,aliases:['seguridad e higiene','higiene y seguridad','epp','riesgos','trabajo seguro','seguridad laboral']},
    leadership:{label:'Coordinación / liderazgo',soft:true,aliases:['coordinador','coordinacion','supervisor','supervision','jefe','liderazgo','lider de equipo','conduccion de equipos','personal a cargo']},
    operations:{label:'Operación / planificación',soft:true,aliases:['operaciones','operacion','planificacion','planificación','programacion de tareas','ordenes de trabajo','ordenes de trabajo','ot','cronograma']}
  };
  const V41_ADJ={
    maintenance:new Set(['electrical','hvac','plumbing','construction','safety','operations']),
    electrical:new Set(['maintenance','safety']), hvac:new Set(['maintenance','safety']), plumbing:new Set(['maintenance']), construction:new Set(['maintenance','safety']),
    logistics:new Set(['operations']), customer:new Set(['sales']), sales:new Set(['customer']), admin:new Set(['operations']), hr:new Set(['admin']),
    it:new Set(['operations']), quality:new Set(['operations','safety']), safety:new Set(['maintenance','construction','electrical','hvac','quality'])
  };
  function v41Tokens(text){return norm(text).split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)&&!V41_GENERIC.has(x));}
  function v41FamilyHits(text){
    const n=` ${norm(text)} `,out=new Map();
    for(const [key,f] of Object.entries(V41_FAMILIES))for(const alias of f.aliases){const a=norm(alias);if(a&&n.includes(` ${a} `)||a.includes(' ')&&n.includes(a)){out.set(key,(out.get(key)||0)+(a.split(' ').length>1?2:1));}}
    return out;
  }
  function v41Set(map,filter){return new Set([...map.keys()].filter(k=>filter(V41_FAMILIES[k]||{})));}
  function v41Inter(a,b){return [...a].filter(x=>b.has(x));}
  function v41Adjacent(expFamilies,jobFamilies){const out=[];for(const e of expFamilies)for(const j of jobFamilies)if(V41_ADJ[j]?.has(e)||V41_ADJ[e]?.has(j))out.push([e,j]);return out;}
  function v41StrongTerms(text){return [...new Set(v41Tokens(text).filter(x=>!V41_QUALIFICATION.has(x)))].slice(0,32);}
  function v41JobIntent(job){
    const titleHits=v41FamilyHits(job?.title||''),reqHits=v41FamilyHits(`${job?.requirements||''} ${job?.description||''}`);
    let core=v41Set(titleHits,f=>f.core);if(!core.size)core=v41Set(reqHits,f=>f.core);
    const requiredCore=v41Set(reqHits,f=>f.core),soft=new Set([...v41Set(titleHits,f=>f.soft),...v41Set(reqHits,f=>f.soft)]);
    const titleTerms=v41StrongTerms(job?.title||''),strongTerms=v41StrongTerms(`${job?.title||''} ${job?.requirements||''}`);
    const qualifications=[...new Set(norm(`${job?.title||''} ${job?.requirements||''} ${job?.description||''}`).split(/\s+/).filter(x=>V41_QUALIFICATION.has(x)))];
    return {core,requiredCore,soft,titleTerms,strongTerms,qualifications,titleHits,reqHits};
  }
  function v41ExperienceRelation(x,intent){
    const title=String(x.position||x.position_title||''),desc=String(x.description||''),titleHits=v41FamilyHits(title),descHits=v41FamilyHits(desc);
    const titleCore=v41Set(titleHits,f=>f.core),descCore=v41Set(descHits,f=>f.core),allCore=new Set([...titleCore,...descCore]);
    const sameTitle=v41Inter(titleCore,intent.core),sameDesc=v41Inter(descCore,intent.core),adjTitle=v41Adjacent(titleCore,intent.core),adjDesc=v41Adjacent(descCore,intent.core);
    const titleTerms=intent.titleTerms.filter(t=>norm(title).includes(t)),descTerms=intent.strongTerms.filter(t=>norm(desc).includes(t));
    const softHits=new Set([...v41Set(titleHits,f=>f.soft),...v41Set(descHits,f=>f.soft)]),softOverlap=v41Inter(softHits,intent.soft);
    let score=sameTitle.length*72+sameDesc.length*46+adjTitle.length*52+adjDesc.length*30+Math.min(24,titleTerms.length*12)+Math.min(15,descTerms.length*5)+Math.min(10,softOverlap.length*6);
    score=Math.min(100,score);
    const hasTechnical=sameTitle.length||sameDesc.length||adjTitle.length||adjDesc.length;
    const requiredFamily=v41Inter(allCore,intent.requiredCore).length>0;
    let relation='other';
    if(hasTechnical&&score>=42)relation='related';
    else if((requiredFamily||softOverlap.length)&&score>=12)relation='transferable';
    const reasons=[...sameTitle,...sameDesc].map(k=>V41_FAMILIES[k].label);for(const [e,j] of [...adjTitle,...adjDesc])reasons.push(`${V41_FAMILIES[e].label} vinculada a ${V41_FAMILIES[j].label}`);for(const k of softOverlap)reasons.push(V41_FAMILIES[k].label);
    return {relation,score,reasons:[...new Set(reasons)].slice(0,5),families:[...allCore]};
  }
  function v41EvidenceRelation(text,intent,{allowSoft=true,allowAdjacent=true}={}){
    const hits=v41FamilyHits(text),core=v41Set(hits,f=>f.core),soft=v41Set(hits,f=>f.soft),same=v41Inter(core,intent.core),required=v41Inter(core,intent.requiredCore),adj=allowAdjacent?v41Adjacent(core,intent.core):[];
    const exact=intent.strongTerms.filter(t=>norm(text).includes(t));const softOverlap=allowSoft?v41Inter(soft,intent.soft):[];
    let score=same.length*70+required.length*58+adj.length*42+Math.min(28,exact.length*9)+Math.min(16,softOverlap.length*12);score=Math.min(100,score);
    let relation='other';if(score>=35&&(same.length||required.length||adj.length||exact.length>=2))relation='relevant';else if(score>=10&&softOverlap.length)relation='transferable';
    const reasons=[...same,...required].map(k=>V41_FAMILIES[k].label);for(const [e,j] of adj)reasons.push(`${V41_FAMILIES[e].label} vinculada a ${V41_FAMILIES[j].label}`);for(const k of softOverlap)reasons.push(V41_FAMILIES[k].label);
    return {relation,score,reasons:[...new Set(reasons)].slice(0,5),families:[...core]};
  }
  function v41EducationRelation(x,intent){
    const text=`${x.title||''} ${x.institution||''} ${x.level||''}`;const rel=v41EvidenceRelation(text,intent,{allowSoft:false,allowAdjacent:true});
    const n=norm(text),qualHits=intent.qualifications.filter(q=>n.includes(q));if(qualHits.length&&rel.score<45)return {...rel,relation:'relevant',score:45,reasons:[...rel.reasons,'Requisito formativo'].slice(0,5)};return rel;
  }
  function cvEvidenceForJob(cv,intent){
    const experiences=(cv?.experiences||[]).map(x=>{const r=v41ExperienceRelation(x,intent);return {...x,position_title:x.position||x.position_title||'',company_name:x.company||x.company_name||'',start_date:x.start||x.start_date||null,end_date:x.end||x.end_date||null,current_job:!!(x.current||x.current_job),_r:r.score,_relation:r.relation,_reasons:r.reasons,_families:r.families,_source:'cv'};}).sort((a,b)=>(({related:3,transferable:2,other:1}[b._relation]||0)-({related:3,transferable:2,other:1}[a._relation]||0))||b._r-a._r||String(b.start_date||'').localeCompare(String(a.start_date||'')));
    const skills=(cv?.skills||[]).map(x=>{const r=v41EvidenceRelation(`${x.skill||''} ${x.excerpt||''}`,intent);return {...x,level:Number(x.level||3),_r:r.score,_relation:r.relation,_reasons:r.reasons,_families:r.families,_source:'cv'};}).sort((a,b)=>b._r-a._r);
    const education=(cv?.education||[]).map(x=>{const r=v41EducationRelation(x,intent);return {...x,_r:r.score,_relation:r.relation,_reasons:r.reasons,_families:r.families,_source:'cv'};}).sort((a,b)=>b._r-a._r);
    return {experiences,skills,education};
  }
  function mergeEvidence(primary,secondary,keyFn){const seen=new Set(),out=[];for(const x of [...(primary||[]),...(secondary||[])]){const key=norm(keyFn(x));if(key&&seen.has(key))continue;if(key)seen.add(key);out.push(x);}return out;}
  function enhancedAnalysis(job){
    const base=baseAnalysis?baseAnalysis(job):null;if(!job)return base;
    const cv=cvContext(),intent=v41JobIntent(job),ev=cvEvidenceForJob(cv,intent);
    // También se consideran certificados y datos estructurados del perfil, pero cada
    // elemento recibe su propia clasificación; no se hereda relevancia por proximidad.
    const profileSkills=(talentData?.skills||[]).map(x=>{const r=v41EvidenceRelation(x.skill||'',intent);return {...x,_r:r.score,_relation:r.relation,_reasons:r.reasons,_families:r.families,_source:'profile'};});
    const certs=(talentData?.certificates||[]).map(x=>{const r=v41EvidenceRelation(`${x.course_title||''} ${x.description||''}`,intent,{allowSoft:false,allowAdjacent:true});return {...x,_r:r.score,_relation:r.relation,_reasons:r.reasons,_families:r.families,_source:'certificate'};}).sort((a,b)=>b._r-a._r||String(b.issued_at||'').localeCompare(String(a.issued_at||'')));
    const experiences=mergeEvidence(ev.experiences,base?.experiences||[],x=>`${x.position_title||x.position||''}|${x.company_name||x.company||''}|${x.start_date||x.start||''}`).map(x=>{
      if(x._relation)return x;const r=v41ExperienceRelation(x,intent);return {...x,_r:r.score,_relation:r.relation,_reasons:r.reasons};
    }).sort((a,b)=>(({related:3,transferable:2,other:1}[b._relation]||0)-({related:3,transferable:2,other:1}[a._relation]||0))||Number(b._r||0)-Number(a._r||0)||String(b.start_date||'').localeCompare(String(a.start_date||'')));
    const skills=mergeEvidence(ev.skills,profileSkills,x=>x.skill||'').map(x=>{if(x._relation)return x;const r=v41EvidenceRelation(`${x.skill||''} ${x.excerpt||''}`,intent);return {...x,_r:r.score,_relation:r.relation,_reasons:r.reasons};}).sort((a,b)=>Number(b._r||0)-Number(a._r||0));
    const education=ev.education;
    const relatedExp=experiences.filter(x=>x._relation==='related'),transferExp=experiences.filter(x=>x._relation==='transferable');
    const relevantSkills=skills.filter(x=>x._relation==='relevant'),transferSkills=skills.filter(x=>x._relation==='transferable'),relevantCerts=certs.filter(x=>x._relation==='relevant'),relevantEdu=education.filter(x=>x._relation==='relevant');
    const familyEvidence=new Set();for(const x of [...relatedExp,...relevantSkills,...relevantCerts,...relevantEdu])for(const f of (x._families||[]))familyEvidence.add(f);
    const missing=[];for(const f of intent.core)if(!familyEvidence.has(f))missing.push(V41_FAMILIES[f]?.label||f);
    const educationText=norm(education.map(x=>`${x.title||''} ${x.level||''}`).join(' '));for(const q of intent.qualifications)if(!educationText.includes(q))missing.push(q);
    const matched=[...new Set([...relatedExp.flatMap(x=>x._reasons||[]),...relevantSkills.map(x=>x.skill),...relevantCerts.map(x=>x.course_title),...relevantEdu.map(x=>x.title)])].filter(Boolean).slice(0,12);
    const score=Math.min(100,Math.round(Math.min(45,relatedExp.reduce((s,x)=>s+Math.min(25,Number(x._r||0)/3),0))+Math.min(22,relevantSkills.length*5+transferSkills.length*2)+Math.min(20,relevantCerts.length*8+relevantEdu.length*7)+Math.min(8,transferExp.length*3)));
    const best=relatedExp[0]||null;
    const questions=[
      best?`En tu CV figura ${best.position_title}${best.company_name?` en ${best.company_name}`:''} como experiencia relacionada. ¿Qué resultado concreto lograste allí que se vincule con ${job.title}?`:`No encuentro experiencia laboral directamente relacionada con ${job.title}. ¿Tenés alguna experiencia real, práctica o proyecto que no esté documentado en tu CV?`,
      missing[0]?`No encuentro evidencia clara de ${missing[0]}. Si realmente tenés experiencia con ese tema, ¿en qué trabajo, curso o proyecto la adquiriste?`:`¿Qué parte de esta oportunidad querés poder demostrar con un ejemplo concreto?`,
      relatedExp.length?`¿Qué responsabilidad de ${job.title} se parece más a algo que hiciste en ${relatedExp[0].company_name||'tu experiencia relacionada'}?`:`¿Qué habilidad transferible de tus trabajos anteriores podría servir para esta oportunidad sin presentarla como experiencia técnica?`,
      `¿Qué evidencia verificable de tu CV respalda mejor esta postulación?`,
      `¿Qué dato del CV conviene aclarar antes de enviar esta postulación?`
    ];
    return {...(base||{}),job,score,matched,missing:[...new Set(missing)].slice(0,10),experiences,skills,education,certs,questions,relatedCourses:base?.relatedCourses||[],intent,experience_groups:{related:relatedExp,transferable:transferExp,other:experiences.filter(x=>x._relation==='other')},skill_groups:{relevant:relevantSkills,transferable:transferSkills,other:skills.filter(x=>x._relation==='other')},certificate_groups:{relevant:relevantCerts,other:certs.filter(x=>x._relation!=='relevant')},education_groups:{relevant:relevantEdu,other:education.filter(x=>x._relation!=='relevant')},cv_source:!!currentCv()};
  }
  if(baseAnalysis)window.buildAgentAnalysisV100=enhancedAnalysis;
  function analysis(job){try{return enhancedAnalysis(job)}catch(e){console.error('[Lutmin V41] análisis',e);return baseAnalysis?.(job)||null}}

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
      const a=analysis(job),best=(a?.experience_groups?.related||[]).slice(0,3);return `Para una entrevista de ${job.title}, usaría evidencia concreta de estas experiencias:
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
    if(job){const a=analysis(job),rel=a?.experience_groups?.related||[];return `Para ${job.title}, ${rel.length?`encuentro ${rel.length} experiencia(s) laboral(es) relacionada(s)`: 'no encuentro experiencia laboral directamente relacionada'}. Evidencia adicional útil: ${(a?.matched||[]).slice(0,7).join(', ')||'ninguna evidencia específica fuerte todavía'}. Sin evidencia clara: ${(a?.missing||[]).slice(0,6).join(', ')||'sin brechas principales'}. No convierto otras experiencias en experiencia técnica por similitud de palabras.`;}
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
  const V41_VERSION='41.0';
  function jobOptions(selected){const jobs=talentData?.jobs||[];return `<option value="">Elegí una oportunidad</option>${jobs.map(j=>`<option value="${esc(j.id)}" ${j.id===selected?'selected':''}>${esc(j.title)} · ${esc(j.company_name||'Lutmin')}</option>`).join('')}`;}
  function mode(){const s=state();return s.mode||'tailor';}
  function setMode(next){save({mode:next||'tailor'});render();}
  function sourceSummary(cv,ev){if(cv){const career=cv.career||{};return `${cv.experiences?.length||0} experiencias${career.years?` · ${career.years} años de trayectoria`:''} · ${cv.education?.length||0} formaciones · ${cv.skills?.length||0} competencias`;}return `${ev.experiences||0} experiencias · ${ev.skills||0} competencias · ${ev.certificates||0} certificados cargados en tu perfil`;}

  function normalizeExperience(x){return {company_name:x.company_name||x.company||'',position_title:x.position_title||x.position||'',start_date:x.start_date||x.start||null,end_date:x.end_date||x.end||null,current_job:!!(x.current_job||x.current),description:x.description||'',relevance:Number(x._r||x.relevance||0),relation:x._relation||x.relation||'other',reasons:x._reasons||x.reasons||[]};}
  function normalizeEducation(x){return {institution:x.institution||'',title:x.title||'',level:x.level||'',start_date:x.start_date||x.start||null,end_date:x.end_date||x.end||null,current:!!(x.current||x.current_job),relevance:Number(x._r||x.relevance||0),relation:x._relation||x.relation||'other',reasons:x._reasons||x.reasons||[]};}
  function v41DateSort(a,b){return String(b.start_date||b.end_date||'').localeCompare(String(a.start_date||a.end_date||''));}
  function v41SafeTargetSummary(t){
    const rel=t.experience_groups.related,skills=t.skill_groups.relevant,certs=t.certificate_groups.relevant,edu=t.education_groups.relevant;
    if(rel.length){const roles=[...new Set(rel.slice(0,2).map(x=>x.position_title).filter(Boolean))];const ev=[...skills.slice(0,3).map(x=>x.skill),...certs.slice(0,2).map(x=>x.course_title)].filter(Boolean);return `Para esta oportunidad se prioriza experiencia laboral documentada en ${roles.join(' y ')}${ev.length?`, respaldada por ${ev.join(', ')}`:''}.`;}
    const evidence=[...certs.slice(0,2).map(x=>x.course_title),...edu.slice(0,2).map(x=>x.title),...skills.slice(0,4).map(x=>x.skill)].filter(Boolean);
    if(evidence.length)return `Para esta oportunidad se prioriza evidencia formativa y competencias documentadas: ${evidence.join(', ')}. La experiencia laboral se mantiene separada sin presentarla como experiencia directa en el puesto.`;
    return '';
  }
  function buildTailoredCvV41(job){
    if(!job)return null;const a=analysis(job)||{},cv=cvContext(),p=talentData?.profile||{},fields=cv?.fields||{};
    const allExperiences=(a.experiences||cv?.experiences||[]).map(normalizeExperience);
    const related=allExperiences.filter(x=>x.relation==='related').sort((x,y)=>y.relevance-x.relevance||v41DateSort(x,y));
    const transferable=allExperiences.filter(x=>x.relation==='transferable').sort((x,y)=>y.relevance-x.relevance||v41DateSort(x,y));
    const other=allExperiences.filter(x=>x.relation==='other').sort(v41DateSort);
    const rawSkills=(a.skills||cv?.skills||[]).map(x=>({skill:x.skill||'',level:Number(x.level||3),relevance:Number(x._r||x.relevance||0),relation:x._relation||x.relation||'other',excerpt:x.excerpt||'',reasons:x._reasons||[]})).filter(x=>x.skill);
    const relevantSkills=rawSkills.filter(x=>x.relation==='relevant').sort((x,y)=>y.relevance-x.relevance),transferSkills=rawSkills.filter(x=>x.relation==='transferable').sort((x,y)=>y.relevance-x.relevance);
    const allEducation=(a.education||cv?.education||educationRows()||[]).map(normalizeEducation);const relevantEducation=allEducation.filter(x=>x.relation==='relevant').sort((x,y)=>y.relevance-x.relevance),otherEducation=allEducation.filter(x=>x.relation!=='relevant').sort(v41DateSort);
    const allCerts=(a.certs||talentData?.certificates||[]).map(c=>({course_title:c.course_title||'',duration_hours:c.duration_hours||null,score:c.score??null,code:c.code||'',issued_at:c.issued_at||null,relevance:Number(c._r||c.relevance||0),relation:c._relation||c.relation||'other',reasons:c._reasons||[]}));const relevantCerts=allCerts.filter(x=>x.relation==='relevant').sort((x,y)=>y.relevance-x.relevance),otherCerts=allCerts.filter(x=>x.relation!=='relevant').sort((x,y)=>String(y.issued_at||'').localeCompare(String(x.issued_at||'')));
    const headline=fields.headline||p.headline||p.desired_role||allExperiences[0]?.position_title||'Perfil profesional';const bio=fields.bio||p.bio||'';
    const t={version:'LUTMIN-CV-TAILORED-V41',generated_at:now(),job:{id:job.id,title:job.title,company_name:job.company_name||'Lutmin',location:job.location||''},source:{name:currentCv()?.file?.name||'Perfil Lutmin',cv_loaded:!!currentCv()},person:{name:currentLutminUser?.fullName||'Perfil profesional',headline,bio,email:fields.email||currentLutminUser?.email||'',phone:fields.phone||p.phone||'',city:fields.city||p.city||'',province:fields.province||p.province||'',linkedin:fields.linkedin||fields.linkedin_url||p.linkedin_url||''},experience_groups:{related,transferable,other},skill_groups:{relevant:relevantSkills,transferable:transferSkills},education_groups:{relevant:relevantEducation,other:otherEducation},certificate_groups:{relevant:relevantCerts,other:otherCerts},score:Number(a.score||0),missing:a.missing||[],matched:a.matched||[]};
    t.experiences=[...related,...transferable,...other];t.skills=[...relevantSkills,...transferSkills];t.education=[...relevantEducation,...otherEducation];t.certificates=[...relevantCerts,...otherCerts];t.target_summary=v41SafeTargetSummary(t);
    t.strategy=related.length?'experience-first':(relevantCerts.length||relevantEducation.length||relevantSkills.length)?'evidence-first':'honest-general';
    t.changes=related.length?[`Separa ${related.length} experiencia(s) relacionada(s) del resto.`,`Muestra primero sólo competencias con evidencia para esta oportunidad.`,`Mantiene la experiencia no relacionada en una sección aparte.`]:[`No presenta ninguna experiencia como relacionada si no hay evidencia suficiente.`,(relevantCerts.length||relevantEducation.length||relevantSkills.length)?'Sube primero formación, certificaciones o competencias realmente relacionadas.':'Mantiene un CV general porque no hay evidencia específica suficiente.',`Conserva ${other.length+transferable.length} experiencia(s) laboral(es) como "Otra experiencia", sin disfrazarlas de experiencia técnica.`];
    return t;
  }

  function v41ExpList(rows,empty){return rows.length?rows.slice(0,4).map(x=>`<article><div><strong>${esc(x.position_title||'Experiencia')}</strong><p>${esc(x.company_name||'Empresa por confirmar')}</p>${x.reasons?.length?`<small>${esc(x.reasons.join(' · '))}</small>`:''}</div></article>`).join(''):`<p class="agent-v41-none">${esc(empty)}</p>`;}
  function tailoredPreviewHtml(job){
    if(!job)return `<div class="agent-v40-empty"><i class="fa-solid fa-arrow-up"></i><div><strong>Elegí la oportunidad</strong><p>Voy a comparar la búsqueda contra evidencia concreta de tu CV y preparar una versión distinta sólo si hay algo real para priorizar.</p></div></div>`;
    const t=buildTailoredCvV41(job),cv=currentCv(),rel=t.experience_groups.related,transfer=t.experience_groups.transferable,other=t.experience_groups.other;const evidence=[...t.certificate_groups.relevant.map(x=>x.course_title),...t.education_groups.relevant.map(x=>x.title),...t.skill_groups.relevant.map(x=>x.skill)].filter(Boolean).slice(0,8);
    const verdict=rel.length?`<div class="agent-v41-verdict is-ok"><i class="fa-solid fa-circle-check"></i><div><strong>Encontré ${rel.length} experiencia${rel.length===1?'':'s'} laboral${rel.length===1?'':'es'} relacionada${rel.length===1?'':'s'}.</strong><p>Estas sí pueden presentarse como experiencia relevante para ${esc(job.title)}.</p></div></div>`:`<div class="agent-v41-verdict is-warning"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>No encontré experiencia laboral directamente relacionada con ${esc(job.title)}.</strong><p>No voy a presentar atención al público, stock u otros trabajos como si fueran experiencia en el puesto. Esas experiencias quedan abajo, separadas.</p></div></div>`;
    return `<div class="agent-v40-tailor-card agent-v41-tailor-card">
      <div class="agent-v40-tailor-head"><div><span>CV PERSONALIZADO PARA ESTA POSTULACIÓN</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Lutmin')}${job.location?` · ${esc(job.location)}`:''}</p></div><i class="fa-solid fa-file-circle-check"></i></div>
      ${verdict}
      ${!cv?`<div class="agent-v40-cv-warning"><i class="fa-solid fa-circle-info"></i><div><strong>Estoy trabajando con tu perfil. Para una personalización más precisa, cargá el CV original.</strong><button type="button" data-agent-v40-upload>Cargar CV ahora</button></div></div>`:''}
      <div class="agent-v41-evidence-grid">
        <div class="is-related"><span>Experiencia relacionada</span>${v41ExpList(rel,'Ninguna experiencia laboral documentada coincide de forma suficiente con esta búsqueda.')}</div>
        <div class="is-evidence"><span>Evidencia que sí aporta</span>${evidence.length?`<div class="agent-v40-tags is-skills">${evidence.map(x=>`<b>${esc(x)}</b>`).join('')}</div>`:'<p class="agent-v41-none">No encontré formación, certificaciones o competencias específicas suficientes para destacar.</p>'}</div>
        <div class="is-other"><span>Otra experiencia laboral</span>${v41ExpList([...transfer,...other],'No hay otras experiencias estructuradas.')}</div>
      </div>
      <div class="agent-v41-changes"><strong>Qué cambia realmente en este CV</strong>${t.changes.map(x=>`<div><i class="fa-solid fa-check"></i><span>${esc(x)}</span></div>`).join('')}</div>
      <div class="agent-v40-main-actions"><button type="button" class="agent-v40-download" data-agent-v40-download="${esc(job.id)}"><i class="fa-solid fa-file-pdf"></i><span><strong>Generar CV personalizado</strong><small>La estructura cambia según la evidencia real de esta búsqueda</small></span></button><button type="button" class="agent-v40-apply" data-agent-v40-apply="${esc(job.id)}"><i class="fa-solid fa-paper-plane"></i> Preparar postulación con este CV</button></div>
      <div class="agent-v40-safety"><i class="fa-solid fa-shield-halved"></i><span>No inventa experiencia ni convierte habilidades transferibles en experiencia técnica. No decide contrataciones.</span></div>
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
  async function downloadTailoredCvV41(jobId=null){
    const job=(talentData?.jobs||[]).find(x=>x.id===(jobId||state().last_job_id));if(!job){showToast?.('Elegí una oportunidad primero.');return false;}
    const snap=buildTailoredCvV41(job);if(!snap){showToast?.('No pude preparar el CV.');return false;}const ok=await ensureJsPdfV40();if(!ok){showToast?.('No se pudo cargar el generador de PDF.');return false;}
    try{
      const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});let y=17;const page=(need=18)=>{if(y+need>278){doc.addPage();y=18;}};const section=(title)=>{page(14);doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.setFontSize(10);doc.text(title,18,y);y+=6;};
      const expBlock=(x)=>{page(22);doc.setFont('helvetica','bold');doc.setTextColor(45);doc.setFontSize(9);doc.text(`${x.position_title||'Experiencia'}${x.company_name?' · '+x.company_name:''}`,18,y);y+=4.5;doc.setFont('helvetica','normal');doc.setTextColor(105);doc.setFontSize(7.5);const dates=[x.start_date||'',x.current_job?'Actualidad':x.end_date||''].filter(Boolean).join(' — ');if(dates){doc.text(dates,18,y);y+=4;}if(x.description){doc.setTextColor(70);doc.setFontSize(8);y=addPdfText(doc,x.description,18,y,171,3.7)+4;}else y+=2;};
      doc.setFont('helvetica','bold');doc.setFontSize(21);doc.setTextColor(10,24,79);doc.text(snap.person.name,18,y);y+=7;doc.setFontSize(11);doc.setTextColor(37,99,235);doc.text(snap.person.headline||'Perfil profesional',18,y);y+=5;
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(92);const contact=[snap.person.email,snap.person.phone,[snap.person.city,snap.person.province].filter(Boolean).join(', ')].filter(Boolean).join(' · ');if(contact){doc.text(contact,18,y);y+=4;}doc.setTextColor(110);doc.text(`Postulación: ${job.title}${job.company_name?' · '+job.company_name:''}`,18,y);y+=8;
      if(snap.target_summary){section('Perfil para esta oportunidad');doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8.5);y=addPdfText(doc,snap.target_summary,18,y,174,4)+5;}else if(snap.person.bio){section('Perfil profesional');doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8.5);y=addPdfText(doc,snap.person.bio,18,y,174,4)+5;}
      const relSkills=snap.skill_groups.relevant,transSkills=snap.skill_groups.transferable,relCert=snap.certificate_groups.relevant,relEdu=snap.education_groups.relevant;
      if(relSkills.length||relCert.length||relEdu.length){section('Evidencia relevante para esta oportunidad');doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8);const rows=[];if(relSkills.length)rows.push(`Competencias: ${relSkills.slice(0,10).map(x=>x.skill).join(' · ')}`);if(relCert.length)rows.push(`Certificaciones: ${relCert.slice(0,6).map(x=>x.course_title).join(' · ')}`);if(relEdu.length)rows.push(`Formación: ${relEdu.slice(0,5).map(x=>`${x.title}${x.institution?' · '+x.institution:''}`).join(' · ')}`);for(const row of rows)y=addPdfText(doc,row,18,y,174,4)+3;}
      if(snap.experience_groups.related.length){section('Experiencia relacionada');for(const x of snap.experience_groups.related)expBlock(x);}
      if(snap.experience_groups.transferable.length){section('Experiencia con habilidades transferibles');for(const x of snap.experience_groups.transferable)expBlock(x);}
      if(snap.experience_groups.other.length){section(snap.experience_groups.related.length||snap.experience_groups.transferable.length?'Otra experiencia laboral':'Experiencia laboral');for(const x of snap.experience_groups.other)expBlock(x);}
      if(snap.education.length){section('Formación');for(const x of snap.education){page(12);doc.setFont('helvetica','bold');doc.setTextColor(50);doc.setFontSize(8.5);doc.text(`${x.title||'Formación'}${x.institution?' · '+x.institution:''}`,18,y);y+=4;doc.setFont('helvetica','normal');doc.setTextColor(105);doc.setFontSize(7.5);const dates=[x.start_date||'',x.current?'Actualidad':x.end_date||''].filter(Boolean).join(' — ');if(dates)doc.text(dates,18,y);y+=5;}}
      if(snap.certificates.length){section(snap.certificate_groups.relevant.length?'Certificaciones adicionales':'Certificaciones');doc.setFont('helvetica','normal');doc.setTextColor(70);doc.setFontSize(8);const rows=snap.certificate_groups.relevant.length?snap.certificate_groups.other:snap.certificates;for(const c of rows.slice(0,10)){page(7);y=addPdfText(doc,`• ${c.course_title}${c.duration_hours?' · '+c.duration_hours+' h':''}${c.code?' · '+c.code:''}`,18,y,171,3.7)+1;}}
      if(transSkills.length){section('Competencias transferibles');doc.setFont('helvetica','normal');doc.setTextColor(65);doc.setFontSize(8);y=addPdfText(doc,transSkills.slice(0,8).map(x=>x.skill).join(' · '),18,y,174,4)+3;}
      const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(6.5);doc.setTextColor(145);doc.text(`Lutmin · CV personalizado para ${job.title} · sólo evidencia documentada · pág. ${p}/${pages}`,18,289);}const slug=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();doc.save(`CV_${slug(snap.person.name||'lutmin')}_${slug(job.title||'oportunidad')}.pdf`);save({last_job_id:job.id,last_cv_download:{job_id:job.id,at:now()}});showToast?.('CV personalizado generado.');return true;
    }catch(e){console.error('[Lutmin V41] CV personalizado',e);showToast?.('No pude generar el CV personalizado. Revisá la consola para más detalle.');return false;}
  }
  // La postulación guarda exactamente la misma estructura que ve y descarga el candidato.
  const legacySnapshotV100=typeof window.buildCvSnapshotV100==='function'?window.buildCvSnapshotV100:null;
  window.buildCvSnapshotV100=function(a){
    const job=a?.job||selectedJob(),t=job?buildTailoredCvV41(job):null;if(!t)return legacySnapshotV100?legacySnapshotV100(a):{};
    return {version:t.version,job:t.job,generated_at:t.generated_at,profile:{headline:t.person.headline,city:t.person.city||null,province:t.person.province||null,availability:talentData?.profile?.availability||null,willing_travel:!!talentData?.profile?.willing_travel,bio:t.person.bio||null},tailoring:{strategy:t.strategy,target_summary:t.target_summary,changes:t.changes,has_related_experience:t.experience_groups.related.length>0,related_experience_count:t.experience_groups.related.length},focus_terms:t.matched,matching_terms:t.matched,gap_terms:t.missing,skills:t.skills,experiences:t.experiences,experience_groups:t.experience_groups,skill_groups:t.skill_groups,education:t.education,education_groups:t.education_groups,certificates:t.certificates,certificate_groups:t.certificate_groups,source:t.source};
  };
  window.downloadSmartCvV100=downloadTailoredCvV41;window.downloadTailoredCvV40=downloadTailoredCvV41;window.downloadTailoredCvV41=downloadTailoredCvV41;window.buildTailoredCvV40=buildTailoredCvV41;window.buildTailoredCvV41=buildTailoredCvV41;

  // También corregimos el modal histórico de postulación para que no prometa
  // "ordenar experiencia" cuando no existe experiencia relacionada.
  if(typeof window.openSmartApplyV100==='function'||typeof openSmartApplyV100==='function'){
    window.openSmartApplyV100=function(jobId){
      const job=(talentData?.jobs||[]).find(x=>x.id===jobId);if(!job)return;if(talentData?.profile?.approval_status!=='approved')return showToast?.('Completá tu perfil profesional para habilitar postulaciones automáticamente.');
      const a=analysis(job),snap=buildTailoredCvV41(job);pendingSmartApplicationV100={job,analysis:a,snapshot:window.buildCvSnapshotV100(a)};const m=ensureV100Modal('smartApplyModalV100','max-w-4xl'),b=m.querySelector('[data-v100-body]');const rel=snap.experience_groups.related.length;
      b.innerHTML=`<p class="text-[10px] uppercase tracking-widest font-black text-lutmin-light">Agente Lutmin · postulación asistida</p><h2 class="mt-2 text-2xl sm:text-3xl font-black text-lutmin-dark">${esc(job.title)}</h2><p class="mt-1 text-sm text-slate-500">${esc(job.company_name||'Lutmin')} · ${esc(job.location||'Ubicación a definir')}</p><div class="mt-5 rounded-2xl ${rel?'bg-emerald-50 border-emerald-100':'bg-amber-50 border-amber-100'} border p-4"><p class="font-extrabold text-sm text-lutmin-dark">${rel?`Encontré ${rel} experiencia(s) laboral(es) relacionada(s).`:'No encontré experiencia laboral directamente relacionada.'}</p><p class="mt-2 text-xs text-slate-600">${esc(snap.target_summary||'El CV conservará tu información real y no presentará experiencia no relacionada como si fuera técnica.')}</p></div><div class="mt-4 rounded-2xl bg-slate-50 p-4"><p class="font-extrabold text-sm text-lutmin-dark">Cómo se enviará tu CV</p><div class="mt-2 space-y-1 text-xs text-slate-600">${snap.changes.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div></div><label class="block mt-5 text-xs font-bold text-slate-600">Mensaje opcional</label><textarea id="smartApplyMessageV100" rows="4" class="mt-2 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Podés agregar una breve presentación personal."></textarea><div class="mt-5 grid sm:grid-cols-3 gap-2"><button onclick="downloadSmartCvV100('${esc(job.id)}')" class="py-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm"><i class="fa-solid fa-file-pdf mr-2"></i>Ver CV personalizado</button><button onclick="hideV100Modal('smartApplyModalV100')" class="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">Cancelar</button><button onclick="confirmSmartApplyV100()" class="py-3 rounded-xl bg-lutmin-dark text-white font-extrabold text-sm"><i class="fa-solid fa-paper-plane mr-2"></i>Enviar postulación</button></div>`;showV100Modal('smartApplyModalV100');
    };
    try{openSmartApplyV100=window.openSmartApplyV100;}catch(_){ }
  }

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
    const dl=e.target.closest?.('[data-agent-v40-download]');if(dl){e.preventDefault();downloadTailoredCvV41(dl.dataset.agentV40Download);return;}
    const apply=e.target.closest?.('[data-agent-v40-apply]');if(apply){e.preventDefault();runAction('apply',apply.dataset.agentV40Apply);return;}
    const a=e.target.closest?.('[data-agent-v40-action]');if(a){e.preventDefault();runAction(a.dataset.agentV40Action,a.dataset.jobId);return;}
  });
  document.addEventListener('change',e=>{if(e.target?.id==='agentCvFileV38')readAgentCv(e.target.files?.[0]);if(e.target?.id==='agentJobSelectV100'){const id=e.target.value;save({last_job_id:id||null,mode:'tailor'});try{window.selectAgentJobV100?.(id)}catch(_){render();}setTimeout(render,0);}});
  document.addEventListener('submit',e=>{if(e.target?.id==='agentQuestionFormV40'){e.preventDefault();window.askAgentV100(e);}});
  window.LutminAgentV41={version:V41_VERSION,answer:answerQuestion,searchCv,cvContext,analysis,render,setMode,buildTailoredCv:buildTailoredCvV41,downloadTailoredCv:downloadTailoredCvV41};window.LutminAgentV40=window.LutminAgentV41;window.LutminAgentV39=window.LutminAgentV41;window.LutminAgentV38=window.LutminAgentV41;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(window.ensureTalentAgentV40,0),{once:true});else setTimeout(window.ensureTalentAgentV40,0);
})();
