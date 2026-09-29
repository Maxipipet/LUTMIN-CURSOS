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
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.test')continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}

// 1) Sintaxis de todo el JavaScript entregado.
const jsFiles=walk(path.join(root,'assets','js')).filter(p=>p.endsWith('.js')).concat([path.join(root,'sw.js')]);
let checked=0;
for(const file of jsFiles){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)errors.push(`Sintaxis JS: ${rel(file)}: ${(r.stderr||r.stdout).trim()}`);else checked++;}
metrics.js_checked=checked;

// 2) Vistas y fragments Admin.
const staticAdmin=['overview','operations','academic','people','companies','commercial','finance','talent','communications','system'];
const adminShell=read('assets/views/admin.html');
for(const m of staticAdmin){const f=`assets/views/admin/${m}.html`;assert(fs.existsSync(path.join(root,f)),`Falta fragment Admin ${f}`);assert(read(f).includes(`data-admin-module-v19="${m}"`),`Fragment Admin ${m} no declara módulo`);}
const adminNav=[...adminShell.matchAll(/data-admin-v19-btn="([^"]+)"/g)].map(m=>m[1]);
const expectedAdmin=['overview','agents','operations','academic','people','companies','development','commercial','finance','talent','communications','system'];
assert(JSON.stringify(adminNav)===JSON.stringify(expectedAdmin),`Nav Admin inesperada: ${adminNav.join(',')}`);
metrics.admin_top_modules=adminNav.length;

