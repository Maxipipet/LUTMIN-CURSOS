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


// 2B) Empresa: módulos superiores y un solo contenido activo.
const companyView=read('assets/views/company.html');
const companyTop=[...companyView.matchAll(/data-v341-company-key="([^"]+)"/g)].map(m=>m[1]);
const expectedCompany=['summary','team','onboarding','training','agenda','compliance','development','autopilot'];
assert(JSON.stringify(companyTop)===JSON.stringify(expectedCompany),`Nav Empresa inesperada: ${companyTop.join(',')}`);
const companyPanels=[...companyView.matchAll(/data-company-module-panel="([^"]+)"/g)].map(m=>m[1]);
assert(JSON.stringify(companyPanels)===JSON.stringify(expectedCompany),`Paneles Empresa inesperados: ${companyPanels.join(',')}`);
assert(companyView.includes('id="companyModuleNavV341"'),'Falta navegación superior Empresa');
metrics.company_top_modules=companyTop.length;


// 2C) Conecta Alumno: un solo acceso lateral, módulos internos arriba y panel único.
const talentView=read('assets/views/talent.html');
const talentTop=[...talentView.matchAll(/data-talent-module-key="([^"]+)"/g)].map(m=>m[1]);
const expectedTalent=['summary','profile','jobs','applications','interviews','organizations','career','timeline','saved','agent','passport'];
assert(JSON.stringify(talentTop)===JSON.stringify(expectedTalent),`Nav Conecta Alumno inesperada: ${talentTop.join(',')}`);
const talentPanels=[...talentView.matchAll(/data-talent-module-panel="([^"]+)"/g)].map(m=>m[1]);
assert(JSON.stringify(talentPanels)===JSON.stringify(expectedTalent),`Paneles Conecta Alumno inesperados: ${talentPanels.join(',')}`);
assert(!read('index.html').includes('studentConectaSubnavV183'),'Conecta Alumno reintrodujo submenú lateral');
assert(read('index.html').includes('id="studentConectaParentV183"'),'Falta acceso único Lutmin Conecta en sidebar');
const conectaRouter=read('assets/js/core/talent-router-v38.js');
assert(conectaRouter.includes('openTalentModuleV38'),'Conecta Alumno no tiene router único estable');
assert(conectaRouter.includes("document.addEventListener('click'"),'Conecta Alumno no usa delegación estable de eventos');
assert(conectaRouter.includes("sessionStorage.setItem('lutmin-talent-module-v38'"),'Conecta Alumno no conserva módulo activo');
assert(!talentView.includes('onclick="openConecta'),'Conecta Alumno conserva handlers inline legacy en los módulos superiores');
assert(read('assets/js/v20-organizations-onboarding.js').includes("talentOrganizationsHostV342"),'Organizaciones no monta en módulo Conecta');
assert(read('assets/js/v20-organizations-onboarding.js').includes("talentTimelineHostV342"),'Trayectoria no monta en módulo Conecta');
assert(read('assets/js/modules/platform/superplatform.js').includes("talentAgentHostV342"),'Agente no monta en módulo Conecta');
assert(read('assets/js/modules/talent/evidence-career.js').includes("talentCareerHostV342"),'Carrera no monta en módulo Conecta');
assert(read('assets/js/modules/agents/autopilot.js').includes("talentPassportHostV342"),'Pasaporte no monta en módulo Conecta');
assert(!read('assets/js/v21-conecta-hub.js').includes('conectaHubGridV210'),'Conecta V21 reintroduce una segunda navegación superior');
metrics.talent_top_modules=talentTop.length;

