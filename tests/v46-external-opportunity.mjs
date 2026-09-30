import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const job={
  id:'external-demo',external:true,title:'Supervisor de mantenimiento',company_name:'Empresa externa',location:'Resistencia',
  requirements:'Excluyente: experiencia en mantenimiento preventivo y coordinación de equipos. Se requiere manejo de Excel. Deseable formación técnica.',
  description:'Coordinar mantenimiento preventivo y correctivo. Supervisar técnicos. Planificar tareas y controlar cumplimiento. Se valorará experiencia con tableros eléctricos.'
};
const cv={career:{years:5.2},experiences:[{position:'Técnico de mantenimiento',company:'Serman',start:'2021-01-01',current:true,description:'Mantenimiento preventivo y correctivo de tableros eléctricos. Coordinación de proveedores y registro de tareas.'}],education:[{title:'Técnico electromecánico',institution:'EET 15'}],skills:[{skill:'Mantenimiento preventivo'},{skill:'Excel'},{skill:'Liderazgo de equipos'}],certificates:[]};
const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../assets/js/modules/talent/cv-tailor-engine-v45.js',import.meta.url),'utf8'),ctx,{filename:'cv-tailor-engine-v45.js'});
const E=ctx.window.LutminTailorV45;
const pack=E.buildApplicationPack(job,cv,{name:'Persona Test'});
assert.equal(pack.job.external,true,'el pack perdió marca de oportunidad externa');
assert(pack.vacancy_spec.must_have.length>=2,'no estructuró requisitos principales');
assert(pack.vacancy_spec.nice_to_have.length>=1,'no detectó requisitos deseables');
assert(pack.vacancy_spec.responsibilities.length>=1,'no detectó responsabilidades');
assert(pack.evidence_ledger.some(x=>x.requirement==='Mantenimiento'&&x.status==='documented'),'no trazó mantenimiento a evidencia');
assert(pack.coverage_summary.mandatory_total>=1,'no resume requisitos obligatorios');
assert(['direct-experience','evidence-transition'].includes(pack.positioning.mode),'posicionamiento incoherente');
assert(pack.intro_message.includes('Supervisor de mantenimiento'),'mensaje no usa la oportunidad externa');
console.log(JSON.stringify({ok:true,source:pack.vacancy_spec.source,must:pack.vacancy_spec.must_have.map(x=>x.text),nice:pack.vacancy_spec.nice_to_have.map(x=>x.text),coverage:pack.coverage_summary,positioning:pack.positioning},null,2));
