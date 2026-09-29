import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const job={id:'job-maint',title:'Coordinador/a de mantenimiento',company_name:'Lutmin',location:'Córdoba',requirements:'coordinación formación técnica universitaria ingeniería',description:'Responsable por mantenimiento preventivo, cumplimiento y coordinación de equipos técnicos'};
const cv={
  file:{name:'CV-real.pdf'},quality:{score:90,warnings:[]},career:{years:2.1},
  fields:{headline:'Atención al público y reposición',bio:'Experiencia en atención al público, reposición y control de stock.',email:'test@test.com',city:'Córdoba'},
  experiences:[
    {position:'Atención al Público y Stock',company:'Kiosco Familia',start:'2021-01-01',end:'2021-03-31',description:'Atención al público, caja y control de stock.'},
    {position:'Tareas de Reposición y Atención al Público',company:'JAZ Autoservicio',start:'2020-01-01',end:'2021-12-31',description:'Reposición de mercadería y atención a clientes.'}
  ],
  education:[],
  skills:[
    {skill:'Mantenimiento preventivo',excerpt:'Curso y práctica formativa de mantenimiento preventivo'},
    {skill:'Liderazgo de equipos',excerpt:'Competencia declarada'},
    {skill:'Gestión de operaciones',excerpt:'Competencia declarada'},
    {skill:'Gestión de stock',excerpt:'Control de stock en comercio'},
    {skill:'Seguridad en trabajos técnicos',excerpt:'Formación técnica'},
    {skill:'Atención al cliente',excerpt:'Experiencia comercial'},
    {skill:'Adobe Photoshop',excerpt:'Herramienta de diseño'}
  ],text:'atencion al publico reposicion stock mantenimiento preventivo seguridad trabajos tecnicos liderazgo equipos'
};
const store=new Map([['lutmin-agent-v41',JSON.stringify({last_job_id:'job-maint',mode:'tailor'})]]);
const host={id:'talentAgentV39',innerHTML:'',dataset:{},scrollIntoView(){}};
const card={classList:{add(){}},appendChild(){}};
const select={value:'job-maint'};
const elements=new Map([['talentAgentV100',card],['talentAgentV39',host],['agentJobSelectV100',select]]);
const noop=()=>{};
const document={readyState:'loading',scripts:[],head:{appendChild(){}},getElementById:id=>elements.get(id)||null,addEventListener:noop,createElement:()=>({id:'',appendChild:noop,classList:{add:noop,remove:noop}})};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
let savedName=''; const pdfText=[];
class FakePdf{constructor(){this.pages=1;}setFont(){}setFontSize(){}setTextColor(){}setFillColor(){}roundedRect(){}text(t){pdfText.push(String(t));}splitTextToSize(t){return [String(t||'')];}addPage(){this.pages++;}getNumberOfPages(){return this.pages;}setPage(){}save(name){savedName=name;}}
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+#. ]+/g,' ').replace(/\s+/g,' ').trim();
const windowObj={
  LutminCvV38:{normalize,snapshot:()=>cv,careerSummary:()=>cv.career},
  buildAgentAnalysisV100:j=>({job:j,score:23,matched:['mantenimiento','gestion','tecnicos','liderazgo','equipos','cumplimiento'],missing:['coordinacion','formacion','tecnica','universitaria','ingenieria'],skills:[],experiences:[],certs:[],education:[],relatedCourses:[],questions:['Pregunta']}),
  ensureJsPdfLib:async()=>true,jspdf:{jsPDF:FakePdf},addEventListener:noop
};
const context={window:windowObj,document,localStorage,console,setTimeout:()=>0,clearTimeout:noop,setInterval,clearInterval,
  talentData:{profile:{headline:'Atención al público',bio:'Experiencia comercial',approval_status:'approved'},jobs:[job],skills:[
    {skill:'Mantenimiento preventivo',level:3},{skill:'Liderazgo de equipos',level:3},{skill:'Gestión de operaciones',level:3},{skill:'Gestión de stock',level:3},{skill:'Seguridad en trabajos técnicos',level:3},{skill:'Atención al cliente',level:3},{skill:'Adobe Photoshop',level:3}
  ],experiences:[],certificates:[{course_title:'Electricidad Domiciliaria',duration_hours:36,code:'LUT-2026-TEST'}],applications:[],applicationDetails:{interviews:[]}},
  currentLutminUser:{id:'u1',fullName:'Persona Test',email:'test@test.com'},calculateTalentProfileStrength:()=>({score:88,missing:[]}),showToast:noop,
  pendingSmartApplicationV100:null,ensureV100Modal:()=>({querySelector:()=>({innerHTML:''})}),showV100Modal:noop,hideV100Modal:noop,confirmSmartApplyV100:noop
};
windowObj.window=windowObj;Object.assign(windowObj,{document,localStorage});
vm.createContext(context);
const code=fs.readFileSync(new URL('../assets/js/modules/agents/talent-agent-v41.js',import.meta.url),'utf8');
vm.runInContext(code,context,{filename:'talent-agent-v41.js'});

windowObj.ensureTalentAgentV40();
const tailored=windowObj.LutminAgentV41.buildTailoredCv(job);
assert.equal(tailored.experience_groups.related.length,0,'clasificó experiencia comercial/stock como mantenimiento');
assert.equal(tailored.experience_groups.other.length,2,'las experiencias no relacionadas no quedaron separadas');
assert(host.innerHTML.includes('No encontré experiencia laboral directamente relacionada'),'la interfaz no dice claramente que no hay experiencia relacionada');
assert(host.innerHTML.includes('Otra experiencia laboral'),'no separa otra experiencia');
assert(tailored.certificate_groups.relevant.some(x=>x.course_title==='Electricidad Domiciliaria'),'no detectó certificación técnica relevante/adyacente');
assert(!tailored.skill_groups.relevant.some(x=>x.skill==='Adobe Photoshop'),'priorizó Photoshop para mantenimiento');
assert(!tailored.skill_groups.relevant.some(x=>x.skill==='Atención al cliente'),'priorizó atención al cliente como competencia técnica de mantenimiento');
const ok=await windowObj.downloadSmartCvV100('job-maint');
assert.equal(ok,true,'falló PDF personalizado');
assert(pdfText.some(x=>x.includes('Evidencia relevante para esta oportunidad')),'el PDF no cambia de estructura para priorizar evidencia real');
assert(pdfText.some(x=>x==='Experiencia laboral'),'el PDF no conserva experiencia no relacionada en sección neutral');
assert(!pdfText.some(x=>x.includes('MÁS RELACIONADA')),'el PDF vuelve a afirmar falsa experiencia relacionada');
assert(/CV_persona-test_coordinador-a-de-mantenimiento\.pdf/i.test(savedName),`nombre inesperado ${savedName}`);
console.log(JSON.stringify({ok:true,related:tailored.experience_groups.related.length,other:tailored.experience_groups.other.map(x=>x.position_title),relevant_skills:tailored.skill_groups.relevant.map(x=>x.skill),relevant_certs:tailored.certificate_groups.relevant.map(x=>x.course_title),strategy:tailored.strategy,pdf:savedName},null,2));