// 2D) Pie de workspace: no repetir Portal Empresa/Administración como badge adicional.
const workspaceCommand=read('assets/js/modules/core/workspaces-command.js');
assert(!workspaceCommand.includes("badge.id='workspaceBadgeV160'"),'Se volvió a inyectar badge redundante del workspace en el pie');
assert(workspaceCommand.includes("workspaceBadgeV160')?.remove()"),'No se limpia badge heredado del workspace');
assert(read('assets/css/v19-workspaces.css').includes('.v160-workspace-chip{'),'Faltan estilos V16 usados por Centro de decisión');

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
assert(index.includes('?v=41.0'),'index no está versionado V41.0');
assert(!index.includes('?v=33.1'),'index conserva assets V33.1');
assert(sw.includes("const VERSION='41.0'"),'Service Worker no está en V41.0');
assert(sw.includes('lutmin-runtime-v41-0')&&sw.includes('lutmin-core-v41-0'),'Caches SW no son V41.0');
assert(viewLoader.includes("const VERSION='41.0'"),'View loader conserva versión anterior');
assert(updateManager.includes("const VERSION='41.0'"),'Update manager conserva versión anterior');
assert(loader.includes("const VERSION='41.0'"),'Module loader no está en V41.0');
assert(index.includes('workspace-nav-v34.js?v=41.0'),'Falta normalizador de navegación V34');
assert(sw.includes('workspace-nav-v34.js?v=41.0'),'SW no precachea normalizador V34');

// 6) Workspace isolation: el runtime se decide sólo por el acceso activo.
assert(loader.includes('company_admin:companyBaseSet'),'Empresa no usa shell base V35');
assert(loader.includes('return new Set(roleSets[role]||roleSets.student);'),'setForAccess no está aislado por workspace activo');
assert(!loader.includes('if(caps.student)set=union'),'Todavía mezcla runtime Alumno por capability');
assert(!loader.includes('if(caps.company)set=union'),'Todavía mezcla runtime Empresa por capability');
assert(!loader.includes("if(role==='admin'||caps.admin)"),'Un usuario admin todavía fuerza runtime Admin al entrar en otro workspace');
assert(loader.includes('ensureCompanySection'),'Falta lazy-load por sección de Empresa');
assert(loader.includes('onboarding:new Set([F.org])'),'Onboarding Empresa no está bajo demanda propio');
assert(loader.includes('summary:new Set()'),'Resumen Empresa todavía descarga onboarding');
assert(loader.includes('agenda:new Set()'),'Agenda Empresa todavía descarga runtime académico innecesario');

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
assert(workspace.includes("showCompanyModuleV341"),'Empresa no oculta los módulos no activos');
assert(workspace.includes("companyOnboardingHostV341")&&workspace.includes("companyAutopilotHostV341"),'Falta host modular para componentes dinámicos Empresa');
assert(!workspace.includes('companyMobileSectionsV34'),'Quedó navegación Empresa paralela de V34');
assert(read('assets/js/v20-organizations-onboarding.js').includes("companyOnboardingHostV341"),'Onboarding no monta en su módulo Empresa');
assert(read('assets/js/modules/academy/compliance.js').includes("companyComplianceHostV341"),'Cumplimiento no monta en su módulo Empresa');
assert(read('assets/js/modules/academy/operations.js').includes("companyAcademyHostV341"),'Capacitación no monta en su módulo Empresa');
assert(read('assets/js/modules/platform/superplatform.js').includes("companyDevelopmentHostV341"),'Desarrollo no monta en su módulo Empresa');
assert(read('assets/js/modules/agents/autopilot.js').includes("companyAutopilotHostV341"),'Autopilot no monta en su módulo Empresa');
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
assert(workspace.includes("new Set(['admin','company','companyConecta'])"),'Admin/Empresa/Conecta podrían volver a crear submenús laterales');

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

// 13) V35: core administrativo fuera del arranque general + Alumno crítico reducido.
const adminCore=read('assets/js/core/admin-workspace-v35.js');
assert(fs.statSync(path.join(root,'assets/js/core/app-core.js')).size<260000,`app-core sigue demasiado grande: ${fs.statSync(path.join(root,'assets/js/core/app-core.js')).size}`);
assert(fs.statSync(path.join(root,'assets/js/core/admin-workspace-v35.js')).size>180000,'admin-workspace-v35 parece incompleto');
assert(!index.includes('admin-workspace-v35.js?v=41.0'),'Admin core volvió a cargarse estáticamente');
assert(!index.includes('admin-data-runtime-v33.js?v=41.0'),'Admin data runtime volvió al arranque global');
assert(!index.includes('admin-module-loader-v33.js?v=41.0'),'Admin module loader volvió al arranque global');
assert(loader.includes("adminCore:'assets/js/core/admin-workspace-v35.js'"),'Module loader no conoce admin core V35');
assert(loader.includes('F.adminCore,F.adminData,F.adminViews'),'Admin base no carga core/data/views bajo demanda');
assert(adminCore.includes('loadAdminDataLegacyV35'),'Admin core no conserva fallback legacy');
assert(core.includes('async function loadAdminData()'),'Falta dispatcher estable loadAdminData');
assert(!dataRuntime.includes('window.loadAdminData=async function'),'Admin data runtime vuelve a reemplazar loadAdminData');
assert(core.includes("ensureFeature?.('activities')"),'Check-in alumno no carga Actividades bajo demanda');

