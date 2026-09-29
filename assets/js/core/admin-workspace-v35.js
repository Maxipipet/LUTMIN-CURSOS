// =============================================================
// LUTMIN V39.0 · ADMIN WORKSPACE CORE (LAZY)
// Lógica pesada exclusiva de Administración. No se descarga en
// Alumno, Empresa o Docente. Las funciones permanecen globales para
// compatibilidad con HTML histórico y módulos incrementales.
// =============================================================

    // =========================================================
    // ADMINISTRACIÓN LUTMIN - ETAPA 9
    // =========================================================
    // V1.3: accesos Alumno independientes del rol principal.
    function adminUserHasStudentAccess(userId){ return adminAccessRoles.some(r=>r.user_id===userId&&r.access_role==='student'); }
    function adminIsStudent(p){ return Boolean(p&&p.active!==false&&adminUserHasStudentAccess(p.id)); }

    function slugifyLutmin(value) {
      return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    async function loadAdminDataLegacyV35() {
      if(await (window.LutminV32Views||window.LutminV31Views)?.ensureForTab?.('admin')===false)return;
      if (!supabaseClient || currentLutminUser?.role !== 'admin') return;

      const [profilesRes, coursesRes, lessonsRes, enrollmentsRes, progressRes, assessmentsRes, questionsRes, attemptsRes, certificatesRes, notesRes, offeringsRes, leadsRes, paymentsRes, accessRolesRes] = await Promise.all([
        supabaseClient.from('profiles').select('id,full_name,email,role,active,must_change_password,created_at,last_seen_at').order('full_name'),
        supabaseClient.from('courses').select('id,slug,title,description,duration_hours,level,category,published,public_featured,certificate_kind,certificate_validity_months,course_version,instructor_name,training_modality,training_location,created_at,updated_at').order('created_at', { ascending: false }),
        supabaseClient.from('lessons').select('id,course_id,title,description,content,duration_minutes,sort_order,video_url,video_path,material_url,material_path,published,required,video_completion_required,video_min_watch_percent,updated_at').order('sort_order'),
        supabaseClient.from('enrollments').select('id,user_id,course_id,offering_id,status,enrolled_at,price_amount,payment_currency,payment_status,payment_due_date,access_granted_at').order('enrolled_at', { ascending: false }),
        supabaseClient.from('lesson_progress').select('user_id,lesson_id,completed,completed_at').eq('completed', true),
        supabaseClient.from('assessments').select('id,course_id,title,description,passing_score,published,max_attempts,random_question_count,time_limit_minutes,show_answer_review,created_at').order('created_at', { ascending: false }),
        supabaseClient.from('assessment_questions').select('id,assessment_id,question_text,sort_order,points,explanation,active').order('sort_order'),
        supabaseClient.from('assessment_attempts').select('id,assessment_id,user_id,score,passed,submitted_at').order('submitted_at', { ascending: false }),
        supabaseClient.from('certificates').select('id,user_id,course_id,code,full_name,course_title,duration_hours,score,status,issued_at,revoked_at,revoked_reason,certificate_kind,issuer_display_name,issuer_legal_name,issuer_tax_id,private_legend,verification_note,course_version,modality,training_location,instructor_name,responsible_name,responsible_role,expires_at').order('issued_at', { ascending: false }),
        supabaseClient.from('student_admin_notes').select('id,student_id,note,created_by,created_at').order('created_at', { ascending: false }),
        supabaseClient.from('course_offerings').select('id,course_id,start_date,end_date,registration_deadline,modality,location,price,currency,capacity,status,published,created_at,updated_at').order('start_date', { ascending: true }),
        supabaseClient.from('course_leads').select('id,course_id,offering_id,full_name,email,phone,city,message,source,status,converted_user_id,consent_at,created_at,updated_at').order('created_at', { ascending: false }),
        supabaseClient.from('enrollment_payments').select('id,enrollment_id,amount,currency,method,reference,notes,receipt_path,status,paid_at,created_at,voided_at').order('paid_at', { ascending: false }),
        supabaseClient.from('user_access_roles').select('user_id,access_role')
      ]);

      const firstError = [profilesRes, coursesRes, lessonsRes, enrollmentsRes, progressRes, assessmentsRes, questionsRes, attemptsRes, certificatesRes, notesRes, offeringsRes, leadsRes, paymentsRes, accessRolesRes].find(x => x.error)?.error;
      if (firstError) {
        console.error('Error admin:', firstError);
        showToast('No pude cargar Administración. Abrí Diagnóstico para identificar el módulo pendiente.');
        return;
      }

      adminProfiles = profilesRes.data || [];
      adminCourses = coursesRes.data || [];
      adminLessons = lessonsRes.data || [];
      adminEnrollments = enrollmentsRes.data || [];
      adminProgressRows = progressRes.data || [];
      adminAssessments = assessmentsRes.data || [];
      adminAssessmentQuestions = questionsRes.data || [];
      adminAssessmentAttempts = attemptsRes.data || [];
      adminCertificates = certificatesRes.data || [];
      adminStudentNotes = notesRes.data || [];
      adminOfferings = offeringsRes.data || [];
      adminCourseLeads = leadsRes.data || [];
      adminPayments = paymentsRes.data || [];
      adminAccessRoles = accessRolesRes.data || [];
      renderAdminPanel();

      // V30: los módulos secundarios de Administración se cargan por demanda.
      // Evita consultar Empresas, Talento, Salud, Operaciones y Agenda si la persona no entra allí.
      const bootstrapAdminDemandV30 = async () => {
        if (window.LutminV30Admin?.bootstrap) await window.LutminV30Admin.bootstrap();
        else { await loadAdminWorkspacePrefsV19(); await loadExecutiveV17(); }
        refreshAdminWorkspaceV19();
        if (activeAdminStudentDetailId && !document.getElementById('adminStudentDetailModal').classList.contains('hidden')) {
          renderAdminStudentDetail(activeAdminStudentDetailId);
        }
      };
      if ('requestIdleCallback' in window) requestIdleCallback(() => bootstrapAdminDemandV30(), { timeout: 700 });
      else setTimeout(bootstrapAdminDemandV30, 60);
    }


    async function loadAdminCompaniesData() {
      if (!supabaseClient || currentLutminUser?.role !== 'admin') return;
      const [companiesRes, membersRes] = await Promise.all([
        supabaseClient.from('companies').select('id,name,display_name,cuit,contact_name,contact_email,phone,address,notes,logo_path,brand_primary,brand_secondary,website,industry,active,created_at,updated_at').order('name'),
        supabaseClient.from('company_members').select('company_id,user_id,member_role,active,joined_at').order('joined_at')
      ]);
      if (companiesRes.error || membersRes.error) {
        console.error(companiesRes.error || membersRes.error);
        showToast('No pude cargar Empresas. Abrí Diagnóstico para revisar la configuración.');
        return;
      }
      adminCompanies = companiesRes.data || [];
      adminCompanyMembers = membersRes.data || [];
      renderAdminCompanies();
      await loadAdminTrainingPlans();
    }

    function companyOptionsHtml() {
      return adminCompanies.filter(c => c.active !== false).length
        ? adminCompanies.filter(c => c.active !== false).map(c => `<option value="${c.id}">${escapeHtml(c.display_name || c.name)}</option>`).join('')
        : '<option value="">Primero creá una empresa</option>';
    }

    function renderAdminCompanies() {
      const companyOptions = companyOptionsHtml();
      ['adminManagerCompany','adminMemberCompany','adminCourseCompany'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=companyOptions; });
      const students = adminProfiles.filter(p => adminIsStudent(p));
      const studentSelect = document.getElementById('adminMemberStudent');
      if (studentSelect) studentSelect.innerHTML = students.length ? students.map(p => `<option value="${p.id}">${escapeHtml(p.full_name || p.email || 'Alumno')} · ${escapeHtml(p.email || '')}</option>`).join('') : '<option value="">No hay alumnos</option>';
      const courseSelect = document.getElementById('adminCompanyCourse');
      if (courseSelect) courseSelect.innerHTML = adminCourses.length ? adminCourses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('') : '<option value="">No hay cursos</option>';

      const root = document.getElementById('adminCompaniesList');
      if (!root) return;
      if (!adminCompanies.length) { root.innerHTML='<div class="p-6 text-sm text-slate-500">Todavía no hay empresas creadas.</div>'; return; }
      root.innerHTML = adminCompanies.map(c => {
        const members = adminCompanyMembers.filter(m => m.company_id === c.id && m.active !== false);
        const managers = members.filter(m => m.member_role === 'manager').map(m => adminProfiles.find(p => p.id === m.user_id)).filter(Boolean);
        const studentsC = members.filter(m => m.member_role === 'student').map(m => adminProfiles.find(p => p.id === m.user_id)).filter(Boolean);
        return `<div class="p-5 sm:p-6"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><div class="flex items-center gap-3">${c.logo_path?`<img src="${escapeHtml(companyBrandingPublicUrl(c.logo_path))}" class="w-9 h-9 rounded-lg bg-white border border-slate-100 object-contain p-1" alt="">`:`<div class="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-800 flex items-center justify-center text-[10px] font-black">${escapeHtml(companyInitials(c.display_name||c.name))}</div>`}<div><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(c.display_name||c.name)}</h4>${c.display_name&&c.display_name!==c.name?`<p class="text-[10px] text-slate-400">${escapeHtml(c.name)}</p>`:''}</div></div><span class="px-2 py-1 rounded-full text-[10px] font-bold ${c.active !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">${c.active !== false ? 'Activa' : 'Inactiva'}</span><span class="px-2 py-1 rounded-full text-[10px] font-bold ${managers.length ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}">${managers.length ? `${managers.length} acceso${managers.length===1?'':'s'} empresa` : 'Sin acceso empresa'}</span></div><p class="mt-1 text-xs text-slate-500">${escapeHtml([c.cuit ? 'CUIT '+c.cuit : '', c.contact_name || '', c.contact_email || '', c.phone || ''].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</p>${c.address ? `<p class="mt-1 text-[11px] text-slate-400">${escapeHtml(c.address)}</p>` : ''}</div><div class="flex flex-wrap gap-2 lg:justify-end"><button onclick="openCompanyEdit('${c.id}')" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button onclick="prepareCompanyAccess('${c.id}')" class="px-3 py-2 rounded-xl ${managers.length ? 'bg-cyan-50 text-cyan-700' : 'bg-cyan-700 text-white'} text-xs font-bold"><i class="fa-solid fa-key mr-1"></i>${managers.length ? 'Otro acceso' : 'Crear acceso'}</button></div></div><div class="mt-3 text-xs text-slate-500"><strong>${studentsC.length}</strong> colaboradores · <strong>${managers.length}</strong> responsables</div>${managers.length ? `<div class="mt-3 flex flex-wrap gap-2">${managers.map(p => `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-cyan-50 text-cyan-800 text-[11px] font-bold"><i class="fa-solid fa-user-shield"></i>${escapeHtml(p.full_name || p.email)}<button onclick="openCompanyPasswordModal('${p.id}')" class="ml-1 px-2 py-1 rounded-lg bg-white text-slate-700" title="Cambiar contraseña"><i class="fa-solid fa-key"></i></button><button onclick="toggleStudentAccess('${p.id}',${adminUserHasStudentAccess(p.id)?'false':'true'})" class="px-2 py-1 rounded-lg bg-white ${adminUserHasStudentAccess(p.id)?'text-red-600':'text-blue-700'}" title="${adminUserHasStudentAccess(p.id)?'Quitar acceso Alumno':'Habilitar acceso Alumno'}"><i class="fa-solid ${adminUserHasStudentAccess(p.id)?'fa-user-minus':'fa-graduation-cap'}"></i></button></span>`).join('')}</div>` : ''}<div class="mt-4 flex flex-wrap gap-2">${studentsC.slice(0,8).map(p => `<span class="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">${escapeHtml(p.full_name || p.email)}</span>`).join('')}${studentsC.length>8 ? `<span class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">+${studentsC.length-8}</span>`:''}</div></div>`;
      }).join('');
    }

    async function loadAdminTrainingPlans(){
      if(!supabaseClient||currentLutminUser?.role!=='admin')return;
      const [plansRes,coursesRes]=await Promise.all([
        supabaseClient.from('company_training_plans').select('id,company_id,name,objective,status,start_date,end_date,created_at').order('created_at',{ascending:false}),
        supabaseClient.from('company_training_plan_courses').select('plan_id,course_id,due_date,required,created_at')
      ]);
      if(plansRes.error||coursesRes.error){console.error(plansRes.error||coursesRes.error);showToast('No pude cargar los planes corporativos. Revisá la configuración del módulo.');return;}
      adminTrainingPlans=plansRes.data||[]; adminTrainingPlanCourses=coursesRes.data||[]; renderAdminTrainingPlans();
    }

    function trainingPlanStatusLabel(v){return {draft:'Borrador',active:'Activo',on_hold:'En pausa',completed:'Completado'}[v]||v;}
    function renderAdminTrainingPlans(){
      const companySel=document.getElementById('adminPlanCompany'), planSel=document.getElementById('adminPlanSelect'), courseSel=document.getElementById('adminPlanCourse');
      if(companySel) companySel.innerHTML=companyOptionsHtml();
      if(planSel) planSel.innerHTML=adminTrainingPlans.length?adminTrainingPlans.map(p=>{const c=adminCompanies.find(x=>x.id===p.company_id);return `<option value="${p.id}">${escapeHtml(c?.display_name||c?.name||'Empresa')} · ${escapeHtml(p.name)}</option>`;}).join(''):'<option value="">Primero creá un plan</option>';
      if(courseSel) courseSel.innerHTML=adminCourses.length?adminCourses.map(c=>`<option value="${c.id}">${escapeHtml(c.title)}</option>`).join(''):'<option value="">No hay cursos</option>';
      const root=document.getElementById('adminTrainingPlansList'); if(!root)return;
      if(!adminTrainingPlans.length){root.innerHTML='<div class="lg:col-span-2 text-sm text-slate-500">Todavía no hay planes corporativos.</div>';return;}
      root.innerHTML=adminTrainingPlans.map(p=>{const c=adminCompanies.find(x=>x.id===p.company_id);const pcs=adminTrainingPlanCourses.filter(x=>x.plan_id===p.id);return `<div class="rounded-2xl bg-white border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(c?.display_name||c?.name||'Empresa')}</p><p class="font-extrabold text-lutmin-dark">${escapeHtml(p.name)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(p.objective||'Sin objetivo detallado')}</p></div><select onchange="adminSetTrainingPlanStatus('${p.id}',this.value)" class="h-fit px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold"><option value="draft" ${p.status==='draft'?'selected':''}>Borrador</option><option value="active" ${p.status==='active'?'selected':''}>Activo</option><option value="on_hold" ${p.status==='on_hold'?'selected':''}>En pausa</option><option value="completed" ${p.status==='completed'?'selected':''}>Completado</option></select></div><div class="mt-3 flex flex-wrap gap-2">${pcs.length?pcs.map(pc=>{const course=adminCourses.find(x=>x.id===pc.course_id);return `<span class="px-2.5 py-1.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold">${escapeHtml(course?.title||'Curso')}${pc.due_date?' · '+new Date(pc.due_date+'T12:00:00').toLocaleDateString('es-AR'):''}</span>`;}).join(''):'<span class="text-xs text-slate-400">Sin cursos todavía</span>'}</div></div>`;}).join('');
    }

    document.getElementById('adminTrainingPlanForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); const {data,error}=await supabaseClient.rpc('admin_create_company_training_plan',{p_company_id:document.getElementById('adminPlanCompany').value,p_name:document.getElementById('adminPlanName').value.trim(),p_objective:document.getElementById('adminPlanObjective').value.trim()||null,p_start_date:document.getElementById('adminPlanStart').value||null,p_end_date:document.getElementById('adminPlanEnd').value||null,p_status:document.getElementById('adminPlanStatus').value});
      if(error)return showToast(error.message||'No pude crear el plan.'); event.target.reset(); document.getElementById('adminPlanStatus').value='active'; showToast('Plan de capacitación creado.'); await loadAdminTrainingPlans();
    });
    document.getElementById('adminTrainingPlanCourseForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); const {error}=await supabaseClient.rpc('admin_add_course_to_training_plan',{p_plan_id:document.getElementById('adminPlanSelect').value,p_course_id:document.getElementById('adminPlanCourse').value,p_due_date:document.getElementById('adminPlanDueDate').value||null,p_required:document.getElementById('adminPlanRequired').checked});
      if(error)return showToast(error.message||'No pude agregar el curso.'); showToast('Curso agregado al plan.'); await loadAdminTrainingPlans();
    });
    async function adminSetTrainingPlanStatus(planId,status){const {error}=await supabaseClient.rpc('admin_set_training_plan_status',{p_plan_id:planId,p_status:status});if(error)return showToast(error.message||'No pude actualizar el plan.');showToast('Estado del plan actualizado.');await loadAdminTrainingPlans();}

    function prepareCompanyAccess(companyId) {
      const select = document.getElementById('adminManagerCompany');
      if (select) select.value = companyId;
      document.getElementById('adminCompanyManagerForm')?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(() => document.getElementById('adminManagerName')?.focus(), 400);
      showToast('Completá los datos del responsable para crear el acceso de empresa.');
    }

    function openCompanyEdit(companyId) {
      const c = adminCompanies.find(x => x.id === companyId);
      if (!c) return;
      document.getElementById('editCompanyId').value = c.id;
      document.getElementById('editCompanyName').value = c.name || '';
      document.getElementById('editCompanyDisplayName').value = c.display_name || c.name || '';
      document.getElementById('editCompanyCuit').value = c.cuit || '';
      document.getElementById('editCompanyContact').value = c.contact_name || '';
      document.getElementById('editCompanyEmail').value = c.contact_email || '';
      document.getElementById('editCompanyPhone').value = c.phone || '';
      document.getElementById('editCompanyAddress').value = c.address || '';
      document.getElementById('editCompanyNotes').value = c.notes || '';
      document.getElementById('editCompanyIndustry').value = c.industry || '';
      document.getElementById('editCompanyWebsite').value = c.website || '';
      document.getElementById('editCompanyPrimary').value = c.brand_primary || '#000B3C';
      document.getElementById('editCompanySecondary').value = c.brand_secondary || '#2F8DFD';
      document.getElementById('editCompanyLogoFile').value = '';
      document.getElementById('editCompanyRemoveLogo').checked = false;
      paintCompanyLogoPreview(c.logo_path || null);
      document.getElementById('editCompanyActive').checked = c.active !== false;
      openModal('adminCompanyEditModal');
    }

    function companyBrandingPublicUrl(path) {
      if (!path || !supabaseClient) return '';
      try { return supabaseClient.storage.from('company-branding').getPublicUrl(path).data.publicUrl || ''; } catch (_) { return ''; }
    }

    function companyInitials(name) {
      return String(name || 'Empresa').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('') || 'EM';
    }

    function paintCompanyLogoPreview(path) {
      const img=document.getElementById('editCompanyLogoPreview'), ph=document.getElementById('editCompanyLogoPlaceholder'); if(!img||!ph)return;
      const url=companyBrandingPublicUrl(path); img.classList.toggle('hidden',!url); ph.classList.toggle('hidden',Boolean(url)); if(url)img.src=url; else img.removeAttribute('src');
    }

    document.getElementById('editCompanyLogoFile')?.addEventListener('change', event => {
      const file=event.target.files?.[0], img=document.getElementById('editCompanyLogoPreview'), ph=document.getElementById('editCompanyLogoPlaceholder');
      if(!file||!img||!ph)return; const url=URL.createObjectURL(file); img.src=url; img.classList.remove('hidden'); ph.classList.add('hidden');
    });

    document.getElementById('adminCompanyEditForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const companyId=document.getElementById('editCompanyId').value;
      const current=adminCompanies.find(x=>x.id===companyId); let logoPath=current?.logo_path||null;
      const removeLogo=document.getElementById('editCompanyRemoveLogo').checked;
      const logoFile=document.getElementById('editCompanyLogoFile').files?.[0];
      if(logoFile){
        if(logoFile.size>5*1024*1024) return showToast('El logo supera 5 MB.');
        const ext=(logoFile.name.split('.').pop()||'png').toLowerCase();
        const path=`${companyId}/logo-${Date.now()}.${ext}`;
        const {error:uploadError}=await supabaseClient.storage.from('company-branding').upload(path,logoFile,{upsert:true,contentType:logoFile.type});
        if(uploadError) return showToast(uploadError.message||'No pude subir el logo.');
        if(logoPath && logoPath!==path) try{await supabaseClient.storage.from('company-branding').remove([logoPath]);}catch(_){}
        logoPath=path;
      } else if(removeLogo){
        if(logoPath) try{await supabaseClient.storage.from('company-branding').remove([logoPath]);}catch(_){}
        logoPath=null;
      }
      const { error } = await supabaseClient.rpc('admin_update_company', {
        p_company_id: companyId,
        p_name: document.getElementById('editCompanyName').value.trim(),
        p_cuit: document.getElementById('editCompanyCuit').value.trim() || null,
        p_contact_name: document.getElementById('editCompanyContact').value.trim() || null,
        p_contact_email: document.getElementById('editCompanyEmail').value.trim() || null,
        p_phone: document.getElementById('editCompanyPhone').value.trim() || null,
        p_address: document.getElementById('editCompanyAddress').value.trim() || null,
        p_notes: document.getElementById('editCompanyNotes').value.trim() || null,
        p_active: document.getElementById('editCompanyActive').checked
      });
      if (error) return showToast(error.message || 'No pude guardar la empresa.');
      const {error:brandError}=await supabaseClient.rpc('admin_update_company_branding',{
        p_company_id:companyId,
        p_display_name:document.getElementById('editCompanyDisplayName').value.trim()||null,
        p_logo_path:logoPath,
        p_brand_primary:document.getElementById('editCompanyPrimary').value||'#000B3C',
        p_brand_secondary:document.getElementById('editCompanySecondary').value||'#2F8DFD',
        p_website:document.getElementById('editCompanyWebsite').value.trim()||null,
        p_industry:document.getElementById('editCompanyIndustry').value.trim()||null
      });
      if(brandError) return showToast(brandError.message||'Guardé los datos, pero no pude guardar el branding.');
      closeModal('adminCompanyEditModal'); showToast('Empresa y branding actualizados.'); await loadAdminCompaniesData();
    });

    document.getElementById('adminCompanyForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const payload = { name: document.getElementById('adminCompanyName').value.trim(), cuit: document.getElementById('adminCompanyCuit').value.trim() || null, contact_email: document.getElementById('adminCompanyEmail').value.trim() || null, phone: document.getElementById('adminCompanyPhone').value.trim() || null, active: true };
      const { error } = await supabaseClient.from('companies').insert(payload);
      if (error) return showToast(error.message || 'No pude crear la empresa.');
      event.target.reset(); showToast('Empresa creada.'); await loadAdminCompaniesData();
    });

    document.getElementById('adminCompanyManagerForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const companyId = document.getElementById('adminManagerCompany').value;
      const fullName = document.getElementById('adminManagerName').value.trim();
      const email = document.getElementById('adminManagerEmail').value.trim();
      const password = document.getElementById('adminManagerPassword').value;
      if (!companyId) return showToast('Elegí una empresa.');
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/hyper-create-student`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}`, 'apikey':SUPABASE_PUBLISHABLE_KEY }, body:JSON.stringify({ full_name:fullName,email,password,account_type:'company_admin',company_id:companyId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return showToast(result.error || 'No pude crear el responsable.');
      event.target.reset(); showToast(result.message || (result.reused ? 'Acceso Empresa agregado a la cuenta existente.' : 'Responsable de empresa creado.')); await loadAdminData();
    });

    document.getElementById('adminCompanyMemberForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const companyId=document.getElementById('adminMemberCompany').value, userId=document.getElementById('adminMemberStudent').value;
      if (!companyId || !userId) return showToast('Elegí empresa y colaborador.');
      const { error } = await supabaseClient.rpc('admin_add_company_member', { p_company_id:companyId, p_user_id:userId });
      if (error) return showToast(error.message || 'No pude vincular el colaborador.');
      showToast('Colaborador vinculado a la empresa.'); await loadAdminCompaniesData();
    });

    document.getElementById('adminCompanyCourseForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const companyId=document.getElementById('adminCourseCompany').value, courseId=document.getElementById('adminCompanyCourse').value;
      if (!companyId || !courseId) return showToast('Elegí empresa y curso.');
      const { data, error } = await supabaseClient.rpc('admin_assign_course_to_company', { p_company_id:companyId, p_course_id:courseId });
      if (error) return showToast(error.message || 'No pude asignar el curso.');
      showToast(`Curso asignado. Nuevas inscripciones: ${data?.inserted || 0}.`); await loadAdminData();
    });

    function openCompanyPasswordModal(userId){
      const p=adminProfiles.find(x=>x.id===userId); const name=p?.full_name||p?.email||'Responsable'; const email=p?.email||'';
      document.getElementById('adminPasswordTargetUser').value=userId;
      document.getElementById('adminPasswordAccountMeta').textContent=`${name} · ${email}`;
      document.getElementById('adminAccountPasswordForm').reset();
      document.getElementById('adminPasswordTargetUser').value=userId;
      document.getElementById('adminPasswordForceChange').checked=true;
      openModal('adminAccountPasswordModal');
    }
    document.getElementById('adminAccountPasswordForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); const userId=document.getElementById('adminPasswordTargetUser').value; const password=document.getElementById('adminPasswordNew').value;
      const {data:sessionData}=await supabaseClient.auth.getSession(); const token=sessionData?.session?.access_token;
      const response=await fetch(`${SUPABASE_URL}/functions/v1/hyper-create-student`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({action:'set_password',target_user_id:userId,password,force_change:document.getElementById('adminPasswordForceChange').checked})});
      const result=await response.json().catch(()=>({})); if(!response.ok)return showToast(result.error||'No pude cambiar la contraseña.');
      closeModal('adminAccountPasswordModal');showToast(result.message||'Contraseña actualizada.');
    });
    async function toggleStudentAccess(userId,enabled){
      const {error}=await supabaseClient.rpc('admin_set_student_access',{p_user_id:userId,p_enabled:enabled});
      if(error)return showToast(error.message||'No pude actualizar el acceso Alumno.');
      showToast(enabled?'Acceso Alumno habilitado en la misma cuenta.':'Acceso Alumno deshabilitado.'); await loadAdminData();
    }

    // =========================================================
    // MESA DE AYUDA - V1.3
    // =========================================================
    async function loadAdminTrainingData() {
      if (!supabaseClient || currentLutminUser?.role !== 'admin') return;
      const [gRes,mRes,sRes,aRes] = await Promise.all([
        supabaseClient.from('training_groups').select('id,course_id,company_id,name,modality,start_date,end_date,instructor_name,location,meeting_url,active,created_at').order('start_date',{ascending:true}),
        supabaseClient.from('training_group_members').select('group_id,user_id,active,joined_at'),
        supabaseClient.from('training_sessions').select('id,group_id,title,session_date,start_time,end_time,location,meeting_url,notes,status,created_at').order('session_date',{ascending:true}).order('start_time',{ascending:true}),
        supabaseClient.from('attendance_records').select('session_id,user_id,status,notes,marked_at,updated_at')
      ]);
      const err=[gRes,mRes,sRes,aRes].find(x=>x.error)?.error;
      if (err) { console.error('Agenda/Asistencia:',err); return; }
      adminTrainingGroups=gRes.data||[]; adminTrainingMembers=mRes.data||[]; adminTrainingSessions=sRes.data||[]; adminAttendance=aRes.data||[];
      renderAdminTraining();
    }

    function trainingGroupLabel(g) {
      const course=adminCourses.find(c=>c.id===g.course_id); const company=adminCompanies.find(c=>c.id===g.company_id);
      return `${g.name}${course ? ' · '+course.title : ''}${company ? ' · '+company.name : ''}`;
    }

    function renderAdminTraining() {
      const courseSel=document.getElementById('adminTrainingCourse');
      if(courseSel) courseSel.innerHTML=adminCourses.length?adminCourses.map(c=>`<option value="${c.id}">${escapeHtml(c.title)}</option>`).join(''):'<option value="">No hay cursos</option>';
      const companySel=document.getElementById('adminTrainingCompany');
      if(companySel) companySel.innerHTML='<option value="">Sin empresa / abierta</option>'+adminCompanies.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      const groupOpts=adminTrainingGroups.filter(g=>g.active!==false).map(g=>`<option value="${g.id}">${escapeHtml(trainingGroupLabel(g))}</option>`).join('');
      ['adminTrainingMemberGroup','adminTrainingSessionGroup'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=groupOpts||'<option value="">No hay comisiones</option>';});
      const studentSel=document.getElementById('adminTrainingMemberStudent');
      if(studentSel) studentSel.innerHTML=adminProfiles.filter(p=>adminIsStudent(p)).map(p=>`<option value="${p.id}">${escapeHtml(p.full_name||p.email)} · ${escapeHtml(p.email||'')}</option>`).join('')||'<option value="">No hay alumnos</option>';
      const root=document.getElementById('adminTrainingList'); if(!root)return;
      if(!adminTrainingGroups.length){root.innerHTML='<div class="p-6 text-sm text-slate-500">Todavía no hay comisiones.</div>';return;}
      root.innerHTML=adminTrainingGroups.map(g=>{
        const course=adminCourses.find(c=>c.id===g.course_id); const company=adminCompanies.find(c=>c.id===g.company_id);
        const members=adminTrainingMembers.filter(m=>m.group_id===g.id&&m.active!==false);
        const sessions=adminTrainingSessions.filter(x=>x.group_id===g.id);
        const sessionHtml=sessions.length?sessions.map(x=>{
          const att=adminAttendance.filter(a=>a.session_id===x.id); const present=att.filter(a=>a.status==='present').length; const absent=att.filter(a=>a.status==='absent').length; const justified=att.filter(a=>a.status==='justified').length;
          const d=x.session_date?new Date(`${x.session_date}T12:00:00`).toLocaleDateString('es-AR'):'—'; const time=x.start_time?String(x.start_time).slice(0,5):'';
          return `<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(x.title)}</p><p class="mt-1 text-[11px] text-slate-500">${d}${time?' · '+time+' hs':''} · ${escapeHtml(x.location||g.location||g.modality)}</p><p class="mt-1 text-[10px] text-slate-400">${present} presentes · ${absent} ausentes · ${justified} justificados</p></div><button onclick="openAttendance('${x.id}')" class="px-3 py-2 rounded-xl bg-indigo-700 text-white text-xs font-bold"><i class="fa-solid fa-clipboard-user mr-1"></i>Asistencia</button></div></div>`;
        }).join(''):'<div class="text-xs text-slate-400">Sin encuentros programados.</div>';
        return `<div class="p-5 sm:p-6"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p class="text-[10px] font-bold uppercase text-indigo-600">${escapeHtml(course?.title||'Curso')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(g.name)}</h4><p class="mt-1 text-xs text-slate-500">${escapeHtml(company?.name||'Comisión abierta')} · ${escapeHtml(g.modality)}${g.instructor_name?' · '+escapeHtml(g.instructor_name):''}</p></div><div class="text-xs text-slate-500"><strong>${members.length}</strong> participantes · <strong>${sessions.length}</strong> encuentros</div></div><div class="mt-4 grid md:grid-cols-2 gap-3">${sessionHtml}</div></div>`;
      }).join('');
    }

    document.getElementById('adminTrainingGroupForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const {data,error}=await supabaseClient.rpc('admin_create_training_group',{
        p_course_id:document.getElementById('adminTrainingCourse').value,
        p_name:document.getElementById('adminTrainingName').value.trim(),
        p_company_id:document.getElementById('adminTrainingCompany').value||null,
        p_modality:document.getElementById('adminTrainingModality').value,
        p_start_date:document.getElementById('adminTrainingStart').value||null,
        p_end_date:document.getElementById('adminTrainingEnd').value||null,
        p_instructor_name:document.getElementById('adminTrainingInstructor').value.trim()||null,
        p_location:document.getElementById('adminTrainingLocation').value.trim()||null,
        p_meeting_url:document.getElementById('adminTrainingMeetingUrl').value.trim()||null
      });
      if(error)return showToast(error.message||'No pude crear la comisión.');
      event.target.reset(); showToast('Comisión creada.'); await loadAdminData();
    });

    document.getElementById('adminTrainingMemberForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); const {error}=await supabaseClient.rpc('admin_add_training_group_member',{p_group_id:document.getElementById('adminTrainingMemberGroup').value,p_user_id:document.getElementById('adminTrainingMemberStudent').value});
      if(error)return showToast(error.message||'No pude agregar al alumno.'); showToast('Alumno agregado a la comisión.'); await loadAdminTrainingData(); await loadAdminData();
    });

    document.getElementById('adminTrainingSessionForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); const {error}=await supabaseClient.rpc('admin_create_training_session',{
        p_group_id:document.getElementById('adminTrainingSessionGroup').value,p_title:document.getElementById('adminTrainingSessionTitle').value.trim(),p_session_date:document.getElementById('adminTrainingSessionDate').value,
        p_start_time:document.getElementById('adminTrainingSessionStart').value||null,p_end_time:document.getElementById('adminTrainingSessionEnd').value||null,p_location:document.getElementById('adminTrainingSessionLocation').value.trim()||null,p_meeting_url:document.getElementById('adminTrainingSessionUrl').value.trim()||null,p_notes:null
      });
      if(error)return showToast(error.message||'No pude programar el encuentro.'); event.target.reset(); showToast('Encuentro agregado a la agenda.'); await loadAdminTrainingData();
    });

    function openAttendance(sessionId){
      activeAttendanceSessionId=sessionId; const session=adminTrainingSessions.find(x=>x.id===sessionId); if(!session)return; const group=adminTrainingGroups.find(g=>g.id===session.group_id); const members=adminTrainingMembers.filter(m=>m.group_id===session.group_id&&m.active!==false);
      document.getElementById('attendanceModalTitle').textContent=session.title||'Encuentro'; document.getElementById('attendanceModalMeta').textContent=`${group?.name||''} · ${session.session_date?new Date(`${session.session_date}T12:00:00`).toLocaleDateString('es-AR'):''}`;
      document.getElementById('attendanceModalList').innerHTML=members.length?members.map(m=>{const p=adminProfiles.find(x=>x.id===m.user_id);const a=adminAttendance.find(x=>x.session_id===sessionId&&x.user_id===m.user_id);return `<div class="p-4 grid sm:grid-cols-[1fr_180px] gap-3 items-center" data-attendance-user="${m.user_id}"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(p?.full_name||p?.email||'Alumno')}</p><p class="text-[11px] text-slate-400">${escapeHtml(p?.email||'')}</p></div><select class="attendance-status px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"><option value="pending" ${!a||a.status==='pending'?'selected':''}>Pendiente</option><option value="present" ${a?.status==='present'?'selected':''}>Presente</option><option value="absent" ${a?.status==='absent'?'selected':''}>Ausente</option><option value="justified" ${a?.status==='justified'?'selected':''}>Justificado</option></select></div>`}).join(''):'<div class="p-6 text-sm text-slate-500">La comisión no tiene participantes.</div>';
      openModal('attendanceModal');
    }

    async function saveAttendanceModal(){
      if(!activeAttendanceSessionId)return; const records=[...document.querySelectorAll('#attendanceModalList [data-attendance-user]')].map(row=>({user_id:row.dataset.attendanceUser,status:row.querySelector('.attendance-status')?.value||'pending',notes:null}));
      const {error}=await supabaseClient.rpc('admin_save_attendance',{p_session_id:activeAttendanceSessionId,p_records:records}); if(error)return showToast(error.message||'No pude guardar la asistencia.'); closeModal('attendanceModal');showToast('Asistencia guardada.');await loadAdminTrainingData();
    }

    function exportAttendanceCsv(){
      const rows=[['Comisión','Curso','Empresa','Encuentro','Fecha','Alumno','Email','Estado']];
      adminAttendance.forEach(a=>{const session=adminTrainingSessions.find(s=>s.id===a.session_id);const group=adminTrainingGroups.find(g=>g.id===session?.group_id);const p=adminProfiles.find(x=>x.id===a.user_id);const c=adminCourses.find(x=>x.id===group?.course_id);const company=adminCompanies.find(x=>x.id===group?.company_id);rows.push([group?.name||'',c?.title||'',company?.name||'',session?.title||'',session?.session_date||'',p?.full_name||'',p?.email||'',a.status||'']);});
      const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lutmin_Asistencia_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
    }

    // V32: render tolerante a módulos de Administración montados bajo demanda.
    // Sólo intenta pintar controles que existen en el fragmento activo.
    function renderAdminPanel() {
      const students = adminProfiles.filter(p => adminIsStudent(p));
      const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
      const setHtml=(id,value)=>{const el=document.getElementById(id);if(el)el.innerHTML=value;};
      setText('adminStudentsStat', students.length);
      setText('adminCoursesStat', adminCourses.length);
      setText('adminEnrollmentsStat', adminEnrollments.length);
      setText('adminCertificatesStat', adminCertificates.length);
      setText('adminLeadsStat', adminCourseLeads.filter(l => l.status !== 'discarded').length);
      setText('adminPaymentsPendingStat', adminEnrollments.filter(e => ['pending','partial'].includes(e.payment_status)).length);
      setText('adminActiveCompaniesStat', adminCompanies.filter(c => c.active !== false).length);
      setText('adminOpenOfferingsStat', adminOfferings.filter(o => o.published !== false && (!o.registration_status || ['open','active','published'].includes(String(o.registration_status).toLowerCase()))).length);

      const studentOptions = students.length
        ? students.map(p => `<option value="${p.id}">${escapeHtml(p.full_name || p.email || 'Alumno')} · ${escapeHtml(p.email || 'sin email')}</option>`).join('')
        : '<option value="">No hay alumnos registrados</option>';
      const courseOptions = adminCourses.length
        ? adminCourses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}${c.published ? '' : ' (oculto)'}</option>`).join('')
        : '<option value="">No hay cursos</option>';

      setHtml('adminStudentSelect', studentOptions);
      setHtml('adminCourseSelect', courseOptions);
      setHtml('adminLessonCourse', courseOptions);
      setHtml('adminAssessmentCourse', courseOptions);
      setHtml('adminOfferingCourse', courseOptions);

      const assessmentOptions = adminAssessments.length
        ? adminAssessments.map(a => {
            const course = adminCourses.find(c => c.id === a.course_id);
            const count = adminAssessmentQuestions.filter(q => q.assessment_id === a.id).length;
            return `<option value="${a.id}">${escapeHtml(course?.title || a.title)} · ${count} preguntas</option>`;
          }).join('')
        : '<option value="">No hay evaluaciones creadas</option>';
      setHtml('adminQuestionAssessment', assessmentOptions);

      if(document.getElementById('adminStudentsList')){
        populateAdminAcademicFilters();
        applyAdminStudentFilters();
      }
      if(document.getElementById('adminCoursesList')) renderAdminCourses();
      if(document.getElementById('adminCertificatesList')) renderAdminCertificates();
      if(document.getElementById('adminOfferingsList')||document.getElementById('adminLeadsList')) renderAdminCommercial();
      if(document.getElementById('adminPaymentsList')) renderAdminPayments();
      if(document.getElementById('financeCourseRows')||document.getElementById('financeDebtRows')) renderAdminFinancialDashboard();
    }

    function adminDateTime(value) {
      if (!value) return 'Sin registro';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return 'Sin registro';
      return new Intl.DateTimeFormat('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(d);
    }

    function getStudentAcademicSnapshot(student) {
      const enrollments = adminEnrollments.filter(e => e.user_id === student.id);
      const certificates = adminCertificates.filter(c => c.user_id === student.id);
      const validCertificates = certificates.filter(c => c.status === 'valid');
      const courseSummaries = enrollments.map(enrollment => {
        const course = adminCourses.find(c => c.id === enrollment.course_id);
        const lessons = adminLessons.filter(l => l.course_id === enrollment.course_id);
        const lessonIds = new Set(lessons.map(l => l.id));
        const completedRows = adminProgressRows.filter(p => p.user_id === student.id && lessonIds.has(p.lesson_id));
        const assessment = adminAssessments.find(a => a.course_id === enrollment.course_id);
        const attempts = assessment ? adminAssessmentAttempts.filter(a => a.assessment_id === assessment.id && a.user_id === student.id).sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at)) : [];
        const passedAttempt = attempts.find(a => a.passed) || null;
        const bestScore = attempts.length ? Math.max(...attempts.map(a => Number(a.score || 0))) : null;
        const certificate = certificates.find(c => c.course_id === enrollment.course_id && c.status === 'valid') || certificates.find(c => c.course_id === enrollment.course_id) || null;
        const pct = lessons.length ? Math.round((completedRows.length / lessons.length) * 100) : 0;
        const dates = [enrollment.enrolled_at, ...completedRows.map(r => r.completed_at), ...attempts.map(a => a.submitted_at), certificate?.issued_at].filter(Boolean).map(x => new Date(x).getTime()).filter(Number.isFinite);
        return { enrollment, course, lessons, completedRows, assessment, attempts, passedAttempt, bestScore, certificate, pct, lastActivity: dates.length ? new Date(Math.max(...dates)).toISOString() : enrollment.enrolled_at };
      });

      const totalLessons = courseSummaries.reduce((sum, x) => sum + x.lessons.length, 0);
      const completedLessons = courseSummaries.reduce((sum, x) => sum + x.completedRows.length, 0);
      const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const allCompleted = enrollments.length > 0 && courseSummaries.every(x => x.enrollment.status === 'completed' || !!(x.certificate && x.certificate.status === 'valid'));
      let statusKey = 'not_started';
      let statusLabel = 'Sin comenzar';
      if (!student.active) { statusKey = 'inactive'; statusLabel = 'Desactivado'; }
      else if (!enrollments.length) { statusKey = 'no_courses'; statusLabel = 'Sin cursos'; }
      else if (allCompleted) { statusKey = 'completed'; statusLabel = 'Formación completada'; }
      else if (completedLessons > 0 || adminAssessmentAttempts.some(a => a.user_id === student.id)) { statusKey = 'in_progress'; statusLabel = 'En curso'; }

      const activityDates = [student.last_seen_at, ...courseSummaries.map(x => x.lastActivity)].filter(Boolean).map(x => new Date(x).getTime()).filter(Number.isFinite);
      const lastActivity = activityDates.length ? new Date(Math.max(...activityDates)).toISOString() : null;
      return {
        student, enrollments, courseSummaries, certificates, validCertificates,
        totalLessons, completedLessons, progress, statusKey, statusLabel, lastActivity,
        attempts: adminAssessmentAttempts.filter(a => a.user_id === student.id).sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      };
    }

    function populateAdminAcademicFilters() {
      const select = document.getElementById('adminStudentCourseFilter');
      if (!select) return;
      const previous = select.value || 'all';
      select.innerHTML = '<option value="all">Todos los cursos</option>' + adminCourses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
      if ([...select.options].some(o => o.value === previous)) select.value = previous;
    }

    function applyAdminStudentFilters() {
      const students = adminProfiles.filter(p => adminIsStudent(p));
      const search = String(document.getElementById('adminStudentSearch')?.value || '').trim().toLowerCase();
      const courseId = document.getElementById('adminStudentCourseFilter')?.value || 'all';
      const status = document.getElementById('adminStudentStatusFilter')?.value || 'all';
      const snapshots = students.map(getStudentAcademicSnapshot);

      document.getElementById('adminAcademicNotStarted').textContent = String(snapshots.filter(s => s.statusKey === 'not_started').length);
      document.getElementById('adminAcademicInProgress').textContent = String(snapshots.filter(s => s.statusKey === 'in_progress').length);
      document.getElementById('adminAcademicCompleted').textContent = String(snapshots.filter(s => s.statusKey === 'completed').length);
      document.getElementById('adminAcademicInactive').textContent = String(snapshots.filter(s => s.statusKey === 'inactive').length);

      const filtered = snapshots.filter(snapshot => {
        const student = snapshot.student;
        const matchesSearch = !search || `${student.full_name || ''} ${student.email || ''}`.toLowerCase().includes(search);
        const matchesCourse = courseId === 'all' || snapshot.enrollments.some(e => e.course_id === courseId);
        const matchesStatus = status === 'all' || snapshot.statusKey === status;
        return matchesSearch && matchesCourse && matchesStatus;
      }).map(s => s.student);
      lastAdminFilteredStudents = filtered;
      renderAdminStudents(filtered);
    }

    function renderAdminStudents(students) {
      const container = document.getElementById('adminStudentsList');
      if (!students.length) {
        container.innerHTML = '<div class="p-8 text-center text-sm text-slate-500">No hay alumnos que coincidan con los filtros.</div>';
        return;
      }

      container.innerHTML = students.map(student => {
        const s = getStudentAcademicSnapshot(student);
        const statusClasses = s.statusKey === 'completed' ? 'bg-green-50 text-green-700' : s.statusKey === 'in_progress' ? 'bg-blue-50 text-blue-700' : s.statusKey === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600';
        const coursesPreview = s.courseSummaries.slice(0, 3).map(x => `<span class="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">${escapeHtml(x.course?.title || 'Curso')} · ${x.pct}%</span>`).join('');
        return `<div class="p-5 sm:p-6">
          <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark text-base">${escapeHtml(student.full_name || 'Alumno sin nombre')}</p><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${statusClasses}">${s.statusLabel}</span>${student.must_change_password ? '<span class="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">Contraseña provisoria</span>' : ''}</div>
              <p class="mt-1 text-xs text-slate-500">${escapeHtml(student.email || 'Sin correo')} · Último acceso: ${adminDateTime(student.last_seen_at)}</p>
              <div class="mt-3 flex flex-wrap gap-2">${coursesPreview || '<span class="text-xs text-slate-400">Sin cursos asignados.</span>'}${s.courseSummaries.length > 3 ? `<span class="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">+${s.courseSummaries.length - 3}</span>` : ''}</div>
              <div class="mt-4 max-w-xl"><div class="flex justify-between text-[11px] font-bold text-slate-500"><span>Progreso general</span><span>${s.progress}%</span></div><div class="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-lutmin-light rounded-full" style="width:${s.progress}%"></div></div></div>
            </div>
            <div class="grid grid-cols-3 gap-2 xl:w-[310px] shrink-0 text-center">
              <div class="rounded-xl bg-slate-50 p-3"><p class="text-[9px] text-slate-400 font-bold">CURSOS</p><p class="mt-1 font-black text-lutmin-dark">${s.enrollments.length}</p></div>
              <div class="rounded-xl bg-slate-50 p-3"><p class="text-[9px] text-slate-400 font-bold">INTENTOS</p><p class="mt-1 font-black text-lutmin-dark">${s.attempts.length}</p></div>
              <div class="rounded-xl bg-slate-50 p-3"><p class="text-[9px] text-slate-400 font-bold">CERT.</p><p class="mt-1 font-black text-green-600">${s.validCertificates.length}</p></div>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button onclick="openAdminStudentDetail('${student.id}')" class="px-3.5 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-address-card mr-2"></i>Ver ficha</button>
            <button onclick="prepareEnrollment('${student.id}')" class="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Asignar curso</button>
            <button onclick="toggleStudentActive('${student.id}', ${student.active ? 'false' : 'true'})" class="px-3.5 py-2 rounded-xl ${student.active ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'} text-xs font-bold">${student.active ? 'Desactivar' : 'Activar'}</button>
          </div>
        </div>`;
      }).join('');
    }

    function exportAdminStudentsCsv() {
      const students = lastAdminFilteredStudents;
      const rows = [['Nombre','Correo','Estado','Cursos asignados','Progreso general','Intentos evaluación','Certificados válidos','Último acceso']];
      students.forEach(student => {
        const s = getStudentAcademicSnapshot(student);
        rows.push([student.full_name || '', student.email || '', s.statusLabel, s.enrollments.length, `${s.progress}%`, s.attempts.length, s.validCertificates.length, student.last_seen_at ? adminDateTime(student.last_seen_at) : 'Sin registro']);
      });
      const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `lutmin-seguimiento-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    // V3.8.1: todas las clases quedan visibles/editables en la tarjeta del curso.
    function renderAdminCourses() {
      const container = document.getElementById('adminCoursesList');
      if (!adminCourses.length) {
        container.innerHTML = '<div class="p-6 text-sm text-slate-500">Todavía no hay cursos.</div>';
        return;
      }

      container.innerHTML = adminCourses.map(course => {
        const lessons = adminLessons.filter(l => l.course_id === course.id).sort((a,b) => a.sort_order - b.sort_order);
        const enrollCount = adminEnrollments.filter(e => e.course_id === course.id).length;
        const lessonPreview = lessons.length
          ? lessons.map(l => `<button onclick="openAdminLessonEditor('${l.id}')" class="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600">${l.sort_order}. ${escapeHtml(l.title)}${l.material_path ? ' · 📎' : ''}</button>`).join('')
          : '<span class="text-xs text-slate-400">Sin clases cargadas.</span>';
        return `<div class="p-5 sm:p-6">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-extrabold text-lutmin-dark">${escapeHtml(course.title)}</p>
                <span class="text-[10px] px-2 py-1 rounded-full font-bold ${course.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}">${course.published ? 'Publicado' : 'Oculto'}</span>
              </div>
              <p class="mt-1 text-xs text-slate-500">${course.duration_hours} h · ${escapeHtml(course.level)} · ${lessons.length} clases · ${enrollCount} inscripciones</p>
              ${(() => { const a = adminAssessments.find(x => x.course_id === course.id); const qCount = a ? adminAssessmentQuestions.filter(q => q.assessment_id === a.id).length : 0; return a ? `<p class="mt-2 text-xs font-bold ${a.published ? 'text-violet-600' : 'text-slate-400'}">Evaluación: ${qCount} preguntas · aprobación ${a.passing_score}% · ${a.published ? 'publicada' : 'oculta'}</p>` : '<p class="mt-2 text-xs text-slate-400">Sin evaluación.</p>'; })()}
              <div class="mt-3 flex flex-wrap gap-2">${lessonPreview}</div>
            </div>
            <div class="flex flex-wrap gap-2 shrink-0">
              <button onclick="openAdminCourseEditor('${course.id}')" class="px-3 py-2 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold">Editar curso</button>
              <button onclick="prepareLesson('${course.id}')" class="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">Agregar clase</button>
              <button onclick="toggleCoursePublished('${course.id}', ${course.published ? 'false' : 'true'})" class="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">${course.published ? 'Ocultar' : 'Publicar'}</button>
            </div>
          </div>
        </div>`;
      }).join('');
    }

    function prepareEnrollment(userId) {
      document.getElementById('adminStudentSelect').value = userId;
      document.getElementById('adminAssignForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function prepareLesson(courseId) {
      document.getElementById('adminLessonCourse').value = courseId;
      const courseLessons = adminLessons.filter(l => l.course_id === courseId);
      const nextOrder = courseLessons.length ? Math.max(...courseLessons.map(l => Number(l.sort_order || 0))) + 1 : 1;
      document.getElementById('adminLessonOrder').value = String(nextOrder);
      document.getElementById('adminLessonForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let editingAdminCourseId = null;
    let editingAdminLessonId = null;

    function openAdminCourseEditor(courseId) {
      const course = adminCourses.find(c => c.id === courseId);
      if (!course) return;
      editingAdminCourseId = courseId;
      document.getElementById('editCourseTitle').value = course.title || '';
      document.getElementById('editCourseHours').value = String(course.duration_hours ?? 0);
      document.getElementById('editCourseLevel').value = course.level || 'Inicial';
      document.getElementById('editCourseCategory').value = course.category || 'tecnico';
      document.getElementById('editCoursePublished').checked = !!course.published;
      document.getElementById('editCourseFeatured').checked = !!course.public_featured;
      document.getElementById('editCourseCertificateKind').value = course.certificate_kind || 'approval';
      document.getElementById('editCourseCertificateValidity').value = course.certificate_validity_months || '';
      document.getElementById('editCourseVersion').value = course.course_version || '1.0';
      document.getElementById('editCourseInstructor').value = course.instructor_name || '';
      document.getElementById('editCourseTrainingModality').value = course.training_modality || '';
      document.getElementById('editCourseTrainingLocation').value = course.training_location || '';
      document.getElementById('editCourseDescription').value = course.description || '';
      openModal('adminCourseEditModal');
    }

    document.getElementById('adminCourseEditForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!editingAdminCourseId || currentLutminUser?.role !== 'admin') return;
      const btn = document.getElementById('editCourseSaveBtn');
      btn.disabled = true; btn.textContent = 'Guardando...';
      const payload = {
        title: document.getElementById('editCourseTitle').value.trim(),
        description: document.getElementById('editCourseDescription').value.trim(),
        duration_hours: Number(document.getElementById('editCourseHours').value || 0),
        level: document.getElementById('editCourseLevel').value,
        category: document.getElementById('editCourseCategory').value,
        published: document.getElementById('editCoursePublished').checked,
        public_featured: document.getElementById('editCourseFeatured').checked,
        certificate_kind: document.getElementById('editCourseCertificateKind').value,
        certificate_validity_months: document.getElementById('editCourseCertificateValidity').value ? Number(document.getElementById('editCourseCertificateValidity').value) : null,
        course_version: document.getElementById('editCourseVersion').value.trim() || '1.0',
        instructor_name: document.getElementById('editCourseInstructor').value.trim(),
        training_modality: document.getElementById('editCourseTrainingModality').value.trim(),
        training_location: document.getElementById('editCourseTrainingLocation').value.trim()
      };
      const { error } = await supabaseClient.from('courses').update(payload).eq('id', editingAdminCourseId);
      btn.disabled = false; btn.textContent = 'Guardar cambios';
      if (error) { console.error(error); showToast('No pude guardar el curso.'); return; }
      closeModal('adminCourseEditModal');
      showToast('Curso actualizado.');
      await loadAdminData();
      await loadCampusData();
      await loadPublicCatalog();
    });

    function openAdminLessonEditor(lessonId) {
      const lesson = adminLessons.find(l => l.id === lessonId);
      if (!lesson) return;
      const course = adminCourses.find(c => c.id === lesson.course_id);
      editingAdminLessonId = lessonId;
      document.getElementById('editLessonCourseLabel').textContent = course ? course.title : 'Curso';
      document.getElementById('editLessonOrder').value = String(lesson.sort_order ?? 1);
      document.getElementById('editLessonDuration').value = String(lesson.duration_minutes ?? 0);
      document.getElementById('editLessonTitle').value = lesson.title || '';
      document.getElementById('editLessonVideo').value = lesson.video_url || '';
      document.getElementById('editLessonMaterialUrl').value = lesson.material_url || '';
      const videoStatus = document.getElementById('editLessonVideoStatus');
      const removeVideoBtn = document.getElementById('removeLessonVideoBtn');
      if (lesson.video_path) {
        videoStatus.textContent = `Video privado cargado: ${lesson.video_path.split('/').pop()}`;
        removeVideoBtn.classList.remove('hidden');
      } else {
        videoStatus.textContent = lesson.video_url ? 'Usa un video por enlace.' : 'Sin video privado cargado.';
        removeVideoBtn.classList.add('hidden');
      }
      document.getElementById('editLessonVideoFile').value = '';
      document.getElementById('editLessonDescription').value = lesson.description || '';
      document.getElementById('editLessonContent').value = String(lesson.content || '').replace(/\\n/g, '\n');
      document.getElementById('editLessonPublishedV39').checked = lesson.published !== false;
      document.getElementById('editLessonRequiredV39').checked = lesson.required !== false;
      document.getElementById('editLessonVideoRequiredV24').checked = lesson.video_completion_required === true;
      document.getElementById('editLessonVideoMinV24').value = String(lesson.video_min_watch_percent || 98);
      const status = document.getElementById('editLessonMaterialStatus');
      const removeBtn = document.getElementById('removeLessonMaterialBtn');
      if (lesson.material_path) {
        status.textContent = `Archivo privado cargado: ${lesson.material_path.split('/').pop()}`;
        removeBtn.classList.remove('hidden');
      } else {
        status.textContent = lesson.material_url ? 'Usa un enlace externo.' : 'Sin archivo privado cargado.';
        removeBtn.classList.add('hidden');
      }
      document.getElementById('editLessonFile').value = '';
      openModal('adminLessonEditModal');
    }

    document.getElementById('adminLessonEditForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!editingAdminLessonId || currentLutminUser?.role !== 'admin') return;
      const lesson = adminLessons.find(l => l.id === editingAdminLessonId);
      if (!lesson) return;
      const btn = document.getElementById('editLessonSaveBtn');
      btn.disabled = true; btn.textContent = 'Guardando...';
      const file = document.getElementById('editLessonFile')?.files?.[0] || null;
      const videoFile = document.getElementById('editLessonVideoFile')?.files?.[0] || null;
      let newPath = null;
      let newVideoPath = null;
      try {
        if (file) newPath = await uploadLessonMaterial(lesson.course_id, file);
        if (videoFile) newVideoPath = await uploadLessonPrivateVideo(lesson.course_id, videoFile);
      } catch (uploadError) {
        if (newPath) await supabaseClient.storage.from('course-materials').remove([newPath]);
        if (newVideoPath) await supabaseClient.storage.from('course-materials').remove([newVideoPath]);
        btn.disabled = false; btn.textContent = 'Guardar clase';
        console.error(uploadError); showToast(uploadError?.message || 'No pude subir el material.'); return;
      }
      const payload = {
        title: document.getElementById('editLessonTitle').value.trim(),
        description: document.getElementById('editLessonDescription').value.trim(),
        content: document.getElementById('editLessonContent').value.trim(),
        duration_minutes: Number(document.getElementById('editLessonDuration').value || 0),
        sort_order: Number(document.getElementById('editLessonOrder').value || 1),
        video_url: document.getElementById('editLessonVideo').value.trim() || null,
        material_url: document.getElementById('editLessonMaterialUrl').value.trim() || null,
        published: document.getElementById('editLessonPublishedV39')?.checked !== false,
        required: document.getElementById('editLessonRequiredV39')?.checked !== false,
        video_completion_required: document.getElementById('editLessonVideoRequiredV24')?.checked === true,
        video_min_watch_percent: Math.max(80, Math.min(100, Number(document.getElementById('editLessonVideoMinV24')?.value || 98))),
        ...(newPath ? { material_path: newPath } : {}),
        ...(newVideoPath ? { video_path: newVideoPath } : {})
      };
      const effectiveVideoPath = newVideoPath || lesson.video_path || null;
      if (payload.video_completion_required && !payload.video_url && !effectiveVideoPath) {
        if (newPath) await supabaseClient.storage.from('course-materials').remove([newPath]);
        if (newVideoPath) await supabaseClient.storage.from('course-materials').remove([newVideoPath]);
        btn.disabled = false; btn.textContent = 'Guardar clase';
        showToast('Para exigir visualización cargá un video YouTube No listado o MP4/WEBM.');
        return;
      }
      if (payload.video_completion_required && payload.video_url && !/youtu(?:\.be|be\.com)|\.(mp4|webm)(?:\?|$)/i.test(payload.video_url) && !effectiveVideoPath) {
        btn.disabled = false; btn.textContent = 'Guardar clase';
        showToast('El bloqueo de avance funciona con YouTube No listado o MP4/WEBM.');
        return;
      }
      const { error } = await supabaseClient.from('lessons').update(payload).eq('id', lesson.id);
      if (error) {
        if (newPath) await supabaseClient.storage.from('course-materials').remove([newPath]);
        if (newVideoPath) await supabaseClient.storage.from('course-materials').remove([newVideoPath]);
        btn.disabled = false; btn.textContent = 'Guardar clase';
        console.error(error);
        showToast(error.code === '23505' ? 'Ya existe otra clase con ese número.' : 'No pude guardar la clase.');
        return;
      }
      if (newPath && lesson.material_path && lesson.material_path !== newPath) {
        await supabaseClient.storage.from('course-materials').remove([lesson.material_path]);
      }
      if (newVideoPath && lesson.video_path && lesson.video_path !== newVideoPath) {
        await supabaseClient.storage.from('course-materials').remove([lesson.video_path]);
      }
      btn.disabled = false; btn.textContent = 'Guardar clase';
      closeModal('adminLessonEditModal');
      showToast('Clase actualizada.');
      await loadAdminData();
      await loadCampusData();
    });

    async function removeAdminLessonVideo() {
      if (!editingAdminLessonId || currentLutminUser?.role !== 'admin') return;
      const lesson = adminLessons.find(l => l.id === editingAdminLessonId);
      if (!lesson?.video_path) return;
      if (!confirm('¿Quitar el video privado de esta clase?')) return;
      const oldPath = lesson.video_path;
      const { error } = await supabaseClient.from('lessons').update({ video_path: null }).eq('id', lesson.id);
      if (error) { console.error(error); showToast('No pude quitar el video.'); return; }
      await supabaseClient.storage.from('course-materials').remove([oldPath]);
      showToast('Video privado quitado.');
      await loadAdminData();
      const refreshed = adminLessons.find(l => l.id === editingAdminLessonId);
      document.getElementById('editLessonVideoStatus').textContent = refreshed?.video_url ? 'Usa un video por enlace.' : 'Sin video privado cargado.';
      document.getElementById('removeLessonVideoBtn').classList.add('hidden');
      await loadCampusData();
    }

    async function removeAdminLessonMaterial() {
      if (!editingAdminLessonId || currentLutminUser?.role !== 'admin') return;
      const lesson = adminLessons.find(l => l.id === editingAdminLessonId);
      if (!lesson?.material_path) return;
      if (!confirm('¿Quitar el archivo privado de esta clase?')) return;
      const oldPath = lesson.material_path;
      const { error } = await supabaseClient.from('lessons').update({ material_path: null }).eq('id', lesson.id);
      if (error) { console.error(error); showToast('No pude quitar el material.'); return; }
      await supabaseClient.storage.from('course-materials').remove([oldPath]);
      showToast('Material quitado.');
      await loadAdminData();
      const refreshed = adminLessons.find(l => l.id === editingAdminLessonId);
      document.getElementById('editLessonMaterialStatus').textContent = refreshed?.material_url ? 'Usa un enlace externo.' : 'Sin archivo privado cargado.';
      document.getElementById('removeLessonMaterialBtn').classList.add('hidden');
      await loadCampusData();
    }

    async function deleteAdminLesson() {
      if (!editingAdminLessonId || currentLutminUser?.role !== 'admin') return;
      const lesson = adminLessons.find(l => l.id === editingAdminLessonId);
      if (!lesson) return;
      const progressCount = adminProgressRows.filter(p => p.lesson_id === lesson.id).length;
      if (progressCount > 0) {
        showToast(`No se puede eliminar: ${progressCount} alumno${progressCount === 1 ? '' : 's'} ya registró progreso en esta clase.`);
        return;
      }
      if (!confirm(`¿Eliminar la clase ${lesson.sort_order}: ${lesson.title}? Esta acción no se puede deshacer.`)) return;
      const { data, error } = await supabaseClient.rpc('admin_delete_unused_lesson', { p_lesson_id: lesson.id });
      if (error) { console.error(error); showToast(error.message || 'No pude eliminar la clase.'); return; }
      const oldPath = data?.material_path || lesson.material_path;
      if (oldPath) await supabaseClient.storage.from('course-materials').remove([oldPath]);
      if (lesson.video_path) await supabaseClient.storage.from('course-materials').remove([lesson.video_path]);
      closeModal('adminLessonEditModal');
      editingAdminLessonId = null;
      showToast('Clase eliminada y numeración reordenada.');
      await loadAdminData();
      await loadCampusData();
    }

    function adminShortDate(value) {
      if (!value) return 'A confirmar';
      const [y,m,d] = String(value).slice(0,10).split('-');
      return `${d}/${m}/${y}`;
    }

    function renderAdminCommercial() {
      const leadCourseFilter = document.getElementById('adminLeadCourseFilter');
      if (leadCourseFilter) {
        const previous = leadCourseFilter.value || 'all';
        leadCourseFilter.innerHTML = '<option value="all">Todos los cursos</option>' + adminCourses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
        if ([...leadCourseFilter.options].some(o => o.value === previous)) leadCourseFilter.value = previous;
      }
      renderAdminOfferings();
      applyAdminLeadFilters();
    }

    function renderAdminOfferings() {
      const list = document.getElementById('adminOfferingsList');
      if (!list) return;
      if (!adminOfferings.length) { list.innerHTML = '<div class="p-6 text-sm text-slate-500">Todavía no hay ediciones programadas.</div>'; return; }
      list.innerHTML = adminOfferings.map(o => {
        const course = adminCourses.find(c => c.id === o.course_id);
        const enrolled = adminEnrollments.filter(e => e.offering_id === o.id).length;
        const leads = adminCourseLeads.filter(l => l.offering_id === o.id && l.status !== 'discarded').length;
        const statusClass = o.status === 'open' && o.published ? 'bg-green-50 text-green-700' : o.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600';
        return `<div class="p-5 sm:p-6"><div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark">${escapeHtml(course?.title || 'Curso')}</p><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${statusClass}">${o.status === 'open' && o.published ? 'Abierta' : o.status === 'closed' ? 'Cerrada' : o.status === 'cancelled' ? 'Cancelada' : o.status}</span></div><p class="mt-1 text-xs text-slate-500">${adminShortDate(o.start_date)} · ${escapeHtml(String(o.modality || '').replace(/^./, x => x.toUpperCase()))}${o.location ? ` · ${escapeHtml(o.location)}` : ''}</p><p class="mt-2 text-xs font-bold text-slate-600">${formatPublicMoney(o.price, o.currency)} · ${o.capacity ? `${enrolled}/${o.capacity} inscriptos` : `${enrolled} inscriptos`} · ${leads} interesados</p></div><div class="flex flex-wrap gap-2"><button onclick="toggleAdminOffering('${o.id}','${o.status === 'open' ? 'closed' : 'open'}')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">${o.status === 'open' ? 'Cerrar inscripción' : 'Reabrir'}</button><button onclick="deleteAdminOffering('${o.id}')" class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Eliminar</button></div></div></div>`;
      }).join('');
    }

    document.getElementById('adminOfferingForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const capacityRaw = document.getElementById('adminOfferingCapacity').value;
      const payload = {
        course_id: document.getElementById('adminOfferingCourse').value,
        start_date: document.getElementById('adminOfferingStart').value || null,
        end_date: document.getElementById('adminOfferingEnd').value || null,
        registration_deadline: document.getElementById('adminOfferingDeadline').value || null,
        modality: document.getElementById('adminOfferingModality').value,
        location: document.getElementById('adminOfferingLocation').value.trim(),
        price: Number(document.getElementById('adminOfferingPrice').value || 0),
        currency: 'ARS',
        capacity: capacityRaw ? Number(capacityRaw) : null,
        status: 'open',
        published: document.getElementById('adminOfferingPublished').checked
      };
      const { error } = await supabaseClient.from('course_offerings').insert(payload);
      if (error) { console.error(error); showToast(error.message || 'No pude crear la edición.'); return; }
      event.target.reset();
      document.getElementById('adminOfferingPrice').value = '0';
      document.getElementById('adminOfferingPublished').checked = true;
      showToast('Edición publicada. Ya puede aparecer en el catálogo.');
      await loadAdminData(); await loadPublicCatalog();
    });

    async function toggleAdminOffering(id, status) {
      if (currentLutminUser?.role !== 'admin') return;
      const { error } = await supabaseClient.from('course_offerings').update({ status, published: status === 'open' }).eq('id', id);
      if (error) { console.error(error); showToast('No pude actualizar la edición.'); return; }
      showToast(status === 'open' ? 'Edición reabierta.' : 'Inscripción cerrada.');
      await loadAdminData(); await loadPublicCatalog();
    }

    async function deleteAdminOffering(id) {
      if (currentLutminUser?.role !== 'admin') return;
      const linkedLeads = adminCourseLeads.filter(l => l.offering_id === id).length;
      const linkedEnrollments = adminEnrollments.filter(e => e.offering_id === id).length;
      if (linkedLeads || linkedEnrollments) { showToast(`No la elimino porque tiene ${linkedLeads} consultas y ${linkedEnrollments} inscripciones. Podés cerrarla.`); return; }
      if (!confirm('¿Eliminar esta edición?')) return;
      const { error } = await supabaseClient.from('course_offerings').delete().eq('id', id);
      if (error) { console.error(error); showToast('No pude eliminar la edición.'); return; }
      showToast('Edición eliminada.'); await loadAdminData(); await loadPublicCatalog();
    }

    function applyAdminLeadFilters() {
      const list = document.getElementById('adminLeadsList');
      if (!list) return;
      const search = String(document.getElementById('adminLeadSearch')?.value || '').trim().toLowerCase();
      const courseId = document.getElementById('adminLeadCourseFilter')?.value || 'all';
      const status = document.getElementById('adminLeadStatusFilter')?.value || 'all';
      const leads = adminCourseLeads.filter(l => {
        const matchSearch = !search || `${l.full_name} ${l.email} ${l.phone} ${l.city}`.toLowerCase().includes(search);
        return matchSearch && (courseId === 'all' || l.course_id === courseId) && (status === 'all' || l.status === status);
      });
      renderAdminLeads(leads);
    }

    function renderAdminLeads(leads) {
      const list = document.getElementById('adminLeadsList');
      if (!leads.length) { list.innerHTML = '<div class="p-8 text-center text-sm text-slate-500">No hay interesados que coincidan con los filtros.</div>'; return; }
      const statusMap = { new:['Nuevo','bg-violet-50 text-violet-700'], contacted:['Contactado','bg-blue-50 text-blue-700'], payment_pending:['Pago pendiente','bg-amber-50 text-amber-700'], enrolled:['Alumno','bg-green-50 text-green-700'], discarded:['Descartado','bg-slate-100 text-slate-500'] };
      list.innerHTML = leads.map(l => {
        const course = adminCourses.find(c => c.id === l.course_id);
        const offering = adminOfferings.find(o => o.id === l.offering_id);
        const [statusLabel,statusClass] = statusMap[l.status] || [l.status,'bg-slate-100 text-slate-600'];
        return `<div class="p-5 sm:p-6"><div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark">${escapeHtml(l.full_name)}</p><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${statusClass}">${statusLabel}</span></div><p class="mt-1 text-xs text-slate-500">${escapeHtml(l.email)}${l.phone ? ` · ${escapeHtml(l.phone)}` : ''}${l.city ? ` · ${escapeHtml(l.city)}` : ''}</p><p class="mt-2 text-sm font-bold text-slate-700">${escapeHtml(course?.title || 'Curso')}${offering ? ` · ${adminShortDate(offering.start_date)}` : ' · Sin edición elegida'}</p>${l.message ? `<p class="mt-2 text-xs text-slate-600 whitespace-pre-wrap">${escapeHtml(l.message)}</p>` : ''}<p class="mt-2 text-[10px] text-slate-400">Recibido: ${adminDateTime(l.created_at)}</p></div><div class="flex flex-wrap gap-2 shrink-0">${['new','contacted'].includes(l.status) ? `<button onclick="openLeadConvertModal('${l.id}')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Convertir en alumno</button>` : ''}${l.status === 'payment_pending' ? `<button onclick="openPaymentForLead('${l.id}')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Gestionar pago</button>` : ''}${l.status === 'new' ? `<button onclick="markAdminLeadStatus('${l.id}','contacted')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Marcar contactado</button>` : ''}${!['discarded','enrolled','payment_pending'].includes(l.status) ? `<button onclick="markAdminLeadStatus('${l.id}','discarded')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">Descartar</button>` : ''}</div></div></div>`;
      }).join('');
    }

    async function markAdminLeadStatus(id, status) {
      const { error } = await supabaseClient.from('course_leads').update({ status }).eq('id', id);
      if (error) { console.error(error); showToast('No pude actualizar el interesado.'); return; }
      showToast('Estado actualizado.'); await loadAdminData();
    }

    function openLeadConvertModal(leadId) {
      const lead = adminCourseLeads.find(l => l.id === leadId);
      if (!lead) return;
      activeAdminLeadId = leadId;
      const existing = adminProfiles.find(p => String(p.email || '').toLowerCase() === String(lead.email || '').toLowerCase() && adminIsStudent(p));
      document.getElementById('leadConvertName').value = lead.full_name || existing?.full_name || '';
      document.getElementById('leadConvertEmail').value = lead.email || existing?.email || '';
      document.getElementById('leadConvertEmail').readOnly = !!existing;
      document.getElementById('leadPasswordWrap').classList.toggle('hidden', !!existing);
      document.getElementById('leadConvertPassword').required = !existing;
      document.getElementById('leadConvertPassword').value = '';
      const course = adminCourses.find(c => c.id === lead.course_id);
      const offering = adminOfferings.find(o => o.id === lead.offering_id);
      const priceText = offering && Number(offering.price || 0) > 0 ? ` · Matrícula ${formatPublicMoney(offering.price, offering.currency)}` : ' · Sin pago requerido';
      document.getElementById('leadConvertSummary').textContent = `${course?.title || 'Curso'}${priceText}${existing ? ' · Este correo ya tiene cuenta.' : ' · Se creará un acceso al Campus.'}`;
      document.getElementById('leadConvertStatus').classList.add('hidden');
      openModal('leadConvertModal');
    }

    function generateLeadPassword() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
      const bytes = new Uint32Array(12); crypto.getRandomValues(bytes);
      document.getElementById('leadConvertPassword').value = Array.from(bytes, n => alphabet[n % alphabet.length]).join('');
    }

    document.getElementById('leadConvertForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin' || !activeAdminLeadId) return;
      const lead = adminCourseLeads.find(l => l.id === activeAdminLeadId);
      if (!lead) return;
      const btn = document.getElementById('leadConvertBtn');
      const statusBox = document.getElementById('leadConvertStatus');
      const fullName = document.getElementById('leadConvertName').value.trim();
      const email = document.getElementById('leadConvertEmail').value.trim().toLowerCase();
      const password = document.getElementById('leadConvertPassword').value;
      btn.disabled = true; btn.textContent = 'Procesando...'; statusBox.classList.add('hidden');
      try {
        let student = adminProfiles.find(p => String(p.email || '').toLowerCase() === email && adminIsStudent(p));
        let createdPassword = null;
        if (!student) {
          if (password.length < 8) throw new Error('Generá una contraseña provisoria de al menos 8 caracteres.');
          const { data, error } = await supabaseClient.functions.invoke('hyper-create-student', { body: { full_name: fullName, email, password } });
          if (error || !data?.ok) throw new Error(data?.error || error?.message || 'No pude crear el alumno.');
          student = data.student;
          createdPassword = password;
        }
        const { data: conversion, error: enrollmentError } = await supabaseClient.rpc('admin_convert_lead_to_enrollment', { p_lead_id: lead.id, p_user_id: student.id });
        if (enrollmentError) throw enrollmentError;
        const paymentRequired = Boolean(conversion?.payment_required);
        const accessText = paymentRequired ? `<br><strong>Pago pendiente:</strong> ${escapeHtml(formatPublicMoney(conversion.price_amount, conversion.currency))}<br>El curso queda bloqueado hasta completar o bonificar el pago.` : '<br><strong>Acceso al curso habilitado.</strong>';
        statusBox.innerHTML = createdPassword ? `<strong>Alumno creado.</strong><br>Correo: ${escapeHtml(email)}<br><strong>Contraseña provisoria:</strong> ${escapeHtml(createdPassword)}${accessText}` : `<strong>Matrícula creada para el alumno existente.</strong>${accessText}`;
        statusBox.classList.remove('hidden');
        showToast(paymentRequired ? 'Alumno creado. La matrícula quedó pendiente de pago.' : 'Interesado convertido e inscripto.');
        await loadAdminData(); await loadPublicCatalog();
      } catch (err) {
        console.error(err); showToast(err?.message || 'No pude convertir al interesado.');
      } finally { btn.disabled = false; btn.textContent = 'Crear acceso / matrícula'; }
    });

    // =========================================================
    // PANEL FINANCIERO Y COMERCIAL - ETAPA 12
    // =========================================================
    function lutminTodayIso() {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0,10);
    }

    function adminFinancialRange() {
      const fromEl = document.getElementById('adminFinancialFrom');
      const toEl = document.getElementById('adminFinancialTo');
      if (!fromEl || !toEl) return { from: lutminTodayIso(), to: lutminTodayIso() };
      if (!fromEl.value || !toEl.value) {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        first.setMinutes(first.getMinutes() - first.getTimezoneOffset());
        fromEl.value = first.toISOString().slice(0,10);
        toEl.value = lutminTodayIso();
      }
      return { from: fromEl.value, to: toEl.value };
    }

    function setAdminFinancialPreset(preset) {
      const fromEl = document.getElementById('adminFinancialFrom');
      const toEl = document.getElementById('adminFinancialTo');
      if (!fromEl || !toEl) return;
      const now = new Date();
      let from = new Date(now);
      if (preset === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (preset === '30') from.setDate(from.getDate() - 29);
      from.setMinutes(from.getMinutes() - from.getTimezoneOffset());
      const today = new Date(now); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      fromEl.value = from.toISOString().slice(0,10);
      toEl.value = today.toISOString().slice(0,10);
      renderAdminFinancialDashboard();
    }

    function adminDateInRange(value, from, to) {
      if (!value) return false;
      const d = String(value).slice(0,10);
      return d >= from && d <= to;
    }

    function adminEnrollmentBalance(enrollment) {
      const summary = getEnrollmentPaymentSummary(enrollment);
      return Math.max(Number(summary.balance || 0), 0);
    }

    function adminFinancialDebtRows() {
      const today = lutminTodayIso();
      return adminEnrollments
        .filter(e => Number(e.price_amount || 0) > 0 && ['pending','partial'].includes(e.payment_status))
        .map(e => ({ enrollment: e, balance: adminEnrollmentBalance(e), overdue: Boolean(e.payment_due_date && e.payment_due_date < today) }))
        .filter(x => x.balance > 0.01)
        .sort((a,b) => {
          if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
          const ad = a.enrollment.payment_due_date || '9999-12-31';
          const bd = b.enrollment.payment_due_date || '9999-12-31';
          if (ad !== bd) return ad.localeCompare(bd);
          return b.balance - a.balance;
        });
    }

    function adminDaysOverdue(dateIso) {
      if (!dateIso) return 0;
      const today = new Date(`${lutminTodayIso()}T00:00:00`);
      const due = new Date(`${dateIso}T00:00:00`);
      return Math.max(Math.floor((today - due) / 86400000), 0);
    }

    function renderAdminFinancialDashboard() {
      const root = document.getElementById('financeCollected');
      if (!root || currentLutminUser?.role !== 'admin') return;
      const { from, to } = adminFinancialRange();
      if (from > to) { showToast('La fecha Desde no puede ser posterior a Hasta.'); return; }

      const periodPayments = adminPayments.filter(p => p.status === 'confirmed' && adminDateInRange(p.paid_at, from, to));
      const periodEnrollments = adminEnrollments.filter(e => Number(e.price_amount || 0) > 0 && adminDateInRange(e.enrolled_at, from, to));
      const periodLeads = adminCourseLeads.filter(l => adminDateInRange(l.created_at, from, to));
      const convertedLeads = periodLeads.filter(l => Boolean(l.converted_user_id) || ['payment_pending','enrolled'].includes(l.status));
      const debtRows = adminFinancialDebtRows();
      const overdueRows = debtRows.filter(x => x.overdue);

      const collected = periodPayments.reduce((s,p) => s + Number(p.amount || 0), 0);
      const generated = periodEnrollments.reduce((s,e) => s + Number(e.price_amount || 0), 0);
      const outstanding = debtRows.reduce((s,x) => s + x.balance, 0);
      const overdue = overdueRows.reduce((s,x) => s + x.balance, 0);
      const waived = periodEnrollments.filter(e => e.payment_status === 'waived').reduce((s,e) => s + Number(e.price_amount || 0), 0);
      const conversion = periodLeads.length ? Math.round(convertedLeads.length * 100 / periodLeads.length) : 0;

      document.getElementById('financeCollected').textContent = formatPublicMoney(collected, 'ARS');
      document.getElementById('financePaymentsCount').textContent = `${periodPayments.length} ${periodPayments.length === 1 ? 'pago' : 'pagos'}`;
      document.getElementById('financeSales').textContent = formatPublicMoney(generated, 'ARS');
      document.getElementById('financeEnrollmentsCount').textContent = `${periodEnrollments.length} ${periodEnrollments.length === 1 ? 'matrícula' : 'matrículas'}`;
      document.getElementById('financeOutstanding').textContent = formatPublicMoney(outstanding, 'ARS');
      document.getElementById('financeOverdue').textContent = formatPublicMoney(overdue, 'ARS');
      document.getElementById('financeOverdueCount').textContent = `${overdueRows.length} ${overdueRows.length === 1 ? 'matrícula vencida' : 'matrículas vencidas'}`;
      document.getElementById('financeWaived').textContent = formatPublicMoney(waived, 'ARS');
      document.getElementById('financeConversion').textContent = `${conversion}%`;
      document.getElementById('financeLeadCount').textContent = `${periodLeads.length} ${periodLeads.length === 1 ? 'interesado' : 'interesados'}`;

      const byCourse = new Map();
      const ensure = courseId => {
        if (!byCourse.has(courseId)) {
          const c = adminCourses.find(x => x.id === courseId);
          byCourse.set(courseId, { title: c?.title || 'Curso', generated: 0, collected: 0, enrollments: 0, outstanding: 0 });
        }
        return byCourse.get(courseId);
      };
      periodEnrollments.forEach(e => { const r = ensure(e.course_id); r.generated += Number(e.price_amount || 0); r.enrollments += 1; });
      periodPayments.forEach(p => { const e = adminEnrollments.find(x => x.id === p.enrollment_id); if (e) ensure(e.course_id).collected += Number(p.amount || 0); });
      debtRows.forEach(x => ensure(x.enrollment.course_id).outstanding += x.balance);
      const courseRows = [...byCourse.values()].sort((a,b) => (b.collected + b.generated) - (a.collected + a.generated));
      const courseBox = document.getElementById('financeCourseRows');
      courseBox.innerHTML = courseRows.length ? courseRows.map(r => `<div class="px-5 py-4"><div class="flex items-start justify-between gap-3"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(r.title)}</p><p class="mt-1 text-[11px] text-slate-500">${r.enrollments} matrículas en el período · Deuda actual ${formatPublicMoney(r.outstanding,'ARS')}</p></div><div class="text-right shrink-0"><p class="text-xs font-black text-green-700">${formatPublicMoney(r.collected,'ARS')}</p><p class="text-[10px] text-slate-400">cobrado</p><p class="mt-1 text-[10px] text-blue-600">${formatPublicMoney(r.generated,'ARS')} generado</p></div></div></div>`).join('') : '<div class="p-6 text-center text-sm text-slate-500">No hay movimientos para este período.</div>';

      const funnel = document.getElementById('financeFunnel');
      const contacted = periodLeads.filter(l => ['contacted','payment_pending','enrolled'].includes(l.status) || Boolean(l.converted_user_id)).length;
      const paidEnrollments = periodEnrollments.filter(e => ['paid','waived','not_required'].includes(e.payment_status)).length;
      const steps = [
        ['Interesados', periodLeads.length, 'bg-violet-500'],
        ['Contactados', contacted, 'bg-blue-500'],
        ['Convertidos', convertedLeads.length, 'bg-cyan-500'],
        ['Acceso habilitado', paidEnrollments, 'bg-green-500']
      ];
      const max = Math.max(periodLeads.length, 1);
      funnel.innerHTML = `<div class="space-y-4">${steps.map(([label,value,bar]) => `<div><div class="flex justify-between text-xs font-bold"><span>${label}</span><span>${value}</span></div><div class="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full ${bar} rounded-full" style="width:${Math.min(value*100/max,100)}%"></div></div></div>`).join('')}</div>`;

      const debtBox = document.getElementById('financeDebtRows');
      document.getElementById('financeDebtSummary').textContent = `${debtRows.length} pendientes · ${formatPublicMoney(outstanding,'ARS')}`;
      debtBox.innerHTML = debtRows.length ? debtRows.slice(0,12).map(x => {
        const e = x.enrollment;
        const student = adminProfiles.find(p => p.id === e.user_id);
        const course = adminCourses.find(c => c.id === e.course_id);
        const dueLabel = e.payment_due_date ? adminShortDate(e.payment_due_date) : 'Sin vencimiento';
        const overdueLabel = x.overdue ? `<span class="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-700 font-bold">${adminDaysOverdue(e.payment_due_date)} días vencido</span>` : '';
        return `<div class="px-5 py-4"><div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(student?.full_name || student?.email || 'Alumno')}</p>${overdueLabel}</div><p class="mt-1 text-xs text-slate-500">${escapeHtml(course?.title || 'Curso')} · Vence: <strong>${dueLabel}</strong></p></div><div class="flex flex-wrap items-center gap-2"><span class="text-sm font-black text-amber-700">${formatPublicMoney(x.balance,e.payment_currency)}</span><button onclick="changeEnrollmentDueDate('${e.id}')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Vencimiento</button><button onclick="openPaymentModal('${e.id}')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Registrar pago</button></div></div></div>`;
      }).join('') : '<div class="p-6 text-center text-sm text-slate-500">No hay deuda pendiente. Excelente.</div>';
    }

    async function changeEnrollmentDueDate(enrollmentId) {
      const enrollment = adminEnrollments.find(e => e.id === enrollmentId);
      if (!enrollment) return;
      const current = enrollment.payment_due_date || '';
      const value = window.prompt('Nueva fecha de vencimiento (AAAA-MM-DD). Dejá vacío para quitarla:', current);
      if (value === null) return;
      const clean = value.trim();
      if (clean && !/^\d{4}-\d{2}-\d{2}$/.test(clean)) { showToast('Usá el formato AAAA-MM-DD.'); return; }
      const { error } = await supabaseClient.rpc('admin_set_enrollment_due_date', { p_enrollment_id: enrollmentId, p_due_date: clean || null });
      if (error) { console.error(error); showToast(error.message || 'No pude cambiar el vencimiento.'); return; }
      showToast(clean ? 'Vencimiento actualizado.' : 'Vencimiento eliminado.');
      await loadAdminData();
    }

    function downloadLutminCsv(filename, rows) {
      const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function exportAdminFinancialCsv() {
      const { from, to } = adminFinancialRange();
      const rows = [['Fecha','Alumno','Correo','Curso','Importe','Moneda','Medio','Referencia','Estado']];
      adminPayments.filter(p => p.status === 'confirmed' && adminDateInRange(p.paid_at, from, to)).forEach(p => {
        const e = adminEnrollments.find(x => x.id === p.enrollment_id);
        const student = e ? adminProfiles.find(x => x.id === e.user_id) : null;
        const course = e ? adminCourses.find(x => x.id === e.course_id) : null;
        rows.push([String(p.paid_at || '').slice(0,10), student?.full_name || '', student?.email || '', course?.title || '', Number(p.amount || 0).toFixed(2), p.currency || 'ARS', p.method || '', p.reference || '', 'Confirmado']);
      });
      downloadLutminCsv(`lutmin-cobranzas-${from}-a-${to}.csv`, rows);
    }

    function exportAdminDebtCsv() {
      const rows = [['Alumno','Correo','Curso','Total matrícula','Pagado','Saldo','Moneda','Vencimiento','Días vencido','Estado pago']];
      adminFinancialDebtRows().forEach(x => {
        const e = x.enrollment;
        const student = adminProfiles.find(p => p.id === e.user_id);
        const course = adminCourses.find(c => c.id === e.course_id);
        const summary = getEnrollmentPaymentSummary(e);
        rows.push([student?.full_name || '', student?.email || '', course?.title || '', Number(e.price_amount || 0).toFixed(2), Number(summary.totalPaid || 0).toFixed(2), Number(x.balance || 0).toFixed(2), e.payment_currency || 'ARS', e.payment_due_date || '', x.overdue ? adminDaysOverdue(e.payment_due_date) : 0, e.payment_status || '']);
      });
      downloadLutminCsv(`lutmin-deuda-${lutminTodayIso()}.csv`, rows);
    }

    function paymentStatusUi(status) {
      const map = {
        pending: ['Pendiente','bg-amber-50 text-amber-700'],
        partial: ['Parcial','bg-orange-50 text-orange-700'],
        paid: ['Pagado','bg-green-50 text-green-700'],
        waived: ['Bonificado','bg-blue-50 text-blue-700'],
        not_required: ['Sin cargo','bg-slate-100 text-slate-600'],
        refunded: ['Reintegrado','bg-violet-50 text-violet-700']
      };
      return map[status] || [status || 'Sin estado','bg-slate-100 text-slate-600'];
    }

    function getEnrollmentPaymentSummary(enrollment) {
      const payments = adminPayments.filter(p => p.enrollment_id === enrollment.id && p.status === 'confirmed');
      const totalPaid = payments.reduce((sum,p) => sum + Number(p.amount || 0), 0);
      const due = Number(enrollment.price_amount || 0);
      return { payments, totalPaid, due, balance: Math.max(due - totalPaid, 0) };
    }

    function renderAdminPayments() {
      const list = document.getElementById('adminPaymentsList');
      if (!list) return;
      const statusFilter = document.getElementById('adminPaymentStatusFilter')?.value || 'all';
      const search = String(document.getElementById('adminPaymentSearch')?.value || '').trim().toLowerCase();
      const rows = adminEnrollments.filter(e => Number(e.price_amount || 0) > 0 || ['pending','partial','paid','waived'].includes(e.payment_status)).filter(e => statusFilter === 'all' || e.payment_status === statusFilter).filter(e => {
        const student = adminProfiles.find(p => p.id === e.user_id);
        const course = adminCourses.find(c => c.id === e.course_id);
        return !search || `${student?.full_name || ''} ${student?.email || ''} ${course?.title || ''}`.toLowerCase().includes(search);
      });
      if (!rows.length) { list.innerHTML = '<div class="p-8 text-center text-sm text-slate-500">No hay matrículas con movimiento de pago para este filtro.</div>'; return; }

      list.innerHTML = rows.map(e => {
        const student = adminProfiles.find(p => p.id === e.user_id);
        const course = adminCourses.find(c => c.id === e.course_id);
        const offering = adminOfferings.find(o => o.id === e.offering_id);
        const summary = getEnrollmentPaymentSummary(e);
        const [label, cls] = paymentStatusUi(e.payment_status);
        const paymentItems = summary.payments.slice(0,4).map(p => `<div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span>${adminShortDate(String(p.paid_at || '').slice(0,10))} · ${formatPublicMoney(p.amount, p.currency)} · ${escapeHtml(p.method)}</span>${p.reference ? `<span>· ${escapeHtml(p.reference)}</span>` : ''}${p.receipt_path ? `<button onclick="openPaymentReceipt('${p.id}')" class="font-bold text-lutmin-light">Comprobante</button>` : ''}<button onclick="voidAdminPayment('${p.id}')" class="font-bold text-red-500">Anular</button></div>`).join('');
        return `<div class="p-5 sm:p-6"><div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark">${escapeHtml(student?.full_name || student?.email || 'Alumno')}</p><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${cls}">${label}</span></div><p class="mt-1 text-xs text-slate-500">${escapeHtml(course?.title || 'Curso')}${offering ? ` · Inicio ${adminShortDate(offering.start_date)}` : ''}</p><div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs"><span>Total: <strong>${formatPublicMoney(summary.due, e.payment_currency)}</strong></span><span>Pagado: <strong class="text-green-700">${formatPublicMoney(summary.totalPaid, e.payment_currency)}</strong></span><span>Saldo: <strong class="text-amber-700">${formatPublicMoney(summary.balance, e.payment_currency)}</strong></span></div>${paymentItems ? `<div class="mt-3 space-y-1">${paymentItems}</div>` : '<p class="mt-3 text-xs text-slate-400">Todavía no hay pagos confirmados.</p>'}</div><div class="flex flex-wrap gap-2 shrink-0">${['pending','partial'].includes(e.payment_status) ? `<button onclick="openPaymentModal('${e.id}')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Registrar pago</button><button onclick="waiveEnrollmentPayment('${e.id}')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Bonificar</button>` : ''}</div></div></div>`;
      }).join('');
    }

    function openPaymentModal(enrollmentId) {
      const enrollment = adminEnrollments.find(e => e.id === enrollmentId);
      if (!enrollment) return;
      activeAdminPaymentEnrollmentId = enrollmentId;
      const student = adminProfiles.find(p => p.id === enrollment.user_id);
      const course = adminCourses.find(c => c.id === enrollment.course_id);
      const sum = getEnrollmentPaymentSummary(enrollment);
      document.getElementById('paymentModalSummary').textContent = `${student?.full_name || student?.email || 'Alumno'} · ${course?.title || 'Curso'} · Saldo ${formatPublicMoney(sum.balance, enrollment.payment_currency)}`;
      document.getElementById('paymentAmount').value = sum.balance > 0 ? sum.balance.toFixed(2) : '';
      document.getElementById('paymentAmount').max = String(sum.balance || '');
      document.getElementById('paymentReference').value = '';
      document.getElementById('paymentNotes').value = '';
      document.getElementById('paymentReceipt').value = '';
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('paymentDate').value = now.toISOString().slice(0,16);
      openModal('paymentModal');
    }

    function openPaymentForLead(leadId) {
      const lead = adminCourseLeads.find(l => l.id === leadId);
      if (!lead?.converted_user_id) { showToast('Todavía no hay una matrícula vinculada.'); return; }
      const enrollment = adminEnrollments.find(e => e.user_id === lead.converted_user_id && e.course_id === lead.course_id && (!lead.offering_id || e.offering_id === lead.offering_id));
      if (!enrollment) { showToast('No encontré la matrícula vinculada.'); return; }
      openPaymentModal(enrollment.id);
    }

    function safePaymentFileName(name) {
      return String(name || 'comprobante').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-100);
    }

    document.getElementById('adminPaymentForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin' || !activeAdminPaymentEnrollmentId) return;
      const enrollment = adminEnrollments.find(e => e.id === activeAdminPaymentEnrollmentId);
      if (!enrollment) return;
      const btn = document.getElementById('paymentSubmitBtn');
      const amount = Number(document.getElementById('paymentAmount').value || 0);
      const file = document.getElementById('paymentReceipt').files?.[0] || null;
      let uploadedPath = null;
      btn.disabled = true; btn.textContent = 'Guardando...';
      try {
        if (file) {
          if (file.size > 10 * 1024 * 1024) throw new Error('El comprobante no puede superar 10 MB.');
          uploadedPath = `${enrollment.id}/${crypto.randomUUID()}-${safePaymentFileName(file.name)}`;
          const { error: uploadError } = await supabaseClient.storage.from('payment-receipts').upload(uploadedPath, file, { upsert: false, contentType: file.type || undefined });
          if (uploadError) throw uploadError;
        }
        const localDate = document.getElementById('paymentDate').value;
        const paidAt = localDate ? new Date(localDate).toISOString() : new Date().toISOString();
        const { data, error } = await supabaseClient.rpc('admin_register_enrollment_payment', {
          p_enrollment_id: enrollment.id,
          p_amount: amount,
          p_method: document.getElementById('paymentMethod').value,
          p_reference: document.getElementById('paymentReference').value.trim(),
          p_notes: document.getElementById('paymentNotes').value.trim(),
          p_receipt_path: uploadedPath,
          p_paid_at: paidAt
        });
        if (error) throw error;
        closeModal('paymentModal');
        showToast(data?.access_enabled ? 'Pago completo. El curso quedó habilitado automáticamente.' : `Pago registrado. Saldo pendiente: ${formatPublicMoney(data?.balance || 0, enrollment.payment_currency)}`);
        await loadAdminData(); await loadPublicCatalog();
      } catch (err) {
        console.error(err);
        if (uploadedPath) await supabaseClient.storage.from('payment-receipts').remove([uploadedPath]);
        showToast(err?.message || 'No pude registrar el pago.');
      } finally { btn.disabled = false; btn.textContent = 'Confirmar pago'; }
    });

    async function waiveEnrollmentPayment(enrollmentId) {
      const enrollment = adminEnrollments.find(e => e.id === enrollmentId);
      if (!enrollment) return;
      if (!confirm('¿Bonificar esta matrícula y habilitar el curso sin registrar un cobro?')) return;
      const reason = window.prompt('Motivo / referencia interna:', 'Bonificado por Administración Lutmin') || 'Bonificado por Administración Lutmin';
      const { error } = await supabaseClient.rpc('admin_waive_enrollment_payment', { p_enrollment_id: enrollmentId, p_reason: reason });
      if (error) { console.error(error); showToast(error.message || 'No pude bonificar la matrícula.'); return; }
      showToast('Matrícula bonificada. El curso quedó habilitado.');
      await loadAdminData(); await loadPublicCatalog();
    }

    async function openPaymentReceipt(paymentId) {
      const payment = adminPayments.find(p => p.id === paymentId);
      if (!payment?.receipt_path) return;
      const { data, error } = await supabaseClient.storage.from('payment-receipts').createSignedUrl(payment.receipt_path, 300);
      if (error || !data?.signedUrl) { console.error(error); showToast('No pude abrir el comprobante.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener');
    }

    async function voidAdminPayment(paymentId) {
      if (!confirm('¿Anular este pago? Si deja saldo pendiente, el acceso al curso puede volver a bloquearse.')) return;
      const { error } = await supabaseClient.rpc('admin_void_enrollment_payment', { p_payment_id: paymentId });
      if (error) { console.error(error); showToast(error.message || 'No pude anular el pago.'); return; }
      showToast('Pago anulado y saldo recalculado.');
      await loadAdminData(); await loadPublicCatalog();
    }

    function generateStudentPassword() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
      const bytes = new Uint32Array(12);
      crypto.getRandomValues(bytes);
      const password = Array.from(bytes, n => alphabet[n % alphabet.length]).join('');
      document.getElementById('adminStudentPassword').value = password;
    }

    document.getElementById('adminStudentForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;

      const fullName = document.getElementById('adminStudentName').value.trim();
      const email = document.getElementById('adminStudentEmail').value.trim().toLowerCase();
      const password = document.getElementById('adminStudentPassword').value;
      const btn = document.getElementById('adminCreateStudentBtn');
      const status = document.getElementById('adminCreateStudentStatus');

      if (!fullName || !email || password.length < 8) {
        showToast('Completá nombre, correo y una contraseña de al menos 8 caracteres.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creando alumno...';
      status.classList.add('hidden');

      try {
        const { data, error } = await supabaseClient.functions.invoke('hyper-create-student', {
          body: { full_name: fullName, email, password }
        });

        if (error) {
          let detail = error.message || 'No se pudo crear el alumno.';
          try {
            const context = error.context;
            if (context && typeof context.json === 'function') {
              const payload = await context.json();
              if (payload?.error) detail = payload.error;
            }
          } catch (_) {}
          throw new Error(detail);
        }
        if (!data?.ok) throw new Error(data?.error || 'No se pudo crear el alumno.');

        status.innerHTML = `<strong>Alumno creado correctamente.</strong><br>${escapeHtml(fullName)} · ${escapeHtml(email)}<br><span class="font-bold">Contraseña provisoria:</span> ${escapeHtml(password)}`;
        status.classList.remove('hidden');
        showToast('Alumno creado. Ya puede ingresar al Campus.');

        document.getElementById('adminStudentName').value = '';
        document.getElementById('adminStudentEmail').value = '';
        document.getElementById('adminStudentPassword').value = '';
        await loadAdminData();
      } catch (error) {
        console.error(error);
        const message = String(error?.message || '');
        showToast(message.toLowerCase().includes('already') || message.toLowerCase().includes('registr') || message.toLowerCase().includes('existe')
          ? 'Ese correo ya tiene una cuenta.'
          : `No pude crear el alumno: ${message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Crear alumno';
      }
    });

    document.getElementById('adminAssignForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const userId = document.getElementById('adminStudentSelect').value;
      const courseId = document.getElementById('adminCourseSelect').value;
      if (!userId || !courseId) return;

      const { error } = await supabaseClient.from('enrollments').upsert({
        user_id: userId, course_id: courseId, status: 'active', price_amount: 0, payment_currency: 'ARS', payment_status: 'not_required', access_granted_at: new Date().toISOString()
      }, { onConflict: 'user_id,course_id' });

      if (error) {
        console.error(error);
        showToast('No pude asignar el curso.');
        return;
      }
      showToast('Curso asignado correctamente.');
      await loadAdminData();
      if (userId === currentLutminUser.id) await loadCampusData();
    });

    document.getElementById('adminCourseForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const title = document.getElementById('adminCourseTitle').value.trim();
      const slug = slugifyLutmin(title);
      if (!title || !slug) return;

      const payload = {
        title,
        slug,
        description: document.getElementById('adminCourseDescription').value.trim(),
        duration_hours: Number(document.getElementById('adminCourseHours').value || 0),
        level: document.getElementById('adminCourseLevel').value,
        category: document.getElementById('adminCourseCategory').value,
        published: document.getElementById('adminCoursePublished').checked
      };
      const { error } = await supabaseClient.from('courses').insert(payload);
      if (error) {
        console.error(error);
        showToast(error.code === '23505' ? 'Ya existe un curso con ese nombre.' : 'No pude crear el curso.');
        return;
      }
      event.target.reset();
      document.getElementById('adminCourseHours').value = '10';
      document.getElementById('adminCoursePublished').checked = true;
      showToast('Curso creado correctamente.');
      await loadAdminData();
      await loadPublicCatalog();
    });

    document.getElementById('adminLessonForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const courseId = document.getElementById('adminLessonCourse').value;
      const file = document.getElementById('adminLessonFile')?.files?.[0] || null;
      const videoFile = document.getElementById('adminLessonVideoFile')?.files?.[0] || null;
      let uploadedPath = null;
      let uploadedVideoPath = null;
      try {
        if (file) uploadedPath = await uploadLessonMaterial(courseId, file);
        if (videoFile) uploadedVideoPath = await uploadLessonPrivateVideo(courseId, videoFile);
      } catch (uploadError) {
        if (uploadedPath) await supabaseClient.storage.from('course-materials').remove([uploadedPath]);
        if (uploadedVideoPath) await supabaseClient.storage.from('course-materials').remove([uploadedVideoPath]);
        console.error(uploadError);
        showToast(uploadError?.message || 'No pude subir el material.');
        return;
      }
      const payload = {
        course_id: courseId,
        title: document.getElementById('adminLessonTitle').value.trim(),
        description: document.getElementById('adminLessonDescription').value.trim(),
        content: document.getElementById('adminLessonContent').value.trim(),
        duration_minutes: Number(document.getElementById('adminLessonDuration').value || 0),
        sort_order: Number(document.getElementById('adminLessonOrder').value),
        video_url: document.getElementById('adminLessonVideo').value.trim() || null,
        video_path: uploadedVideoPath,
        material_url: document.getElementById('adminLessonMaterial').value.trim() || null,
        material_path: uploadedPath,
        published: document.getElementById('adminLessonPublishedV39')?.checked !== false,
        required: document.getElementById('adminLessonRequiredV39')?.checked !== false,
        video_completion_required: document.getElementById('adminLessonVideoRequiredV24')?.checked === true,
        video_min_watch_percent: Math.max(80, Math.min(100, Number(document.getElementById('adminLessonVideoMinV24')?.value || 98)))
      };
      if (payload.video_completion_required && !payload.video_url && !payload.video_path) {
        if (uploadedPath) await supabaseClient.storage.from('course-materials').remove([uploadedPath]);
        if (uploadedVideoPath) await supabaseClient.storage.from('course-materials').remove([uploadedVideoPath]);
        showToast('Para exigir visualización cargá un video YouTube No listado o MP4/WEBM.');
        return;
      }
      if (payload.video_completion_required && payload.video_url && !/youtu(?:\.be|be\.com)|\.(mp4|webm)(?:\?|$)/i.test(payload.video_url) && !payload.video_path) {
        showToast('El bloqueo de avance funciona con YouTube No listado o MP4/WEBM.');
        return;
      }
      const { error } = await supabaseClient.from('lessons').insert(payload);
      if (error) {
        console.error(error);
        if (uploadedPath) await supabaseClient.storage.from('course-materials').remove([uploadedPath]);
        if (uploadedVideoPath) await supabaseClient.storage.from('course-materials').remove([uploadedVideoPath]);
        showToast(error.code === '23505' ? 'Ese número de clase ya existe en el curso.' : 'No pude agregar la clase.');
        return;
      }
      const keepCourse = payload.course_id;
      event.target.reset();
      document.getElementById('adminLessonCourse').value = keepCourse;
      document.getElementById('adminLessonDuration').value = '30';
      showToast('Clase agregada correctamente.');
      await loadAdminData();
      prepareLesson(keepCourse);
    });

    document.getElementById('adminAssessmentForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const courseId = document.getElementById('adminAssessmentCourse').value;
      if (!courseId) return;
      const payload = {
        course_id: courseId,
        title: document.getElementById('adminAssessmentTitle').value.trim(),
        description: document.getElementById('adminAssessmentDescription').value.trim(),
        passing_score: Number(document.getElementById('adminAssessmentPassing').value || 70),
        published: document.getElementById('adminAssessmentPublished').checked,
        max_attempts: Number(document.getElementById('adminAssessmentMaxAttemptsV39')?.value || 3),
        random_question_count: document.getElementById('adminAssessmentRandomCountV39')?.value ? Number(document.getElementById('adminAssessmentRandomCountV39').value) : null,
        time_limit_minutes: document.getElementById('adminAssessmentTimeLimitV39')?.value ? Number(document.getElementById('adminAssessmentTimeLimitV39').value) : null,
        show_answer_review: !!document.getElementById('adminAssessmentReviewV39')?.checked
      };
      const { error } = await supabaseClient.from('assessments').upsert(payload, { onConflict: 'course_id' });
      if (error) {
        console.error(error);
        showToast('No pude guardar la evaluación.');
        return;
      }
      showToast('Evaluación guardada correctamente.');
      event.target.reset();
      document.getElementById('adminAssessmentPassing').value = '70';
      document.getElementById('adminAssessmentPublished').checked = true;
      await loadAdminData();
    });

    document.getElementById('adminQuestionAssessment')?.addEventListener('change', () => {
      const assessmentId = document.getElementById('adminQuestionAssessment').value;
      const existing = adminAssessmentQuestions.filter(q => q.assessment_id === assessmentId);
      const next = existing.length ? Math.max(...existing.map(q => Number(q.sort_order || 0))) + 1 : 1;
      document.getElementById('adminQuestionOrder').value = String(next);
    });

    document.getElementById('adminQuestionForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const assessmentId = document.getElementById('adminQuestionAssessment').value;
      if (!assessmentId) return;

      const questionPayload = {
        assessment_id: assessmentId,
        question_text: document.getElementById('adminQuestionText').value.trim(),
        option_a: document.getElementById('adminQuestionA').value.trim(),
        option_b: document.getElementById('adminQuestionB').value.trim(),
        option_c: document.getElementById('adminQuestionC').value.trim(),
        option_d: document.getElementById('adminQuestionD').value.trim(),
        sort_order: Number(document.getElementById('adminQuestionOrder').value || 1),
        points: Number(document.getElementById('adminQuestionPoints').value || 1),
        explanation: document.getElementById('adminQuestionExplanationV39')?.value.trim() || null,
        active: true
      };

      const { data: question, error: questionError } = await supabaseClient
        .from('assessment_questions')
        .insert(questionPayload)
        .select('id')
        .single();

      if (questionError) {
        console.error(questionError);
        showToast(questionError.code === '23505' ? 'Ese número de pregunta ya existe.' : 'No pude agregar la pregunta.');
        return;
      }

      const { error: keyError } = await supabaseClient.from('assessment_question_keys').insert({
        question_id: question.id,
        correct_option: document.getElementById('adminQuestionCorrect').value
      });

      if (keyError) {
        console.error(keyError);
        await supabaseClient.from('assessment_questions').delete().eq('id', question.id);
        showToast('No pude guardar la respuesta correcta. La pregunta no fue creada.');
        return;
      }

      const keepAssessment = assessmentId;
      event.target.reset();
      document.getElementById('adminQuestionAssessment').value = keepAssessment;
      document.getElementById('adminQuestionPoints').value = '1';
      showToast('Pregunta agregada correctamente.');
      await loadAdminData();
      document.getElementById('adminQuestionAssessment').value = keepAssessment;
      document.getElementById('adminQuestionAssessment').dispatchEvent(new Event('change'));
    });

    function openAdminStudentDetail(studentId) {
      activeAdminStudentDetailId = studentId;
      renderAdminStudentDetail(studentId);
      openModal('adminStudentDetailModal');
    }

    function renderAdminStudentDetail(studentId) {
      const student = adminProfiles.find(p => p.id === studentId && adminIsStudent(p));
      if (!student) return;
      const s = getStudentAcademicSnapshot(student);
      document.getElementById('adminStudentDetailName').textContent = student.full_name || 'Alumno';
      document.getElementById('adminStudentDetailEmail').textContent = student.email || 'Sin correo';
      document.getElementById('adminStudentDetailCourses').textContent = String(s.enrollments.length);
      document.getElementById('adminStudentDetailProgress').textContent = `${s.progress}%`;
      document.getElementById('adminStudentDetailAttempts').textContent = String(s.attempts.length);
      document.getElementById('adminStudentDetailCertificates').textContent = String(s.validCertificates.length);
      document.getElementById('adminStudentDetailLastSeen').textContent = adminDateTime(student.last_seen_at);

      const statusClass = s.statusKey === 'completed' ? 'bg-green-50 text-green-700' : s.statusKey === 'in_progress' ? 'bg-blue-50 text-blue-700' : s.statusKey === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600';
      document.getElementById('adminStudentDetailBadges').innerHTML = `<span class="text-xs px-3 py-1.5 rounded-full font-bold ${statusClass}">${s.statusLabel}</span>${student.must_change_password ? '<span class="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-bold">Debe cambiar contraseña</span>' : ''}`;

      const assignBtn = document.getElementById('adminStudentDetailAssignBtn');
      assignBtn.onclick = () => { closeModal('adminStudentDetailModal'); prepareEnrollment(student.id); };
      const activeBtn = document.getElementById('adminStudentDetailActiveBtn');
      activeBtn.className = `px-4 py-2.5 rounded-xl text-sm font-bold ${student.active ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`;
      activeBtn.innerHTML = student.active ? '<i class="fa-solid fa-user-slash mr-2"></i>Desactivar' : '<i class="fa-solid fa-user-check mr-2"></i>Activar';
      activeBtn.onclick = async () => { await toggleStudentActive(student.id, !student.active); renderAdminStudentDetail(student.id); };

      const courseList = document.getElementById('adminStudentDetailCourseList');
      courseList.innerHTML = s.courseSummaries.length ? s.courseSummaries.map(x => {
        const passed = !!x.passedAttempt;
        const cert = x.certificate;
        return `<div class="p-5 sm:p-6">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(x.course?.title || 'Curso')}</h4><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${x.enrollment.status === 'completed' ? 'bg-green-50 text-green-700' : x.enrollment.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}">${escapeHtml(x.enrollment.status)}</span></div><p class="mt-1 text-xs text-slate-500">Inscripto: ${formatCertificateDate(x.enrollment.enrolled_at)} · ${x.completedRows.length} de ${x.lessons.length} clases</p></div><div class="flex flex-wrap gap-2">${x.assessment ? `<span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${passed ? 'bg-green-50 text-green-700' : x.attempts.length ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">${passed ? `Evaluación aprobada ${Math.round(Number(x.passedAttempt.score))}%` : x.attempts.length ? `Mejor nota ${Math.round(Number(x.bestScore))}%` : 'Sin rendir'}</span>` : '<span class="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">Sin evaluación</span>'}${cert ? `<button onclick="showAdminCertificate('${cert.id}')" class="text-[10px] px-2.5 py-1 rounded-full font-bold ${cert.status === 'valid' ? 'bg-violet-50 text-violet-700' : 'bg-red-50 text-red-700'}">Certificado ${cert.status === 'valid' ? 'válido' : 'revocado'}</button>` : ''}</div></div>
          <div class="mt-4"><div class="flex justify-between text-[11px] font-bold text-slate-500"><span>Avance de clases</span><span>${x.pct}%</span></div><div class="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-lutmin-light rounded-full" style="width:${x.pct}%"></div></div></div>
        </div>`;
      }).join('') : '<div class="p-6 text-sm text-slate-500">Este alumno todavía no tiene cursos asignados.</div>';

      const attemptsList = document.getElementById('adminStudentDetailAttemptsList');
      attemptsList.innerHTML = s.attempts.length ? s.attempts.slice(0, 20).map(attempt => {
        const assessment = adminAssessments.find(a => a.id === attempt.assessment_id);
        const course = assessment ? adminCourses.find(c => c.id === assessment.course_id) : null;
        return `<div class="p-4 sm:p-5 flex items-center justify-between gap-4"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(course?.title || assessment?.title || 'Evaluación')}</p><p class="mt-1 text-xs text-slate-500">${adminDateTime(attempt.submitted_at)}</p></div><span class="text-xs px-3 py-1.5 rounded-full font-bold ${attempt.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">${Math.round(Number(attempt.score || 0))}% · ${attempt.passed ? 'Aprobado' : 'No aprobado'}</span></div>`;
      }).join('') : '<div class="p-6 text-sm text-slate-500">Todavía no realizó evaluaciones.</div>';

      const certList = document.getElementById('adminStudentDetailCertificatesList');
      certList.innerHTML = s.certificates.length ? s.certificates.map(cert => `<div class="p-4 sm:p-5 flex items-center justify-between gap-4"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(cert.course_title)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(cert.code)} · ${formatCertificateDate(cert.issued_at)}</p></div><button onclick="showAdminCertificate('${cert.id}')" class="px-3 py-2 rounded-xl text-xs font-bold ${cert.status === 'valid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">${cert.status === 'valid' ? 'Ver válido' : 'Ver revocado'}</button></div>`).join('') : '<div class="p-6 text-sm text-slate-500">Todavía no tiene certificados.</div>';

      renderAdminStudentNotes(student.id);
    }

    function renderAdminStudentNotes(studentId) {
      const list = document.getElementById('adminStudentNotesList');
      const notes = adminStudentNotes.filter(n => n.student_id === studentId);
      list.innerHTML = notes.length ? notes.map(note => `<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div class="flex items-start justify-between gap-3"><p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(note.note)}</p><button onclick="deleteAdminStudentNote('${note.id}')" class="text-slate-400 hover:text-red-500 shrink-0" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div><p class="mt-2 text-[10px] text-slate-400">${adminDateTime(note.created_at)}</p></div>`).join('') : '<p class="text-xs text-slate-400">Sin observaciones internas.</p>';
    }

    document.getElementById('adminStudentNoteForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin' || !activeAdminStudentDetailId) return;
      const textarea = document.getElementById('adminStudentNoteText');
      const note = textarea.value.trim();
      if (!note) return;
      const { error } = await supabaseClient.from('student_admin_notes').insert({ student_id: activeAdminStudentDetailId, note, created_by: currentLutminUser.id });
      if (error) { console.error(error); showToast('No pude guardar la observación.'); return; }
      textarea.value = '';
      showToast('Observación guardada.');
      await loadAdminData();
      renderAdminStudentDetail(activeAdminStudentDetailId);
    });

    async function deleteAdminStudentNote(noteId) {
      if (currentLutminUser?.role !== 'admin') return;
      if (!confirm('¿Eliminar esta observación interna?')) return;
      const { error } = await supabaseClient.from('student_admin_notes').delete().eq('id', noteId);
      if (error) { console.error(error); showToast('No pude eliminar la observación.'); return; }
      showToast('Observación eliminada.');
      await loadAdminData();
      if (activeAdminStudentDetailId) renderAdminStudentDetail(activeAdminStudentDetailId);
    }

    function renderAdminCertificates() {
      const list = document.getElementById('adminCertificatesList');
      if (!list) return;
      if (!adminCertificates.length) {
        list.innerHTML = '<div class="p-6 text-sm text-slate-500">Todavía no hay certificados emitidos.</div>';
        return;
      }
      list.innerHTML = adminCertificates.map(cert => {
        const expired = cert.status === 'valid' && cert.expires_at && new Date(cert.expires_at).getTime() < Date.now();
        const valid = cert.status === 'valid' && !expired;
        const kind = cert.certificate_kind === 'participation' ? 'Participación' : 'Aprobación';
        const statusLabel = valid ? 'Válido' : (expired ? 'Vencido' : 'Revocado');
        const statusClass = valid ? 'bg-green-50 text-green-700' : (expired ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700');
        const scoreText = cert.certificate_kind === 'participation' ? '' : ` · ${Math.round(Number(cert.score))}%`;
        const expiryText = cert.expires_at ? ` · Vigencia ${formatCertificateDate(cert.expires_at)}` : '';
        return `<div class="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div class="min-w-0"><div class="flex flex-wrap gap-2 items-center"><p class="font-extrabold text-lutmin-dark">${escapeHtml(cert.full_name)}</p><span class="text-[10px] px-2.5 py-1 rounded-full font-bold ${statusClass}">${statusLabel}</span><span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700">${kind}</span></div><p class="mt-1 text-sm text-slate-500">${escapeHtml(cert.course_title)}${scoreText} · ${formatCertificateDate(cert.issued_at)}${expiryText}</p><p class="mt-2 text-[10px] text-slate-400 break-all">${escapeHtml(cert.code)}</p>${cert.revoked_reason ? `<p class="mt-1 text-xs text-red-500">${escapeHtml(cert.revoked_reason)}</p>` : ''}</div>
          <div class="flex flex-wrap gap-2 shrink-0"><button onclick="showAdminCertificate('${cert.id}')" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Ver</button>${cert.status==='valid' ? `<button onclick="revokeAdminCertificate('${cert.id}')" class="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Revocar</button>` : `<button onclick="restoreAdminCertificate('${cert.id}')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Restaurar</button>`}</div>
        </div>`;
      }).join('');
    }

    function showAdminCertificate(id) {
      const cert = adminCertificates.find(c => c.id === id);
      if (cert) showCertificate(cert);
    }

    async function revokeAdminCertificate(id) {
      if (currentLutminUser?.role !== 'admin') return;
      const reason = window.prompt('Motivo de la revocación:', 'Revocado por Administración Lutmin');
      if (reason === null) return;
      const { error } = await supabaseClient.rpc('revoke_certificate', { p_certificate_id: id, p_reason: reason });
      if (error) { console.error(error); showToast('No pude revocar el certificado.'); return; }
      showToast('Certificado revocado.');
      await loadAdminData();
    }

    async function restoreAdminCertificate(id) {
      if (currentLutminUser?.role !== 'admin') return;
      const { error } = await supabaseClient.rpc('restore_certificate', { p_certificate_id: id });
      if (error) { console.error(error); showToast('No pude restaurar el certificado.'); return; }
      showToast('Certificado restaurado.');
      await loadAdminData();
    }

    async function toggleCoursePublished(courseId, published) {
      if (currentLutminUser?.role !== 'admin') return;
      const { error } = await supabaseClient.from('courses').update({ published }).eq('id', courseId);
      if (error) { console.error(error); showToast('No pude cambiar el estado del curso.'); return; }
      showToast(published ? 'Curso publicado.' : 'Curso ocultado.');
      await loadAdminData();
      await loadPublicCatalog();
    }

    async function toggleStudentActive(userId, active) {
      if (currentLutminUser?.role !== 'admin') return;
      const { error } = await supabaseClient.from('profiles').update({ active }).eq('id', userId);
      if (error) { console.error(error); showToast('No pude cambiar el estado del alumno.'); return; }
      showToast(active ? 'Alumno activado.' : 'Alumno desactivado.');
      await loadAdminData();
    }

    async function removeEnrollment(enrollmentId) {
      if (currentLutminUser?.role !== 'admin') return;
      if (!confirm('¿Quitar este curso al alumno? Su progreso guardado no se borra.')) return;
      const { error } = await supabaseClient.from('enrollments').delete().eq('id', enrollmentId);
      if (error) { console.error(error); showToast('No pude quitar la inscripción.'); return; }
      showToast('Curso quitado del alumno.');
      await loadAdminData();
    }

    // =========================================================
    // LUTMIN V1.0 - NOTIFICACIONES, CONTROL, AUDITORÍA E IMPORTACIÓN
    // =========================================================
    async function loadAdminV1Ops() {
      if (!supabaseClient || currentLutminUser?.role !== 'admin') return;
      const [controlRes, auditRes, announcementRes] = await Promise.all([
        supabaseClient.rpc('admin_get_control_center'),
        supabaseClient.from('audit_log').select('id,actor_user_id,action,entity_type,entity_id,details,created_at').order('created_at',{ascending:false}).limit(100),
        supabaseClient.from('announcements').select('id,title,body,audience,active,starts_at,expires_at,created_by,created_at').order('created_at',{ascending:false}).limit(30)
      ]);
      if (controlRes.error || auditRes.error || announcementRes.error) {
        console.error(controlRes.error || auditRes.error || announcementRes.error);
        showToast('No pude cargar una parte de Administración. Abrí Sistema → Diagnóstico para ver el componente pendiente.');
        return;
      }
      adminControlCenter = controlRes.data || {};
      adminAuditRows = auditRes.data || [];
      adminAnnouncements = announcementRes.data || [];
      renderAdminV1Ops();
    }

    function renderAdminV1Ops() {
      const c = adminControlCenter || {};
      const map = {
        controlNewLeads: c.new_leads,
        controlOverdue: c.overdue_payments,
        controlInactive: c.inactive_students_7d,
        controlNoLessons: c.courses_without_lessons,
        controlNoCourses: c.students_without_courses,
        controlRevoked: c.revoked_certificates
      };
      Object.entries(map).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.textContent=String(Number(val||0)); });

      const alerts = [
        [Number(c.overdue_payments||0),'Pagos vencidos','Hay matrículas con vencimiento superado.','fa-triangle-exclamation','bg-red-50','text-red-700'],
        [Number(c.new_leads||0),'Interesados sin gestionar','Consultas nuevas esperando contacto.','fa-user-clock','bg-violet-50','text-violet-700'],
        [Number(c.inactive_students_7d||0),'Alumnos inactivos','Tienen cursos pero no ingresaron en los últimos 7 días.','fa-person-circle-exclamation','bg-amber-50','text-amber-700'],
        [Number(c.courses_without_lessons||0),'Cursos sin contenido','Cursos creados que todavía no tienen clases.','fa-book-open','bg-blue-50','text-blue-700'],
        [Number(c.students_without_courses||0),'Alumnos sin cursos','Cuentas activas sin ninguna inscripción.','fa-user-minus','bg-cyan-50','text-cyan-700'],
        [Number(c.revoked_certificates||0),'Certificados revocados','Certificados que actualmente figuran como revocados.','fa-ban','bg-slate-100','text-slate-700']
      ].filter(x => x[0] > 0);
      const alertRoot = document.getElementById('controlAlertsList');
      if (alertRoot) alertRoot.innerHTML = alerts.length ? alerts.map(a => `<div class="rounded-2xl ${a[4]} p-4 ${a[5]}"><div class="flex gap-3"><i class="fa-solid ${a[3]} mt-1"></i><div><p class="font-extrabold text-sm">${a[0]} · ${a[1]}</p><p class="mt-1 text-[11px] opacity-80">${a[2]}</p></div></div></div>`).join('') : '<div class="md:col-span-2 xl:col-span-3 rounded-2xl bg-green-500/15 border border-green-400/20 p-4 text-green-100 text-sm font-bold"><i class="fa-solid fa-circle-check mr-2"></i>No hay alertas operativas importantes en este momento.</div>';

      const annRoot = document.getElementById('adminAnnouncementsList');
      if (annRoot) annRoot.innerHTML = adminAnnouncements.length ? adminAnnouncements.map(a => `<div class="p-5"><div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap gap-2 items-center"><p class="font-extrabold text-sm text-lutmin-dark">${escapeHtml(a.title)}</p><span class="px-2 py-1 rounded-full text-[10px] font-bold ${a.active ? 'bg-green-50 text-green-700':'bg-slate-100 text-slate-500'}">${a.active?'Activo':'Inactivo'}</span><span class="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">${escapeHtml(a.audience)}</span></div><p class="mt-2 text-xs text-slate-500 line-clamp-2">${escapeHtml(a.body)}</p><p class="mt-2 text-[10px] text-slate-400">${notificationDate(a.created_at)}${a.expires_at ? ' · vence '+notificationDate(a.expires_at):''}</p></div><button onclick="toggleAdminAnnouncement('${a.id}',${!a.active})" class="px-3 py-2 rounded-xl ${a.active?'bg-red-50 text-red-700':'bg-green-50 text-green-700'} text-[11px] font-bold shrink-0">${a.active?'Desactivar':'Activar'}</button></div></div>`).join('') : '<div class="p-6 text-sm text-slate-500">Todavía no publicaste comunicados.</div>';

      const auditRoot = document.getElementById('adminAuditList');
      if (auditRoot) auditRoot.innerHTML = adminAuditRows.length ? adminAuditRows.map(row => {
        const actor = adminProfiles.find(p => p.id === row.actor_user_id);
        const actionMap = { insert:'Creó', update:'Modificó', delete:'Eliminó', create_account:'Creó cuenta' };
        return `<div class="p-4 sm:px-6"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><p class="text-sm text-slate-700"><strong>${escapeHtml(actor?.full_name || actor?.email || (row.actor_user_id ? 'Usuario':'Sistema'))}</strong> · ${escapeHtml(actionMap[row.action] || row.action)} <strong>${escapeHtml(row.entity_type)}</strong></p><p class="mt-1 text-[10px] text-slate-400">ID: ${escapeHtml(row.entity_id || '—')}</p></div><span class="text-[10px] text-slate-400 shrink-0">${notificationDate(row.created_at)}</span></div></div>`;
      }).join('') : '<div class="p-6 text-sm text-slate-500">Todavía no hay movimientos auditados.</div>';
    }

    document.getElementById('adminAnnouncementForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (currentLutminUser?.role !== 'admin') return;
      const title = document.getElementById('adminAnnouncementTitle').value.trim();
      const body = document.getElementById('adminAnnouncementBody').value.trim();
      const audience = document.getElementById('adminAnnouncementAudience').value;
      const rawExpires = document.getElementById('adminAnnouncementExpires').value;
      const expires = rawExpires ? new Date(rawExpires).toISOString() : null;
      const { error } = await supabaseClient.rpc('admin_create_announcement', { p_title:title, p_body:body, p_audience:audience, p_expires_at:expires });
      if (error) { showToast(error.message || 'No pude publicar el comunicado.'); return; }
      event.target.reset();
      showToast('Comunicado publicado.');
      await loadAdminV1Ops();
      await loadNotificationCenter();
    });

    async function toggleAdminAnnouncement(id, active) {
      const { error } = await supabaseClient.rpc('admin_toggle_announcement', { p_id:id, p_active:active });
      if (error) { showToast('No pude cambiar el comunicado.'); return; }
      await loadAdminV1Ops();
      await loadNotificationCenter();
    }

    function exportAdminBackupJson() {
      if (currentLutminUser?.role !== 'admin') return;
      const payload = {
        exported_at: new Date().toISOString(),
        version: 'LUTMIN V3.5',
        profiles: adminProfiles,
        courses: adminCourses,
        lessons: adminLessons,
        enrollments: adminEnrollments,
        progress: adminProgressRows,
        assessments: adminAssessments,
        assessment_questions: adminAssessmentQuestions,
        assessment_attempts: adminAssessmentAttempts,
        certificates: adminCertificates,
        offerings: adminOfferings,
        leads: adminCourseLeads,
        payments: adminPayments,
        companies: adminCompanies,
        company_members: adminCompanyMembers,
        training_groups: adminTrainingGroups,
        training_group_members: adminTrainingMembers,
        training_sessions: adminTrainingSessions,
        attendance_records: adminAttendance,
        announcements: adminAnnouncements,
        audit_recent: adminAuditRows
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`LUTMIN_respaldo_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
      showToast('Respaldo descargado.');
    }

    function csvEscapeV1(value) {
      const str=String(value ?? '');
      return /[";,\n\r]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
    }

    function downloadStudentImportTemplate() {
      const csv='nombre,email\nJuan Pérez,juan@correo.com\nMaría López,maria@correo.com\n';
      const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='LUTMIN_plantilla_alumnos.csv'; a.click(); URL.revokeObjectURL(a.href);
    }

    function parseCsvV1(text) {
      const rows=[]; let row=[]; let cell=''; let quoted=false;
      for (let i=0;i<text.length;i++) {
        const ch=text[i];
        if (ch==='"') { if (quoted && text[i+1]==='"') { cell+='"'; i++; } else quoted=!quoted; continue; }
        if (!quoted && (ch===',' || ch===';' || ch==='\n' || ch==='\r')) {
          if (ch==='\r' && text[i+1]==='\n') continue;
          row.push(cell.trim()); cell='';
          if (ch==='\n' || ch==='\r') { if (row.some(v=>v!=='')) rows.push(row); row=[]; }
          continue;
        }
        cell+=ch;
      }
      row.push(cell.trim()); if (row.some(v=>v!=='')) rows.push(row);
      return rows;
    }

    function generateBulkStudentPassword() {
      const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
      const bytes=new Uint32Array(12); crypto.getRandomValues(bytes);
      return 'L!' + Array.from(bytes).map(n=>chars[n%chars.length]).join('');
    }

    async function importStudentsCsv() {
      if (currentLutminUser?.role !== 'admin') return;
      const input=document.getElementById('adminBulkStudentsFile');
      const status=document.getElementById('adminBulkImportStatus');
      const btn=document.getElementById('adminBulkStudentsBtn');
      const file=input?.files?.[0];
      if (!file) { showToast('Elegí un archivo CSV.'); return; }
      btn.disabled=true; btn.textContent='Importando...';
      status.className='mt-4 rounded-2xl p-4 text-sm bg-blue-50 text-blue-800'; status.textContent='Leyendo archivo...';
      status.classList.remove('hidden');
      try {
        const rows=parseCsvV1(await file.text());
        if (rows.length < 2) throw new Error('El CSV no tiene alumnos.');
        const header=rows[0].map(x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
        const nameIdx=header.findIndex(x=>['nombre','nombre completo','full_name','name'].includes(x));
        const emailIdx=header.findIndex(x=>['email','correo','correo electronico'].includes(x));
        if (nameIdx<0 || emailIdx<0) throw new Error('El CSV debe tener las columnas nombre y email.');
        const seen=new Set();
        const students=rows.slice(1).filter(r=>r[nameIdx] && r[emailIdx]).map(r=>({full_name:r[nameIdx].trim(),email:r[emailIdx].trim().toLowerCase()})).filter(r=>{ if(seen.has(r.email)) return false; seen.add(r.email); return true; });
        if (!students.length) throw new Error('No encontré alumnos válidos.');
        if (students.length>50) throw new Error('Importá como máximo 50 alumnos por vez.');
        students.forEach(x=>x.password=generateBulkStudentPassword());
        const { data:sessionData }=await supabaseClient.auth.getSession();
        const token=sessionData?.session?.access_token;
        const response=await fetch(`${SUPABASE_URL}/functions/v1/hyper-create-student`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({action:'bulk_create_students',students})});
        const result=await response.json().catch(()=>({}));
        if (!response.ok) throw new Error(result.error || 'No pude importar alumnos.');
        const byEmail=new Map((result.results||[]).map(x=>[x.email,x]));
        const output=[['nombre','email','contraseña provisoria','resultado','detalle']];
        students.forEach(st=>{ const r=byEmail.get(st.email)||{}; output.push([st.full_name,st.email,st.password,r.ok?'CREADO':'ERROR',r.error||'']); });
        const csv='\ufeff'+output.map(r=>r.map(csvEscapeV1).join(';')).join('\n');
        const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`LUTMIN_importacion_alumnos_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
        status.className='mt-4 rounded-2xl p-4 text-sm bg-green-50 text-green-800'; status.innerHTML=`<strong>${Number(result.created||0)}</strong> creados · <strong>${Number(result.failed||0)}</strong> con error. Se descargó el resultado con las contraseñas provisorias.`;
        input.value=''; await loadAdminData();
      } catch (error) {
        console.error(error); status.className='mt-4 rounded-2xl p-4 text-sm bg-red-50 text-red-800'; status.textContent=error.message || 'No pude importar el archivo.';
      } finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-users-gear mr-2"></i>Importar alumnos'; }
    }


    // =========================================================
    // LUTMIN CONECTA REAL - V1.2
    // =========================================================
    function escV16(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s])); }
    function fmtDateV16(v){ if(!v) return 'Sin fecha'; const d=new Date(v); return Number.isNaN(d.getTime())?'Sin fecha':d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
    function laneLabelV16(v){ return ({academia:'Academia',comercial:'Comercial',cobranzas:'Cobranzas',soporte:'Soporte',general:'General'})[v]||v; }
    function severityMetaV16(v){ return ({baja:['Baja','bg-slate-100 text-slate-600'],normal:['Normal','bg-blue-50 text-blue-700'],alta:['Alta','bg-amber-50 text-amber-700'],critica:['Crítica','bg-red-50 text-red-700']})[v]||['Normal','bg-slate-100']; }
    function statusLabelV16(v){ return ({open:'Abierta',in_progress:'En gestión',resolved:'Resuelta',dismissed:'Descartada'})[v]||v; }

    async function loadAdminOpsV16(){
      if(!supabaseClient || !currentLutminUser || currentLutminUser.role!=='admin') return;

      // V1.9: las consultas son independientes. Una tabla secundaria faltante ya no bloquea todo el Centro Operativo.
      const [tasks,rules,roles,userRoles,snapshots]=await Promise.all([
        supabaseClient.from('operational_tasks').select('*').order('created_at',{ascending:false}),
        supabaseClient.from('automation_rules').select('*').order('name'),
        supabaseClient.from('internal_roles').select('*').order('name'),
        supabaseClient.from('user_internal_roles').select('*'),
        supabaseClient.from('management_snapshots').select('*').order('created_at',{ascending:false}).limit(20)
      ]);

      if(tasks.error){
        console.warn('Centro Operativo no disponible:',tasks.error.message);
        adminOpsTasksV16=[];
        const list=document.getElementById('opsTasksListV16');
        if(list) list.innerHTML=`<div class="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm"><strong>Centro Operativo pendiente.</strong><p class="mt-1 text-xs">${escV16(tasks.error.message)}</p><button onclick="setAdminModuleV19('system');runAdminDiagnosticsV19()" class="mt-3 px-3 py-2 rounded-xl bg-white text-amber-800 text-xs font-bold">Ver diagnóstico</button></div>`;
      }else{
        adminOpsTasksV16=tasks.data||[];
        renderOperationalCenterV16();
      }

      if(rules.error){
        console.warn('Automatizaciones no disponibles:',rules.error.message);
        adminAutomationRulesV16=[];
        const el=document.getElementById('opsAutomationsV16');
        if(el) el.innerHTML=`<div class="p-4 text-xs text-amber-700">No pude leer las reglas de automatización: ${escV16(rules.error.message)}</div>`;
      }else{
        // Compatibilidad V1.5/V1.6/V1.9: normalizamos ambos esquemas en el navegador.
        adminAutomationRulesV16=(rules.data||[]).map(r=>({
          ...r,
          description:r.description||r.body||'',
          lane:r.lane||(r.target_scope==='student'?'academia':r.target_scope==='company'?'comercial':'general'),
          threshold_hours:Number(r.threshold_hours ?? Math.abs(Number(r.offset_hours||0)) ?? 0),
          severity:r.severity||'normal'
        }));
        renderAutomationRulesV16();
      }

      if(roles.error||userRoles.error){
        console.warn('Roles internos no disponibles:',roles.error?.message||userRoles.error?.message);
        adminInternalRolesV16=[]; adminUserInternalRolesV16=[];
        const el=document.getElementById('opsInternalTeamV16');
        if(el) el.innerHTML='<p class="text-xs text-amber-700">Roles internos pendientes de instalación. Revisá Sistema → Diagnóstico.</p>';
      }else{
        adminInternalRolesV16=roles.data||[];
        adminUserInternalRolesV16=userRoles.data||[];
        renderInternalTeamV16();
      }

      if(snapshots.error){
        console.warn('Fotos de gestión no disponibles:',snapshots.error.message);
        adminManagementSnapshotsV16=[];
      }else{
        adminManagementSnapshotsV16=snapshots.data||[];
        renderSnapshotsV16();
      }

      refreshAdminWorkspaceV19();
    }

    function setOpsLaneV16(lane){ activeOpsLaneV16=lane; renderOperationalCenterV16(); }

    function renderOperationalCenterV16(){
      const counts={all:0,academia:0,comercial:0,cobranzas:0,soporte:0,general:0};
      const active=adminOpsTasksV16.filter(t=>['open','in_progress'].includes(t.status));
      counts.all=active.length; active.forEach(t=>{if(counts[t.lane]!==undefined)counts[t.lane]++;});
      const ids={all:'opsCountAll',academia:'opsCountAcademia',comercial:'opsCountComercial',cobranzas:'opsCountCobranzas',soporte:'opsCountSoporte',general:'opsCountGeneral'};
      Object.entries(ids).forEach(([k,id])=>{const el=document.getElementById(id);if(el)el.textContent=counts[k]||0;});
      const list=document.getElementById('opsTasksListV16'); if(!list)return;
      const status=document.getElementById('opsStatusFilterV16')?.value||'active';
      const q=(document.getElementById('opsSearchV16')?.value||'').trim().toLowerCase();
      let rows=adminOpsTasksV16.filter(t=>activeOpsLaneV16==='all'||t.lane===activeOpsLaneV16);
      rows=rows.filter(t=>status==='all'?true:status==='active'?['open','in_progress'].includes(t.status):t.status===status);
      if(q) rows=rows.filter(t=>(t.title+' '+t.description).toLowerCase().includes(q));
      if(!rows.length){list.innerHTML='<div class="p-5 rounded-2xl bg-slate-50 text-sm text-slate-500">No hay tareas para este filtro.</div>';return;}
      const weight={critica:4,alta:3,normal:2,baja:1};
      rows.sort((a,b)=>(weight[b.severity]||0)-(weight[a.severity]||0)||new Date(a.due_at||'2999-01-01')-new Date(b.due_at||'2999-01-01'));
      list.innerHTML=rows.map(t=>{const [sev,sevClass]=severityMetaV16(t.severity);const due=t.due_at?fmtDateV16(t.due_at):'Sin vencimiento';const overdue=t.due_at&&new Date(t.due_at)<new Date()&&!['resolved','dismissed'].includes(t.status);return `<div class="rounded-2xl border ${overdue?'border-red-200':'border-slate-100'} p-4 bg-white"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div class="min-w-0"><div class="flex flex-wrap gap-2"><span class="text-[10px] px-2 py-1 rounded-full bg-slate-100 font-bold">${escV16(laneLabelV16(t.lane))}</span><span class="text-[10px] px-2 py-1 rounded-full font-bold ${sevClass}">${sev}</span><span class="text-[10px] px-2 py-1 rounded-full bg-slate-100 font-bold">${escV16(statusLabelV16(t.status))}</span></div><h4 class="mt-2 font-extrabold text-lutmin-dark">${escV16(t.title)}</h4>${t.description?`<p class="mt-1 text-xs text-slate-500 leading-relaxed">${escV16(t.description)}</p>`:''}<p class="mt-2 text-[10px] ${overdue?'text-red-600 font-bold':'text-slate-400'}"><i class="fa-regular fa-clock mr-1"></i>${escV16(due)}</p></div><div class="flex sm:flex-col gap-2 shrink-0">${t.status==='open'?`<button onclick="updateOperationalTaskV16('${t.id}','in_progress')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold">Tomar</button>`:''}${!['resolved','dismissed'].includes(t.status)?`<button onclick="updateOperationalTaskV16('${t.id}','resolved')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-[11px] font-bold">Resolver</button><button onclick="updateOperationalTaskV16('${t.id}','dismissed')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold">Descartar</button>`:`<button onclick="updateOperationalTaskV16('${t.id}','open')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-bold">Reabrir</button>`}</div></div></div>`;}).join('');
    }

    async function updateOperationalTaskV16(id,status){
      const patch={status,updated_at:new Date().toISOString(),resolved_at:status==='resolved'?new Date().toISOString():null};
      const {error}=await supabaseClient.from('operational_tasks').update(patch).eq('id',id);
      if(error){showToast('No pude actualizar la tarea: '+error.message);return;} showToast('Tarea actualizada.'); await loadAdminOpsV16();
    }

    async function refreshOperationalSignalsV16(){
      const {data,error}=await supabaseClient.rpc('admin_refresh_operational_signals');
      if(error){showToast('No pude actualizar señales: '+error.message);return;} showToast(`Señales actualizadas · ${data?.active_tasks??0} tareas activas.`); await loadAdminOpsV16();
    }

    function renderAutomationRulesV16(){
      const el=document.getElementById('opsAutomationsV16'); if(!el)return;
      if(!adminAutomationRulesV16.length){el.innerHTML='<p class="p-4 text-xs text-slate-500">Sin reglas configuradas.</p>';return;}
      el.innerHTML=adminAutomationRulesV16.map(r=>`<label class="p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50"><input type="checkbox" ${r.active?'checked':''} onchange="toggleAutomationV16('${r.id}',this.checked)" class="mt-1"><span class="min-w-0"><span class="block text-xs font-extrabold text-lutmin-dark">${escV16(r.name)}</span><span class="block text-[10px] text-slate-500 mt-1">${escV16(r.description)}</span></span></label>`).join('');
    }
    async function toggleAutomationV16(id,active){const {error}=await supabaseClient.from('automation_rules').update({active,updated_at:new Date().toISOString()}).eq('id',id);if(error){showToast(error.message);return;}showToast(active?'Automatización activada.':'Automatización pausada.');await loadAdminOpsV16();}

    function renderInternalTeamV16(){
      const el=document.getElementById('opsInternalTeamV16'); if(!el)return;
      const admins=adminProfiles.filter(p=>p.active!==false&&(p.role==='admin'||adminAccessRoles.some(r=>r.user_id===p.id&&r.access_role==='admin')));
      if(!admins.length){el.innerHTML='<p class="text-sm text-slate-500">No hay administradores cargados.</p>';return;}
      el.innerHTML=admins.map(p=>{const assigned=new Set(adminUserInternalRolesV16.filter(x=>x.user_id===p.id).map(x=>x.role_key));return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark">${escV16(p.full_name||p.email)}</p><p class="text-[11px] text-slate-500">${escV16(p.email||'')}</p></div><div class="flex flex-wrap gap-2">${adminInternalRolesV16.map(r=>`<label class="px-3 py-2 rounded-xl ${assigned.has(r.key)?'bg-emerald-50 text-emerald-700':'bg-slate-50 text-slate-600'} text-[10px] font-bold cursor-pointer"><input type="checkbox" class="hidden" ${assigned.has(r.key)?'checked':''} onchange="toggleInternalRoleV16('${p.id}','${r.key}',this.checked)">${escV16(r.name)}</label>`).join('')}</div></div></div>`;}).join('');
    }
    async function toggleInternalRoleV16(userId,roleKey,checked){let res;if(checked){res=await supabaseClient.from('user_internal_roles').upsert({user_id:userId,role_key:roleKey,granted_by:currentLutminUser.id},{onConflict:'user_id,role_key'});}else{res=await supabaseClient.from('user_internal_roles').delete().eq('user_id',userId).eq('role_key',roleKey);}if(res.error){showToast('No pude cambiar el rol: '+res.error.message);return;}showToast('Roles actualizados.');await loadAdminOpsV16();}

    function getOpsMetricsV16(){
      const active=adminOpsTasksV16.filter(t=>['open','in_progress'].includes(t.status));
      const critical=active.filter(t=>t.severity==='critica').length;
      const overdue=active.filter(t=>t.due_at&&new Date(t.due_at)<new Date()).length;
      const today=new Date();
      const newLeads=adminCourseLeads.filter(l=>['new','nuevo'].includes(String(l.status||'').toLowerCase())).length;
      const pendingPayments=adminEnrollments.filter(e=>!['paid','bonified','waived'].includes(String(e.payment_status||'').toLowerCase())&&Number(e.price_amount||0)>0).length;
      return {active_tasks:active.length,critical_tasks:critical,overdue_tasks:overdue,new_leads:newLeads,pending_payments:pendingPayments,students:adminProfiles.filter(adminIsStudent).length,courses:adminCourses.length,certificates:adminCertificates.filter(c=>c.status==='valid').length,generated_at:today.toISOString()};
    }

    async function saveManagementSnapshotV16(){const metrics=getOpsMetricsV16();const label='Foto '+new Date().toLocaleString('es-AR');const {error}=await supabaseClient.from('management_snapshots').insert({label,metrics,created_by:currentLutminUser.id});if(error){showToast(error.message);return;}showToast('Foto de gestión guardada.');await loadAdminOpsV16();}
    function renderSnapshotsV16(){const el=document.getElementById('opsSnapshotsV16');if(!el)return;if(!adminManagementSnapshotsV16.length){el.innerHTML='<div class="p-4 rounded-2xl bg-slate-50 text-xs text-slate-500">Todavía no guardaste ninguna foto.</div>';return;}el.innerHTML=adminManagementSnapshotsV16.map(s=>`<div class="p-3 rounded-2xl bg-slate-50"><p class="text-xs font-bold text-lutmin-dark">${escV16(s.label)}</p><p class="mt-1 text-[10px] text-slate-500">${fmtDateV16(s.created_at)} · ${s.metrics?.active_tasks??0} tareas activas · ${s.metrics?.critical_tasks??0} críticas</p></div>`).join('');}

    function downloadOperationsCsvV16(){
      const rows=[['Área','Título','Prioridad','Estado','Vencimiento','Descripción']];
      adminOpsTasksV16.forEach(t=>rows.push([laneLabelV16(t.lane),t.title,t.severity,statusLabelV16(t.status),t.due_at||'',t.description||'']));
      const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='lutmin_centro_operativo.csv';a.click();URL.revokeObjectURL(a.href);
    }

    async function downloadExecutiveOpsPdfV16(){
      if(!(await ensureJsPdfLib())){showToast('No pude cargar el generador PDF.');return;}
      const {jsPDF}=window.jspdf;const doc=new jsPDF();const m=getOpsMetricsV16();let y=20;
      doc.setFontSize(18);doc.text('LUTMIN · Reporte Ejecutivo Operativo',14,y);y+=10;doc.setFontSize(10);doc.text('Generado: '+new Date().toLocaleString('es-AR'),14,y);y+=12;
      const k=[['Tareas activas',m.active_tasks],['Tareas críticas',m.critical_tasks],['Tareas vencidas',m.overdue_tasks],['Interesados nuevos',m.new_leads],['Pagos pendientes',m.pending_payments],['Alumnos',m.students],['Cursos',m.courses],['Certificados válidos',m.certificates]];
      k.forEach(([a,b])=>{doc.setFont(undefined,'bold');doc.text(String(a)+':',14,y);doc.setFont(undefined,'normal');doc.text(String(b),65,y);y+=7;});y+=4;
      doc.setFontSize(13);doc.setFont(undefined,'bold');doc.text('Prioridades abiertas',14,y);y+=8;doc.setFontSize(9);doc.setFont(undefined,'normal');
      const top=adminOpsTasksV16.filter(t=>['open','in_progress'].includes(t.status)).sort((a,b)=>({critica:4,alta:3,normal:2,baja:1}[b.severity]||0)-({critica:4,alta:3,normal:2,baja:1}[a.severity]||0)).slice(0,12);
      top.forEach(t=>{if(y>275){doc.addPage();y=20;}const line=`[${laneLabelV16(t.lane)}] ${t.title} · ${t.severity}`;const lines=doc.splitTextToSize(line,180);doc.text(lines,14,y);y+=lines.length*5+2;});
      doc.save('LUTMIN_Reporte_Ejecutivo_Operativo.pdf');
    }

    const opsFormV16=document.getElementById('opsNewTaskFormV16');
    if(opsFormV16) opsFormV16.addEventListener('submit',async e=>{e.preventDefault();const due=document.getElementById('opsNewDueV16').value;const payload={title:document.getElementById('opsNewTitleV16').value.trim(),description:document.getElementById('opsNewDescriptionV16').value.trim(),lane:document.getElementById('opsNewLaneV16').value,severity:document.getElementById('opsNewSeverityV16').value,due_at:due?new Date(due).toISOString():null,created_by:currentLutminUser.id};const {error}=await supabaseClient.from('operational_tasks').insert(payload);if(error){showToast(error.message);return;}opsFormV16.reset();showToast('Tarea creada.');await loadAdminOpsV16();});


    // =========================================================
    // V1.7 · INTELIGENCIA DE GESTIÓN + METAS + RIESGO
    // =========================================================
    let executiveGoalsV17 = [];
    let executiveRiskSettingsV17 = {inactive_days:7,low_progress_percent:30,low_progress_after_days:14,company_attention_percent:60};
    let executiveSnapshotsV17 = [];
    let executiveCompaniesV17 = [];
    let executiveCompanyMembersV17 = [];
    let executiveMetricsV17 = null;

    function monthBoundsV17(){const now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),1);const end=new Date(now.getFullYear(),now.getMonth()+1,1);return {start,end,startIso:start.toISOString(),endIso:end.toISOString(),month:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`};}
    function moneyV17(n){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n||0));}
    function pctV17(n){return `${Math.round(Number(n||0))}%`;}
    function daysAgoV17(date){if(!date)return 9999;return Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));}
    function goalV17(key){return executiveGoalsV17.find(g=>g.metric_key===key);}
    function setTextV17(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
    function progressBarV17(actual,target,inverse=false){if(!target||Number(target)<=0)return '';const a=Number(actual||0),t=Number(target||0);let ratio=inverse?(t?Math.min(100,(t/Math.max(a,0.01))*100):0):Math.min(100,(a/t)*100);const ok=inverse?a<=t:a>=t;return `<div class="mt-1 h-1.5 rounded-full bg-white/70 overflow-hidden"><div class="h-full rounded-full ${ok?'bg-emerald-500':'bg-current'}" style="width:${Math.max(2,ratio)}%"></div></div><span class="block mt-1">Meta: ${inverse?'≤ ':''}${Number(t).toLocaleString('es-AR')}</span>`;}

    async function loadExecutiveV17(){
      if(!supabaseClient||currentLutminUser?.role!=='admin')return;
      const b=monthBoundsV17();
      const [goalsRes,riskRes,snapRes,companiesRes,membersRes]=await Promise.all([
        supabaseClient.from('executive_kpi_goals').select('*').eq('period_month',b.month),
        supabaseClient.from('executive_risk_settings').select('*').eq('id',true).maybeSingle(),
        supabaseClient.from('executive_metric_snapshots').select('*').order('created_at',{ascending:false}).limit(12),
        supabaseClient.from('companies').select('id,name,display_name,active').eq('active',true).order('name'),
        supabaseClient.from('company_members').select('company_id,user_id,member_role,active').eq('active',true)
      ]);
      const err=[goalsRes,riskRes,snapRes,companiesRes,membersRes].find(x=>x.error)?.error;
      if(err){console.warn('V1.7 no disponible:',err.message);return;}
      executiveGoalsV17=goalsRes.data||[];
      executiveRiskSettingsV17=riskRes.data||executiveRiskSettingsV17;
      executiveSnapshotsV17=snapRes.data||[];
      executiveCompaniesV17=companiesRes.data||[];
      executiveCompanyMembersV17=membersRes.data||[];
      executiveMetricsV17=calculateExecutiveMetricsV17();
      renderExecutiveV17();
    }

    function enrollmentProgressV17(e){
      const lessons=adminLessons.filter(l=>l.course_id===e.course_id);
      if(!lessons.length)return 0;
      const ids=new Set(lessons.map(l=>l.id));
      const done=adminProgressRows.filter(p=>p.user_id===e.user_id&&ids.has(p.lesson_id)&&p.completed).length;
      return Math.min(100,(done/lessons.length)*100);
    }

    function calculateExecutiveMetricsV17(){
      const b=monthBoundsV17();
      const paid=adminPayments.filter(p=>p.status==='confirmed'&&p.paid_at&&new Date(p.paid_at)>=b.start&&new Date(p.paid_at)<b.end);
      const revenue=paid.reduce((s,p)=>s+Number(p.amount||0),0);
      const monthLeads=adminCourseLeads.filter(l=>l.created_at&&new Date(l.created_at)>=b.start&&new Date(l.created_at)<b.end);
      const converted=monthLeads.filter(l=>['payment_pending','enrolled'].includes(l.status)||l.converted_user_id).length;
      const conversion=monthLeads.length?(converted/monthLeads.length)*100:0;
      const completed=adminEnrollments.filter(e=>e.status==='completed').length;
      const completion=adminEnrollments.length?(completed/adminEnrollments.length)*100:0;
      const certs=adminCertificates.filter(c=>c.issued_at&&new Date(c.issued_at)>=b.start&&new Date(c.issued_at)<b.end&&c.status==='valid').length;
      const overdueEnroll=adminEnrollments.filter(e=>e.payment_due_date&&new Date(`${e.payment_due_date}T23:59:59`)<new Date()&&!['paid','waived','not_required'].includes(e.payment_status));
      const paidByEnrollment={};adminPayments.filter(p=>p.status==='confirmed').forEach(p=>paidByEnrollment[p.enrollment_id]=(paidByEnrollment[p.enrollment_id]||0)+Number(p.amount||0));
      const overdueDebt=overdueEnroll.reduce((s,e)=>s+Math.max(0,Number(e.price_amount||0)-Number(paidByEnrollment[e.id]||0)),0);
      const risks=[];
      const s=executiveRiskSettingsV17;
      adminProfiles.filter(adminIsStudent).forEach(p=>{
        const enrolls=adminEnrollments.filter(e=>e.user_id===p.id&&['active','pending_payment','paused'].includes(e.status));
        if(!enrolls.length)return;
        const reasons=[];const inactive=daysAgoV17(p.last_seen_at||p.created_at);
        if(inactive>=Number(s.inactive_days||7)) reasons.push(`${inactive} días sin ingresar`);
        enrolls.forEach(e=>{const age=daysAgoV17(e.enrolled_at);const prog=enrollmentProgressV17(e);if(age>=Number(s.low_progress_after_days||14)&&prog<Number(s.low_progress_percent||30))reasons.push(`${Math.round(prog)}% en ${adminCourses.find(c=>c.id===e.course_id)?.title||'curso'}`);if(e.payment_due_date&&new Date(`${e.payment_due_date}T23:59:59`)<new Date()&&!['paid','waived','not_required'].includes(e.payment_status))reasons.push('pago vencido');});
        if(reasons.length)risks.push({id:p.id,name:p.full_name||p.email,email:p.email,reasons:[...new Set(reasons)],severity:reasons.some(r=>r.includes('pago vencido'))?'alta':reasons.length>=2?'alta':'normal'});
      });
      const companyHealth=executiveCompaniesV17.map(c=>{const ids=executiveCompanyMembersV17.filter(m=>m.company_id===c.id&&m.member_role==='employee').map(m=>m.user_id);const ens=adminEnrollments.filter(e=>ids.includes(e.user_id)&&['active','completed','paused'].includes(e.status));const avg=ens.length?ens.reduce((sum,e)=>sum+enrollmentProgressV17(e),0)/ens.length:0;const cert=adminCertificates.filter(x=>ids.includes(x.user_id)&&x.status==='valid').length;return {id:c.id,name:c.display_name||c.name,members:new Set(ids).size,enrollments:ens.length,progress:avg,certificates:cert};}).sort((a,b)=>a.progress-b.progress);
      const noLessons=adminCourses.filter(c=>c.published&&!adminLessons.some(l=>l.course_id===c.id));
      const noAssessment=adminCourses.filter(c=>c.published&&!adminAssessments.some(a=>a.course_id===c.id&&a.published));
      const noManager=executiveCompaniesV17.filter(c=>!executiveCompanyMembersV17.some(m=>m.company_id===c.id&&m.member_role==='manager'));
      const offeringsNoDate=adminOfferings.filter(o=>o.published&&o.status==='open'&&!o.start_date);
      return {revenue,monthLeads:monthLeads.length,converted,conversion,completion,certs,overdueDebt,activeCompanies:executiveCompaniesV17.length,risks,companyHealth,noLessons,noAssessment,noManager,offeringsNoDate};
    }

    function renderGoalMiniV17(key,id,actual,formatter=x=>x,inverse=false){const g=goalV17(key),el=document.getElementById(id);if(!el)return;el.innerHTML=g?progressBarV17(actual,g.target_value,inverse):'<span class="opacity-70">Sin meta cargada</span>';}
    function renderExecutiveV17(){
      const m=executiveMetricsV17;if(!m)return;
      setTextV17('execRevenueV17',moneyV17(m.revenue));setTextV17('execLeadsV17',m.monthLeads);setTextV17('execConversionV17',pctV17(m.conversion));setTextV17('execCompletionV17',pctV17(m.completion));setTextV17('execCertificatesV17',m.certs);setTextV17('execDebtV17',moneyV17(m.overdueDebt));setTextV17('execCompaniesV17',m.activeCompanies);setTextV17('adminActiveCompaniesStat',m.activeCompanies);
      renderGoalMiniV17('revenue','execRevenueGoalV17',m.revenue);renderGoalMiniV17('new_leads','execLeadsGoalV17',m.monthLeads);renderGoalMiniV17('lead_conversion','execConversionGoalV17',m.conversion);renderGoalMiniV17('completion_rate','execCompletionGoalV17',m.completion);renderGoalMiniV17('certificates','execCertificatesGoalV17',m.certs);renderGoalMiniV17('overdue_debt','execDebtGoalV17',m.overdueDebt,x=>x,true);renderGoalMiniV17('active_companies','execCompaniesGoalV17',m.activeCompanies);
      const stages=[['Interesados',m.monthLeads,'bg-violet-500'],['Avanzados',m.converted,'bg-blue-500'],['Inscripciones',adminEnrollments.filter(e=>e.enrolled_at&&new Date(e.enrolled_at)>=monthBoundsV17().start).length,'bg-cyan-500'],['Certificados',m.certs,'bg-emerald-500']];const max=Math.max(1,...stages.map(x=>x[1]));const funnel=document.getElementById('execFunnelV17');if(funnel)funnel.innerHTML=stages.map(([n,v,c])=>`<div><div class="flex justify-between text-xs"><span class="font-bold text-slate-700">${n}</span><span>${v}</span></div><div class="mt-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full ${c} rounded-full" style="width:${Math.max(v?5:0,(v/max)*100)}%"></div></div></div>`).join('');setTextV17('execFunnelRateV17',pctV17(m.conversion));
      const risk=document.getElementById('execRiskStudentsV17');setTextV17('execRiskCountV17',m.risks.length);if(risk)risk.innerHTML=m.risks.length?m.risks.slice(0,20).map(r=>`<button onclick="openAdminStudentDetail('${r.id}')" class="w-full text-left rounded-xl ${r.severity==='alta'?'bg-red-50':'bg-amber-50'} p-3"><div class="flex justify-between gap-2"><span class="font-bold text-xs text-lutmin-dark">${escapeHtml(r.name||'Alumno')}</span><span class="text-[9px] uppercase font-black ${r.severity==='alta'?'text-red-600':'text-amber-600'}">${r.severity}</span></div><p class="mt-1 text-[10px] text-slate-600">${escapeHtml(r.reasons.join(' · '))}</p></button>`).join(''):'<div class="p-4 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Sin alertas de riesgo con las reglas actuales.</div>';
      const ch=document.getElementById('execCompaniesHealthV17');if(ch)ch.innerHTML=m.companyHealth.length?m.companyHealth.map(c=>{const attention=c.progress<Number(executiveRiskSettingsV17.company_attention_percent||60)&&c.enrollments>0;return `<div class="p-4 flex items-center justify-between gap-4"><div class="min-w-0"><p class="font-bold text-xs text-lutmin-dark truncate">${escapeHtml(c.name)}</p><p class="mt-1 text-[10px] text-slate-500">${c.members} colaboradores · ${c.enrollments} inscripciones · ${c.certificates} certificados</p><div class="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full ${attention?'bg-amber-500':'bg-emerald-500'} rounded-full" style="width:${Math.max(0,Math.min(100,c.progress))}%"></div></div></div><span class="shrink-0 font-black ${attention?'text-amber-600':'text-emerald-600'}">${Math.round(c.progress)}%</span></div>`}).join(''):'<div class="p-4 text-xs text-slate-500">Sin empresas activas.</div>';
      const issues=[...[...m.noLessons].map(c=>`Curso publicado sin clases: ${c.title}`),...[...m.noAssessment].map(c=>`Curso sin evaluación publicada: ${c.title}`),...[...m.noManager].map(c=>`Empresa sin responsable: ${c.display_name||c.name}`),...[...m.offeringsNoDate].map(o=>`Edición abierta sin fecha de inicio (${adminCourses.find(c=>c.id===o.course_id)?.title||'Curso'})`)];const dq=document.getElementById('execDataQualityV17');if(dq)dq.innerHTML=issues.length?issues.slice(0,20).map(x=>`<div class="flex gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs"><i class="fa-solid fa-triangle-exclamation mt-0.5"></i><span>${escapeHtml(x)}</span></div>`).join(''):'<div class="p-4 rounded-xl bg-green-50 text-green-700 text-xs font-bold">La configuración básica no presenta observaciones.</div>';
    }

    function openRiskSettingsV17(){document.getElementById('riskInactiveDaysV17').value=executiveRiskSettingsV17.inactive_days||7;document.getElementById('riskLowProgressV17').value=executiveRiskSettingsV17.low_progress_percent||30;document.getElementById('riskAfterDaysV17').value=executiveRiskSettingsV17.low_progress_after_days||14;document.getElementById('riskCompanyPercentV17').value=executiveRiskSettingsV17.company_attention_percent||60;document.getElementById('riskSettingsModalV17').classList.remove('hidden');}
    function closeRiskSettingsV17(){document.getElementById('riskSettingsModalV17').classList.add('hidden');}

    const goalFormV17=document.getElementById('execGoalFormV17');
    if(goalFormV17)goalFormV17.addEventListener('submit',async e=>{e.preventDefault();const metric=document.getElementById('execGoalMetricV17').value;const value=Number(document.getElementById('execGoalValueV17').value||0);const notes=document.getElementById('execGoalNotesV17').value.trim();const {error}=await supabaseClient.rpc('save_executive_kpi_goal',{p_period_month:monthBoundsV17().month,p_metric_key:metric,p_target_value:value,p_notes:notes});if(error){showToast('No pude guardar la meta: '+error.message);return;}showToast('Meta guardada.');goalFormV17.reset();await loadExecutiveV17();});
    const riskFormV17=document.getElementById('riskSettingsFormV17');
    if(riskFormV17)riskFormV17.addEventListener('submit',async e=>{e.preventDefault();const payload={inactive_days:Number(document.getElementById('riskInactiveDaysV17').value||7),low_progress_percent:Number(document.getElementById('riskLowProgressV17').value||30),low_progress_after_days:Number(document.getElementById('riskAfterDaysV17').value||14),company_attention_percent:Number(document.getElementById('riskCompanyPercentV17').value||60),updated_by:currentLutminUser.id,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('executive_risk_settings').update(payload).eq('id',true);if(error){showToast(error.message);return;}closeRiskSettingsV17();showToast('Reglas de riesgo actualizadas.');await loadExecutiveV17();});

    async function saveExecutiveSnapshotV17(){if(!executiveMetricsV17)return;const b=monthBoundsV17();const metrics={revenue:executiveMetricsV17.revenue,new_leads:executiveMetricsV17.monthLeads,conversion:executiveMetricsV17.conversion,completion:executiveMetricsV17.completion,certificates:executiveMetricsV17.certs,overdue_debt:executiveMetricsV17.overdueDebt,active_companies:executiveMetricsV17.activeCompanies,risk_students:executiveMetricsV17.risks.length};const {error}=await supabaseClient.from('executive_metric_snapshots').insert({label:`Gestión ${new Date().toLocaleDateString('es-AR')}`,period_start:b.month,period_end:new Date(b.end.getTime()-86400000).toISOString().slice(0,10),metrics,created_by:currentLutminUser.id});if(error){showToast(error.message);return;}showToast('Foto ejecutiva guardada.');await loadExecutiveV17();}

    function downloadExecutiveV17Csv(){if(!executiveMetricsV17)return;const m=executiveMetricsV17;const rows=[['Indicador','Valor'],['Cobrado mes',m.revenue],['Leads mes',m.monthLeads],['Conversión %',m.conversion.toFixed(1)],['Finalización %',m.completion.toFixed(1)],['Certificados mes',m.certs],['Deuda vencida',m.overdueDebt],['Empresas activas',m.activeCompanies],['Alumnos en riesgo',m.risks.length],[],['Alumno en riesgo','Motivos'],...m.risks.map(r=>[r.name,r.reasons.join(' | ')])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lutmin_Ejecutivo_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);}
    async function downloadExecutiveV17Pdf(){if(!executiveMetricsV17||!(await ensureJsPdfLib())){showToast('No pude generar el PDF.');return;}const {jsPDF}=window.jspdf,doc=new jsPDF(),m=executiveMetricsV17;let y=18;doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('Lutmin · Informe ejecutivo',14,y);y+=9;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100);doc.text(`Generado ${new Date().toLocaleString('es-AR')}`,14,y);y+=10;doc.setTextColor(20);const metrics=[['Cobrado del mes',moneyV17(m.revenue)],['Interesados del mes',String(m.monthLeads)],['Conversión',pctV17(m.conversion)],['Finalización',pctV17(m.completion)],['Certificados del mes',String(m.certs)],['Deuda vencida',moneyV17(m.overdueDebt)],['Empresas activas',String(m.activeCompanies)],['Alumnos que requieren atención',String(m.risks.length)]];metrics.forEach(([k,v])=>{doc.setFont('helvetica','bold');doc.text(k,14,y);doc.setFont('helvetica','normal');doc.text(v,80,y);y+=7;});y+=4;doc.setFont('helvetica','bold');doc.text('Principales alertas',14,y);y+=7;doc.setFont('helvetica','normal');m.risks.slice(0,12).forEach(r=>{const lines=doc.splitTextToSize(`${r.name}: ${r.reasons.join(' · ')}`,180);if(y+lines.length*5>280){doc.addPage();y=20;}doc.text(lines,14,y);y+=lines.length*5+2;});doc.save(`Lutmin_Informe_Ejecutivo_${new Date().toISOString().slice(0,10)}.pdf`);}

  

    // =========================================================
    // V1.8 · SALUD DEL SISTEMA + OPERACIONES MASIVAS
    // =========================================================
    let healthFindingsV18=[];
    let schemaMigrationsV18=[];
    let bulkOperationsV18=[];

    function healthSeverityMetaV18(v){return ({critica:['Crítica','bg-red-100 text-red-700'],alta:['Alta','bg-amber-100 text-amber-700'],normal:['Normal','bg-blue-50 text-blue-700'],baja:['Baja','bg-slate-100 text-slate-600']})[v]||['Normal','bg-slate-100 text-slate-600'];}
    function selectedValuesV18(id){const el=document.getElementById(id);return el?[...el.selectedOptions].map(o=>o.value).filter(Boolean):[];}
    function hasStudentAccessV18(p){return p?.role==='student'||adminAccessRoles.some(r=>r.user_id===p.id&&r.access_role==='student');}

    async function loadAdminV18(){
      if(!supabaseClient||currentLutminUser?.role!=='admin')return;
      const [f,m,b]=await Promise.all([
        supabaseClient.from('system_health_findings').select('*').order('last_detected_at',{ascending:false}),
        supabaseClient.from('lutmin_schema_migrations').select('*').order('applied_at',{ascending:false}),
        supabaseClient.from('bulk_operations').select('*').order('created_at',{ascending:false}).limit(20)
      ]);
      const err=f.error||m.error||b.error;
      if(err){console.warn('V1.8 no disponible:',err.message);const root=document.getElementById('healthFindingsV18');if(root)root.innerHTML='<div class="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm">Este módulo necesita una revisión de configuración. Abrí Diagnóstico para ver el detalle.</div>';return;}
      healthFindingsV18=f.data||[];schemaMigrationsV18=m.data||[];bulkOperationsV18=b.data||[];
      renderHealthV18();renderBulkControlsV18();renderBulkHistoryV18();
    }

    function renderHealthV18(){
      const filter=document.getElementById('healthFilterV18')?.value||'open';
      const open=healthFindingsV18.filter(x=>x.status==='open'&&!x.ignored_at);
      const important=open.filter(x=>['alta','critica'].includes(x.severity));
      const resolved=healthFindingsV18.filter(x=>x.status==='resolved').length;
      if(document.getElementById('healthOpenV18'))document.getElementById('healthOpenV18').textContent=String(open.length);
      if(document.getElementById('healthImportantV18'))document.getElementById('healthImportantV18').textContent=String(important.length);
      if(document.getElementById('healthResolvedV18'))document.getElementById('healthResolvedV18').textContent=String(resolved);
      const latest=schemaMigrationsV18.find(x=>x.version==='1.8')||schemaMigrationsV18[0];
      if(document.getElementById('healthVersionV18'))document.getElementById('healthVersionV18').textContent=latest?.version?'V'+latest.version:'V1.8';
      let rows=healthFindingsV18;
      if(filter!=='all')rows=rows.filter(x=>x.status===filter||(filter==='ignored'&&x.ignored_at));
      const root=document.getElementById('healthFindingsV18');if(!root)return;
      if(!rows.length){root.innerHTML='<div class="p-5 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold"><i class="fa-solid fa-circle-check mr-2"></i>No hay hallazgos para este filtro.</div>';return;}
      root.innerHTML=rows.map(x=>{const [sev,cls]=healthSeverityMetaV18(x.severity);return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div class="flex flex-wrap gap-2"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${cls}">${sev}</span><span class="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">${escV16(x.category||'general')}</span></div><p class="mt-2 font-extrabold text-lutmin-dark">${escV16(x.title)}</p><p class="mt-1 text-xs text-slate-500">${escV16(x.details||'')}</p><p class="mt-2 text-[10px] text-slate-400">Detectado: ${fmtDateV16(x.last_detected_at)}</p></div><div class="flex gap-2 shrink-0">${x.status!=='resolved'?`<button onclick="setHealthStatusV18('${x.id}','resolved')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-[10px] font-bold">Resolver</button>`:''}${!x.ignored_at?`<button onclick="setHealthStatusV18('${x.id}','ignored')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-bold">Ignorar</button>`:`<button onclick="setHealthStatusV18('${x.id}','open')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-bold">Reabrir</button>`}</div></div></div>`;}).join('');
    }

    async function runSystemHealthV18(){const {data,error}=await supabaseClient.rpc('admin_run_system_health_v18');if(error){showToast('No pude revisar el sistema: '+error.message);return;}showToast(`Revisión completa · ${data?.open_findings??0} hallazgos abiertos.`);await loadAdminV18();}
    async function setHealthStatusV18(id,status){const {error}=await supabaseClient.rpc('admin_set_health_finding_status_v18',{p_id:id,p_status:status});if(error){showToast(error.message);return;}showToast('Hallazgo actualizado.');await loadAdminV18();}

    function renderBulkControlsV18(){
      const course=document.getElementById('bulkCourseV18'),company=document.getElementById('bulkCompanyV18');
      const students=adminProfiles.filter(p=>p.active!==false&&hasStudentAccessV18(p));
      const opts=students.map(p=>`<option value="${p.id}">${escV16(p.full_name||p.email)} · ${escV16(p.email||'')}</option>`).join('');
      ['bulkCourseUsersV18','bulkCompanyUsersV18'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts||'<option disabled>Sin alumnos disponibles</option>';});
      if(course)course.innerHTML=adminCourses.filter(c=>c.published!==false).map(c=>`<option value="${c.id}">${escV16(c.title)}</option>`).join('')||'<option value="">Sin cursos</option>';
      if(company)company.innerHTML=adminCompanies.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${escV16(c.display_name||c.name)}</option>`).join('')||'<option value="">Sin empresas</option>';
    }

    async function bulkAssignCourseV18(){
      const courseId=document.getElementById('bulkCourseV18')?.value,users=selectedValuesV18('bulkCourseUsersV18');
      if(!courseId||!users.length){showToast('Elegí un curso y al menos una persona.');return;}
      if(!confirm(`¿Asignar el curso a ${users.length} persona(s)?`))return;
      const {data,error}=await supabaseClient.rpc('admin_bulk_assign_course_v18',{p_course_id:courseId,p_user_ids:users});
      if(error){showToast(error.message);return;}showToast(`Listo: ${data?.affected??0} asignadas · ${data?.skipped??0} omitidas.`);await loadAdminData();
    }

    async function bulkLinkCompanyV18(){
      const companyId=document.getElementById('bulkCompanyV18')?.value,users=selectedValuesV18('bulkCompanyUsersV18');
      if(!companyId||!users.length){showToast('Elegí una empresa y al menos una persona.');return;}
      if(!confirm(`¿Vincular ${users.length} persona(s) a esta empresa?`))return;
      const {data,error}=await supabaseClient.rpc('admin_bulk_link_company_v18',{p_company_id:companyId,p_user_ids:users});
      if(error){showToast(error.message);return;}showToast(`Vinculación completa: ${data?.affected??0} procesadas.`);await loadAdminData();
    }

    function renderBulkHistoryV18(){const root=document.getElementById('bulkHistoryV18');if(!root)return;if(!bulkOperationsV18.length){root.innerHTML='<p class="text-xs text-slate-500">Todavía no hay operaciones masivas.</p>';return;}root.innerHTML=bulkOperationsV18.slice(0,8).map(x=>`<div class="p-3 rounded-xl bg-slate-50"><p class="text-xs font-extrabold text-lutmin-dark">${escV16(x.description||x.operation_type)}</p><p class="mt-1 text-[10px] text-slate-500">${fmtDateV16(x.created_at)} · solicitadas ${x.requested_count} · afectadas ${x.affected_count} · omitidas ${x.skipped_count}</p></div>`).join('');}



    // =========================================================
    // V1.9 · ADMINISTRACIÓN MODULAR + BUSCADOR + DIAGNÓSTICO
    // =========================================================
    const ADMIN_MODULES_V19 = {
      overview:{title:'Resumen',description:'Indicadores, inteligencia y prioridades del sistema.'},
      agents:{title:'Autopilot',description:'Agentes internos, excepciones determinísticas y acciones trazables.'},
      operations:{title:'Operación',description:'Centro Operativo, tareas, señales automáticas y salud del sistema.'},
      academic:{title:'Academia',description:'Cursos, clases, evaluaciones, comisiones, agenda y certificados.'},
      people:{title:'Personas',description:'Alumnos, importación masiva y seguimiento académico.'},
      companies:{title:'Empresas',description:'Clientes corporativos, responsables, colaboradores y planes de capacitación.'},
      development:{title:'Desarrollo',description:'Perfiles de puesto, brechas, necesidades y planes de desarrollo.'},
      commercial:{title:'Comercial',description:'Ediciones, interesados, conversiones y oportunidades de venta.'},
      finance:{title:'Finanzas',description:'Matrículas, pagos, deuda, vencimientos e indicadores financieros.'},
      talent:{title:'Talento',description:'Lutmin Conecta, búsquedas laborales y postulaciones.'},
      communications:{title:'Comunicación',description:'Comunicados y avisos para alumnos, empresas y administradores.'},
      system:{title:'Sistema',description:'Configuración, roles, auditoría, diagnóstico y salud técnica.'}
    };
    let activeAdminModuleV19='overview';
    let adminWorkspaceTaggedV19=false;
    let adminPrefSaveTimerV36=null;
    let adminPrefLastQueuedV36=null;

    function scheduleAdminWorkspacePrefSaveV36(module){
      if(!currentLutminUser?.id||!supabaseClient)return;
      adminPrefLastQueuedV36=module;
      clearTimeout(adminPrefSaveTimerV36);
      adminPrefSaveTimerV36=setTimeout(()=>{
        const next=adminPrefLastQueuedV36;adminPrefSaveTimerV36=null;
        if(!next||!currentLutminUser?.id)return;
        supabaseClient.from('admin_workspace_preferences').upsert({user_id:currentLutminUser.id,last_module:next,updated_at:new Date().toISOString()},{onConflict:'user_id'}).then(()=>{}).catch(()=>{});
      },700);
    }

    function tagAdminBlocksV19(){
      if(adminWorkspaceTaggedV19) return;
      const admin=document.querySelector('section[data-campus-panel="admin"]');
      if(!admin) return;
      [...admin.children].forEach(el=>{
        if(el.id==='adminWorkspaceV19'||el.id==='adminSystemGuideV19') return;
        if(el.classList.contains('fixed')){el.dataset.adminAlwaysV19='1';return;}
        const text=(el.textContent||'').replace(/\s+/g,' ').trim();
        let module='overview';
        if(el.querySelector('#adminStudentsStat')) module='overview';
        else if(text.includes('Inteligencia de gestión')) module='overview';
        else if(text.includes('Centro de control')) module='overview';
        else if(text.includes('Centro Operativo')) module='operations';
        else if(text.includes('Salud del sistema')) module='operations';
        else if(text.includes('Equipo interno y roles')) module='system';
        else if(text.includes('Auditoría del sistema')) module='system';
        else if(text.includes('Publicar comunicado')||text.includes('Comunicados recientes')) module='communications';
        else if(text.includes('Lutmin Conecta · Empleo y talento')) module='talent';
        else if(text.includes('Panel financiero y comercial')) module='finance';
        else if(text.includes('Matrículas y pagos')) module='finance';
        else if(text.includes('Abrir edición de un curso')||text.includes('Ediciones programadas')) module='commercial';
        else if(text.includes('Interesados desde la web')) module='commercial';
        else if(text.includes('Importar alumnos por CSV')) module='people';
        else if(text.includes('Seguimiento académico')) module='people';
        else if(text.includes('Empresas y capacitación corporativa')) module='companies';
        else if(text.includes('Comisiones, agenda y asistencia')) module='academic';
        else if(text.includes('Cursos y clases')) module='academic';
        else if(text.includes('Certificados emitidos')) module='academic';
        else if(text.includes('Crear alumno')&&text.includes('Crear curso')) module='academic';
        else if(el===admin.firstElementChild) {el.dataset.adminAlwaysV19='1';return;}
        el.dataset.adminModuleV19=module;
      });
      adminWorkspaceTaggedV19=true;
    }

    function setAdminModuleV19(module,opts={}){
      if(!ADMIN_MODULES_V19[module]) module='overview';
      tagAdminBlocksV19();
      activeAdminModuleV19=module;
      const admin=document.querySelector('section[data-campus-panel="admin"]');
      if(admin){
        [...admin.children].forEach(el=>{
          if(el.dataset.adminAlwaysV19==='1'||el.id==='adminWorkspaceV19') return;
          if(el.id==='adminSystemGuideV19'){
            el.classList.toggle('hidden',module!=='system');
            return;
          }
          const m=el.dataset.adminModuleV19;
          if(m) el.classList.toggle('hidden',m!==module);
        });
      }
      document.querySelectorAll('.admin-v19-nav').forEach(btn=>{
        const active=btn.dataset.adminV19Btn===module;
        // V36: el estado visual vive en atributos estables. Evita acumular
        // bg-white + bg-* / text-white + text-* y quedar ilegible con Tailwind.
        btn.setAttribute('aria-current',active?'page':'false');
        btn.setAttribute('aria-selected',active?'true':'false');
        btn.dataset.lutminActive=active?'true':'false';
        btn.tabIndex=active?0:-1;
      });
      window.dispatchEvent(new CustomEvent('lutmin:navigation-change',{detail:{scope:'admin',key:module}}));
      const mobileSelectV20=document.getElementById('adminModuleSelectV20'); if(mobileSelectV20) mobileSelectV20.value=module;
      const meta=ADMIN_MODULES_V19[module];
      const t=document.getElementById('adminModuleTitleV19'); if(t)t.textContent=meta.title;
      const d=document.getElementById('adminModuleDescriptionV19'); if(d)d.textContent=meta.description;
      localStorage.setItem('lutmin-admin-module-v19',module);
      if(!opts.noSave)scheduleAdminWorkspacePrefSaveV36(module);
      const scroller=document.querySelector('#campusModal .modal-scroll');
      if(scroller && !opts.noScroll) scroller.scrollTo({top:0,behavior:'smooth'});
      refreshAdminWorkspaceV19();
    }

    async function loadAdminWorkspacePrefsV19(){
      tagAdminBlocksV19();
      const local=localStorage.getItem('lutmin-admin-module-v19');
      // V36: la preferencia local abre el módulo inmediatamente y evita una
      // lectura Supabase en cada entrada. La remota queda como fallback cross-device.
      if(local&&ADMIN_MODULES_V19[local]){setAdminModuleV19(local,{noSave:true,noScroll:true});return;}
      let module='overview';
      if(supabaseClient&&currentLutminUser?.id){
        const {data,error}=await supabaseClient.from('admin_workspace_preferences').select('last_module').eq('user_id',currentLutminUser.id).maybeSingle();
        if(!error&&data?.last_module&&ADMIN_MODULES_V19[data.last_module])module=data.last_module;
      }
      setAdminModuleV19(module,{noSave:true,noScroll:true});
    }

    function refreshAdminWorkspaceV19(){
      const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value?`· ${value}`:'';};
      const activeTasks=(typeof adminOpsTasksV16!=='undefined'?adminOpsTasksV16:[]).filter(x=>['open','in_progress'].includes(x.status)).length;
      const students=(typeof adminProfiles!=='undefined'?adminProfiles:[]).filter(p=>typeof adminIsStudent==='function'?adminIsStudent(p):p.role==='student').length;
      const courses=(typeof adminCourses!=='undefined'?adminCourses:[]).length;
      const companies=(typeof adminCompanies!=='undefined'?adminCompanies:[]).filter(c=>c.active!==false).length;
      const leads=(typeof adminCourseLeads!=='undefined'?adminCourseLeads:[]).filter(l=>['new','nuevo'].includes(String(l.status||'').toLowerCase())).length;
      const pending=(typeof adminEnrollments!=='undefined'?adminEnrollments:[]).filter(e=>Number(e.price_amount||0)>0&&!['paid','bonified','waived'].includes(String(e.payment_status||'').toLowerCase())).length;
      set('adminBadgeOperationsV19',activeTasks); set('adminBadgeAcademicV19',courses); set('adminBadgePeopleV19',students); set('adminBadgeCompaniesV19',companies); set('adminBadgeCommercialV19',leads); set('adminBadgeFinanceV19',pending);
    }

    function toggleAdminQuickActionsV19(){document.getElementById('adminQuickActionsV19')?.classList.toggle('hidden');}
    function scrollAdminHeadingV19(text){
      setTimeout(()=>{
        const admin=document.querySelector('section[data-campus-panel="admin"]');
        const h=[...admin.querySelectorAll('h3,h4')].find(x=>(x.textContent||'').includes(text));
        h?.scrollIntoView({behavior:'smooth',block:'center'});
      },120);
    }
    function adminQuickActionV19(kind){
      document.getElementById('adminQuickActionsV19')?.classList.add('hidden');
      if(kind==='student'){setAdminModuleV19('academic');scrollAdminHeadingV19('Crear alumno');setTimeout(()=>document.getElementById('adminStudentName')?.focus(),350);}
      else if(kind==='company'){setAdminModuleV19('companies');scrollAdminHeadingV19('Empresas y capacitación corporativa');}
      else if(kind==='course'){setAdminModuleV19('academic');scrollAdminHeadingV19('Crear curso');setTimeout(()=>document.getElementById('adminCourseTitle')?.focus(),350);}
      else if(kind==='task'){setAdminModuleV19('operations');scrollAdminHeadingV19('Centro Operativo');setTimeout(()=>document.getElementById('opsNewTitleV16')?.focus(),350);}
      else if(kind==='announcement'){setAdminModuleV19('communications');setTimeout(()=>document.getElementById('adminAnnouncementTitle')?.focus(),350);}
      else if(kind==='support'){goToCampusTab('support');}
    }

    function buildAdminSearchIndexV19(){
      const rows=[];
      Object.entries(ADMIN_MODULES_V19).forEach(([key,m])=>rows.push({kind:'module',id:key,label:m.title,sub:m.description,module:key,icon:'fa-layer-group'}));
      (typeof adminProfiles!=='undefined'?adminProfiles:[]).forEach(p=>rows.push({kind:'student',id:p.id,label:p.full_name||p.email||'Persona',sub:p.email||'',module:'people',icon:'fa-user'}));
      (typeof adminCompanies!=='undefined'?adminCompanies:[]).forEach(c=>rows.push({kind:'company',id:c.id,label:c.display_name||c.name||'Empresa',sub:[c.cuit,c.contact_email].filter(Boolean).join(' · '),module:'companies',icon:'fa-building'}));
      (typeof adminCourses!=='undefined'?adminCourses:[]).forEach(c=>rows.push({kind:'course',id:c.id,label:c.title||'Curso',sub:[c.category,c.level].filter(Boolean).join(' · '),module:'academic',icon:'fa-book'}));
      (typeof adminCourseLeads!=='undefined'?adminCourseLeads:[]).forEach(l=>rows.push({kind:'lead',id:l.id,label:l.full_name||l.email||'Interesado',sub:l.email||'',module:'commercial',icon:'fa-bullseye'}));
      (typeof adminJobs!=='undefined'?adminJobs:[]).forEach(j=>rows.push({kind:'job',id:j.id,label:j.title||'Búsqueda',sub:j.location||'',module:'talent',icon:'fa-briefcase'}));
      (typeof supportTickets!=='undefined'?supportTickets:[]).forEach(t=>rows.push({kind:'ticket',id:t.id,label:t.subject||'Consulta',sub:t.category||'',module:'support',icon:'fa-headset'}));
      return rows;
    }

    function adminGlobalSearchV19(){
      const input=document.getElementById('adminGlobalSearchV19'),root=document.getElementById('adminSearchResultsV19');if(!input||!root)return;
      const q=(input.value||'').trim().toLowerCase();
      if(!q){root.classList.add('hidden');root.innerHTML='';return;}
      const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const nq=normalize(q);
      const rows=buildAdminSearchIndexV19().filter(r=>normalize(r.label+' '+r.sub).includes(nq)).slice(0,14);
      root.classList.remove('hidden');
      root.innerHTML=rows.length?rows.map(r=>`<button onclick="openAdminSearchResultV19('${r.kind}','${r.id}')" class="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3"><span class="w-8 h-8 rounded-lg bg-blue-50 text-lutmin-light flex items-center justify-center shrink-0"><i class="fa-solid ${r.icon}"></i></span><span class="min-w-0"><span class="block text-xs font-extrabold text-lutmin-dark truncate">${escapeHtml(r.label)}</span><span class="block text-[10px] text-slate-500 truncate">${escapeHtml(r.sub||ADMIN_MODULES_V19[r.module]?.description||'')}</span></span></button>`).join(''):'<div class="p-4 text-xs text-slate-500">No encontré coincidencias.</div>';
    }

    function openAdminSearchResultV19(kind,id){
      document.getElementById('adminSearchResultsV19')?.classList.add('hidden');
      const input=document.getElementById('adminGlobalSearchV19');if(input)input.value='';
      if(kind==='module'){setAdminModuleV19(id);return;}
      if(kind==='student'){setAdminModuleV19('people');setTimeout(()=>openAdminStudentDetail(id),120);return;}
      if(kind==='company'){setAdminModuleV19('companies');setTimeout(()=>openCompanyEdit(id),120);return;}
      if(kind==='course'){setAdminModuleV19('academic');setTimeout(()=>openAdminCourseEditor(id),120);return;}
      if(kind==='ticket'){goToCampusTab('support');setTimeout(()=>openSupportThread(id),200);return;}
      setAdminModuleV19(kind==='lead'?'commercial':kind==='job'?'talent':'overview');
    }

    async function runAdminDiagnosticsV19(){
      setAdminModuleV19('system',{noScroll:true});
      const root=document.getElementById('adminDiagnosticsV19');if(!root)return;
      root.innerHTML='<div class="text-sm text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Revisando Supabase...</div>';
      const {data,error}=await supabaseClient.rpc('admin_v19_schema_check');
      if(error){root.innerHTML=`<div class="rounded-xl bg-red-50 text-red-700 p-3 text-xs"><strong>No pude ejecutar el diagnóstico.</strong><p class="mt-1">${escapeHtml(error.message)}</p><p class="mt-2">Revisá la configuración de base de datos del módulo.</p></div>`;return;}
      const labels={operational_tasks:'Tareas operativas',automation_rules:'Reglas de automatización',internal_roles:'Roles internos',user_internal_roles:'Asignación de roles',management_snapshots:'Fotos de gestión',health_findings:'Salud del sistema',workspace_preferences:'Preferencias de Administración',automation_description_column:'Columna description',automation_lane_column:'Columna lane',automation_threshold_column:'Columna threshold_hours',automation_target_scope_column:'Compatibilidad V1.5',refresh_signals_rpc:'Actualización automática de señales'};
      const entries=Object.entries(labels);
      const ok=entries.filter(([k])=>data?.[k]===true).length;
      root.innerHTML=`<div class="flex items-center justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark">Esquema ${escapeHtml(data?.version||'')}</p><p class="text-[10px] text-slate-500 mt-1">${ok} de ${entries.length} componentes correctos</p></div><span class="px-3 py-1.5 rounded-full ${ok===entries.length?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'} text-[10px] font-extrabold">${ok===entries.length?'TODO OK':'REVISAR'}</span></div><div class="mt-3 space-y-2">${entries.map(([k,label])=>`<div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 text-xs"><span>${escapeHtml(label)}</span><span class="font-black ${data?.[k]===true?'text-green-600':'text-red-600'}"><i class="fa-solid ${data?.[k]===true?'fa-circle-check':'fa-circle-xmark'}"></i></span></div>`).join('')}</div>`;
    }

    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();
        if(currentLutminUser?.role==='admin'){
          goToCampusTab('admin');
          setTimeout(()=>document.getElementById('adminGlobalSearchV19')?.focus(),120);
        }
      }
      if(e.key==='Escape') document.getElementById('adminSearchResultsV19')?.classList.add('hidden');
    });

    document.addEventListener('click',e=>{
      const box=document.getElementById('adminSearchResultsV19'),input=document.getElementById('adminGlobalSearchV19');
      if(box&&!box.contains(e.target)&&e.target!==input)box.classList.add('hidden');
    });

    // Etiqueta los bloques aunque Administración todavía esté oculta.
    setTimeout(()=>{tagAdminBlocksV19();const saved=localStorage.getItem('lutmin-admin-module-v19')||'overview';setAdminModuleV19(saved,{noSave:true,noScroll:true});},0);



// V36 · API mínima para el dispatcher estable y limpieza de sesión.
window.LutminV35AdminCore = {
  version:'39.0',
  loadLegacy: (...args) => loadAdminDataLegacyV35(...args),
  reset: () => {
    try { executiveGoalsV17=[]; executiveRiskSettingsV17={inactive_days:7,low_progress_percent:30,low_progress_after_days:14,company_attention_percent:60}; executiveSnapshotsV17=[]; executiveCompaniesV17=[]; executiveCompanyMembersV17=[]; executiveMetricsV17=null; } catch(_) {}
    try { healthFindingsV18=[]; schemaMigrationsV18=[]; bulkOperationsV18=[]; } catch(_) {}
    try { activeAdminModuleV19='overview'; adminWorkspaceTaggedV19=false; clearTimeout(adminPrefSaveTimerV36); adminPrefSaveTimerV36=null; adminPrefLastQueuedV36=null; } catch(_) {}
  }
};
