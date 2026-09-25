import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {performance as nodePerformance} from 'node:perf_hooks';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const rel=p=>path.relative(root,p).replaceAll(path.sep,'/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const errors=[];const warnings=[];const metrics={};
const assert=(ok,msg)=>{if(!ok)errors.push(msg)};

function walk(dir){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name==='.test')continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())out.push(...walk(p));else out.push(p);
  }
  return out;
}

// 1) Sintaxis JS real del deploy.
const jsFiles=walk(path.join(root,'assets','js')).filter(p=>p.endsWith('.js')).concat([path.join(root,'sw.js')]);
let checked=0;
for(const file of jsFiles){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0)errors.push(`Sintaxis JS: ${rel(file)}: ${(r.stderr||r.stdout).trim()}`); else checked++;
}
metrics.js_checked=checked;

// 2) Estructura Admin V33: shell + 10 fragments + 2 módulos dinámicos.
const adminShell=read('assets/views/admin.html');
const staticModules=['overview','operations','academic','people','companies','commercial','finance','talent','communications','system'];
const dynamicModules=['development','agents'];
const expected=['overview','agents','operations','academic','people','companies','development','commercial','finance','talent','communications','system'];
for(const m of staticModules){
  const f=`assets/views/admin/${m}.html`;
  assert(fs.existsSync(path.join(root,f)),`Falta fragment Admin: ${f}`);
  const html=read(f);
  assert(html.includes(`data-admin-module-v19="${m}"`),`Fragment ${m} no declara su módulo`);
  assert(html.trim().length>50,`Fragment ${m} parece vacío`);
}
const nav=[...adminShell.matchAll(/data-admin-v19-btn="([^"]+)"/g)].map(m=>m[1]);
metrics.admin_top_modules=nav.length;
assert(JSON.stringify(nav)===JSON.stringify(expected),`Módulos superiores Admin inesperados: ${nav.join(', ')}`);
assert((adminShell.match(/id="adminModuleHostV32"/g)||[]).length===1,'El host Admin debe existir una sola vez');

// 3) IDs estáticos únicos en shell/fragments (un módulo se monta a la vez, pero evitamos colisiones accidentales).
const docs=[['admin.html',adminShell],...staticModules.map(m=>[`${m}.html`,read(`assets/views/admin/${m}.html`)])];
const ids=new Map();
for(const [name,html] of docs){
  for(const m of html.matchAll(/\bid="([^"]+)"/g)){
    const id=m[1]; if(!ids.has(id))ids.set(id,[]);ids.get(id).push(name);
  }
}
const dup=[...ids.entries()].filter(([,where])=>where.length>1);
assert(!dup.length,`IDs duplicados Admin: ${dup.map(([id,w])=>`${id}(${w.join(',')})`).join('; ')}`);
metrics.admin_static_ids=ids.size;
metrics.admin_shell_bytes=Buffer.byteLength(adminShell);