const studentBaseLine=loader.match(/const studentBaseSet=new Set\(\[([^\]]+)\]\)/)?.[1]||'';
const studentKeys=[...studentBaseLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let studentBytes=0;for(const k of studentKeys){const f=fmap[k];if(f)studentBytes+=fs.statSync(path.join(root,f)).size;}
metrics.student_base_scripts=studentKeys.length;metrics.student_base_bytes=studentBytes;
assert(studentKeys.length<=7,`Alumno crítico demasiado grande: ${studentKeys.length} scripts`);
assert(studentBytes<100000,`Alumno crítico supera 100 KB: ${studentBytes}`);
assert(!studentBaseLine.includes('F.qa')&&!studentBaseLine.includes('F.ops')&&!studentBaseLine.includes('F.teacher')&&!studentBaseLine.includes('F.ux'),'Alumno vuelve a cargar módulos no críticos al login');
assert(loader.includes("studentEnhancements:new Set([F.lp,F.compliance])"),'Faltan mejoras Alumno diferidas');
assert(loader.includes("activities:new Set([F.teacher])"),'Actividades no está separada bajo demanda');
assert(loader.includes("support:new Set([F.ux])"),'Ayuda no está separada bajo demanda');
assert(core.includes("ensureFeature?.('student-enhancements')"),'No se hidratan mejoras Alumno en idle');

const staticScriptFiles=[...index.matchAll(/<script src=\"(assets\/js\/[^\"?]+)/g)].map(m=>m[1]);
let staticBytes=0;for(const f of staticScriptFiles)staticBytes+=fs.statSync(path.join(root,f)).size;
metrics.static_local_js_files=staticScriptFiles.length;metrics.static_local_js_bytes=staticBytes;
assert(staticBytes<330000,`JS local estático supera 330 KB: ${staticBytes}`);

// 14) V37: actualización sin loop + navegación superior visible y accesible.
const navCss=read('assets/css/v31-views.css');
const workspaceNav=read('assets/js/core/workspace-nav-v34.js');
const companyRuntime=read('assets/js/v19-workspaces.js');
const studentNav=read('assets/js/core/talent-router-v38.js');
assert(index.includes('<meta name="lutmin-version" content="41.0">'),'Falta meta de versión V37');
assert((index.match(/rel="preload"/g)||[]).length<=2,'Quedan demasiados preloads especulativos');
assert(updateManager.includes("const TARGET_KEY='lutmin:update-target'"),'Update manager no persiste versión objetivo');
assert(updateManager.includes('function workerVersion(worker'),'Update manager no consulta versión real del worker');
assert(updateManager.includes('version===VERSION'),'Update manager no suprime worker de la misma versión');
assert(updateManager.includes('newerThan(version,VERSION)'),'Update manager no compara versiones');
assert(!updateManager.includes('setInterval('),'Update manager conserva polling periódico de arranque');
assert(sw.includes("if(type==='GET_VERSION')"),'SW no expone su versión');
assert(sw.includes("event.ports?.[0]"),'SW no responde handshake por MessageChannel');
assert(navCss.includes('#e6f2ff'),'Falta estado activo celeste V37');
assert(navCss.includes('[data-admin-v19-btn][aria-current="page"]'),'Admin no tiene estilo activo estable');
assert(navCss.includes('[data-v341-company-key][aria-current="page"]'),'Empresa no tiene estilo activo estable');
assert(navCss.includes('[data-talent-module-key][aria-current="page"]'),'Conecta Alumno no tiene estilo activo estable');
assert(navCss.includes('[data-company-conecta-nav][aria-current="page"]'),'Conecta Empresa no tiene estilo activo estable');
assert(adminCore.includes("btn.setAttribute('aria-current',active?'page':'false')"),'Admin sigue dependiendo de clases Tailwind conflictivas');
assert(!adminCore.includes("btn.classList.toggle('text-white',active)"),'Admin conserva combinación de clases que podía ocultar texto');
assert(companyRuntime.includes("b.setAttribute('aria-selected',active?'true':'false')"),'Empresa no sincroniza accesibilidad del módulo activo');
assert(core.includes("btn.setAttribute('aria-selected',active?'true':'false')"),'Conecta Empresa no sincroniza accesibilidad del módulo activo');
assert(studentNav.includes("btn.setAttribute('aria-selected',on?'true':'false')"),'Conecta Alumno no sincroniza accesibilidad del módulo activo');
assert(workspaceNav.includes("['ArrowRight','ArrowLeft','Home','End']"),'Módulos superiores no soportan navegación por teclado');
metrics.v36_preloads=(index.match(/rel="preload"/g)||[]).length;
assert(!index.includes('cdn.tailwindcss.com'),'Tailwind CDN sigue en producción');
assert(index.includes('assets/css/tailwind-v36.css?v=41.0'),'No se carga Tailwind compilado local');
assert(fs.existsSync(path.join(root,'assets/css/tailwind-v36.css')),'Falta CSS Tailwind local');
assert(fs.statSync(path.join(root,'assets/css/tailwind-v36.css')).size<130000,'Tailwind local supera 130 KB');
assert(sw.includes('tailwind-v36.css?v=41.0'),'SW no precachea Tailwind local');
metrics.tailwind_local_bytes=fs.statSync(path.join(root,'assets/css/tailwind-v36.css')).size;

// 15) Prueba lógica del update manager: misma versión no avisa, nueva sí.
{
  const {MessageChannel}=await import('node:worker_threads');
  async function simulateUpdate(waitingVersion){
    const elements=new Map();
    const makeClassList=()=>{const set=new Set();return {add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on===undefined?(set.has(x)?(set.delete(x),false):(set.add(x),true)):(on?(set.add(x),true):(set.delete(x),false))};};
    const makeEl=()=>{const el={id:'',classList:makeClassList(),dataset:{},disabled:false,textContent:'',setAttribute(){},addEventListener(){},appendChild(){},querySelector(sel){if(sel.includes('data-v30-apply'))return el._button||(el._button=makeEl());return null;}};Object.defineProperty(el,'innerHTML',{set(){el._button=makeEl();},get(){return '';}});return el;};
    const body=makeEl();body.appendChild=el=>{if(el.id)elements.set(el.id,el)};
    const document={body,getElementById:id=>elements.get(id)||null,createElement:()=>makeEl(),querySelector:sel=>{if(sel.includes('lutminV30UpdateBanner'))return elements.get('lutminV30UpdateBanner')?._button||null;return null;},addEventListener(){},visibilityState:'visible'};
    const worker={postMessage(data,ports){if(data?.type==='GET_VERSION')ports?.[0]?.postMessage({version:waitingVersion});if(data?.type==='SKIP_WAITING')this.skipped=true;}};
    const reg={waiting:worker,installing:null,addEventListener(){},update:async()=>{}};
    const storage=new Map();
    const ctx={console,Promise,Date,Math,JSON,Map,Set,Array,Number,String,Boolean,Object,URL,MessageChannel,document,navigator:{onLine:true,serviceWorker:{controller:{},getRegistration:async()=>reg,addEventListener(){}}},location:{href:'https://lutmin.test/',replace(){}},history:{state:null,replaceState(){}},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},caches:{keys:async()=>[]},requestAnimationFrame:fn=>fn(),setTimeout:()=>0,clearTimeout(){},window:null};
    ctx.window=ctx;ctx.window.addEventListener=()=>{};ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(updateManager,ctx,{filename:'update-manager-v32.js'});
    await ctx.LutminV32Update.check(true);await new Promise(r=>setTimeout(r,10));
    return {visible:elements.get('lutminV30UpdateBanner')?.classList.contains('is-visible')||false,state:ctx.LutminV32Update.state(),worker};
  }
  const same=await simulateUpdate('41.0');const newer=await simulateUpdate('41.1');
  metrics.update_manager_logic={same_version_banner:same.visible,new_version_banner:newer.visible};
  assert(same.visible===false,'Update manager muestra banner para la misma versión');
  assert(newer.visible===true,'Update manager no muestra banner para una versión nueva');
}

// 16) Preferencias Admin: lectura local primero + escritura remota debounced.
assert(adminCore.includes('scheduleAdminWorkspacePrefSaveV36'),'Admin no debouncea preferencia de módulo');
assert(adminCore.includes("if(local&&ADMIN_MODULES_V19[local])"),'Admin no prioriza preferencia local');
assert(adminCore.includes('},700);'),'Debounce de preferencia Admin no está activo');

// 17) V41: Conecta liviano + agente con parser real de CV bajo demanda.
const agent41=read('assets/js/modules/agents/talent-agent-v41.js');
const cv38=read('assets/js/modules/talent/cv-parser.js');
assert(loader.includes("talent:new Set([F.hub,F.talentRouter])"),'Conecta vuelve a descargar todo el runtime al entrar');
assert(loader.includes('const talentSectionSets={'),'Falta lazy-load por submódulo de Conecta');
assert(loader.includes("agent:new Set([F.super,F.intel,F.cv,F.talentAgent41])"),'Agente V41 no carga inteligencia/CV bajo demanda');
assert(loader.includes('ensureTalentSection'),'Loader no expone carga de sección Conecta');
assert(agent41.includes('No inventa experiencia'),'Agente V41 no preserva regla de no invención');
assert(agent41.includes('No decide contrataciones'),'Agente V41 no explicita límite de decisión');
assert(agent41.includes('analyzeFile'),'Agente V41 no permite leer CV directo');
assert(agent41.includes('answerQuestion'),'Agente V41 no interpreta preguntas sobre CV');
assert(agent41.includes('localStorage'),'Agente V41 no conserva historial local');
assert(agent41.includes('No encontré experiencia laboral directamente relacionada'),'Agente V41 no explicita ausencia de experiencia relacionada');
assert(agent41.includes('Generar CV personalizado'),'Agente V41 no expone generación de CV personalizado');
assert(agent41.includes('Preparar postulación con este CV'),'Agente V41 no conecta el CV personalizado con la postulación');
assert(agent41.includes('downloadTailoredCvV41'),'Agente V41 no tiene generador propio de CV');
assert(!agent41.includes('Motor estructural V38 · API $0'),'Agente V41 sigue exponiendo información técnica al usuario');
assert(cv38.includes('semantic-v38'),'Parser V41 no está instalado');
assert(cv38.includes('careerSummary'),'Parser V41 no calcula trayectoria sin superposición');
assert(cv38.includes('quality(result)'),'Parser V41 no expone calidad/dudas de lectura');
assert(core.includes('abrir Conecta es lectura'),'Conecta sigue haciendo escritura al abrir');
const talentBaseLine=loader.match(/talent:new Set\(\[([^\]]+)\]\)/)?.[1]||'';
assert(!talentBaseLine.includes('F.intel'),'Conecta base todavía arrastra Intelligence al abrirse');
const talentBaseKeys=[...talentBaseLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let talentBaseBytes=0;for(const k of talentBaseKeys){const f=fmap[k];if(f)talentBaseBytes+=fs.statSync(path.join(root,f)).size;}
metrics.talent_entry_scripts=talentBaseKeys.length;metrics.talent_entry_bytes=talentBaseBytes;
assert(talentBaseKeys.length<=2,`Conecta inicial supera 2 scripts opcionales: ${talentBaseKeys.length}`);
assert(talentBaseBytes<30000,`Conecta inicial supera 30 KB: ${talentBaseBytes}`);
const agentLine=loader.match(/agent:new Set\(\[([^\]]+)\]\)/)?.[1]||'';
const agentKeys=[...agentLine.matchAll(/F\.([A-Za-z0-9]+)/g)].map(m=>m[1]);
let agentBytes=0;for(const k of agentKeys){const f=fmap[k];if(f)agentBytes+=fs.statSync(path.join(root,f)).size;}
metrics.agent_v41_scripts=agentKeys.length;metrics.agent_v41_bytes=agentBytes;

// 18) Prueba lógica del router Conecta: el click cambia realmente de panel.
{
  const router=read('assets/js/core/talent-router-v38.js');
  const mkClass=()=>{const set=new Set();return {toggle:(c,on)=>on?set.add(c):set.delete(c),contains:c=>set.has(c),add:c=>set.add(c),remove:c=>set.delete(c)};};
  const panels=['summary','profile','jobs'].map(k=>({dataset:{talentModulePanel:k},classList:mkClass()}));
  panels.filter(x=>x.dataset.talentModulePanel!=='summary').forEach(x=>x.classList.add('hidden'));
  const buttons=['summary','profile','jobs'].map(k=>({dataset:{talentModuleKey:k},attrs:{},tabIndex:-1,setAttribute(k2,v){this.attrs[k2]=v;}}));
  const storage=new Map();
  const document={readyState:'complete',querySelectorAll(sel){if(sel==='[data-talent-module-panel]')return panels;if(sel==='[data-talent-module-key]')return buttons;return[];},addEventListener(){}};
  const ctx={console,Promise,Set,Map,CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},document,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},currentLutminUser:{role:'student'},goToCampusTab(){},loadTalentCenter:async()=>{},showToast(){},window:null,setTimeout:fn=>fn()};
  ctx.window=ctx;ctx.window.dispatchEvent=()=>{};ctx.window.addEventListener=()=>{};ctx.ensureV140StudentUI=()=>{};ctx.loadV140ProfileData=async()=>{};ctx.LutminV30Modules={ensureTalentSection:async()=>true};ctx.LutminV29Data={load:async(k,fn)=>fn()};
  vm.createContext(ctx);vm.runInContext(router,ctx,{filename:'talent-router-v38.js'});
  await ctx.openTalentModuleV38('profile');
  const profile=panels.find(x=>x.dataset.talentModulePanel==='profile'),summary=panels.find(x=>x.dataset.talentModulePanel==='summary'),profileBtn=buttons.find(x=>x.dataset.talentModuleKey==='profile');
  metrics.talent_router_logic={profile_visible:!profile.classList.contains('hidden'),summary_hidden:summary.classList.contains('hidden'),profile_active:profileBtn.attrs['aria-current']==='page'};
  assert(metrics.talent_router_logic.profile_visible,'Router Conecta no muestra el panel seleccionado');
  assert(metrics.talent_router_logic.summary_hidden,'Router Conecta deja Resumen visible al cambiar de módulo');
  assert(metrics.talent_router_logic.profile_active,'Router Conecta no marca el módulo activo');
}

