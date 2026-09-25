// =============================================================
// LUTMIN V33.0 · ADMIN DATA RUNTIME
// Datos primarios de Administración por módulo/dominio.
// Evita la carga monolítica de 14 tablas al abrir Administración.
// =============================================================
(function(){
  'use strict';
  const VERSION='33.0';
  const state={entries:new Map(),inFlight:new Map(),activeModule:'overview',loads:0,hits:0,errors:0,lastDuration:0,lastDatasets:[]};
  const DEFAULT_TTL=60000;

  function isAdmin(){try{return currentLutminUser?.role==='admin';}catch(_){return false;}}
  function currentModule(){
    const host=document.getElementById('adminModuleHostV32');
    const fromHost=host?.dataset?.adminModuleV32;
    if(fromHost)return fromHost;
    try{if(typeof activeAdminModuleV19!=='undefined'&&activeAdminModuleV19)return activeAdminModuleV19;}catch(_){}
    try{return localStorage.getItem('lutmin-admin-module-v19')||'overview';}catch(_){return 'overview';}
  }
  function age(key){const e=state.entries.get(key);return e?.at?Date.now()-e.at:Infinity;}

  const defs={
    profiles:{ttl:45000,query:()=>supabaseClient.from('profiles').select('id,full_name,email,role,active,must_change_password,created_at,last_seen_at').order('full_name'),assign:d=>{adminProfiles=d||[];}},
    accessRoles:{ttl:45000,query:()=>supabaseClient.from('user_access_roles').select('user_id,access_role'),assign:d=>{adminAccessRoles=d||[];}},
    courses:{ttl:90000,query:()=>supabaseClient.from('courses').select('id,slug,title,description,duration_hours,level,category,published,public_featured,certificate_kind,certificate_validity_months,course_version,instructor_name,training_modality,training_location,created_at,updated_at').order('created_at',{ascending:false}),assign:d=>{adminCourses=d||[];}},
    lessons:{ttl:90000,query:()=>supabaseClient.from('lessons').select('id,course_id,title,description,content,duration_minutes,sort_order,video_url,video_path,material_url,material_path,published,required,video_completion_required,video_min_watch_percent,updated_at').order('sort_order'),assign:d=>{adminLessons=d||[];}},
    enrollments:{ttl:45000,query:()=>supabaseClient.from('enrollments').select('id,user_id,course_id,offering_id,status,enrolled_at,price_amount,payment_currency,payment_status,payment_due_date,access_granted_at').order('enrolled_at',{ascending:false}),assign:d=>{adminEnrollments=d||[];}},
    progress:{ttl:45000,query:()=>supabaseClient.from('lesson_progress').select('user_id,lesson_id,completed,completed_at').eq('completed',true),assign:d=>{adminProgressRows=d||[];}},
    assessments:{ttl:90000,query:()=>supabaseClient.from('assessments').select('id,course_id,title,description,passing_score,published,max_attempts,random_question_count,time_limit_minutes,show_answer_review,created_at').order('created_at',{ascending:false}),assign:d=>{adminAssessments=d||[];}},
    questions:{ttl:90000,query:()=>supabaseClient.from('assessment_questions').select('id,assessment_id,question_text,sort_order,points,explanation,active').order('sort_order'),assign:d=>{adminAssessmentQuestions=d||[];}},
    attempts:{ttl:45000,query:()=>supabaseClient.from('assessment_attempts').select('id,assessment_id,user_id,score,passed,submitted_at').order('submitted_at',{ascending:false}),assign:d=>{adminAssessmentAttempts=d||[];}},
    certificates:{ttl:60000,query:()=>supabaseClient.from('certificates').select('id,user_id,course_id,code,full_name,course_title,duration_hours,score,status,issued_at,revoked_at,revoked_reason,certificate_kind,issuer_display_name,issuer_legal_name,issuer_tax_id,private_legend,verification_note,course_version,modality,training_location,instructor_name,responsible_name,responsible_role,expires_at').order('issued_at',{ascending:false}),assign:d=>{adminCertificates=d||[];}},
    notes:{ttl:45000,query:()=>supabaseClient.from('student_admin_notes').select('id,student_id,note,created_by,created_at').order('created_at',{ascending:false}),assign:d=>{adminStudentNotes=d||[];}},
    offerings:{ttl:60000,query:()=>supabaseClient.from('course_offerings').select('id,course_id,start_date,end_date,registration_deadline,modality,location,price,currency,capacity,status,published,created_at,updated_at').order('start_date',{ascending:true}),assign:d=>{adminOfferings=d||[];}},
    leads:{ttl:35000,query:()=>supabaseClient.from('course_leads').select('id,course_id,offering_id,full_name,email,phone,city,message,source,status,converted_user_id,consent_at,created_at,updated_at').order('created_at',{ascending:false}),assign:d=>{adminCourseLeads=d||[];}},
    payments:{ttl:35000,query:()=>supabaseClient.from('enrollment_payments').select('id,enrollment_id,amount,currency,method,reference,notes,receipt_path,status,paid_at,created_at,voided_at').order('paid_at',{ascending:false}),assign:d=>{adminPayments=d||[];}},
    companies:{ttl:60000,query:()=>supabaseClient.from('companies').select('id,name,display_name,cuit,contact_name,contact_email,phone,address,notes,logo_path,brand_primary,brand_secondary,website,industry,active,created_at,updated_at').order('name'),assign:d=>{adminCompanies=d||[];}},
    companyMembers:{ttl:45000,query:()=>supabaseClient.from('company_members').select('company_id,user_id,member_role,active,joined_at').order('joined_at'),assign:d=>{adminCompanyMembers=d||[];}}
  };

  const moduleMap={
    overview:['profiles','accessRoles','courses','lessons','enrollments','progress','assessments','certificates','offerings','leads','payments'],
    operations:['profiles','accessRoles','courses','companies'],
    academic:['profiles','accessRoles','courses','lessons','enrollments','progress','assessments','questions','attempts','certificates','offerings','companies'],
    people:['profiles','accessRoles','courses','lessons','enrollments','progress','assessments','attempts','certificates','notes'],
    companies:['profiles','accessRoles','courses','companies','companyMembers'],
    commercial:['profiles','accessRoles','courses','enrollments','offerings','leads','payments'],
    finance:['profiles','accessRoles','courses','enrollments','offerings','leads','payments'],
    talent:['profiles','companies'],
    communications:['profiles'],
    system:['profiles','accessRoles','courses','companies'],
    development:['profiles','accessRoles','courses','companies'],
    agents:['profiles','accessRoles','courses','companies']
  };

  async function loadDataset(key,{force=false}={}){
    const def=defs[key];if(!def)return null;
    if(state.inFlight.has(key))return state.inFlight.get(key);
    const cached=state.entries.get(key);const ttl=Number(def.ttl||DEFAULT_TTL);
    if(!force&&cached&&Date.now()-cached.at<ttl){state.hits+=1;return cached.data;}
    const p=(async()=>{
      const res=await def.query();
      if(res?.error)throw res.error;
      const data=res?.data||[];def.assign(data);state.entries.set(key,{at:Date.now(),data});state.loads+=1;return data;
    })().catch(err=>{state.errors+=1;console.error(`[Lutmin V33] dataset ${key}:`,err);throw err;}).finally(()=>state.inFlight.delete(key));
    state.inFlight.set(key,p);return p;
  }

  function renderModule(module){
    try{if(typeof renderAdminPanel==='function')renderAdminPanel();}catch(err){console.warn('[Lutmin V33] renderAdminPanel',err);}
    if(module==='companies'||module==='academic'){
      try{if(typeof renderAdminCompanies==='function'&&document.getElementById('adminCompaniesList'))renderAdminCompanies();}catch(err){console.warn('[Lutmin V33] render companies',err);}
    }
    if(module==='operations'||module==='system'){
      try{if(typeof renderBulkControlsV18==='function')renderBulkControlsV18();}catch(_){}
    }
    try{if(typeof refreshAdminWorkspaceV19==='function')refreshAdminWorkspaceV19();}catch(_){}
    try{
      if(typeof activeAdminStudentDetailId!=='undefined'&&activeAdminStudentDetailId&&document.getElementById('adminStudentDetailModal')&&!document.getElementById('adminStudentDetailModal').classList.contains('hidden'))renderAdminStudentDetail(activeAdminStudentDetailId);
    }catch(_){}
  }

  async function loadForModule(module,{force=false,quiet=false}={}){
    if(!supabaseClient||!isAdmin())return false;
    module=moduleMap[module]?module:'overview';state.activeModule=module;
    const keys=moduleMap[module]||[];state.lastDatasets=[...keys];const started=performance.now();
    const results=await Promise.allSettled(keys.map(k=>loadDataset(k,{force})));
    const failed=results.find(x=>x.status==='rejected');
    state.lastDuration=Math.round(performance.now()-started);
    if(failed&&!quiet){showToast('No pude actualizar todos los datos de este módulo. Revisá Sistema → Diagnóstico.');}
    renderModule(module);
    window.dispatchEvent(new CustomEvent('lutmin:v33:admin-data-ready',{detail:{module,datasets:keys,duration_ms:state.lastDuration,failed:Boolean(failed)}}));
    return !failed;
  }

  function invalidate(target){
    if(!target){state.entries.clear();return;}
    const keys=moduleMap[target]||[target];keys.forEach(k=>state.entries.delete(k));
  }
  function invalidateMany(keys=[]){(keys||[]).forEach(invalidate);}
  async function refreshCurrent(){const module=currentModule();invalidate(module);return loadForModule(module,{force:true});}
  async function bootstrap(){return loadForModule(currentModule(),{force:false});}

  // Compatibilidad: todas las mutaciones históricas que llaman loadAdminData()
  // ahora refrescan únicamente el módulo activo, no las 14 tablas globales.
  const legacyLoadAdminData=window.loadAdminData;
  window.loadAdminData=async function(){
    if(await (window.LutminV32Views||window.LutminV31Views)?.ensureForTab?.('admin')===false)return false;
    if(!supabaseClient||!isAdmin())return false;
    const module=currentModule();
    invalidate(module);
    const ok=await loadForModule(module,{force:true});
    try{await window.LutminV30Admin?.loadForModule?.(module,{force:true});}catch(_){}
    return ok;
  };
  window.loadAdminData.__lutminV33=true;

  window.LutminV33AdminData={version:VERSION,loadForModule,loadDataset,refreshCurrent,bootstrap,invalidate,invalidateMany,status:()=>({version:VERSION,activeModule:state.activeModule,loads:state.loads,hits:state.hits,errors:state.errors,lastDuration:state.lastDuration,lastDatasets:[...state.lastDatasets],cached:[...state.entries.keys()],inFlight:[...state.inFlight.keys()],moduleMap}),legacyLoadAdminData};
})();
