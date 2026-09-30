// =========================================================
// LUTMIN V45.0 · VACANCY INTELLIGENCE / EVIDENCE GRAPH / APPLICATION PACK
// Motor determinístico local. Sin APIs externas ni inferencias no respaldadas.
// Convierte requisitos -> evidencia -> composición de CV específica.
// =========================================================
(function(){
  'use strict';

  const VERSION='45.0';
  const STOP=new Set(('que como para por con sin sobre desde hacia entre donde cuando cual cuales una uno unos unas los las del de al en y o u e es son ser se su sus tu tus mi mis el la un requisito requisitos requerido requerida requeridos requeridas experiencia experiencias experiencia laboral conocimientos conocimiento habilidad habilidades competencia competencias capacidad capacidades funciones funcion tareas tarea puesto puestos perfil perfiles trabajo trabajos empresa empresas persona personas valorable deseable excluyente preferentemente').split(/\s+/));
  const GENERIC=new Set(('gestion gestionar gestionando tecnico tecnica tecnicos tecnicas profesional profesionales formacion formacion continua equipo equipos cumplimiento orientacion orientado orientada capacidad capacidades experiencia conocimiento conocimientos responsabilidad responsabilidades disponibilidad manejo nivel buen buena avanzado avanzada intermedio intermedia basico basica').split(/\s+/));

  const FAMILIES={
    maintenance:{label:'Mantenimiento',kind:'domain',aliases:['mantenimiento','mantenimiento preventivo','mantenimiento correctivo','facility','facilities','servicios generales','infraestructura edilicia','electromecanico','electromecanica']},
    electrical:{label:'Electricidad',kind:'domain',aliases:['electricidad','electrico','electrica','electricista','tablero electrico','tableros electricos','cableado','baja tension','instalaciones electricas','electromecanico','electromecanica']},
    hvac:{label:'Climatización / refrigeración',kind:'domain',aliases:['refrigeracion','climatizacion','hvac','aire acondicionado','split','frio industrial']},
    plumbing:{label:'Plomería / fontanería',kind:'domain',aliases:['plomeria','fontaneria','sanitario','sanitarios','caneria','cañeria','agua potable']},
    construction:{label:'Construcción / obra',kind:'domain',aliases:['construccion','obra','albanil','albañil','durlock','pintura','carpinteria','cerramientos','obra civil']},
    logistics:{label:'Logística / stock',kind:'domain',aliases:['logistica','deposito','almacen','stock','reposicion','repositor','picking','expedicion','carga y descarga','inventario']},
    customer:{label:'Atención al cliente',kind:'domain',aliases:['atencion al cliente','atencion al publico','cliente','clientes','cajero','caja']},
    sales:{label:'Ventas',kind:'domain',aliases:['ventas','vendedor','comercial','venta consultiva','presupuesto comercial']},
    admin:{label:'Administración',kind:'domain',aliases:['administracion','administrativo','facturacion','tesoreria','cuentas corrientes']},
    hr:{label:'Recursos Humanos',kind:'domain',aliases:['recursos humanos','rrhh','seleccion','reclutamiento','liquidacion de sueldos','talento']},
    software:{label:'Software / sistemas',kind:'domain',aliases:['software','desarrollo web','desarrollador','programacion','javascript','typescript','react','node','sql','sistemas','frontend','backend']},
    quality:{label:'Calidad',kind:'domain',aliases:['calidad','iso 9001','auditoria','sistema de gestion','procedimientos','no conformidad']},
    safety:{label:'Seguridad e higiene',kind:'domain',aliases:['seguridad e higiene','higiene y seguridad','epp','riesgos','trabajo seguro','seguridad laboral']},
    leadership:{label:'Coordinación / liderazgo',kind:'soft',aliases:['coordinador','coordinacion','supervisor','supervision','jefe','liderazgo','lider de equipo','conduccion de equipos','personal a cargo']},
    operations:{label:'Operación / planificación',kind:'soft',aliases:['operaciones','operacion','planificacion','programacion de tareas','ordenes de trabajo','orden de trabajo','cronograma','seguimiento de tareas']},
    project:{label:'Gestión de proyectos',kind:'soft',aliases:['gestion de proyectos','project management','proyecto','proyectos','implementacion']},
    communication:{label:'Comunicación',kind:'soft',aliases:['comunicacion','presentacion','negociacion','trato con clientes','relacion con clientes']},
    excel:{label:'Excel',kind:'tool',aliases:['excel','microsoft excel','planillas de calculo']},
    powerbi:{label:'Power BI',kind:'tool',aliases:['power bi','powerbi']},
    sap:{label:'SAP',kind:'tool',aliases:['sap']},
    autocad:{label:'AutoCAD',kind:'tool',aliases:['autocad']},
    solidworks:{label:'SolidWorks',kind:'tool',aliases:['solidworks']},
    photoshop:{label:'Adobe Photoshop',kind:'tool',aliases:['photoshop','adobe photoshop']}
  };

  const ADJ={
    maintenance:new Set(['electrical','hvac','plumbing','construction','safety','operations']),
    electrical:new Set(['maintenance','safety']),hvac:new Set(['maintenance','safety']),plumbing:new Set(['maintenance']),construction:new Set(['maintenance','safety']),
    logistics:new Set(['operations']),customer:new Set(['sales','communication']),sales:new Set(['customer','communication']),admin:new Set(['operations']),hr:new Set(['admin','communication']),
    software:new Set(['operations','project']),quality:new Set(['operations','safety']),safety:new Set(['maintenance','construction','electrical','hvac','quality']),
    leadership:new Set(['operations','project']),operations:new Set(['leadership','project']),project:new Set(['leadership','operations'])
  };

  const QUALIFICATION_PATTERNS=[
    {id:'higher_education',label:'Formación técnica / universitaria',rx:/\b(universitari[oa]|ingenier[oaí]|tecnicatura|terciari[oa]|titulo tecnico|título técnico|graduad[oa])\b/i,weight:2.4},
    {id:'secondary',label:'Secundario completo',rx:/\b(secundari[oa].{0,16}(complet|finaliz)|titulo secundario|título secundario)\b/i,weight:1.6}
  ];
  const EXPERIENCE_PATTERNS=[
    {id:'years',rx:/\b(\d+)\s*(?:años|anos)\s*(?:de\s*)?experiencia\b/i},
    {id:'experience_required',rx:/\b(experiencia comprobable|experiencia previa|experiencia en|experiencia mínima|experiencia minima)\b/i}
  ];

  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+# ]+/g,' ').replace(/\s+/g,' ').trim();}
  function uniq(arr,key=x=>x){const seen=new Set();return (arr||[]).filter(x=>{const k=key(x);if(!k||seen.has(k))return false;seen.add(k);return true;});}
  function tokens(v){return uniq(normalize(v).split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)&&!GENERIC.has(x)));}
  function splitUnits(v){
    return uniq(String(v||'').replace(/\r/g,'\n').split(/(?:\n+|[•●▪◦]|\s+-\s+|;|,|(?<=[.!?])\s+)/).map(x=>x.replace(/^[-–—·•\s]+/,'').replace(/\s+/g,' ').trim()).filter(x=>x.length>=4),x=>normalize(x));
  }
  function familyHits(v){
    const n=` ${normalize(v)} `,out=new Map();
    for(const [id,f] of Object.entries(FAMILIES))for(const aliasRaw of f.aliases){const alias=normalize(aliasRaw);if(!alias)continue;const hit=alias.includes(' ')?n.includes(alias):n.includes(` ${alias} `);if(hit)out.set(id,(out.get(id)||0)+(alias.includes(' ')?2:1));}
    return out;
  }
  function relatedFamily(a,b){return a===b||ADJ[a]?.has(b)||ADJ[b]?.has(a);}
  function familyLabel(id){return FAMILIES[id]?.label||id;}
  function importantPhrases(text){
    const out=[];const n=normalize(text);
    for(const [id,f] of Object.entries(FAMILIES))if([...familyHits(n).keys()].includes(id))out.push(f.label);
    const raw=tokens(text).filter(x=>x.length>3).slice(0,16);return uniq([...out,...raw]);
  }

  function inferRequirements(job){
    const title=job?.title||'',requirements=job?.requirements||'',description=job?.description||'';
    const sources=[['title',title,3.4],['requirements',requirements,2.6],['description',description,1.4]];
    const map=new Map();
    for(const [source,text,baseWeight] of sources){
      const hits=familyHits(text);
      for(const [family,count] of hits){
        const f=FAMILIES[family];const key=`family:${family}`;const existing=map.get(key);const sourceBoost=source==='title'?1.25:source==='requirements'?1.1:1;
        const candidate={id:key,label:f.label,type:f.kind==='tool'?'tool':f.kind==='soft'?'soft':'domain',family,weight:baseWeight*sourceBoost+Math.min(1,count*.2),mandatory:source!=='description',sources:new Set([source]),terms:tokens(f.aliases.join(' '))};
        if(existing){existing.weight=Math.max(existing.weight,candidate.weight);existing.mandatory=existing.mandatory||candidate.mandatory;existing.sources.add(source);}else map.set(key,candidate);
      }
    }
    const all=`${title} ${requirements} ${description}`;
    for(const q of QUALIFICATION_PATTERNS)if(q.rx.test(all))map.set(`qualification:${q.id}`,{id:`qualification:${q.id}`,label:q.label,type:'qualification',weight:q.weight,mandatory:q.rx.test(requirements)||q.rx.test(title),sources:new Set([q.rx.test(requirements)?'requirements':'description']),terms:tokens(q.label)});
    let years=null;for(const p of EXPERIENCE_PATTERNS){const m=normalize(requirements).match(p.rx)||normalize(description).match(p.rx);if(m&&p.id==='years')years=Number(m[1]||0)||null;}
    if(years)map.set('experience:years',{id:'experience:years',label:`${years}+ años de experiencia`,type:'experience_years',years,weight:2.4,mandatory:true,sources:new Set(['requirements']),terms:['experiencia']});

    // Requisitos textuales concretos que no pertenecen a una familia conocida.
    // También tomamos responsabilidades específicas de la descripción para poder
    // seleccionar bullets como diagnóstico de fallas sin inventar una familia nueva.
    const clauseSources=[...splitUnits(requirements).slice(0,12).map(x=>['requirements',x]),...splitUnits(description).slice(0,12).map(x=>['description',x])];
    for(const [clauseSource,clause] of clauseSources){
      const ts=tokens(clause).filter(t=>t.length>3);
      if(ts.length<2)continue;
      const fh=[...familyHits(clause).keys()];if(fh.length)continue;
      if(QUALIFICATION_PATTERNS.some(q=>q.rx.test(clause)))continue;
      const mandatory=clauseSource==='requirements'&&/excluyente|requerid|required|indispensable|debe|deber[aá]|mínim|minim/i.test(clause);
      const key=`clause:${normalize(clause).slice(0,80)}`;
      const candidate={id:key,label:clause.length>70?clause.slice(0,67)+'…':clause,type:'clause',weight:clauseSource==='requirements'?(mandatory?2.2:1.5):1.0,mandatory,sources:new Set([clauseSource]),terms:ts.slice(0,8)};
      const prev=map.get(key);if(prev){prev.weight=Math.max(prev.weight,candidate.weight);prev.mandatory=prev.mandatory||candidate.mandatory;prev.sources.add(clauseSource);}else map.set(key,candidate);
    }

    return [...map.values()].map(r=>({...r,sources:[...r.sources]})).sort((a,b)=>(b.mandatory-a.mandatory)||b.weight-a.weight).slice(0,12);
  }

  function normalizeExp(x,index){return {id:`exp:${index}`,source:'experience',experience_index:index,title:x.position_title||x.position||'',company:x.company_name||x.company||'',start:x.start_date||x.start||null,end:x.end_date||x.end||null,current:!!(x.current_job||x.current),description:x.description||'',text:`${x.position_title||x.position||''} ${x.company_name||x.company||''} ${x.description||''}`.trim(),raw:x};}
  function contextEvidence(ctx){
    const out=[];
    (ctx?.experiences||[]).forEach((x,i)=>{
      const e=normalizeExp(x,i);out.push(e);
      const units=splitUnits(e.description);units.forEach((u,j)=>out.push({id:`exp:${i}:bullet:${j}`,source:'experience_bullet',experience_index:i,title:e.title,company:e.company,text:u,description:u,raw:x}));
    });
    (ctx?.skills||[]).forEach((x,i)=>out.push({id:`skill:${i}`,source:'skill',text:`${x.skill||''} ${x.excerpt||''}`.trim(),label:x.skill||'',raw:x}));
    (ctx?.education||[]).forEach((x,i)=>out.push({id:`education:${i}`,source:'education',text:`${x.title||''} ${x.institution||''} ${x.level||''}`.trim(),label:x.title||'',raw:x}));
    (ctx?.certificates||ctx?.certs||[]).forEach((x,i)=>out.push({id:`certificate:${i}`,source:'certificate',text:`${x.course_title||x.title||''} ${x.description||''}`.trim(),label:x.course_title||x.title||'',raw:x}));
    return out.map(e=>({...e,families:[...familyHits(e.text).keys()],terms:tokens(e.text)}));
  }

  function scoreEvidence(req,e){
    let score=0;const reasons=[];const reqTerms=req.terms||[];const eTerms=new Set(e.terms||tokens(e.text));
    const common=reqTerms.filter(t=>eTerms.has(t));
    if(req.family){
      if(e.families.includes(req.family)){score+=req.type==='soft'?55:72;reasons.push(familyLabel(req.family));}
      else{const adj=e.families.find(f=>relatedFamily(f,req.family));if(adj){score+=req.type==='soft'?25:38;reasons.push(`${familyLabel(adj)} relacionada con ${familyLabel(req.family)}`);}}
    }
    if(req.type==='qualification'){
      const n=normalize(e.text);if(e.source==='education'&&/(universitari|ingenier|tecnicatura|terciari|tecnico|secundari)/.test(n)){score+=75;reasons.push('Formación documentada');}
      else if(e.source==='certificate'){score+=20;reasons.push('Formación complementaria');}
    }
    if(req.type==='experience_years'&&e.source==='experience')score+=20;
    if(req.type==='clause')score+=Math.min(55,common.length*13);
    else score+=Math.min(24,common.length*6);
    if(e.source==='experience_bullet')score+=4;
    if(e.source==='skill'&&req.type==='tool')score+=8;
    if(e.source==='certificate'&&req.type==='domain')score+=4;
    return {score:Math.min(100,Math.round(score)),reasons:uniq(reasons),common};
  }

  function careerYears(ctx){
    if(Number(ctx?.career?.years)>0)return Number(ctx.career.years);
    const intervals=[];for(const x of ctx?.experiences||[]){const a=new Date(x.start_date||x.start||'');const b=x.current_job||x.current?new Date():new Date(x.end_date||x.end||'');if(Number.isFinite(a.getTime())&&Number.isFinite(b.getTime())&&b>=a)intervals.push([a,b]);}
    if(!intervals.length)return 0;intervals.sort((a,b)=>a[0]-b[0]);const merged=[];for(const it of intervals){const last=merged[merged.length-1];if(!last||it[0]>last[1])merged.push([...it]);else if(it[1]>last[1])last[1]=it[1];}const days=merged.reduce((s,[a,b])=>s+(b-a)/86400000,0);return Math.round((days/365.25)*10)/10;
  }

  function buildCoverage(job,ctx){
    const requirements=inferRequirements(job),evidence=contextEvidence(ctx),years=careerYears(ctx);
    let totalWeight=0,earned=0;
    for(const req of requirements){
      let matches=[];
      if(req.type==='experience_years'){
        const status=years>=req.years?'documented':years>0?'partial':'missing';const score=status==='documented'?100:status==='partial'?Math.min(70,Math.round(years/req.years*70)):0;
        matches=years?[{evidence:{id:'career:years',source:'career',text:`${years} años de trayectoria fechada`,label:`${years} años`},score,reasons:['Trayectoria fechada'],common:[]}]:[];
        req.result={status,score,matches,top:matches[0]||null};
      }else{
        matches=evidence.map(ev=>({evidence:ev,...scoreEvidence(req,ev)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
        const top=matches[0]||null;let status='missing';if(top?.score>=55)status='documented';else if(top?.score>=26)status='partial';
        req.result={status,score:top?.score||0,matches,top};
      }
      totalWeight+=req.weight;earned+=req.weight*(req.result.status==='documented'?1:req.result.status==='partial'?.45:0);
    }
    const score=totalWeight?Math.round(earned*100/totalWeight):0;
    return {version:VERSION,job,requirements,evidence,career_years:years,score,documented:requirements.filter(r=>r.result.status==='documented'),partial:requirements.filter(r=>r.result.status==='partial'),missing:requirements.filter(r=>r.result.status==='missing')};
  }

  function experienceClassification(ctx,coverage){
    return (ctx?.experiences||[]).map((x,i)=>{
      const direct=[],partial=[];let best=0;const bullets=[];
      const units=splitUnits(x.description||'');
      for(const req of coverage.requirements){
        for(const m of req.result.matches||[]){if(m.evidence.experience_index!==i)continue;best=Math.max(best,m.score);if(m.score>=55)direct.push(req.label);else if(m.score>=26)partial.push(req.label);}
      }
      for(const unit of units){let unitScore=0,reqLabel=null;for(const req of coverage.requirements){const scored=scoreEvidence(req,{source:'experience_bullet',experience_index:i,text:unit,families:[...familyHits(unit).keys()],terms:tokens(unit)});if(scored.score>unitScore){unitScore=scored.score;reqLabel=req.label;}}
        bullets.push({text:unit,score:unitScore,requirement:reqLabel});
      }
      bullets.sort((a,b)=>b.score-a.score);
      let relation='other';if(direct.length&&best>=55)relation='related';else if(partial.length||best>=26)relation='transferable';
      const selected=bullets.filter(b=>b.score>=26).slice(0,4);const neutral=bullets.filter(b=>b.score<26).slice(0,relation==='other'?2:1);
      return {company_name:x.company_name||x.company||'',position_title:x.position_title||x.position||'',start_date:x.start_date||x.start||null,end_date:x.end_date||x.end||null,current_job:!!(x.current_job||x.current),description:x.description||'',relation,relevance:best,reasons:uniq([...direct,...partial]).slice(0,5),selected_bullets:selected,neutral_bullets:neutral,omitted_bullets:Math.max(0,bullets.length-selected.length-neutral.length),raw:x};
    }).sort((a,b)=>({related:3,transferable:2,other:1}[b.relation]-{related:3,transferable:2,other:1}[a.relation])||b.relevance-a.relevance||String(b.start_date||'').localeCompare(String(a.start_date||'')));
  }

  function classifySimpleRows(rows,source,coverage,labelFn,textFn){
    return (rows||[]).map((x,i)=>{
      const ev={id:`${source}:${i}`,source,text:textFn(x),label:labelFn(x),raw:x,families:[...familyHits(textFn(x)).keys()],terms:tokens(textFn(x))};let best={score:0,req:null};
      for(const req of coverage.requirements){const m=scoreEvidence(req,ev);if(m.score>best.score)best={...m,req};}
      return {...x,label:labelFn(x),relevance:best.score,relation:best.score>=55?'relevant':best.score>=26?'transferable':'other',reasons:best.reasons||[],requirement:best.req?.label||null};
    }).sort((a,b)=>b.relevance-a.relevance);
  }

  function buildSummary(job,composition){
    const rel=composition.experience_groups.related,certs=composition.certificate_groups.relevant,edu=composition.education_groups.relevant,skills=composition.skill_groups.relevant;
    const documented=composition.coverage?.documented?.map(r=>r.label).filter(Boolean)||[];
    if(rel.length){
      const roles=uniq(rel.slice(0,2).map(x=>x.position_title).filter(Boolean));
      const focus=uniq([...documented.slice(0,4),...skills.slice(0,3).map(x=>x.skill||x.label),...certs.slice(0,2).map(x=>x.course_title||x.label)].filter(Boolean));
      return `${roles.length?`Experiencia documentada como ${roles.join(' y ')}`:'Experiencia laboral documentada'}${focus.length?`, con evidencia vinculada a ${focus.join(', ')}`:''}. Para esta postulación se priorizan únicamente antecedentes y tareas respaldados por la información disponible.`;
    }
    const compCert=[...composition.certificate_groups.relevant,...composition.certificate_groups.transferable],compEdu=[...composition.education_groups.relevant,...composition.education_groups.transferable],compSkills=[...composition.skill_groups.relevant,...composition.skill_groups.transferable];
    const ev=uniq([...documented.slice(0,4),...compCert.slice(0,2).map(x=>x.course_title||x.label),...compEdu.slice(0,2).map(x=>x.title||x.label),...compSkills.slice(0,4).map(x=>x.skill||x.label)].filter(Boolean));
    const previousRoles=uniq([...composition.experience_groups.transferable,...composition.experience_groups.other].slice(0,2).map(x=>x.position_title).filter(Boolean));
    if(ev.length)return `Perfil con evidencia documentada en ${ev.join(', ')}${previousRoles.length?`. Trayectoria laboral previa en ${previousRoles.join(' y ')}`:''}. No se presenta esa trayectoria como experiencia directa en ${job.title} cuando no existe respaldo suficiente.`;
    return `Trayectoria laboral y formación documentadas. Para ${job.title} no se identificó evidencia específica suficiente como para afirmar experiencia directa, por lo que el CV conserva los antecedentes reales sin forzar coincidencias.`;
  }

  function buildComposition(job,ctx,person={}){
    const coverage=buildCoverage(job,ctx);const experiences=experienceClassification(ctx,coverage);
    const skills=classifySimpleRows(ctx?.skills||[],'skill',coverage,x=>x.skill||'',x=>`${x.skill||''} ${x.excerpt||''}`);
    const education=classifySimpleRows(ctx?.education||[],'education',coverage,x=>x.title||'',x=>`${x.title||''} ${x.institution||''} ${x.level||''}`);
    const certs=classifySimpleRows(ctx?.certificates||ctx?.certs||[],'certificate',coverage,x=>x.course_title||x.title||'',x=>`${x.course_title||x.title||''} ${x.description||''}`);
    const groups={
      experience_groups:{related:experiences.filter(x=>x.relation==='related'),transferable:experiences.filter(x=>x.relation==='transferable'),other:experiences.filter(x=>x.relation==='other')},
      skill_groups:{relevant:skills.filter(x=>x.relation==='relevant'),transferable:skills.filter(x=>x.relation==='transferable'),other:skills.filter(x=>x.relation==='other')},
      education_groups:{relevant:education.filter(x=>x.relation==='relevant'),transferable:education.filter(x=>x.relation==='transferable'),other:education.filter(x=>x.relation==='other')},
      certificate_groups:{relevant:certs.filter(x=>x.relation==='relevant'),transferable:certs.filter(x=>x.relation==='transferable'),other:certs.filter(x=>x.relation==='other')}
    };
    const strategy=groups.experience_groups.related.length?'experience-first':(groups.skill_groups.relevant.length||groups.education_groups.relevant.length||groups.certificate_groups.relevant.length)?'evidence-first':'honest-general';
    const section_order=strategy==='experience-first'?['summary','coverage','related_experience','relevant_evidence','other_experience','education','certificates']:strategy==='evidence-first'?['summary','coverage','relevant_evidence','experience','education','certificates']:['summary','coverage','experience','education','certificates'];
    const composition={version:'LUTMIN-CV-TAILORED-V44',generated_at:new Date().toISOString(),job:{id:job?.id,title:job?.title,company_name:job?.company_name||'Lutmin',location:job?.location||''},person,coverage,...groups,strategy,section_order};
    composition.target_headline=`Perfil orientado a ${job?.title||'la oportunidad'}`;
    composition.summary=buildSummary(job,composition);
    composition.hidden={skills:groups.skill_groups.other.map(x=>x.skill||x.label).filter(Boolean),experience_detail:experiences.reduce((s,x)=>s+x.omitted_bullets,0)};
    composition.changes=[
      strategy==='experience-first'?`Prioriza ${groups.experience_groups.related.length} experiencia(s) con evidencia directa para la búsqueda.`:strategy==='evidence-first'?'Prioriza formación, certificaciones y competencias documentadas porque no hay experiencia laboral directa suficiente.':'No fuerza una adaptación que la evidencia no permite.',
      `Selecciona sólo descripciones de experiencia que respaldan requisitos concretos; ${composition.hidden.experience_detail} detalle(s) no relevantes se omiten del CV adaptado.`,
      composition.hidden.skills.length?`Oculta ${composition.hidden.skills.length} competencia(s) sin relación suficiente con esta oportunidad.`:'No detectó competencias claramente irrelevantes para ocultar.',
      'Mantiene intactos empresas, cargos, fechas y hechos documentados.'
    ];
    return composition;
  }

  function cleanBullet(text){
    let out=String(text||'').replace(/^[•·▪◦\-–—\s]+/,'').replace(/\s+/g,' ').trim();
    if(!out)return '';
    out=out.charAt(0).toUpperCase()+out.slice(1);
    if(!/[.!?]$/.test(out))out+='.';
    return out;
  }

  function buildIntroMessage(job,composition){
    if(!job||!composition)return '';
    const company=job.company_name&&job.company_name!=='Lutmin'?` en ${job.company_name}`:'';
    const rel=composition.experience_groups.related||[];
    const evidence=uniq([
      ...(composition.coverage?.documented||[]).slice(0,4).map(r=>r.label),
      ...(composition.skill_groups?.relevant||[]).slice(0,3).map(x=>x.skill||x.label),
      ...(composition.certificate_groups?.relevant||[]).slice(0,2).map(x=>x.course_title||x.label)
    ].filter(Boolean));
    if(rel.length){
      const roles=uniq(rel.slice(0,2).map(x=>x.position_title).filter(Boolean));
      return `Hola, me interesa postularme a ${job.title}${company}. Mi experiencia documentada incluye ${roles.join(' y ')}${evidence.length?`, con antecedentes vinculados a ${evidence.join(', ')}`:''}. Adjunto una versión de mi CV enfocada en la evidencia más relevante para esta búsqueda. Quedo a disposición para ampliar cualquier antecedente.`;
    }
    if(evidence.length)return `Hola, me interesa postularme a ${job.title}${company}. Si bien no presento experiencia laboral directa documentada en ese puesto, cuento con evidencia formativa y competencias vinculadas a ${evidence.join(', ')}. Adjunto mi CV con esos antecedentes diferenciados de mi experiencia laboral general. Quedo a disposición para ampliar la información.`;
    return `Hola, me interesa postularme a ${job.title}${company}. Adjunto mi CV con mi trayectoria y formación documentadas. Prefiero no atribuirme experiencia específica que no esté respaldada y quedo a disposición para ampliar cualquier antecedente relevante para la búsqueda.`;
  }

  function buildInterviewBrief(job,composition){
    if(!job||!composition)return [];
    return (composition.coverage?.requirements||[]).slice(0,8).map(req=>{
      const top=req.result?.top?.evidence||null;
      const status=req.result?.status||'missing';
      let prompt;
      if(status==='documented'&&top)prompt=`Prepará un ejemplo concreto que demuestre ${req.label} usando esta evidencia: ${top.text}.`;
      else if(status==='partial'&&top)prompt=`Podrían preguntarte por ${req.label}. La evidencia disponible es parcial: ${top.text}. Explicá el alcance real sin exagerarlo.`;
      else prompt=`No hay evidencia clara de ${req.label}. Si te preguntan, respondé con honestidad y diferenciá experiencia real de conocimientos que todavía necesitás desarrollar.`;
      return {requirement:req.label,status,evidence:top?.text||null,source:top?.source||null,prompt};
    });
  }

  function buildFocusedVersion(composition){
    if(!composition)return null;
    const rel=composition.experience_groups.related||[],trans=composition.experience_groups.transferable||[],other=composition.experience_groups.other||[];
    const relevantEvidence={
      skills:(composition.skill_groups.relevant||[]).slice(0,8),
      education:[...(composition.education_groups.relevant||[]),...(composition.education_groups.transferable||[])].slice(0,4),
      certificates:[...(composition.certificate_groups.relevant||[]),...(composition.certificate_groups.transferable||[])].slice(0,5)
    };
    const compact=x=>({...x,selected_bullets:(x.selected_bullets||[]).slice(0,3).map(b=>({...b,text:cleanBullet(b.text)})),neutral_bullets:[]});
    return {
      summary:composition.summary,
      evidence:relevantEvidence,
      related:rel.slice(0,4).map(compact),
      transferable:trans.slice(0,2).map(compact),
      other:(rel.length||trans.length?other.slice(0,3):other.slice(0,5)).map(x=>({...x,selected_bullets:[],neutral_bullets:[]})),
      omitted:{skills:(composition.skill_groups.other||[]).length,experience_details:composition.hidden?.experience_detail||0,experiences:Math.max(0,other.length-(rel.length||trans.length?3:5))}
    };
  }


  // -------------------------------------------------------------
  // V44 · VACANCY INTELLIGENCE
  // Estructura una oportunidad sin depender de IA externa.
  // Clasifica requisitos obligatorios/deseables, responsabilidades
  // y restricciones para que el CV no responda a una bolsa de palabras.
  // -------------------------------------------------------------
  const MUST_RX=/\b(excluyente|obligatori[oa]|indispensable|requisito(?:s)?|se requiere|deber[aá]|debe contar|mínim[oa]|comprobable|required|must have)\b/i;
  const NICE_RX=/\b(deseable|valorable|preferente(?:mente)?|se valorará|se valorara|plus|idealmente|nice to have)\b/i;
  const RESPONSIBILITY_RX=/^(coordinar|supervisar|liderar|gestionar|planificar|ejecutar|realizar|controlar|mantener|desarrollar|implementar|administrar|atender|resolver|asegurar|monitorear|analizar|organizar|relevar|diagnosticar|verificar|dar seguimiento|participar)\b/i;
  const MODALITY_RX=/\b(presencial|remoto|remota|h[ií]brido|h[ií]brida)\b/i;
  const SENIORITY_RX=/\b(junior|jr\.?|semi[\s-]?senior|ssr\.?|senior|sr\.?|jefatura|supervisor|coordinador|coordinadora|gerente|responsable)\b/i;

  function classifyVacancyUnit(raw,source='description'){
    const text=String(raw||'').replace(/\s+/g,' ').trim();
    if(!text)return null;
    const n=normalize(text);
    let bucket='context';
    if(MUST_RX.test(text)||source==='title')bucket='must';
    else if(NICE_RX.test(text))bucket='nice';
    else if(RESPONSIBILITY_RX.test(n))bucket='responsibility';
    else if(source==='requirements')bucket='must';
    else if(text.length>=16)bucket='responsibility';
    const years=(n.match(/\b(\d+)\s*(?:anos|años)\b/)||[])[1];
    return {
      text,
      normalized:n,
      bucket,
      source,
      years:years?Number(years):null,
      modality:(text.match(MODALITY_RX)||[])[1]||null,
      seniority:(text.match(SENIORITY_RX)||[])[1]||null
    };
  }

  function extractVacancySpec(job){
    const title=String(job?.title||'').trim();
    const requirementUnits=splitUnits(job?.requirements||'').slice(0,24).map(x=>classifyVacancyUnit(x,'requirements')).filter(Boolean);
    const descriptionUnits=splitUnits(job?.description||'').slice(0,30).map(x=>classifyVacancyUnit(x,'description')).filter(Boolean);
    const all=[...requirementUnits,...descriptionUnits];
    const key=x=>normalize(x.text);
    const must=uniq(all.filter(x=>x.bucket==='must'),key).slice(0,14);
    const nice=uniq(all.filter(x=>x.bucket==='nice'),key).slice(0,10);
    const responsibilities=uniq(all.filter(x=>x.bucket==='responsibility'&&!must.some(m=>key(m)===key(x))),key).slice(0,12);
    const text=`${title} ${job?.requirements||''} ${job?.description||''}`;
    const seniority=(text.match(SENIORITY_RX)||[])[1]||null;
    const modality=job?.modality||(text.match(MODALITY_RX)||[])[1]||null;
    const years=[...all.map(x=>x.years).filter(Boolean)];
    const education=QUALIFICATION_PATTERNS.filter(q=>q.rx.test(text)).map(q=>q.label);
    return {
      title,
      company_name:job?.company_name||null,
      location:job?.location||null,
      modality,
      seniority,
      years_required:years.length?Math.max(...years):null,
      must_have:must,
      nice_to_have:nice,
      responsibilities,
      education:uniq(education),
      source:job?.external?'external':'lutmin'
    };
  }

  function buildEvidenceLedger(composition){
    const rows=(composition?.coverage?.requirements||[]).map(req=>{
      const top=req.result?.top?.evidence||null;
      const status=req.result?.status||'missing';
      const source=top?.source||null;
      const sourceLabel=source==='experience'||source==='experience_bullet'?'Experiencia laboral':
        source==='skill'?'Competencia':source==='certificate'?'Certificación':
        source==='education'?'Formación':source==='career'?'Trayectoria':'Sin evidencia';
      return {
        requirement:req.label,
        mandatory:!!req.mandatory,
        status,
        evidence:top?.text||null,
        evidence_source:source,
        evidence_source_label:sourceLabel,
        score:Number(req.result?.score||0)
      };
    });
    return rows;
  }

  function summarizeCoverageLedger(rows){
    const mandatory=rows.filter(x=>x.mandatory);
    return {
      total:rows.length,
      documented:rows.filter(x=>x.status==='documented').length,
      partial:rows.filter(x=>x.status==='partial').length,
      missing:rows.filter(x=>x.status==='missing').length,
      mandatory_total:mandatory.length,
      mandatory_documented:mandatory.filter(x=>x.status==='documented').length,
      mandatory_partial:mandatory.filter(x=>x.status==='partial').length,
      mandatory_missing:mandatory.filter(x=>x.status==='missing').length
    };
  }

  function candidatePositioning(composition){
    const direct=(composition?.experience_groups?.related||[]).length;
    const transfer=(composition?.experience_groups?.transferable||[]).length;
    const evidence=(composition?.skill_groups?.relevant||[]).length+(composition?.education_groups?.relevant||[]).length+(composition?.certificate_groups?.relevant||[]).length;
    if(direct)return {mode:'direct-experience',label:'Experiencia directa documentada',message:`La postulación puede apoyarse en ${direct} experiencia${direct===1?'':'s'} laboral${direct===1?'':'es'} relacionada${direct===1?'':'s'}.`};
    if(evidence)return {mode:'evidence-transition',label:'Transición respaldada por evidencia',message:'No hay experiencia laboral directa suficiente, pero sí formación, certificaciones o competencias documentadas útiles para la oportunidad.'};
    if(transfer)return {mode:'transferable-only',label:'Experiencia transferible',message:'No hay experiencia directa; sólo se utilizarán antecedentes transferibles claramente diferenciados.'};
    return {mode:'exploratory',label:'Postulación exploratoria',message:'No hay evidencia específica suficiente. El CV conservará la trayectoria real sin forzar coincidencias.'};
  }

  function buildApplicationPack(job,ctx,person={}){
    const composition=buildComposition(job,ctx,person);
    const focused=buildFocusedVersion(composition);
    const intro_message=buildIntroMessage(job,composition);
    const interview=buildInterviewBrief(job,composition);
    const requirements=(composition.coverage?.requirements||[]).map(r=>({requirement:r.label,status:r.result?.status||'missing',evidence:r.result?.top?.evidence?.text||null,source:r.result?.top?.evidence?.source||null,mandatory:!!r.mandatory}));
    const ats_keywords=uniq(requirements.filter(r=>r.status!=='missing').map(r=>r.requirement)).slice(0,12);
    const evidence_integrity={
      documented:requirements.filter(r=>r.status==='documented').length,
      partial:requirements.filter(r=>r.status==='partial').length,
      missing:requirements.filter(r=>r.status==='missing').length,
      total:requirements.length,
      related_experiences:(composition.experience_groups.related||[]).length,
      selected_bullets:[...(composition.experience_groups.related||[]),...(composition.experience_groups.transferable||[])].reduce((n,x)=>n+(x.selected_bullets||[]).length,0)
    };
    const vacancy_spec=extractVacancySpec(job);
    const evidence_ledger=buildEvidenceLedger(composition);
    const coverage_summary=summarizeCoverageLedger(evidence_ledger);
    const positioning=candidatePositioning(composition);
    return {version:'LUTMIN-APPLICATION-PACK-V45',generated_at:new Date().toISOString(),job:{...composition.job,external:!!job?.external},composition,focused,intro_message,interview,requirements,ats_keywords,evidence_integrity,vacancy_spec,evidence_ledger,coverage_summary,positioning};
  }

  function coverageAnswer(coverage){return coverage.requirements.map(r=>({requirement:r.label,status:r.result.status,score:r.result.score,evidence:r.result.top?.evidence?.text||null,source:r.result.top?.evidence?.source||null}));}

  const api={VERSION,normalize,tokens,splitUnits,familyHits,inferRequirements,contextEvidence,scoreEvidence,buildCoverage,experienceClassification,buildComposition,buildApplicationPack,buildIntroMessage,buildInterviewBrief,buildFocusedVersion,coverageAnswer,extractVacancySpec,buildEvidenceLedger,summarizeCoverageLedger,candidatePositioning,FAMILIES};
  window.LutminTailorV45=api;
  window.LutminTailorV44=api;
  window.LutminTailorV43=api;
  window.LutminTailorV42=api; // compatibilidad temporal con runtimes históricos
})();