// 19) Smoke HTTP local de todos los HTML y rutas críticas.
const targets=['/index.html','/sw.js','/assets/js/core/workspace-nav-v34.js','/assets/js/core/module-loader-v33.js','/assets/js/core/view-loader-v32.js','/assets/js/core/app-core.js','/assets/js/core/admin-workspace-v35.js',...walk(path.join(root,'assets','views')).filter(p=>p.endsWith('.html')).map(p=>'/'+rel(p))];
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://127.0.0.1');const clean=decodeURIComponent(u.pathname).replace(/^\/+/, '');const file=path.resolve(root,clean||'index.html');if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.writeHead(200);fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;let ok=0;
try{for(const t of targets){const r=await fetch(`http://127.0.0.1:${port}${t}?v=41.0`);if(r.ok){await r.arrayBuffer();ok++;}else errors.push(`HTTP ${r.status}: ${t}`);}}finally{await new Promise(r=>server.close(r));}
metrics.http_targets_ok=ok;assert(ok===targets.length,`Smoke HTTP incompleto ${ok}/${targets.length}`);

if(index.includes('LOGO.png')&&!fs.existsSync(path.join(root,'LOGO.png')))warnings.push('LOGO.png continúa referenciado pero no está en el deploy original recibido; no se inventó un asset.');

console.log(JSON.stringify({ok:errors.length===0,version:'41.0',metrics,warnings,errors},null,2));
process.exit(errors.length?1:0);
