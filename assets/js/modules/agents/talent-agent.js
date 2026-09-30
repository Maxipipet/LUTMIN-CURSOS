// =========================================================
// LUTMIN V46.0 · AGENTE DE POSTULACIÓN + SEGUIMIENTO OPERATIVO
// Interpretación estructurada de CV + preguntas determinísticas. API $0.
// No inventa antecedentes, no decide contrataciones y no postula solo.
// =========================================================
(function(){
  'use strict';
  const STORE='lutmin-agent-v45'; const LEGACY_STORE='lutmin-agent-v44';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>(window.LutminCvV43||window.LutminCvV42||window.LutminCvV38)?.normalize?.(v)||String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+#. ]+/g,' ').replace(/\s+/g,' ').trim();
  const now=()=>new Date().toISOString();
  const STOP=new Set('que como cual cuales donde cuando cuanto cuantos tengo tiene mi mis del de la el los las un una y o en para por con sin sobre hacia desde experiencia cv curriculum trabajo puesto empresa formacion formación habilidad habilidades competencia competencias'.split(/\s+/));

  function state(){try{const current=localStorage.getItem(STORE),legacy=localStorage.getItem(LEGACY_STORE);return JSON.parse(current||legacy||'{}')||{}}catch(_){return{}}}
  function save(patch){try{localStorage.setItem(STORE,JSON.stringify({...state(),...patch,updated_at:now()}))}catch(_){ }}

  let pendingSmartApplicationV100=null;
  function dossierApi(){return window.LutminDossierV46||window.LutminDossierV45||null;}
  function simpleHash(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36);}
  function externalJobs(){return dossierApi()?.externalJobs?.()||[];}
  function externalJob(){return dossierApi()?.selectedExternal?.()||null;}
  function jobById(id){
    const internal=(talentData?.jobs||[]).find(j=>j.id===id);
    if(internal)return internal;
    return externalJobs().find(x=>x.id===id)||null;
  }
  function sourceMode(){return state().job_source==='external'?'external':'lutmin';}
  function selectedJob(){
    if(sourceMode()==='external')return externalJob();
    const id=document.getElementById('agentJobSelectV100')?.value||state().last_job_id;
    return jobById(id)||null;
  }
  function setJobSource(source){save({job_source:source==='external'?'external':'lutmin',mode:'tailor'});render();}
  function parseExternalJobForm(){
    const title=document.getElementById('agentExternalTitleV44')?.value?.trim()||'';
    const company=document.getElementById('agentExternalCompanyV44')?.value?.trim()||'';
    const location=document.getElementById('agentExternalLocationV44')?.value?.trim()||'';
    const description=document.getElementById('agentExternalDescriptionV44')?.value?.trim()||'';
    if(!title||description.length<25){showToast?.('Ingresá el puesto y pegá una descripción de la oportunidad.');return null;}
    const current=externalJob();const same=current&&current.title===title&&current.company_name===(company||'Oportunidad externa');
    const id=same?current.id:`external-${simpleHash(`${title}|${company}|${description}`)}`;
    const job={id,title,company_name:company||'Oportunidad externa',location,description,requirements:description,status:current?.status||'saved',external:true};
    const saved=dossierApi()?.upsertExternal?.(job)||job;
    save({job_source:'external',last_job_id:saved.id,mode:'tailor'});
    return saved;
  }

  function ensureV100Modal(id,max='max-w-4xl'){
    let m=document.getElementById(id);if(m)return m;
    m=document.createElement('div');m.id=id;m.className='hidden fixed inset-0 z-[180] bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center';
    m.innerHTML=`<div class="w-full ${max} bg-white rounded-[2rem] shadow-2xl max-h-[94vh] overflow-y-auto modal-scroll relative"><button type="button" data-agent-modal-close="${esc(id)}" class="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 z-10"><i class="fa-solid fa-xmark"></i></button><div data-v100-body class="p-6 sm:p-9"></div></div>`;
    document.body.appendChild(m);return m;
  }
  function showV100Modal(id){document.getElementById(id)?.classList.remove('hidden');}
  function hideV100Modal(id){document.getElementById(id)?.classList.add('hidden');}
  window.ensureV100Modal=window.ensureV100Modal||ensureV100Modal;
  window.showV100Modal=window.showV100Modal||showV100Modal;
  window.hideV100Modal=window.hideV100Modal||hideV100Modal;
  function profileScore(){try{return calculateTalentProfileStrength(talentData?.profile||{},talentData?.skills||[],talentData?.experiences||[],talentData?.certificates||[])}catch(_){return{score:0,missing:[]}}}
  function currentCv(){return (window.LutminCvV43||window.LutminCvV42||window.LutminCvV38)?.snapshot?.()||null;}
  function educationRows(){try{return Array.isArray(v140State?.education)?v140State.education:[]}catch(_){return[]}}
  function appFor(job){return (talentData?.applications||[]).find(a=>a.job_id===job?.id)||null;}
  function upcomingInterview(job){const app=appFor(job),rows=talentData?.applicationDetails?.interviews||[];return rows.find(i=>(!app||i.application_id===app.id)&&(!i.scheduled_at||new Date(i.scheduled_at)>=new Date()))||null;}
  function evidenceCounts(){return {skills:(talentData?.skills||[]).length,experiences:(talentData?.experiences||[]).length,certificates:(talentData?.certificates||[]).length};}

  function structuredCvFallback(){
    const ex=(talentData?.experiences||[]).map(x=>({position:x.position_title||'',company:x.company_name||'',start:x.start_date||null,end:x.end_date||null,current:!!x.current_job,description:x.description||'',confidence:1,needs_company:false}));
    const edu=educationRows().map(x=>({institution:x.institution,title:x.title,start:x.start_date,end:x.end_date,current:!!x.current,level:x.level||'',confidence:1}));
    const skills=(talentData?.skills||[]).map(x=>({skill:x.skill,confidence:1,kind:'confirmed',excerpt:x.skill}));
    const career=(window.LutminCvV43||window.LutminCvV42||window.LutminCvV38)?.careerSummary?.(ex)||{years:0,roles:ex.length,companies:new Set(ex.map(x=>norm(x.company)).filter(Boolean)).size};
    const p=talentData?.profile||{};
    return {file:null,parser:'profile-structured',quality:{score:100,warnings:[],experience_confidence:100},career,experiences:ex,education:edu,courses:[],skills,fields:{headline:p.headline||'',bio:p.bio||'',city:p.city||'',province:p.province||'',email:'',phone:'',linkedin:p.linkedin_url||''},sections:[],text:[p.headline,p.bio,...ex.map(x=>`${x.position} ${x.company} ${x.description}`),...skills.map(x=>x.skill),...edu.map(x=>`${x.title} ${x.institution}`)].join('\n')};
  }
  function cvContext(){return currentCv()||structuredCvFallback();}
  function engineV42(){return window.LutminTailorV45||LutminTailorV44||window.LutminTailorV43||window.LutminTailorV42||null;}
  let tailorLoadPromise=null;
  async function ensureTailorV46(){if(engineV42())return engineV42();if(tailorLoadPromise)return tailorLoadPromise;tailorLoadPromise=(async()=>{const ok=await window.LutminModules?.ensureTalentAgentEngine?.();if(ok===false||!engineV42())throw new Error('No pude iniciar el motor de personalización.');return engineV42();})().finally(()=>{tailorLoadPromise=null;});return tailorLoadPromise;}
  function engineContextV42(){
    const cv=cvContext();
    return {
      ...cv,
      experiences:cv.experiences||[],
      skills:mergeEvidence(cv.skills||[],(talentData?.skills||[]).map(x=>({skill:x.skill,level:x.level,excerpt:x.skill,kind:'profile'})),x=>x.skill||''),
      education:mergeEvidence(cv.education||[],educationRows()||[],x=>`${x.title||''}|${x.institution||''}`),
      certificates:talentData?.certificates||[],
      career:cv.career||{}
    };
  }

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
    const engine=engineV42();if(!engine)return base;
    const ctx=engineContextV42(),p=talentData?.profile||{},fields=ctx.fields||{};
    const comp=engine.buildComposition(job,ctx,{name:currentLutminUser?.fullName||'Perfil profesional',headline:fields.headline||p.headline||p.desired_role||'Perfil profesional',bio:fields.bio||p.bio||'',email:fields.email||currentLutminUser?.email||'',phone:fields.phone||p.phone||'',city:fields.city||p.city||'',province:fields.province||p.province||'',linkedin:fields.linkedin||fields.linkedin_url||p.linkedin_url||''});
    const exp=[...comp.experience_groups.related,...comp.experience_groups.transferable,...comp.experience_groups.other].map(x=>({...x,_r:x.relevance,_relation:x.relation,_reasons:x.reasons}));
    const skills=[...comp.skill_groups.relevant,...comp.skill_groups.transferable,...comp.skill_groups.other].map(x=>({...x,_r:x.relevance,_relation:x.relation,_reasons:x.reasons}));
    const certs=[...comp.certificate_groups.relevant,...comp.certificate_groups.transferable,...comp.certificate_groups.other].map(x=>({...x,_r:x.relevance,_relation:x.relation,_reasons:x.reasons}));
    const education=[...comp.education_groups.relevant,...comp.education_groups.transferable,...comp.education_groups.other].map(x=>({...x,_r:x.relevance,_relation:x.relation,_reasons:x.reasons}));
    const matched=comp.coverage.documented.map(r=>r.label).slice(0,12),missing=comp.coverage.missing.filter(r=>r.mandatory).map(r=>r.label).slice(0,10);
    const best=comp.experience_groups.related[0]||null;
    const questions=[
      best?`En ${best.position_title}${best.company_name?` · ${best.company_name}`:''} encontré evidencia relacionada. ¿Qué resultado concreto podés demostrar de esa experiencia?`:`No encuentro experiencia laboral directamente relacionada con ${job.title}. ¿Existe una práctica, proyecto o experiencia real que todavía no esté documentada?`,
      missing[0]?`La búsqueda pide ${missing[0]} y no encuentro evidencia suficiente. Si realmente lo tenés, ¿dónde lo adquiriste y cómo podrías documentarlo?`:`¿Qué requisito de la búsqueda querés respaldar con un ejemplo concreto?`,
      comp.coverage.partial[0]?`Para ${comp.coverage.partial[0].label} encontré evidencia parcial. ¿Qué dato real podrías agregar para dejarlo mejor documentado?`:`¿Qué evidencia verificable respalda mejor esta postulación?`,
      `¿Qué parte de tu CV conviene reducir porque no aporta a ${job.title}?`,
      `¿Qué dato debería quedar sin afirmar hasta que lo confirmes?`
    ];
    return {...(base||{}),job,score:comp.coverage.score,matched,missing,experiences:exp,skills,education,certs,questions,relatedCourses:base?.relatedCourses||[],coverage:comp.coverage,composition:comp,experience_groups:comp.experience_groups,skill_groups:comp.skill_groups,certificate_groups:comp.certificate_groups,education_groups:comp.education_groups,cv_source:!!currentCv()};
  }
  window.buildAgentAnalysisV100=enhancedAnalysis;
  function analysis(job){try{return enhancedAnalysis(job)}catch(e){console.error('[Lutmin V45] análisis',e);return baseAnalysis?.(job)||null}}

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
  function doubtsAnswer(){const cv=currentCv();if(!cv)return'No hay un CV cargado en esta sesión. Puedo analizar uno acá mismo sin salir de la plataforma.';const warnings=cv.quality?.warnings||[];const missing=(cv.experiences||[]).filter(x=>!x.company||!x.position);const lines=[...warnings];if(missing.length)lines.push(`${missing.length} experiencia(s) necesitan confirmar puesto o empresa.`);if(!cv.fields?.headline)lines.push('No pude identificar un título profesional claro.');return lines.length?'Lo que no tomaría como seguro automáticamente:\n• '+lines.join('\n• '):'La lectura no muestra inconsistencias estructurales importantes. Igual conviene confirmar nombres de empresas, fechas y descripciones antes de incorporarlas.';}
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
    if(job&&/falta|brecha|requisito|coincid|afinidad/.test(n)){const a=analysis(job),rows=a?.coverage?.requirements||[];return `Para ${job.title}, revisé requisito por requisito:
${rows.slice(0,8).map(r=>`• ${r.label}: ${r.result?.status==='documented'?'documentado':r.result?.status==='partial'?'evidencia parcial':'sin evidencia clara'}${r.result?.top?.evidence?.text?` — ${String(r.result.top.evidence.text).slice(0,120)}`:''}`).join('\n')||'• No pude estructurar requisitos suficientes.'}

"Sin evidencia" significa que no lo encuentro documentado; no significa que no sepas hacerlo.`;}
    if(job&&/destac|prioriz|personaliz|adapt|poner primero/.test(n)){const t=buildTailoredCvV42(job),rel=t.experience_groups.related,ev=[...t.certificate_groups.relevant.map(x=>x.course_title),...t.education_groups.relevant.map(x=>x.title),...t.skill_groups.relevant.map(x=>x.skill)].filter(Boolean);return `${t.summary}

${rel.length?`Experiencia que sí priorizaría:
• ${rel.slice(0,3).map(x=>`${x.position_title}${x.company_name?' · '+x.company_name:''}${x.selected_bullets?.length?` — ${x.selected_bullets.map(b=>b.text).join(' / ')}`:''}`).join('\n• ')}`:'No pondría ninguna experiencia como directamente relacionada.'}${ev.length?`

Evidencia adicional a destacar:
• ${ev.slice(0,7).join('\n• ')}`:''}${t.hidden?.skills?.length?`

No priorizaría: ${t.hidden.skills.slice(0,6).join(', ')}.`:''}`;}
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
    if(!cv)out.push({key:'cv',tone:'violet',title:'Leer tu CV en el agente',detail:'Puedo ordenar experiencia, fechas, formación y competencias para usar esa información en tus postulaciones.',action:'cv-upload'});
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
  const V45_VERSION='49.0';
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
  function buildTailoredCvV42(job){
    if(!job)return null;const engine=engineV42();if(!engine)return null;const cv=cvContext(),p=talentData?.profile||{},fields=cv?.fields||{};
    const person={name:currentLutminUser?.fullName||'Perfil profesional',headline:fields.headline||p.headline||p.desired_role||'Perfil profesional',bio:fields.bio||p.bio||'',email:fields.email||currentLutminUser?.email||'',phone:fields.phone||p.phone||'',city:fields.city||p.city||'',province:fields.province||p.province||'',linkedin:fields.linkedin||fields.linkedin_url||p.linkedin_url||''};
    const t=engine.buildComposition(job,engineContextV42(),person);t.source={name:currentCv()?.file?.name||'Perfil Lutmin',cv_loaded:!!currentCv()};t.score=t.coverage.score;t.missing=t.coverage.missing.map(r=>r.label);t.matched=t.coverage.documented.map(r=>r.label);t.target_summary=t.summary;
    t.experiences=[...t.experience_groups.related,...t.experience_groups.transferable,...t.experience_groups.other];t.skills=[...t.skill_groups.relevant,...t.skill_groups.transferable];t.education=[...t.education_groups.relevant,...t.education_groups.transferable,...t.education_groups.other];t.certificates=[...t.certificate_groups.relevant,...t.certificate_groups.transferable,...t.certificate_groups.other];return t;
  }

  function buildApplicationPackV44(job){
    if(!job)return null;
    const engine=engineV42();if(!engine)return null;
    const cv=cvContext(),p=talentData?.profile||{},fields=cv?.fields||{};
    const person={name:currentLutminUser?.fullName||'Perfil profesional',headline:fields.headline||p.headline||p.desired_role||'Perfil profesional',bio:fields.bio||p.bio||'',email:fields.email||currentLutminUser?.email||'',phone:fields.phone||p.phone||'',city:fields.city||p.city||'',province:fields.province||p.province||'',linkedin:fields.linkedin||fields.linkedin_url||p.linkedin_url||''};
    const pack=engine.buildApplicationPack?engine.buildApplicationPack(job,engineContextV42(),person):null;
    if(!pack){const composition=buildTailoredCvV42(job);return composition?{version:'LUTMIN-APPLICATION-PACK-V45',job:composition.job,composition,focused:null,intro_message:'',interview:[],requirements:[],ats_keywords:[]}:null;}
    pack.composition.source={name:currentCv()?.file?.name||'Perfil Lutmin',cv_loaded:!!currentCv()};
    pack.composition.score=pack.composition.coverage.score;
    pack.composition.missing=pack.composition.coverage.missing.map(r=>r.label);
    pack.composition.matched=pack.composition.coverage.documented.map(r=>r.label);
    pack.composition.target_summary=pack.composition.summary;
    pack.composition.experiences=[...pack.composition.experience_groups.related,...pack.composition.experience_groups.transferable,...pack.composition.experience_groups.other];
    pack.composition.skills=[...pack.composition.skill_groups.relevant,...pack.composition.skill_groups.transferable];
    pack.composition.education=[...pack.composition.education_groups.relevant,...pack.composition.education_groups.transferable,...pack.composition.education_groups.other];
    pack.composition.certificates=[...pack.composition.certificate_groups.relevant,...pack.composition.certificate_groups.transferable,...pack.composition.certificate_groups.other];
    return pack;
  }

  function v41ExpList(rows,empty){return rows.length?rows.slice(0,4).map(x=>`<article><div><strong>${esc(x.position_title||'Experiencia')}</strong><p>${esc(x.company_name||'Empresa por confirmar')}</p>${x.reasons?.length?`<small>${esc(x.reasons.join(' · '))}</small>`:''}</div></article>`).join(''):`<p class="agent-v41-none">${esc(empty)}</p>`;}
  function coverageRowsV42(t){
    const rows=(t.coverage?.requirements||[]).slice(0,7);if(!rows.length)return '<p class="agent-v41-none">La búsqueda no tiene requisitos suficientemente estructurados para comparar.</p>';
    return rows.map(r=>{const status=r.result?.status||'missing',label=status==='documented'?'Documentado':status==='partial'?'Parcial':'Sin evidencia',top=status==='missing'?null:r.result?.top?.evidence;const source=top?.source==='experience'||top?.source==='experience_bullet'?'Experiencia':top?.source==='skill'?'Competencia':top?.source==='certificate'?'Certificación':top?.source==='education'?'Formación':top?.source==='career'?'Trayectoria':'';return `<div class="agent-v42-coverage-row is-${status}"><div><strong>${esc(r.label)}</strong>${top?`<small>${esc(source)} · ${esc(String(top.text||'').slice(0,115))}</small>`:''}</div><span>${label}</span></div>`;}).join('');
  }
  function packEvidenceTags(pack){
    const c=pack?.composition;if(!c)return [];
    return [...new Set([
      ...(pack.ats_keywords||[]),
      ...(c.skill_groups?.relevant||[]).map(x=>x.skill),
      ...(c.certificate_groups?.relevant||[]).map(x=>x.course_title),
      ...(c.education_groups?.relevant||[]).map(x=>x.title)
    ].filter(Boolean))].slice(0,10);
  }
  function focusedExperienceHtml(rows,empty){
    if(!rows?.length)return empty?`<p class="agent-v43-empty-note">${esc(empty)}</p>`:'';
    return rows.slice(0,4).map(x=>`<article class="agent-v43-exp"><strong>${esc(x.position_title||'Experiencia')}</strong><span>${esc(x.company_name||'Empresa por confirmar')}</span>${(x.selected_bullets||[]).length?`<ul>${x.selected_bullets.slice(0,3).map(b=>`<li>${esc(b.text)}</li>`).join('')}</ul>`:''}</article>`).join('');
  }
  function packRequirementSummary(pack){
    const req=pack?.requirements||[];
    const documented=req.filter(x=>x.status==='documented').length,partial=req.filter(x=>x.status==='partial').length,missing=req.filter(x=>x.status==='missing').length;
    return {documented,partial,missing,total:req.length};
  }
  function vacancySpecHtml(pack){
    const spec=pack?.vacancy_spec||{},must=spec.must_have||[],nice=spec.nice_to_have||[],resp=spec.responsibilities||[];
    if(!must.length&&!nice.length&&!resp.length)return '';
    const rows=(arr,label,cls)=>arr.length?`<div class="agent-v44-vacancy-group"><span>${label}</span>${arr.slice(0,6).map(x=>`<p class="${cls}">${esc(x.text||x)}</p>`).join('')}</div>`:'';
    return `<details class="agent-v44-vacancy"><summary><span><i class="fa-solid fa-list-check"></i> Qué pide esta oportunidad</span><i class="fa-solid fa-chevron-down"></i></summary><div class="agent-v44-vacancy-body">${rows(must,'Requisitos principales','is-must')}${rows(nice,'Deseables','is-nice')}${rows(resp,'Responsabilidades','is-resp')}</div></details>`;
  }
  function evidenceLedgerHtml(pack){
    const rows=pack?.evidence_ledger||[];if(!rows.length)return '';
    return `<details class="agent-v43-evidence"><summary><span>Requisito → evidencia (${pack.coverage_summary?.documented||0} documentados · ${pack.coverage_summary?.partial||0} parciales · ${pack.coverage_summary?.missing||0} sin evidencia)</span><i class="fa-solid fa-chevron-down"></i></summary><div>${rows.slice(0,12).map(r=>`<div class="agent-v42-coverage-row is-${esc(r.status)}"><div><strong>${esc(r.requirement)}</strong>${r.evidence?`<small>${esc(r.evidence_source_label)} · ${esc(String(r.evidence).slice(0,140))}</small>`:'<small>No encontré respaldo suficiente en CV/perfil/formación.</small>'}</div><span>${r.status==='documented'?'Documentado':r.status==='partial'?'Parcial':'Sin evidencia'}</span></div>`).join('')}</div></details>`;
  }
  function historyHtml(){
    const rows=Array.isArray(state().pack_history)?state().pack_history.slice(0,5):[];
    if(!rows.length)return '';
    return `<details class="agent-v44-history"><summary><span><i class="fa-solid fa-clock-rotate-left"></i> Últimas versiones preparadas</span><i class="fa-solid fa-chevron-down"></i></summary><div>${rows.map(x=>`<div><span>${esc(x.title||'Oportunidad')}</span><small>${esc(x.company||'')}${x.external?' · externa':''} · ${new Date(x.at).toLocaleString('es-AR')}</small></div>`).join('')}</div></details>`;
  }

  function statusLabel(status){return ({saved:'Guardada',preparing:'Preparando',applied:'Postulado/a',followup:'Seguimiento',interview:'Entrevista',closed:'Cerrada'})[status]||'Preparando';}
  function statusIcon(status){return ({saved:'fa-bookmark',preparing:'fa-pen-ruler',applied:'fa-paper-plane',followup:'fa-arrow-rotate-right',interview:'fa-comments',closed:'fa-circle-check'})[status]||'fa-pen-ruler';}
  function dossierPanelHtml(job,pack){
    const api=dossierApi();if(!api||!job||!pack)return '';
    const d=api.dossier?.(job.id),ready=api.readiness?.(pack),check=api.checklist?.(pack,!!currentCv())||[],versions=d?.versions||[],last=versions[0]||null,prev=versions[1]||null,diff=prev&&last?api.diffVersions?.(prev,last):null;
    const process=(api.allProcesses?.(talentData?.applications||[],talentData?.jobs||[])||[]).find(x=>x.id===job.id)||{id:job.id,title:job.title,company:job.company_name||'',external:!!job.external,status:job.status||'preparing',dossier:d};
    const next=api.nextAction?.(process)||null;
    const completed=check.filter(x=>x.done).length;
    return `<section class="agent-v45-dossier">
      <div class="agent-v45-dossier-head"><div><span>EXPEDIENTE DE POSTULACIÓN</span><h5>${esc(ready?.label||'Preparación documental')}</h5><p>${ready?.total?`${ready.documented} documentados · ${ready.partial} parciales · ${ready.missing} sin evidencia entre requisitos principales`:'La búsqueda todavía no tiene requisitos suficientemente estructurados.'}</p></div><div class="agent-v45-progress"><strong>${completed}/${check.length}</strong><small>pasos listos</small></div></div>
      <div class="agent-v45-checklist">${check.map(x=>`<div class="${x.done?'is-done':x.critical?'is-critical':''}"><i class="fa-solid ${x.done?'fa-circle-check':x.critical?'fa-circle-exclamation':'fa-circle'}"></i><span>${esc(x.label)}</span></div>`).join('')}</div>
      ${next?`<div class="agent-v46-next"><div><span>PRÓXIMA ACCIÓN</span><strong>${esc(next.label)}</strong><p>${esc(next.detail||'')}</p></div><button type="button" data-agent-v46-processes><i class="fa-solid fa-list-check"></i>Ver seguimiento</button></div>`:''}
      <div class="agent-v45-dossier-actions"><button type="button" data-agent-v45-save-dossier="${esc(job.id)}"><i class="fa-solid fa-floppy-disk"></i>${last?'Guardar nueva versión':'Guardar expediente'}</button><button type="button" data-agent-v45-export-dossier="${esc(job.id)}"><i class="fa-solid fa-file-arrow-down"></i>Descargar expediente</button>${job.external?`<select data-agent-v45-status="${esc(job.id)}"><option value="saved" ${job.status==='saved'?'selected':''}>Guardada</option><option value="preparing" ${job.status==='preparing'?'selected':''}>Preparando</option><option value="applied" ${job.status==='applied'?'selected':''}>Postulado/a</option><option value="followup" ${job.status==='followup'?'selected':''}>Seguimiento</option><option value="interview" ${job.status==='interview'?'selected':''}>Entrevista</option><option value="closed" ${job.status==='closed'?'selected':''}>Cerrada</option></select>`:''}</div>
      ${versions.length?`<details class="agent-v45-versions"><summary><span><i class="fa-solid fa-code-branch"></i> ${versions.length} versión(es) guardada(s)</span><i class="fa-solid fa-chevron-down"></i></summary><div>${versions.slice(0,6).map((v,i)=>`<article><div><strong>Versión ${versions.length-i}</strong><small>${new Date(v.created_at).toLocaleString('es-AR')} · ${esc(v.source_cv||'Perfil Lutmin')}</small></div><span>${v.readiness?.documented||0}/${v.readiness?.total||0} respaldados</span></article>`).join('')}${diff?`<p class="agent-v45-diff">Último cambio: ${diff.documented_delta>0?`+${diff.documented_delta} requisito(s) documentado(s)`:diff.documented_delta<0?`${diff.documented_delta} requisito(s) documentado(s)`:'sin cambios en cobertura'}${diff.source_changed?' · cambió el CV fuente':''}${diff.newly_documented?.length?` · nuevos: ${esc(diff.newly_documented.slice(0,3).join(', '))}`:''}</p>`:''}</div></details>`:''}
    </section>`;
  }
  function processesHtml(){
    const api=dossierApi();if(!api)return `<div class="agent-v40-empty"><i class="fa-solid fa-folder-open"></i><div><strong>No pude abrir tus procesos</strong><p>Recargá el módulo Agente.</p></div></div>`;
    const rows=api.allProcesses?.(talentData?.applications||[],talentData?.jobs||[])||[];
    if(!rows.length)return `<div class="agent-v40-empty"><i class="fa-solid fa-folder-plus"></i><div><strong>Todavía no hay procesos guardados</strong><p>Elegí una oportunidad y guardá el expediente. Las ofertas externas también quedan disponibles acá.</p></div></div>`;
    return `<div class="agent-v45-processes"><div class="agent-v40-tool-head"><span>MIS PROCESOS</span><h4>Postulaciones y oportunidades en preparación</h4><p>Seguimiento documental local. No implica una evaluación de contratación.</p></div><div class="agent-v45-process-grid">${rows.slice(0,20).map(x=>`<article><div class="agent-v45-process-icon is-${esc(x.status||'preparing')}"><i class="fa-solid ${statusIcon(x.status)}"></i></div><div><strong>${esc(x.title)}</strong><p>${esc(x.company||'')}${x.external?' · externa':' · Lutmin'}</p><small>${x.dossier?.versions?.length||0} versión(es) de expediente</small></div><span>${esc(statusLabel(x.status))}</span><button type="button" data-agent-v45-open-process="${esc(x.id)}" data-external="${x.external?'1':'0'}">Abrir</button></article>`).join('')}</div></div>`;
  }
  function opportunityPlanHtml(pack){
    const ledger=pack?.evidence_ledger||[],missing=ledger.filter(x=>x.status==='missing'),partial=ledger.filter(x=>x.status==='partial'),documented=ledger.filter(x=>x.status==='documented');
    const c=pack?.composition||{},profile=[];
    if(!(c.experience_groups?.related||[]).length)profile.push('No hay experiencia laboral directa documentada: no la inventes; reforzá formación, proyectos o habilidades transferibles reales.');
    if(missing.length)profile.push(`Antes de postular, revisá si podés documentar: ${missing.slice(0,3).map(x=>x.requirement).join(', ')}.`);
    if(partial.length)profile.push(`Hay evidencia parcial para ${partial.slice(0,3).map(x=>x.requirement).join(', ')}: agregá una tarea, proyecto, curso o certificado sólo si realmente existe.`);
    if(!profile.length)profile.push('La evidencia principal está documentada. El foco pasa a claridad del CV, mensaje y preparación de entrevista.');
    const interview=[...missing.slice(0,2),...partial.slice(0,2)].slice(0,3);
    return `<section class="agent-v47-plan"><div class="agent-v47-plan-head"><div><span>PLAN PARA ESTA OPORTUNIDAD</span><h5>Qué conviene hacer antes y después de postular</h5><p>No es un score: son acciones derivadas de la evidencia disponible.</p></div><strong>${documented.length}/${ledger.length||0}<small> requisitos documentados</small></strong></div><div class="agent-v47-plan-grid"><article><i class="fa-solid fa-id-card"></i><div><b>1 · Completar evidencia</b>${profile.map(x=>`<p>${esc(x)}</p>`).join('')}</div></article><article><i class="fa-solid fa-file-circle-check"></i><div><b>2 · Preparar postulación</b><p>Generá el CV enfocado para esta búsqueda y conservá el CV completo adaptado como respaldo.</p><p>Usá el mismo expediente para mensaje, entrevista y seguimiento: evita contradicciones.</p></div></article><article><i class="fa-solid fa-comments"></i><div><b>3 · Preparar entrevista</b>${interview.length?interview.map(x=>`<p><strong>${esc(x.requirement)}:</strong> ${x.status==='missing'?'explicá con claridad que hoy no tenés evidencia directa.':'prepará un ejemplo concreto y delimitá qué parte está documentada.'}</p>`).join(''):'<p>Prepará ejemplos concretos para los requisitos ya documentados y cómo verificaste resultados.</p>'}</div></article></div></section>`;
  }
  function opportunityDevelopmentHtml(job,pack){return window.LutminOpportunityDevelopmentV48?.html?.(job,pack,esc)||'';}
  function professionalPassportHtml(pack){
    const rows=(pack?.evidence_ledger||[]).filter(x=>x.status!=='missing'),by={};rows.forEach(x=>{const k=x.evidence_source_label||'Otra evidencia';(by[k]||(by[k]=[])).push(x)});
    const groups=Object.entries(by);if(!groups.length)return '';
    return `<details class="agent-v47-passport"><summary><span><i class="fa-solid fa-passport"></i> Pasaporte de evidencia para esta oportunidad</span><i class="fa-solid fa-chevron-down"></i></summary><div class="agent-v47-passport-body"><p>Mapa reutilizable de evidencia real. Una misma evidencia puede respaldar futuras oportunidades sin cambiar su naturaleza.</p>${groups.map(([k,v])=>`<section><b>${esc(k)}</b>${v.slice(0,6).map(x=>`<div><span>${esc(x.requirement)}</span><small>${esc(String(x.evidence||'').slice(0,150))}</small></div>`).join('')}</section>`).join('')}</div></details>`;
  }
  function tailoredPreviewHtml(job){
    if(!job)return `<div class="agent-v40-empty"><i class="fa-solid fa-arrow-up"></i><div><strong>Elegí una oportunidad o pegá una oferta externa</strong><p>Lutmin construye un CV enfocado, un mensaje de presentación y una guía de entrevista usando sólo evidencia real.</p></div></div>`;
    const pack=buildApplicationPackV44(job);if(!pack)return `<div class="agent-v40-empty"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>No pude construir el paquete</strong><p>Revisá la oportunidad e intentá nuevamente.</p></div></div>`;
    const c=pack.composition,cv=currentCv(),rel=c.experience_groups.related||[],other=c.experience_groups.other||[],tags=packEvidenceTags(pack),counts=packRequirementSummary(pack),focused=pack.focused||{},position=pack.positioning||{};
    const mandatory=pack.coverage_summary||{};
    const verdict=`<div class="agent-v44-position is-${esc(position.mode||'exploratory')}"><i class="fa-solid ${rel.length?'fa-circle-check':'fa-scale-balanced'}"></i><div><strong>${esc(position.label||'Estrategia de postulación')}</strong><p>${esc(position.message||c.summary||'')}</p></div></div>`;
    const action=job.external?
      `<div class="agent-v43-apply-row"><div class="agent-v44-external-note"><i class="fa-solid fa-arrow-up-right-from-square"></i><span>Oferta externa: Lutmin prepara el paquete, pero la postulación se realiza en el sitio de origen.</span></div></div>`:
      `<div class="agent-v43-apply-row"><button type="button" class="agent-v43-apply" data-agent-v40-apply="${esc(job.id)}"><i class="fa-solid fa-paper-plane"></i> Preparar postulación con este paquete</button><small>No se envía nada automáticamente.</small></div>`;
    return `<div class="agent-v43-studio">
      <div class="agent-v43-head"><div><span>${job.external?'OFERTA EXTERNA · ':''}PAQUETE PERSONALIZADO</span><h4>${esc(job.title)}</h4><p>${esc(job.company_name||'Oportunidad')}${job.location?` · ${esc(job.location)}`:''}</p></div><div class="agent-v43-integrity"><strong>${mandatory.mandatory_documented||counts.documented}</strong><small>requisitos principales respaldados</small></div></div>
      ${verdict}
      ${!cv?`<div class="agent-v40-cv-warning"><i class="fa-solid fa-circle-info"></i><div><strong>Estoy usando tu perfil. Para seleccionar tareas concretas y mejorar el resultado, cargá tu CV original.</strong><button type="button" data-agent-v40-upload>Cargar CV ahora</button></div></div>`:''}
      <section class="agent-v43-primary"><div class="agent-v43-primary-copy"><span>CV ENFOCADO · SALIDA PRINCIPAL</span><h5>Una versión específica para esta oportunidad</h5><p>${esc(c.summary||'Se prioriza la evidencia documentada más útil para esta búsqueda.')}</p><div class="agent-v43-tags">${tags.length?tags.map(x=>`<b>${esc(x)}</b>`).join(''):'<em>Sin evidencia específica fuerte todavía</em>'}</div></div><button type="button" class="agent-v43-main-cta" data-agent-v43-download="focused" data-job-id="${esc(job.id)}"><i class="fa-solid fa-file-pdf"></i><span><strong>Descargar CV enfocado</strong><small>Versión breve y específica para esta oportunidad</small></span></button></section>
      <div class="agent-v43-preview">
        <section><div class="agent-v43-section-title"><i class="fa-solid fa-briefcase"></i><div><strong>Experiencia que realmente respalda la búsqueda</strong><small>No se prioriza un trabajo por coincidencias débiles</small></div></div>${focusedExperienceHtml(focused.related||rel,'No hay experiencia laboral directa para priorizar.')}${focusedExperienceHtml((focused.transferable||[]).slice(0,2),'')}</section>
        <section><div class="agent-v43-section-title"><i class="fa-solid fa-filter"></i><div><strong>Qué queda fuera del foco</strong><small>Información real que no ayuda a esta oportunidad</small></div></div><div class="agent-v43-omit"><strong>${c.hidden?.experience_detail||0}</strong><span>detalles laborales no relevantes</span></div><div class="agent-v43-omit"><strong>${c.hidden?.skills?.length||0}</strong><span>competencias sin relación suficiente</span></div><div class="agent-v43-omit"><strong>${Math.max(0,other.length-(focused.other?.length||0))}</strong><span>experiencias fuera de la versión enfocada</span></div></section>
      </div>
      <section class="agent-v43-pack-grid">
        <article><i class="fa-solid fa-file-lines"></i><div><strong>CV completo adaptado</strong><p>Conserva toda la trayectoria, diferenciando relevancia.</p></div><button type="button" data-agent-v43-download="full" data-job-id="${esc(job.id)}">Descargar</button></article>
        <article><i class="fa-solid fa-message"></i><div><strong>Mensaje de presentación</strong><p>Texto construido sólo con antecedentes documentados.</p></div><button type="button" data-agent-v43-copy-intro data-job-id="${esc(job.id)}">Copiar</button></article>
        <article><i class="fa-solid fa-comments"></i><div><strong>Guía de entrevista</strong><p>Requisitos, evidencia disponible y brechas reales.</p></div><button type="button" data-agent-v44-interview-pdf="${esc(job.id)}">Descargar</button></article>
      </section>
      ${opportunityPlanHtml(pack)}
      ${opportunityDevelopmentHtml(job,pack)}
      ${professionalPassportHtml(pack)}
      ${vacancySpecHtml(pack)}
      ${evidenceLedgerHtml(pack)}
      ${dossierPanelHtml(job,pack)}
      ${action}
    </div>`;
  }
  function interviewHtml(job){
    if(!job)return `<div class="agent-v40-empty"><i class="fa-solid fa-comments"></i><div><strong>Elegí una oportunidad</strong><p>Voy a preparar preguntas usando esa búsqueda y tu evidencia real.</p></div></div>`;
    const pack=buildApplicationPackV44(job),rows=pack?.interview||[];
    return `<div class="agent-v40-tool-head"><span>Preparación de entrevista</span><h4>${esc(job.title)}</h4><p>Cada punto indica qué podés respaldar y dónde conviene ser explícito sobre los límites de tu experiencia.</p></div><div class="agent-v43-interview">${rows.slice(0,8).map((x,i)=>`<article class="is-${esc(x.status)}"><span>${i+1}</span><div><strong>${esc(x.requirement)}</strong><p>${esc(x.prompt)}</p>${x.evidence?`<small>Evidencia: ${esc(String(x.evidence).slice(0,180))}</small>`:''}</div></article>`).join('')||'<p class="agent-v43-empty-note">No pude estructurar requisitos suficientes para preparar la entrevista.</p>'}</div>`;
  }
  function profileHtml(){const ps=profileScore(),ev=evidenceCounts(),missing=ps.missing||[];return `<div class="agent-v40-tool-head"><span>Estado del perfil</span><h4>${Number(ps.score||0)}% completo</h4><p>${ev.experiences} experiencias · ${ev.skills} competencias · ${ev.certificates} certificados</p></div>${missing.length?`<div class="agent-v40-checklist">${missing.slice(0,6).map(x=>`<div><i class="fa-regular fa-circle"></i><span>${esc(x)}</span></div>`).join('')}</div>`:`<div class="agent-v40-ok"><i class="fa-solid fa-circle-check"></i><span>Tu perfil tiene una base sólida.</span></div>`}<button type="button" class="agent-v40-small-primary" data-agent-v40-action="profile">Ir a mi perfil</button>`;}
  function cvReviewHtml(){const cv=currentCv(),ev=evidenceCounts();if(!cv)return `<div class="agent-v40-empty"><i class="fa-solid fa-file-arrow-up"></i><div><strong>Cargá tu CV</strong><p>Voy a interpretar experiencia, formación y competencias para usarlo en cada postulación.</p><button type="button" class="agent-v40-small-primary" data-agent-v40-upload>Cargar CV</button></div></div>`;const career=cv.career||{};return `<div class="agent-v40-tool-head"><span>CV interpretado</span><h4>${esc(cv.file?.name||'Tu CV')}</h4><p>${sourceSummary(cv,ev)}</p></div><div class="agent-v40-stats"><div><span>Experiencias</span><strong>${cv.experiences?.length||0}</strong></div><div><span>Trayectoria</span><strong>${career.years?career.years+' años':'—'}</strong></div><div><span>Formación</span><strong>${cv.education?.length||0}</strong></div><div><span>Competencias</span><strong>${cv.skills?.length||0}</strong></div></div><div class="agent-v40-inline-actions"><button type="button" data-agent-v40-review>Revisar lectura</button><button type="button" data-agent-v40-upload>Cambiar CV</button></div>`;}

  function secondaryTools(active){const items=[['tailor','fa-file-circle-check','Paquete de postulación'],['interview','fa-comments','Entrevista'],['cv','fa-file-lines','Revisar CV'],['profile','fa-user-check','Perfil']];return items.map(([key,icon,label])=>`<button type="button" class="${active===key?'is-active':''}" data-agent-v40-mode="${key}"><i class="fa-solid ${icon}"></i>${label}</button>`).join('');}
  function questionSuggestions(){return ['¿Qué debería destacar para esta búsqueda?','¿Qué experiencia conviene poner primero?','¿Qué me falta documentar?'];}

  function externalSetupHtml(){
    const ext=externalJob()||{},rows=externalJobs(),active=sourceMode()==='external';
    return `<div class="agent-v44-source-tabs" role="tablist"><button type="button" class="${!active?'is-active':''}" data-agent-v44-source="lutmin"><i class="fa-solid fa-briefcase"></i> Oportunidades Lutmin</button><button type="button" class="${active?'is-active':''}" data-agent-v44-source="external"><i class="fa-solid fa-paste"></i> Ofertas externas${rows.length?` · ${rows.length}`:''}</button></div>
      ${active?`<div class="agent-v45-external-toolbar">${rows.length?`<select id="agentExternalSavedV45"><option value="">Nueva oferta externa</option>${rows.map(x=>`<option value="${esc(x.id)}" ${x.id===ext.id?'selected':''}>${esc(x.title)} · ${esc(x.company_name||'Externa')} · ${esc(statusLabel(x.status))}</option>`).join('')}</select>`:''}<button type="button" data-agent-v45-new-external><i class="fa-solid fa-plus"></i>Nueva</button>${ext.id?`<button type="button" class="is-danger" data-agent-v45-delete-external="${esc(ext.id)}"><i class="fa-solid fa-trash"></i>Eliminar</button>`:''}</div><div class="agent-v44-external-form"><div class="agent-v44-form-row"><input id="agentExternalTitleV44" value="${esc(ext.title||'')}" placeholder="Puesto / título de la búsqueda"><input id="agentExternalCompanyV44" value="${esc(ext.company_name&&ext.company_name!=='Oportunidad externa'?ext.company_name:'')}" placeholder="Empresa (opcional)"><input id="agentExternalLocationV44" value="${esc(ext.location||'')}" placeholder="Ubicación (opcional)"></div><textarea id="agentExternalDescriptionV44" rows="6" placeholder="Pegá acá la descripción completa de LinkedIn, Computrabajo, correo o cualquier aviso laboral.">${esc(ext.description||'')}</textarea><button type="button" data-agent-v44-analyze-external><i class="fa-solid fa-wand-magic-sparkles"></i> ${ext.id?'Actualizar análisis':'Analizar y guardar oferta'}</button></div>`:''}`;
  }
  function render(){
    let host=document.getElementById('talentAgentV40')||document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38');if(!host)return;
    if(host.id!=='talentAgentV40')host.id='talentAgentV40';
    const cv=currentCv(),job=selectedJob(),active=mode(),external=sourceMode()==='external';
    const needsEngine=!!job&&(active==='tailor'||active==='interview');
    let tool;if(needsEngine&&!engineV42()){tool='<div class="agent-v40-empty"><i class="fa-solid fa-spinner fa-spin"></i><div><strong>Preparando la personalización</strong><p>Cargo el motor sólo porque elegiste una oportunidad.</p></div></div>';ensureTailorV46().then(()=>render()).catch(e=>{console.error(e);showToast?.(e.message||'No pude iniciar la personalización.');});}else tool=active==='interview'?interviewHtml(job):active==='cv'?cvReviewHtml():active==='profile'?profileHtml():tailoredPreviewHtml(job);
    host.innerHTML=`<div class="agent-v40">
      <header class="agent-v40-hero"><div><p>AGENTE LUTMIN · EXPEDIENTE DE POSTULACIÓN</p><h3>Prepará, versioná y seguí cada postulación desde un solo lugar</h3><span>Cada oportunidad conserva su CV enfocado, evidencia, mensaje, entrevista y versiones. Las ofertas externas también quedan guardadas localmente.</span></div><div class="agent-v40-hero-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div></header>
      <section class="agent-v44-opportunity">${externalSetupHtml()}${!external?`<div class="agent-v40-field agent-v44-job-select"><label for="agentJobSelectV100"><b>1</b><span>Elegí una oportunidad publicada</span></label><select id="agentJobSelectV100">${jobOptions(job?.id||state().last_job_id||'')}</select></div>`:''}</section>
      <section class="agent-v40-setup agent-v44-cv-setup"><div class="agent-v40-source"><div><b>2</b><span>${cv?'CV listo':'Tu información'}</span><strong>${cv?esc(cv.file?.name||'CV cargado'):'Usando perfil Lutmin'}</strong><small>${cv?sourceSummary(cv,evidenceCounts()):'Cargá tu CV para que pueda seleccionar tareas y experiencia con mayor precisión.'}</small></div><input id="agentCvFileV38" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg" hidden><button type="button" data-agent-v40-upload>${cv?'Cambiar CV':'Cargar CV'}</button></div></section>
      <nav class="agent-v40-tools" aria-label="Herramientas del agente">${secondaryTools(active)}</nav>
      <section class="agent-v40-result">${tool}</section>
      <details class="agent-v40-help"><summary><i class="fa-solid fa-message"></i> Consultar al agente sobre esta oportunidad</summary><div class="agent-v40-help-body"><div class="agent-v40-suggestions">${questionSuggestions().map(q=>`<button type="button" data-agent-v40-question="${esc(q)}">${esc(q)}</button>`).join('')}</div><form id="agentQuestionFormV40"><input id="agentQuestionV100" autocomplete="off" placeholder="Ej.: ¿Qué experiencia conviene poner primero?"><button type="submit"><i class="fa-solid fa-arrow-right"></i></button></form><div id="agentAnswerV100" class="agent-v40-answer hidden"></div></div></details>
    </div>`;
  }
  async function ensureApplicationExportV45(){
    if(window.LutminApplicationExportV45)return window.LutminApplicationExportV45;
    return await new Promise((resolve,reject)=>{const src='assets/js/modules/talent/application-export.js?v=49.0';const old=[...document.scripts].find(x=>String(x.src||'').includes('application-export.js'));if(old){let n=0;const t=setInterval(()=>{n++;if(window.LutminApplicationExportV45){clearInterval(t);resolve(window.LutminApplicationExportV45)}else if(n>50){clearInterval(t);reject(new Error('No se pudo iniciar el exportador.'))}},80);return;}const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onload=()=>window.LutminApplicationExportV45?resolve(window.LutminApplicationExportV45):reject(new Error('Exportador no disponible.'));sc.onerror=()=>reject(new Error('No se pudo cargar el exportador.'));document.body.appendChild(sc);});
  }
  async function saveDossierVersionV45(jobId=null){const job=jobById(jobId)||selectedJob();if(!job)return null;await ensureTailorV46();const pack=buildApplicationPackV44(job);if(!pack)return null;const result=dossierApi()?.saveVersion?.(job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});if(result?.created)showToast?.('Nueva versión del expediente guardada.');else if(result)showToast?.('El expediente ya estaba actualizado.');render();return result;}
  async function downloadTailoredCvV45(jobId=null,format='focused'){
    const job=jobById(jobId||selectedJob()?.id||state().last_job_id)||selectedJob();if(!job){showToast?.('Elegí o cargá una oportunidad primero.');return false;}await ensureTailorV46();const pack=buildApplicationPackV44(job);if(!pack){showToast?.('No pude preparar el CV.');return false;}
    try{const exp=await ensureApplicationExportV45();await exp.downloadCv(job,pack,format);dossierApi()?.saveVersion?.(job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});const history=Array.isArray(state().pack_history)?state().pack_history:[];save({last_job_id:job.id,last_cv_download:{job_id:job.id,format,at:now()},pack_history:[{job_id:job.id,title:job.title,company:job.company_name||null,external:!!job.external,format,at:now()},...history.filter(x=>!(x.job_id===job.id&&x.format===format))].slice(0,12)});showToast?.(format==='focused'?'CV enfocado generado.':'CV completo adaptado generado.');render();return true}catch(e){console.error('[Lutmin V45] CV personalizado',e);showToast?.(e.message||'No pude generar el CV personalizado.');return false}
  }
  async function downloadInterviewGuideV45(jobId=null){const job=jobById(jobId)||selectedJob();if(!job)return showToast?.('Elegí una oportunidad primero.');await ensureTailorV46();const pack=buildApplicationPackV44(job);if(!pack)return showToast?.('No pude preparar la guía.');try{const exp=await ensureApplicationExportV45();await exp.downloadInterview(job,pack);dossierApi()?.saveVersion?.(job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});showToast?.('Guía de entrevista generada.');render()}catch(e){console.error(e);showToast?.(e.message||'No pude generar la guía.') }}
  async function downloadDossierV45(jobId=null){const job=jobById(jobId)||selectedJob();if(!job)return showToast?.('Elegí una oportunidad primero.');await ensureTailorV46();const pack=buildApplicationPackV44(job);if(!pack)return showToast?.('No pude preparar el expediente.');const saved=dossierApi()?.saveVersion?.(job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});try{const exp=await ensureApplicationExportV45();await exp.downloadDossier(job,pack,saved?.dossier||dossierApi()?.dossier?.(job.id));showToast?.('Expediente descargado.');render()}catch(e){console.error(e);showToast?.(e.message||'No pude generar el expediente.') }}
  async function downloadTailoredCvV42(jobId=null){return downloadTailoredCvV45(jobId,'focused');}
  // La postulación guarda exactamente la misma estructura que ve y descarga el candidato.
  const legacySnapshotV100=typeof window.buildCvSnapshotV100==='function'?window.buildCvSnapshotV100:null;
  window.buildCvSnapshotV100=function(a){
    const job=a?.job||selectedJob(),pack=job?buildApplicationPackV44(job):null,t=pack?.composition||null;if(!t)return legacySnapshotV100?legacySnapshotV100(a):{};
    return {version:t.version,job:t.job,generated_at:t.generated_at,profile:{headline:t.target_headline||t.person.headline,source_headline:t.person.headline,city:t.person.city||null,province:t.person.province||null,availability:talentData?.profile?.availability||null,willing_travel:!!talentData?.profile?.willing_travel,bio:t.person.bio||null},target_headline:t.target_headline,tailoring:{strategy:t.strategy,target_summary:t.target_summary,changes:t.changes,has_related_experience:t.experience_groups.related.length>0,related_experience_count:t.experience_groups.related.length,coverage_score:t.coverage?.score||0,coverage:(t.coverage?.requirements||[]).map(r=>({requirement:r.label,status:r.result?.status||'missing',evidence:r.result?.top?.evidence?.text||null,source:r.result?.top?.evidence?.source||null}))},focus_terms:t.matched,matching_terms:t.matched,gap_terms:t.missing,skills:t.skills,experiences:t.experiences,experience_groups:t.experience_groups,skill_groups:t.skill_groups,education:t.education,education_groups:t.education_groups,certificates:t.certificates,certificate_groups:t.certificate_groups,source:t.source,application_pack:{version:pack?.version||'LUTMIN-APPLICATION-PACK-V45',intro_message:pack?.intro_message||'',ats_keywords:pack?.ats_keywords||[],evidence_integrity:pack?.evidence_integrity||{},coverage_summary:pack?.coverage_summary||{},positioning:pack?.positioning||{},vacancy_spec:pack?.vacancy_spec||{},evidence_ledger:pack?.evidence_ledger||[],interview:pack?.interview||[]}};
  };
  window.downloadSmartCvV100=downloadTailoredCvV42;window.downloadTailoredCvV40=downloadTailoredCvV42;window.downloadTailoredCvV42=downloadTailoredCvV42;window.downloadTailoredCvV43=downloadTailoredCvV45;window.downloadTailoredCvV44=downloadTailoredCvV45;window.downloadTailoredCvV45=downloadTailoredCvV45;window.buildTailoredCvV40=buildTailoredCvV42;window.buildTailoredCvV41=buildTailoredCvV42;window.buildTailoredCvV42=buildTailoredCvV42;window.buildApplicationPackV43=buildApplicationPackV44;window.buildApplicationPackV44=buildApplicationPackV44;

  // V44 · postulación interna autónoma: el Agente ya no depende de superplatform.js.
  window.openSmartApplyV100=function(jobId){
    const job=jobById(jobId);if(!job||job.external)return showToast?.('Esta oportunidad se postula fuera de Lutmin.');
    if(!engineV42()){showToast?.('Preparando tu paquete personalizado...');ensureTailorV46().then(()=>window.openSmartApplyV100(jobId)).catch(e=>showToast?.(e.message||'No pude preparar la postulación.'));return;}
    if(talentData?.profile?.approval_status!=='approved')return showToast?.('Completá tu perfil profesional para habilitar postulaciones automáticamente.');
    const a=analysis(job),pack=buildApplicationPackV44(job),snap=pack?.composition||buildTailoredCvV42(job);
    pendingSmartApplicationV100={job,analysis:a,snapshot:window.buildCvSnapshotV100(a)};
    const intro=pendingSmartApplicationV100.snapshot?.application_pack?.intro_message||pack?.intro_message||'';
    const m=ensureV100Modal('smartApplyModalV100','max-w-4xl'),b=m.querySelector('[data-v100-body]'),rel=snap.experience_groups.related.length;
    b.innerHTML=`<p class="text-[10px] uppercase tracking-widest font-black text-lutmin-light">Agente Lutmin · postulación asistida</p><h2 class="mt-2 text-2xl sm:text-3xl font-black text-lutmin-dark">${esc(job.title)}</h2><p class="mt-1 text-sm text-slate-500">${esc(job.company_name||'Lutmin')} · ${esc(job.location||'Ubicación a definir')}</p><div class="mt-5 rounded-2xl ${rel?'bg-emerald-50 border-emerald-100':'bg-amber-50 border-amber-100'} border p-4"><p class="font-extrabold text-sm text-lutmin-dark">${rel?`Encontré ${rel} experiencia(s) laboral(es) relacionada(s).`:'No encontré experiencia laboral directamente relacionada.'}</p><p class="mt-2 text-xs text-slate-600">${esc(snap.target_summary||'El CV conserva la información real y separa experiencia directa de evidencia formativa o transferible.')}</p></div><label class="block mt-5 text-xs font-bold text-slate-600">Mensaje de presentación</label><textarea id="smartApplyMessageV100" rows="5" class="mt-2 w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">${esc(intro)}</textarea><div class="mt-5 grid sm:grid-cols-3 gap-2"><button type="button" data-agent-v43-download="focused" data-job-id="${esc(job.id)}" class="py-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm"><i class="fa-solid fa-file-pdf mr-2"></i>Descargar CV</button><button type="button" data-agent-modal-close="smartApplyModalV100" class="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">Cancelar</button><button type="button" data-agent-confirm-apply class="py-3 rounded-xl bg-lutmin-dark text-white font-extrabold text-sm"><i class="fa-solid fa-paper-plane mr-2"></i>Enviar postulación</button></div>`;
    showV100Modal('smartApplyModalV100');
  };
  window.confirmSmartApplyV100=async function(){
    const p=pendingSmartApplicationV100;if(!p)return;
    const btn=document.querySelector('[data-agent-confirm-apply]');if(btn){btn.disabled=true;btn.textContent='Enviando...';}
    try{
      const msg=document.getElementById('smartApplyMessageV100')?.value.trim()||null;
      const {data,error}=await supabaseClient.from('job_applications').insert({job_id:p.job.id,user_id:currentLutminUser.id,message:msg}).select('id').single();
      if(error){showToast?.(error.code==='23505'?'Ya estás postulado/a a esta búsqueda.':error.message||'No pude registrar la postulación.');return;}
      const saved=await supabaseClient.rpc('save_application_cv_snapshot_v100',{p_application_id:data.id,p_job_id:p.job.id,p_affinity:p.analysis?.score||0,p_matching_terms:p.analysis?.matched||[],p_gap_terms:p.analysis?.missing||[],p_snapshot:p.snapshot});
      if(saved.error)console.error('[Lutmin V45] snapshot CV',saved.error);
      const pack=buildApplicationPackV44(p.job);dossierApi()?.saveVersion?.(p.job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});dossierApi()?.setDossierStatus?.(p.job.id,'applied');
      hideV100Modal('smartApplyModalV100');pendingSmartApplicationV100=null;showToast?.('Postulación enviada con el expediente personalizado asociado.');
      await loadTalentCenter?.();
    }finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane mr-2"></i>Enviar postulación';}}
  };
  try{openSmartApplyV100=window.openSmartApplyV100;confirmSmartApplyV100=window.confirmSmartApplyV100;}catch(_){ }

  function remember(jobId){const s=state(),history=Array.isArray(s.history)?s.history:[],job=jobById(jobId)||selectedJob();if(!job)return;const a=analysis(job),entry={job_id:job.id,title:job.title,company:job.company_name||null,external:!!job.external,score:Number(a?.score||0),at:now()};save({last_job_id:job.id,history:[entry,...history.filter(x=>x.job_id!==job.id)].slice(0,10)});}
  async function runAction(action,jobId){if(action==='profile'){window.openTalentModuleV38?.('profile');return;}if(action==='applications'){window.openTalentModuleV38?.('applications');return;}if(action==='jobs'){window.openTalentModuleV38?.('jobs');return;}if(action==='apply'){const job=jobById(jobId)||selectedJob();if(job?.external){showToast?.('Esta oportunidad es externa: descargá el CV y copiá el mensaje para postularte en el sitio de origen.');return;}if(typeof window.openSmartApplyV100==='function')return window.openSmartApplyV100(jobId);}}
  async function readAgentCv(file){if(!file)return;const host=document.getElementById('talentAgentV40');try{if(host)host.dataset.busy='true';if(!(window.LutminCvV43||window.LutminCvV42||window.LutminCvV38)?.analyzeFile)await window.LutminModules?.ensureTalentCvParser?.();const cv=await (window.LutminCvV43||window.LutminCvV42||window.LutminCvV38)?.analyzeFile?.(file,{openReview:false});if(!cv)throw new Error('No pude interpretar el CV.');save({mode:'tailor'});render();showToast?.('CV leído. El paquete se recalculó con la información del archivo.');}catch(e){console.error(e);showToast?.(e.message||'No pude interpretar el CV.');}finally{if(host)host.dataset.busy='false';}}
  async function copyIntroMessageV44(jobId){const job=jobById(jobId)||selectedJob();if(!job)return false;await ensureTailorV46();const pack=buildApplicationPackV44(job),text=pack?.intro_message||'';if(!text)return false;dossierApi()?.saveVersion?.(job,pack,{source_cv:currentCv()?.file?.name||'Perfil Lutmin'});try{await navigator.clipboard.writeText(text);showToast?.('Mensaje de presentación copiado.');render();return true;}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand?.('copy');ta.remove();showToast?.('Mensaje de presentación copiado.');return true;}}
  function showAnswer(text){const root=document.getElementById('agentAnswerV100');if(!root)return;root.classList.remove('hidden');root.innerHTML=`<p>${esc(text).replace(/\n/g,'<br>')}</p>`;root.scrollIntoView?.({behavior:'smooth',block:'nearest'});}

  window.askAgentV100=function(e){e?.preventDefault?.();const q=document.getElementById('agentQuestionV100')?.value?.trim()||'';if(!q)return;showAnswer(answerQuestion(q));};
  window.agentAskPresetV100=function(kind){const map={cv:'¿Qué entendiste de mi CV?',gap:'¿Qué me falta para esta búsqueda?',interview:'¿Cómo preparo la entrevista para esta búsqueda?',course:'¿Qué formación encontraste?'};showAnswer(answerQuestion(map[kind]||kind));};
  window.ensureTalentAgentV40=function(){let card=document.getElementById('talentAgentV100');if(!card){const mount=document.getElementById('talentAgentHostV342');if(!mount)return;card=document.createElement('div');card.id='talentAgentV100';card.className='agent-v39-card agent-v40-card';card.innerHTML='<div id="talentAgentV40"></div>';mount.appendChild(card);}card.classList.add('agent-v40-card');let host=document.getElementById('talentAgentV40')||document.getElementById('talentAgentV39')||document.getElementById('talentAgentV38');if(!host){host=document.createElement('div');host.id='talentAgentV40';card.appendChild(host);}else host.id='talentAgentV40';render();};
  window.refreshTalentAgentV40=render;window.ensureTalentAgentV39=window.ensureTalentAgentV40;window.refreshTalentAgentV39=render;window.ensureTalentAgentV38=window.ensureTalentAgentV40;window.refreshTalentAgentV38=render;window.ensureTalentAgentV37=window.ensureTalentAgentV40;window.refreshTalentAgentV37=render;
  const oldSelect=window.selectAgentJobV100;if(typeof oldSelect==='function')window.selectAgentJobV100=function(id){const r=oldSelect.apply(this,arguments);if(id){save({last_job_id:id});remember(id);}setTimeout(render,0);return r;};
  window.addEventListener('lutmin:cv-analyzed',()=>setTimeout(render,0));

  document.addEventListener('click',e=>{
    const m=e.target.closest?.('[data-agent-v40-mode]');if(m){e.preventDefault();setMode(m.dataset.agentV40Mode);return;}
    const proc=e.target.closest?.('[data-agent-v46-processes]');if(proc){e.preventDefault();window.openTalentModuleV38?.('applications');return;}
    const q=e.target.closest?.('[data-agent-v40-question]');if(q){e.preventDefault();showAnswer(answerQuestion(q.dataset.agentV40Question));return;}
    const up=e.target.closest?.('[data-agent-v40-upload]');if(up){e.preventDefault();document.getElementById('agentCvFileV38')?.click();return;}
    const rv=e.target.closest?.('[data-agent-v40-review]');if(rv){e.preventDefault();const cv=currentCv();if(cv)window.openCvReviewV140?.(cv);return;}
    const src=e.target.closest?.('[data-agent-v44-source]');if(src){e.preventDefault();setJobSource(src.dataset.agentV44Source);return;}
    const ext=e.target.closest?.('[data-agent-v44-analyze-external]');if(ext){e.preventDefault();const job=parseExternalJobForm();if(job){remember(job.id);render();showToast?.('Oferta externa analizada localmente.');}return;}
    const newExt=e.target.closest?.('[data-agent-v45-new-external]');if(newExt){e.preventDefault();dossierApi()?.selectExternal?.(null);save({job_source:'external',last_job_id:null});render();return;}
    const delExt=e.target.closest?.('[data-agent-v45-delete-external]');if(delExt){e.preventDefault();if(confirm('¿Eliminar esta oportunidad externa y su expediente local?')){dossierApi()?.removeExternal?.(delExt.dataset.agentV45DeleteExternal);save({last_job_id:null});render();showToast?.('Oportunidad externa eliminada.');}return;}
    const saveDos=e.target.closest?.('[data-agent-v45-save-dossier]');if(saveDos){e.preventDefault();saveDossierVersionV45(saveDos.dataset.agentV45SaveDossier);return;}
    const exportDos=e.target.closest?.('[data-agent-v45-export-dossier]');if(exportDos){e.preventDefault();downloadDossierV45(exportDos.dataset.agentV45ExportDossier);return;}
    const openProc=e.target.closest?.('[data-agent-v45-open-process]');if(openProc){e.preventDefault();const id=openProc.dataset.agentV45OpenProcess;if(openProc.dataset.external==='1'){dossierApi()?.selectExternal?.(id);save({job_source:'external',last_job_id:id,mode:'tailor'});}else{save({job_source:'lutmin',last_job_id:id,mode:'tailor'});}render();return;}
    const close=e.target.closest?.('[data-agent-modal-close]');if(close){e.preventDefault();hideV100Modal(close.dataset.agentModalClose);return;}
    const confirm=e.target.closest?.('[data-agent-confirm-apply]');if(confirm){e.preventDefault();window.confirmSmartApplyV100?.();return;}
    const guide=e.target.closest?.('[data-agent-v44-interview-pdf]');if(guide){e.preventDefault();downloadInterviewGuideV45(guide.dataset.agentV44InterviewPdf);return;}
    const dl43=e.target.closest?.('[data-agent-v43-download]');if(dl43){e.preventDefault();downloadTailoredCvV45(dl43.dataset.jobId,dl43.dataset.agentV43Download||'focused');return;}
    const copyIntro=e.target.closest?.('[data-agent-v43-copy-intro]');if(copyIntro){e.preventDefault();copyIntroMessageV44(copyIntro.dataset.jobId);return;}
    const dl=e.target.closest?.('[data-agent-v40-download]');if(dl){e.preventDefault();downloadTailoredCvV42(dl.dataset.agentV40Download);return;}
    const apply=e.target.closest?.('[data-agent-v40-apply]');if(apply){e.preventDefault();runAction('apply',apply.dataset.agentV40Apply);return;}
    const a=e.target.closest?.('[data-agent-v40-action]');if(a){e.preventDefault();runAction(a.dataset.agentV40Action,a.dataset.jobId);return;}
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='agentCvFileV38')readAgentCv(e.target.files?.[0]);
    if(e.target?.id==='agentJobSelectV100'){const id=e.target.value;save({job_source:'lutmin',last_job_id:id||null,mode:'tailor'});remember(id);try{window.selectAgentJobV100?.(id)}catch(_){render();}setTimeout(render,0);}
    if(e.target?.id==='agentExternalSavedV45'){const id=e.target.value||null;dossierApi()?.selectExternal?.(id);save({job_source:'external',last_job_id:id,mode:'tailor'});render();}
    if(e.target?.matches?.('[data-agent-v45-status]')){const id=e.target.dataset.agentV45Status,status=e.target.value;dossierApi()?.setExternalStatus?.(id,status);render();showToast?.(`Estado actualizado: ${statusLabel(status)}.`);}
  });
  document.addEventListener('submit',e=>{if(e.target?.id==='agentQuestionFormV40'){e.preventDefault();window.askAgentV100(e);}});
  window.openAgentProcessV46=async function(id,external=false){if(external)dossierApi()?.selectExternal?.(id);save({job_source:external?'external':'lutmin',last_job_id:id,mode:'tailor'});await window.openTalentModuleV38?.('agent');setTimeout(render,0);return true;};
  window.LutminAgentV46={version:V45_VERSION,answer:answerQuestion,searchCv,cvContext,analysis,render,setMode,buildTailoredCv:buildTailoredCvV42,buildApplicationPack:buildApplicationPackV44,downloadTailoredCv:downloadTailoredCvV45,downloadInterviewGuide:downloadInterviewGuideV45,downloadDossier:downloadDossierV45,saveDossier:saveDossierVersionV45,copyIntroMessage:copyIntroMessageV44,selectedJob,externalJob,ensureEngine:ensureTailorV46,openSmartApply:window.openSmartApplyV100,confirmSmartApply:window.confirmSmartApplyV100};window.LutminAgentV45=window.LutminAgentV46;window.LutminAgentV44=window.LutminAgentV46;window.LutminAgentV43=window.LutminAgentV45;window.LutminAgentV42=window.LutminAgentV45;window.LutminAgentV41=window.LutminAgentV45;window.LutminAgentV40=window.LutminAgentV45;window.LutminAgentV39=window.LutminAgentV45;window.LutminAgentV38=window.LutminAgentV45;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(window.ensureTalentAgentV40,0),{once:true});else setTimeout(window.ensureTalentAgentV40,0);
})();
