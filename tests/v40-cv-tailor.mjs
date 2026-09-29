import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const job={id:'job-1',title:'Coordinador/a de mantenimiento',company_name:'Empresa Test',location:'Resistencia',requirements:'mantenimiento gestión técnicos liderazgo equipos cumplimiento',description:'Coordinación técnica y planificación'};
const cv={
  file:{name:'CV-Maximiliano.pdf'},quality:{score:94,warnings:[]},career:{years:7.8},
  fields:{headline:'Técnico de mantenimiento',bio:'Experiencia en mantenimiento preventivo y coordinación operativa.',email:'max@test.com',phone:'123',city:'Resistencia',province:'Chaco'},
  experiences:[
    {position:'Técnico de mantenimiento',company:'Serman NEA SRL',start:'2021-03-01',current:true,description:'Mantenimiento preventivo, coordinación de equipos y diagnóstico técnico.'},
    {position:'Ayudante electricista',company:'Electro Norte',start:'2019-01-01',end:'2021-02-28',description:'Instalaciones eléctricas.'}
  ],
  education:[{title:'Técnico electromecánico',institution:'EET 15',end:'2018-12-01'}],
  skills:[{skill:'Mantenimiento'},{skill:'Liderazgo'},{skill:'Gestión'}],text:'mantenimiento gestion tecnicos liderazgo equipos cumplimiento'
};
const store=new Map([['lutmin-agent-v40',JSON.stringify({last_job_id:'job-1',mode:'tailor'})]]);
const host={id:'talentAgentV39',innerHTML:'',dataset:{},scrollIntoView(){}};
const card={classList:{add(){}},appendChild(){}};
const select={value:'job-1'};
const elements=new Map([['talentAgentV100',card],['talentAgentV39',host],['agentJobSelectV100',select]]);
const noop=()=>{};
const document={
  readyState:'loading',scripts:[],head:{appendChild(){}},
  getElementById:id=>elements.get(id)||null,
  addEventListener:noop,createElement:()=>({id:'',appendChild:noop,classList:{add:noop,remove:noop}})
};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
let savedName='';
class FakePdf{
  constructor(){this.pages=1;} setFont(){} setFontSize(){} setTextColor(){} setFillColor(){} roundedRect(){}
  text(){} splitTextToSize(t){return [String(t||'')];} addPage(){this.pages++;} getNumberOfPages(){return this.pages;} setPage(){}
  save(name){savedName=name;}
}
const windowObj={
  LutminCvV38:{normalize:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+#. ]+/g,' ').replace(/\s+/g,' ').trim(),snapshot:()=>cv,careerSummary:()=>cv.career},
  buildAgentAnalysisV100:j=>({job:j,score:23,matched:['mantenimiento','gestion','liderazgo'],missing:['universitaria','ingenieria'],skills:[{skill:'Mantenimiento',level:4,_r:3},{skill:'Liderazgo',level:3,_r:2}],experiences:[{company_name:'Serman NEA SRL',position_title:'Técnico de mantenimiento',start_date:'2021-03-01',current_job:true,description:'Mantenimiento preventivo, coordinación de equipos.',_r:4}],certs:[],education:[],relatedCourses:[],questions:['Pregunta']}),
  ensureJsPdfLib:async()=>true,jspdf:{jsPDF:FakePdf},addEventListener:noop
};
const context={
  window:windowObj,document,localStorage,console,setTimeout:()=>0,clearTimeout:noop,setInterval,clearInterval,
  talentData:{profile:{headline:'Técnico de mantenimiento',bio:'Experiencia real',approval_status:'approved'},jobs:[job],skills:[],experiences:[],certificates:[],applications:[],applicationDetails:{interviews:[]}},
  currentLutminUser:{id:'u1',fullName:'Maximiliano Test',email:'max@test.com'},
  calculateTalentProfileStrength:()=>({score:88,missing:[]}),showToast:noop
};
windowObj.window=windowObj;Object.assign(windowObj,{document,localStorage});
vm.createContext(context);
const code=fs.readFileSync(new URL('../assets/js/modules/agents/talent-agent-v40.js',import.meta.url),'utf8');
vm.runInContext(code,context,{filename:'talent-agent-v40.js'});

windowObj.ensureTalentAgentV40();
assert(host.innerHTML.includes('Un CV distinto para cada oportunidad'),'la propuesta diferencial no está en el hero');
assert(host.innerHTML.includes('Descargar CV adaptado'),'el CTA de CV adaptado no es visible');
assert(host.innerHTML.includes('Preparar postulación con este CV'),'la postulación no referencia el CV adaptado');
assert(!host.innerHTML.includes('¿Qué querés hacer hoy?'),'sigue presente el flujo engorroso V39');
const tailored=windowObj.LutminAgentV40.buildTailoredCv(job);
assert.equal(tailored.job.id,'job-1');
assert.equal(tailored.experiences[0].company_name,'Serman NEA SRL');
assert(tailored.focus.includes('mantenimiento'),'no prioriza evidencia de la búsqueda');
assert.equal(tailored.source.cv_loaded,true,'no usa el CV cargado');
assert.equal(typeof windowObj.downloadSmartCvV100,'function','no reemplazó el generador histórico');
const ok=await windowObj.downloadSmartCvV100('job-1');
assert.equal(ok,true,'falló la generación de PDF');
assert(/CV_maximiliano-test_coordinador-a-de-mantenimiento\.pdf/i.test(savedName),`nombre de PDF inesperado: ${savedName}`);
console.log(JSON.stringify({ok:true,hero:true,tailored_company:tailored.experiences[0].company_name,focus:tailored.focus,pdf:savedName},null,2));