// 4) Rutas declaradas por loaders/SW: toda ruta local assets/* debe existir.
const routingFiles=['assets/js/core/module-loader-v33.js','assets/js/core/view-loader-v32.js','assets/js/core/admin-module-loader-v33.js','sw.js','index.html'];
const pathRefs=new Set();
for(const rf of routingFiles){
  const txt=read(rf);
  for(const m of txt.matchAll(/(?:\.\/)?(assets\/[A-Za-z0-9_./-]+\.(?:js|css|html))(?:\?[^'"`\s]*)?/g))pathRefs.add(m[1]);
}
for(const f of pathRefs)assert(fs.existsSync(path.join(root,f)),`Ruta local inexistente: ${f}`);
metrics.routed_assets=pathRefs.size;

// 5) Asegurar arquitectura nueva y no reintroducir loaders viejos en el index.
const index=read('index.html');
assert(index.includes('module-loader-v33.js?v=33.0'),'index no usa module-loader-v33');
assert(index.includes('admin-data-runtime-v33.js?v=33.0'),'index no usa admin-data-runtime-v33');
assert(index.includes('admin-module-loader-v33.js?v=33.0'),'index no usa admin-module-loader-v33');
assert(!index.includes('module-loader-v32.js'),'index todavía referencia module-loader-v32');
assert(!index.includes('admin-module-loader-v32.js'),'index todavía referencia admin-module-loader-v32');
const sw=read('sw.js');
assert(sw.includes("const VERSION='33.0'"),'Service Worker no está versionado 33.0');
assert(sw.includes("lutmin-runtime-v33-0"),'Cache runtime no corresponde a V33');

// 6) Reglas de navegación: Admin y Conecta no generan submenús laterales internos.
const workspace=read('assets/js/v19-workspaces.js');
assert(workspace.includes("new Set(['admin','companyConecta'])"),'Admin/Conecta no están marcados como navegación superior');
assert(!workspace.includes('oldSetAdminV190=typeof setAdminModuleV19'),'V19 todavía envuelve la navegación Admin');
assert(!workspace.includes('oldCompanyViewV190=typeof setCompanyConectaView'),'V19 todavía envuelve la navegación Conecta');
const demand=read('assets/js/modules/core/admin-demand-v33.js');
assert(!demand.includes('queueMicrotask(()=>loadForModule(module))'),'admin-demand todavía duplica carga por wrapper');

// 7) La carga Admin autenticada debe ser núcleo reducido, no todos los módulos.
const loader=read('assets/js/core/module-loader-v33.js');
assert(loader.includes('admin:adminBaseSet'),'Admin autenticado no usa adminBaseSet');
assert(!/admin\s*:\s*new Set\(scriptFiles\)/.test(loader),'Admin vuelve a cargar todos los scripts al autenticarse');
const fMap={};
for(const m of loader.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):'([^']+\.js)'/gm))fMap[m[1]]=m[2];
const baseLine=loader.match(/const adminBaseSet=new Set\(\[([^\]]+)\]\)/)?.[1]||'';
const baseKeys=[...baseLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let baseBytes=0;for(const k of baseKeys){const f=fMap[k];if(f&&fs.existsSync(path.join(root,f)))baseBytes+=fs.statSync(path.join(root,f)).size;}
const allScripts=[...loader.matchAll(/^\s*'([^']+\.js)',?$/gm)].map(m=>m[1]).filter(x=>x.startsWith('assets/js/'));
let allBytes=0;for(const f of allScripts){if(fs.existsSync(path.join(root,f)))allBytes+=fs.statSync(path.join(root,f)).size;}
metrics.admin_base_scripts=baseKeys.length;
metrics.admin_base_bytes=baseBytes;
metrics.optional_runtime_total_bytes=allBytes;
metrics.admin_initial_runtime_reduction_pct=allBytes?Number(((1-baseBytes/allBytes)*100).toFixed(1)):0;
assert(baseKeys.length<=7,`Núcleo Admin demasiado grande: ${baseKeys.length} scripts`);
assert(metrics.admin_initial_runtime_reduction_pct>=80,`Reducción runtime Admin insuficiente: ${metrics.admin_initial_runtime_reduction_pct}%`);

// 8) Datos primarios por módulo y cache compartida.
const dataRuntime=read('assets/js/core/admin-data-runtime-v33.js');
assert(dataRuntime.includes("finance:['profiles','accessRoles','courses','enrollments','offerings','leads','payments']"),'Mapa de datos Finanzas inesperado');
assert(dataRuntime.includes("communications:['profiles']"),'Comunicaciones no usa dataset mínimo esperado');
assert(dataRuntime.includes('state.inFlight.has(key)'),'Falta deduplicación de consultas concurrentes');
assert(dataRuntime.includes('Date.now()-cached.at<ttl'),'Falta TTL por dataset');
assert(dataRuntime.includes('invalidate(module)'),'Falta invalidación por módulo');

// 9) Prueba funcional del runtime de datos sin navegador ni red externa.
{
  const tables=[];
  const makeQuery=()=>{const q={select(){return q},order(){return q},eq(){return q},limit(){return q},maybeSingle(){return q},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q;};
  const store=new Map([['lutmin-admin-module-v19','finance']]);
  const ctx={console,performance:nodePerformance,Date,Promise,Map,Set,Array,Number,String,Boolean,Object,Math,JSON,
    window:null,document:{getElementById:()=>null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
    CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail}},
    currentLutminUser:{id:'admin-test',role:'admin'},showToast:()=>{},renderAdminPanel:()=>{},refreshAdminWorkspaceV19:()=>{},renderAdminCompanies:()=>{},renderBulkControlsV18:()=>{},
    adminProfiles:[],adminAccessRoles:[],adminCourses:[],adminLessons:[],adminEnrollments:[],adminProgressRows:[],adminAssessments:[],adminAssessmentQuestions:[],adminAssessmentAttempts:[],adminCertificates:[],adminStudentNotes:[],adminOfferings:[],adminCourseLeads:[],adminPayments:[],adminCompanies:[],adminCompanyMembers:[],
    supabaseClient:{from(table){tables.push(table);return makeQuery();}},loadAdminData:async()=>true
  };
  ctx.window=ctx;ctx.window.dispatchEvent=()=>{};
  vm.createContext(ctx);vm.runInContext(dataRuntime,ctx,{filename:'admin-data-runtime-v33.js'});
  const api=ctx.LutminV33AdminData;
  const q0=tables.length;await api.loadForModule('finance');const financeQ=tables.length-q0;
  const q1=tables.length;await api.loadForModule('communications');const commQ=tables.length-q1;
  const q2=tables.length;await api.loadForModule('people');const peopleQ=tables.length-q2;
  const q3=tables.length;await api.loadForModule('finance');const financeCachedQ=tables.length-q3;
  api.invalidate('leads');const q4=tables.length;await Promise.all([api.loadDataset('leads'),api.loadDataset('leads')]);const dedupeQ=tables.length-q4;
  metrics.data_runtime={finance_first:financeQ,communications_after_finance:commQ,people_after_finance:peopleQ,finance_cached:financeCachedQ,inflight_dedupe:dedupeQ};
  assert(financeQ===7,`Finanzas hizo ${financeQ} consultas primarias, esperaba 7`);
  assert(commQ===0,`Comunicaciones repitió ${commQ} consultas ya cacheadas`);
  assert(peopleQ===6,`Personas agregó ${peopleQ} consultas, esperaba 6 sobre cache compartida`);
  assert(financeCachedQ===0,`Finanzas no reutilizó cache: ${financeCachedQ} consultas`);
  assert(dedupeQ===1,`Deduplicación concurrente falló: ${dedupeQ} consultas para dos pedidos`);
}

// 10) Asset conocido heredado: se reporta, no se inventa.
if(index.includes('LOGO.png')&&!fs.existsSync(path.join(root,'LOGO.png')))warnings.push('LOGO.png sigue referenciado pero no estaba incluido en V31/V32; no se generó un logo ficticio.');

// 11) Smoke HTTP local de vistas y assets críticos.
const httpTargets=['/assets/views/admin.html',...staticModules.map(m=>`/assets/views/admin/${m}.html`),'/assets/js/core/module-loader-v33.js','/assets/js/core/admin-data-runtime-v33.js','/assets/js/core/admin-module-loader-v33.js','/sw.js'];
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  const clean=decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const file=path.resolve(root,clean||'index.html');
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let httpOk=0;
try{
  for(const t of httpTargets){
    const r=await fetch(`http://127.0.0.1:${port}${t}?v=33.0`);
    if(r.ok){await r.arrayBuffer();httpOk++;}else errors.push(`HTTP ${r.status}: ${t}`);
  }
}finally{await new Promise(resolve=>server.close(resolve));}
metrics.http_targets_ok=httpOk;
assert(httpOk===httpTargets.length,`Smoke HTTP incompleto: ${httpOk}/${httpTargets.length}`);

console.log(JSON.stringify({ok:errors.length===0,version:'33.0',metrics,warnings,errors},null,2));
process.exit(errors.length?1:0);
