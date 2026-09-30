import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../assets/js/modules/talent/cv-parser.js',import.meta.url),'utf8');
const sandbox={console,setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},window:null,document:{querySelector:()=>null,getElementById:()=>null,createElement:()=>({}),head:{appendChild:()=>{}}},showToast:()=>{},crypto:globalThis.crypto};
sandbox.window=sandbox;sandbox.window.dispatchEvent=()=>{};
vm.createContext(sandbox);vm.runInContext(code,sandbox,{filename:'cv-parser.js'});
const P=sandbox.LutminCvV38;
if(!P)throw new Error('LutminCvV38 missing');
if('v140State' in sandbox)throw new Error('standalone test must not provide v140State');
const cv1=`
JUAN PEREZ
Técnico de mantenimiento
Resistencia, Chaco
juan@mail.com
EXPERIENCIA LABORAL
Técnico de mantenimiento
Serman NEA SRL
Marzo 2021 - Actualidad
Mantenimiento preventivo y correctivo. Electricidad y tableros eléctricos.
Ayudante electricista
Electro Norte SA
01/2019 - 02/2021
Cableado, iluminación y reparación de fallas.
FORMACIÓN ACADÉMICA
E.E.T. N° 15
Técnico Electromecánico
2013 - 2018
HABILIDADES
Excel; Electricidad; Mantenimiento preventivo; Atención al cliente
IDIOMAS
Inglés - Intermedio
`;
const a=P.parseText(cv1);
if(a.experiences.length<2)throw new Error(`expected >=2 experiences got ${a.experiences.length}`);
if(!a.experiences.some(x=>/serman/i.test(x.company)))throw new Error('Serman company not parsed');
if(!a.experiences.some(x=>/tecnico de mantenimiento/i.test(P.normalize(x.position))))throw new Error('role not parsed');
if(a.education.length<1)throw new Error('education not parsed');
if(!a.skills.some(x=>/excel/i.test(x.skill)))throw new Error('Excel not parsed');
if(a.career.years<4)throw new Error('career years too low');
const cv2=`
MARIA LOPEZ
Analista de Recursos Humanos
EXPERIENCIA PROFESIONAL
Lutmin Consultora | Analista de RRHH
2024 - Presente
Selección de personal, legajos y administración de personal.
Coordinadora de Personas - Empresa Delta SAS
2021 - 2024
Coordinación de equipo y reclutamiento.
EDUCACIÓN
Universidad Nacional del Nordeste
Licenciatura en Relaciones Laborales
2016 - 2021
`;
const b=P.parseText(cv2);
if(b.experiences.length<2)throw new Error(`cv2 expected >=2 experiences got ${b.experiences.length}`);
if(!b.experiences.some(x=>/lutmin/i.test(x.company)))throw new Error('composite company/role not parsed');
console.log(JSON.stringify({ok:true,cv1:{experiences:a.experiences.length,education:a.education.length,skills:a.skills.length,career:a.career,quality:a.quality},cv2:{experiences:b.experiences.length,education:b.education.length,quality:b.quality}},null,2));
