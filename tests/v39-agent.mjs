import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const job={id:'job-1',title:'Técnico de mantenimiento eléctrico',company_name:'Empresa Test',requirements:'electricidad mantenimiento preventivo Excel',description:'Diagnóstico de fallas, tableros eléctricos y atención de incidencias'};
const cv={
  file:{name:'cv-tecnico.pdf'}, parser:'semantic-v38', text:'Técnico de mantenimiento Serman NEA SRL electricidad mantenimiento preventivo Excel atención al cliente',
  quality:{score:94,warnings:[],experience_confidence:98},
  career:{years:7.8,months:93,roles:2,companies:2},
  fields:{headline:'Técnico de mantenimiento',bio:'Experiencia en mantenimiento edilicio'},
  experiences:[
    {position:'Técnico de mantenimiento',company:'Serman NEA SRL',start:'2021-03-01',end:null,current:true,description:'Mantenimiento preventivo y correctivo, diagnóstico de fallas y tableros eléctricos.'},
    {position:'Ayudante electricista',company:'Electro Norte SA',start:'2019-01-01',end:'2021-02-28',current:false,description:'Cableado y apoyo en instalaciones eléctricas.'}
  ],
  education:[{title:'Técnico electromecánico',institution:'EET 15',start:'2013-01-01',end:'2018-12-31'}],
  skills:[{skill:'Electricidad',kind:'explicit',excerpt:'Electricidad'},{skill:'Mantenimiento preventivo',kind:'inferred',excerpt:'mantenimiento preventivo'},{skill:'Microsoft Excel',kind:'explicit',excerpt:'Excel'}]
};

const store=new Map();
const elements=new Map([
  ['agentJobSelectV100',{value:'job-1'}],
  ['talentAgentV100',null],
  ['talentAgentV39',null],
  ['agentAnswerV100',null]
]);
const noop=()=>{};
const document={
  readyState:'loading',
  getElementById(id){return elements.get(id)||null;},
  addEventListener:noop,
  querySelector(){return null;},
  createElement(){return {appendChild:noop,classList:{add:noop,remove:noop},dataset:{}};}
};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const windowObj={
  LutminCvV38:{normalize:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+#. ]+/g,' ').replace(/\s+/g,' ').trim(),snapshot:()=>cv,careerSummary:()=>cv.career},
  buildAgentAnalysisV100:(j)=>({job:j,score:12,matched:[],missing:['electricidad','mantenimiento','excel'],skills:[],experiences:[],certs:[],relatedCourses:[],questions:[]}),
  addEventListener:noop
};
const context={
  window:windowObj,document,localStorage,console,setTimeout:()=>0,clearTimeout:noop,
  talentData:{profile:{approval_status:'approved'},jobs:[job],skills:[],experiences:[],certificates:[],applications:[],applicationDetails:{interviews:[]}},
  publicCatalog:[],calculateTalentProfileStrength:()=>({score:100,missing:[]}),
  showToast:noop,goToCampusTab:noop,openCvReviewV140:noop
};
windowObj.window=windowObj;
Object.assign(windowObj,{document,localStorage});
vm.createContext(context);
const code=fs.readFileSync(new URL('../assets/js/modules/agents/talent-agent-v39.js',import.meta.url),'utf8');
vm.runInContext(code,context,{filename:'talent-agent-v39.js'});

const agent=windowObj.LutminAgentV39;
assert(agent,'LutminAgentV39 no expuesto');
const a=agent.analysis(job);
assert(a.cv_source===true,'el análisis no está usando el CV');
assert(a.experiences.length>=2,'no incorporó experiencias del CV');
assert(a.experiences[0].company_name==='Serman NEA SRL','no normalizó empresa del CV');
assert(a.matched.some(x=>String(x).includes('electricidad')),'no encontró electricidad');
assert(a.score>12,'el CV no mejora el análisis documental');
const where=agent.answer('¿Qué hice en Serman?');
assert(/Serman NEA SRL/i.test(where),'no puede recuperar una empresa concreta del CV');
assert(/mantenimiento preventivo/i.test(where),'no devuelve evidencia de la experiencia');
const summary=agent.answer('¿Qué entendiste de mi CV?');
assert(/2 experiencia/i.test(summary),'resumen no reconoce experiencias');
assert(/7\.8 años/i.test(summary),'resumen no calcula trayectoria');
const gaps=agent.answer('¿Qué me falta para esta búsqueda?');
assert(/evidencia encontrada/i.test(gaps),'no explica evidencia/brechas para la búsqueda');
const interview=agent.answer('¿Cómo preparo la entrevista para esta búsqueda?');
assert(/Serman NEA SRL/i.test(interview),'entrevista no usa experiencia del CV');

console.log(JSON.stringify({ok:true,score:a.score,matched:a.matched,top_experience:a.experiences[0].company_name,checks:['cv-source','company-retrieval','career-summary','job-gaps','interview-grounding']},null,2));