// 3) IDs estáticos únicos en todos los HTML que pueden convivir o montarse por workspace.
const htmlFiles=['index.html',...walk(path.join(root,'assets','views')).filter(p=>p.endsWith('.html')).map(rel)];
const ids=new Map();
for(const file of htmlFiles){const html=read(file);for(const m of html.matchAll(/\bid="([^"]+)"/g)){const id=m[1];if(!ids.has(id))ids.set(id,[]);ids.get(id).push(file);}}
const duplicates=[...ids.entries()].filter(([,where])=>where.length>1);
assert(!duplicates.length,`IDs estáticos duplicados: ${duplicates.slice(0,15).map(([id,w])=>`${id}(${w.join(',')})`).join('; ')}`);
metrics.static_ids=ids.size;

// 4) Todas las rutas locales declaradas existen.
const routing=['index.html','sw.js','assets/js/core/module-loader-v33.js','assets/js/core/view-loader-v32.js','assets/js/core/admin-module-loader-v33.js'];
const refs=new Set();
for(const rf of routing){for(const m of read(rf).matchAll(/(?:\.\/)?(assets\/[A-Za-z0-9_./-]+\.(?:js|css|html))(?:\?[^'"`\s]*)?/g))refs.add(m[1]);}
for(const f of refs)assert(fs.existsSync(path.join(root,f)),`Ruta local inexistente: ${f}`);
metrics.routed_assets=refs.size;

// 5) Versionado coherente: evita servir vistas V33 con app V34.
const index=read('index.html'),sw=read('sw.js'),viewLoader=read('assets/js/core/view-loader-v32.js'),updateManager=read('assets/js/core/update-manager-v32.js'),loader=read('assets/js/core/module-loader-v33.js');
assert(index.includes('?v=34.0'),'index no está versionado V34.0');
assert(!index.includes('?v=33.1'),'index conserva assets V33.1');
assert(sw.includes("const VERSION='34.0'"),'Service Worker no está en V34.0');
assert(sw.includes('lutmin-runtime-v34-0')&&sw.includes('lutmin-core-v34-0'),'Caches SW no son V34.0');
assert(viewLoader.includes("const VERSION='34.0'"),'View loader conserva versión anterior');
assert(updateManager.includes("const VERSION='34.0'"),'Update manager conserva versión anterior');
assert(loader.includes("const VERSION='34.0'"),'Module loader no está en V34.0');
assert(index.includes('workspace-nav-v34.js?v=34.0'),'Falta normalizador de navegación V34');
assert(sw.includes('workspace-nav-v34.js?v=34.0'),'SW no precachea normalizador V34');

// 6) Workspace isolation: el runtime se decide sólo por el acceso activo.
assert(loader.includes('company_admin:companyBaseSet'),'Empresa no usa shell base V34');
assert(loader.includes('return new Set(roleSets[role]||roleSets.student);'),'setForAccess no está aislado por workspace activo');
assert(!loader.includes('if(caps.student)set=union'),'Todavía mezcla runtime Alumno por capability');
assert(!loader.includes('if(caps.company)set=union'),'Todavía mezcla runtime Empresa por capability');
assert(!loader.includes("if(role==='admin'||caps.admin)"),'Un usuario admin todavía fuerza runtime Admin al entrar en otro workspace');
assert(loader.includes('ensureCompanySection'),'Falta lazy-load por sección de Empresa');

const fmap={};for(const m of loader.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):'([^']+\.js)'/gm))fmap[m[1]]=m[2];
const companyBaseLine=loader.match(/const companyBaseSet=new Set\(\[([^\]]+)\]\)/)?.[1]||'';
const companyKeys=[...companyBaseLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let companyBytes=0;for(const k of companyKeys){const f=fmap[k];if(f)companyBytes+=fs.statSync(path.join(root,f)).size;}
const allScripts=[...loader.matchAll(/^\s*'([^']+\.js)',?$/gm)].map(m=>m[1]).filter(x=>x.startsWith('assets/js/'));
let allBytes=0;for(const f of allScripts)if(fs.existsSync(path.join(root,f)))allBytes+=fs.statSync(path.join(root,f)).size;
metrics.company_base_scripts=companyKeys.length;metrics.company_base_bytes=companyBytes;metrics.optional_runtime_total_bytes=allBytes;metrics.company_base_reduction_pct=Number(((1-companyBytes/allBytes)*100).toFixed(1));
assert(companyKeys.length<=5,`Shell Empresa demasiado grande: ${companyKeys.length} scripts`);
assert(companyBytes<60000,`Shell Empresa supera 60 KB: ${companyBytes}`);
assert(metrics.company_base_reduction_pct>=90,`Reducción runtime Empresa insuficiente: ${metrics.company_base_reduction_pct}%`);

const ccLine=loader.match(/companyConecta:new Set\(\[([^\]]+)\]\)/)?.[1]||'';
const ccKeys=[...ccLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let ccBytes=0;for(const k of ccKeys){const f=fmap[k];if(f)ccBytes+=fs.statSync(path.join(root,f)).size;}
metrics.company_conecta_feature_scripts=ccKeys.length;metrics.company_conecta_feature_bytes=ccBytes;
assert(ccKeys.length<=3,`Conecta Empresa vuelve a arrastrar módulos ajenos: ${ccKeys.join(',')}`);
assert(ccBytes<160000,`Conecta Empresa demasiado pesado: ${ccBytes} bytes`);

// 7) No precargar bundles enteros ni CSS de features no abiertas.
assert(loader.includes('.slice(0,2).forEach'),'Preload no está limitado a recursos inmediatos');
assert(!loader.includes('Promise.all(cssFiles.map(loadCssOnce))'),'Todavía carga todo el CSS opcional en cada bundle');
assert(loader.includes('cssForSet(set)'),'No hay CSS selectivo por runtime');
const warmLine=loader.match(/const warmSet=new Set\(\[([^\]]+)\]\)/)?.[1]||'';
assert(!warmLine.includes('F.qa')&&!warmLine.includes('F.ux'),'Warm pre-login todavía descarga QA/UX sin conocer el acceso');

// 8) Empresa: no cargar Conecta ni módulos avanzados al abrir el portal base.
const core=read('assets/js/core/app-core.js');
const companyFn=core.match(/async function loadCompanyPortalData\(\)[\s\S]*?\n    }\n\n    function companyMemberCourseStatus/)?.[0]||'';
assert(companyFn&&!companyFn.includes('loadCompanyConectaData'),'Portal Empresa sigue cargando Conecta de forma anticipada');
const workspace=read('assets/js/v19-workspaces.js');
assert(workspace.includes('ensureCompanySection?.(key)'),'V19 no solicita runtime según sección Empresa');
assert(workspace.includes("window.LutminV29Data.load('company'"),'V19 no reutiliza cache al volver a Empresa');
const noAutoCompanyWrappers=[
  'assets/js/modules/academy/learning-paths-quality.js','assets/js/modules/academy/operations.js','assets/js/modules/academy/compliance.js',
  'assets/js/modules/talent/development.js','assets/js/modules/platform/superplatform.js','assets/js/modules/agents/autopilot.js','assets/js/v20-organizations-onboarding.js'
];
for(const f of noAutoCompanyWrappers){const t=read(f);assert(!/loadCompanyPortalData\s*=\s*async function[\s\S]{0,280}(loadCompanyCompetency|loadCompanyAcademy|loadCompanyCompliance|loadCompanyDevelopment|loadCompanyAutopilot|loadCompanyOnboarding)/.test(t),`${f} reintroduce carga Empresa automática`);}

// 9) Navegación: Conecta Alumno y Conecta Empresa no pueden quedar simultáneamente visibles.
const nav=read('assets/js/core/workspace-nav-v34.js');
assert(nav.includes("company_admin:new Set(['company','company-conecta','notifications','support','profile'])"),'Regla de navegación Empresa inesperada');
assert(nav.includes("student:new Set(['dashboard','courses','agenda','activities','certificates','talent'"),'Regla de navegación Alumno incompleta');
assert(nav.includes("canonical"),'Falta preferencia canónica para tabs duplicados heredados');
assert(core.includes('window.LutminV34Nav?.apply?.(currentLutminUser.role)'),'paintCurrentLutminUser no normaliza navegación');
assert(workspace.includes("new Set(['admin','companyConecta'])"),'Admin/Conecta podrían volver a crear submenús laterales');

// 10) Admin V33 sigue conservando demanda/cache y no regresiona.
const dataRuntime=read('assets/js/core/admin-data-runtime-v33.js');
assert(dataRuntime.includes("finance:['profiles','accessRoles','courses','enrollments','offerings','leads','payments']"),'Mapa Finanzas cambió inesperadamente');
assert(dataRuntime.includes('state.inFlight.has(key)'),'Se perdió deduplicación concurrente Admin');
assert(dataRuntime.includes('Date.now()-cached.at<ttl'),'Se perdió TTL Admin');

// 11) Prueba funcional de cache Admin sin navegador.
{
  const tables=[];const makeQuery=()=>{const q={select(){return q},order(){return q},eq(){return q},limit(){return q},maybeSingle(){return q},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q;};
  const store=new Map([['lutmin-admin-module-v19','finance']]);
  const ctx={console,performance:nodePerformance,Date,Promise,Map,Set,Array,Number,String,Boolean,Object,Math,JSON,window:null,document:{getElementById:()=>null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail}},currentLutminUser:{id:'admin-test',role:'admin'},showToast:()=>{},renderAdminPanel:()=>{},refreshAdminWorkspaceV19:()=>{},renderAdminCompanies:()=>{},renderBulkControlsV18:()=>{},adminProfiles:[],adminAccessRoles:[],adminCourses:[],adminLessons:[],adminEnrollments:[],adminProgressRows:[],adminAssessments:[],adminAssessmentQuestions:[],adminAssessmentAttempts:[],adminCertificates:[],adminStudentNotes:[],adminOfferings:[],adminCourseLeads:[],adminPayments:[],adminCompanies:[],adminCompanyMembers:[],supabaseClient:{from(table){tables.push(table);return makeQuery();}},loadAdminData:async()=>true};
  ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(dataRuntime,ctx,{filename:'admin-data-runtime-v33.js'});
  const api=ctx.LutminV33AdminData;const q0=tables.length;await api.loadForModule('finance');const finance=tables.length-q0;const q1=tables.length;await api.loadForModule('communications');const comm=tables.length-q1;const q2=tables.length;await api.loadForModule('finance');const cached=tables.length-q2;api.invalidate('leads');const q3=tables.length;await Promise.all([api.loadDataset('leads'),api.loadDataset('leads')]);const dedupe=tables.length-q3;
  metrics.admin_data={finance_first:finance,communications_after_finance:comm,finance_cached:cached,inflight_dedupe:dedupe};
  assert(finance===7,`Finanzas hizo ${finance} consultas, esperaba 7`);assert(comm===0,`Comunicaciones repitió ${comm} consultas`);assert(cached===0,`Finanzas no reutilizó cache`);assert(dedupe===1,`Deduplicación Admin falló: ${dedupe}`);
}

// 12) Puente Supabase V33.1 permanece: evita regresión del video gate.
assert(core.includes("exposeLutminRuntimeGlobal('supabaseClient', () => supabaseClient)"),'Se perdió bridge Supabase para módulos lazy');
assert(read('assets/js/v24-1-video-gate.js').includes("window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null)"),'Video gate perdió fallback Supabase');

// 13) Smoke HTTP local de todos los HTML y rutas críticas.
const targets=['/index.html','/sw.js','/assets/js/core/workspace-nav-v34.js','/assets/js/core/module-loader-v33.js','/assets/js/core/view-loader-v32.js','/assets/js/core/app-core.js',...walk(path.join(root,'assets','views')).filter(p=>p.endsWith('.html')).map(p=>'/'+rel(p))];
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://127.0.0.1');const clean=decodeURIComponent(u.pathname).replace(/^\/+/, '');const file=path.resolve(root,clean||'index.html');if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.writeHead(200);fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;let ok=0;
try{for(const t of targets){const r=await fetch(`http://127.0.0.1:${port}${t}?v=34.0`);if(r.ok){await r.arrayBuffer();ok++;}else errors.push(`HTTP ${r.status}: ${t}`);}}finally{await new Promise(r=>server.close(r));}
metrics.http_targets_ok=ok;assert(ok===targets.length,`Smoke HTTP incompleto ${ok}/${targets.length}`);

if(index.includes('LOGO.png')&&!fs.existsSync(path.join(root,'LOGO.png')))warnings.push('LOGO.png continúa referenciado pero no está en el deploy original recibido; no se inventó un asset.');

console.log(JSON.stringify({ok:errors.length===0,version:'34.0',metrics,warnings,errors},null,2));
process.exit(errors.length?1:0);
