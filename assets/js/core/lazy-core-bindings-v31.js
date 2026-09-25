// LUTMIN V31.0 · enlaces del core para vistas HTML cargadas bajo demanda.
(function(){
  'use strict';
  function bind(view){
    const host=document.querySelector(`[data-lutmin-view-host="${view}"]`);
    if(!host||host.dataset.lutminV31CoreBound==='1')return true;
    try{
      if(view==='talent'){
        document.getElementById('talentProfileForm')?.addEventListener('submit',async e=>{e.preventDefault();if(currentLutminUser?.role!=='student')return;const cvUrl=document.getElementById('talentExternalCvUrl').value.trim();if(cvUrl&&!/^https:\/\//i.test(cvUrl))return showToast('El enlace del CV debe comenzar con https://');const approved=talentData?.profile?.approval_status==='approved';const wantVisible=document.getElementById('talentVisible').checked;const payload={user_id:currentLutminUser.id,headline:document.getElementById('talentHeadline').value.trim()||null,bio:document.getElementById('talentBio').value.trim()||null,city:document.getElementById('talentCity').value.trim()||null,province:document.getElementById('talentProvince').value.trim()||null,phone:document.getElementById('talentPhone').value.trim()||null,linkedin_url:document.getElementById('talentLinkedin').value.trim()||null,years_experience:Number(document.getElementById('talentYears').value||0),availability:document.getElementById('talentAvailability').value,willing_travel:document.getElementById('talentTravel').checked,requested_visible:wantVisible,visible:approved?wantVisible:false,share_contact_with_companies:document.getElementById('talentShareContact').checked,external_cv_url:cvUrl||null,external_cv_label:document.getElementById('talentExternalCvLabel').value.trim()||null,share_external_cv_with_companies:document.getElementById('talentShareExternalCv').checked,desired_role:document.getElementById('talentDesiredRole').value.trim()||null,desired_modality:document.getElementById('talentDesiredModality').value||'indistinto',desired_location:document.getElementById('talentDesiredLocation').value.trim()||null,open_to_relocation:document.getElementById('talentRelocation').checked,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('talent_profiles').upsert(payload,{onConflict:'user_id'});if(error)return showToast(error.message||'No pude guardar el perfil.');showToast(approved?'Perfil profesional actualizado.':'Perfil guardado. Lutmin actualizó su estado automáticamente.');await loadTalentCenter();});
        document.getElementById('talentSkillForm')?.addEventListener('submit',async e=>{e.preventDefault();const skill=document.getElementById('talentSkillName').value.trim();if(!skill)return;const known=(competencyDataV33||[]).find(c=>String(c.name||'').trim().toLowerCase()===skill.toLowerCase()||String(c.code||'').trim().toLowerCase()===skill.toLowerCase());const payload={user_id:currentLutminUser.id,skill:known?.name||skill,level:Number(document.getElementById('talentSkillLevel').value||3),competency_id:known?.competency_id||null};const {error}=await supabaseClient.from('talent_skills').upsert(payload,{onConflict:'user_id,skill'});if(error)return showToast(error.message||'No pude agregar la competencia.');e.target.reset();document.getElementById('talentSkillLevel').value='3';await loadTalentCenter();});
        document.getElementById('talentExperienceForm')?.addEventListener('submit',async e=>{e.preventDefault();const current=document.getElementById('talentExpCurrent').checked;const payload={user_id:currentLutminUser.id,company_name:document.getElementById('talentExpCompany').value.trim(),position_title:document.getElementById('talentExpPosition').value.trim(),start_date:document.getElementById('talentExpStart').value||null,end_date:current?null:(document.getElementById('talentExpEnd').value||null),current_job:current,description:document.getElementById('talentExpDescription').value.trim()||null};const {error}=await supabaseClient.from('talent_experiences').insert(payload);if(error)return showToast(error.message||'No pude agregar la experiencia.');e.target.reset();await loadTalentCenter();});
      }
      if(view==='company-conecta'){
        document.getElementById('companyJobRequestForm')?.addEventListener('submit',async e=>{e.preventDefault();const companyId=companyPortalData?.company?.id;if(!companyId)return showToast('No hay empresa vinculada.');const payload={company_id:companyId,title:document.getElementById('companyJobTitle').value.trim(),description:document.getElementById('companyJobDescription').value.trim(),requirements:document.getElementById('companyJobRequirements').value.trim()||null,location:document.getElementById('companyJobLocation').value.trim()||null,modality:document.getElementById('companyJobModality').value,employment_type:document.getElementById('companyJobType').value,vacancy_count:Number(document.getElementById('companyJobVacancies')?.value||1),closes_at:document.getElementById('companyJobCloses')?.value||null,status:'draft',created_by:currentLutminUser.id};const {error}=await supabaseClient.from('job_posts').insert(payload);if(error)return showToast(error.message||'No pude enviar la búsqueda.');e.target.reset();showToast('Búsqueda enviada a revisión de Lutmin.');companyConectaCurrentView='jobs';await loadCompanyConectaData();});
      }
      if(view==='admin'){
        document.getElementById('adminTrainingPlanForm')?.addEventListener('submit',async event=>{
        event.preventDefault(); const {data,error}=await supabaseClient.rpc('admin_create_company_training_plan',{p_company_id:document.getElementById('adminPlanCompany').value,p_name:document.getElementById('adminPlanName').value.trim(),p_objective:document.getElementById('adminPlanObjective').value.trim()||null,p_start_date:document.getElementById('adminPlanStart').value||null,p_end_date:document.getElementById('adminPlanEnd').value||null,p_status:document.getElementById('adminPlanStatus').value});
        if(error)return showToast(error.message||'No pude crear el plan.'); event.target.reset(); document.getElementById('adminPlanStatus').value='active'; showToast('Plan de capacitación creado.'); await loadAdminTrainingPlans();
        });
        document.getElementById('adminTrainingPlanCourseForm')?.addEventListener('submit',async event=>{
        event.preventDefault(); const {error}=await supabaseClient.rpc('admin_add_course_to_training_plan',{p_plan_id:document.getElementById('adminPlanSelect').value,p_course_id:document.getElementById('adminPlanCourse').value,p_due_date:document.getElementById('adminPlanDueDate').value||null,p_required:document.getElementById('adminPlanRequired').checked});
        if(error)return showToast(error.message||'No pude agregar el curso.'); showToast('Curso agregado al plan.'); await loadAdminTrainingPlans();
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
        document.getElementById('adminJobForm')?.addEventListener('submit',async e=>{e.preventDefault();const publish=document.getElementById('adminJobPublish').checked;const payload={company_id:document.getElementById('adminJobCompany').value||null,title:document.getElementById('adminJobTitle').value.trim(),description:document.getElementById('adminJobDescription').value.trim(),requirements:document.getElementById('adminJobRequirements').value.trim()||null,location:document.getElementById('adminJobLocation').value.trim()||null,modality:document.getElementById('adminJobModality').value,employment_type:document.getElementById('adminJobType').value,closes_at:document.getElementById('adminJobCloses').value||null,status:publish?'published':'draft',published_at:publish?new Date().toISOString():null,created_by:currentLutminUser.id};const {error}=await supabaseClient.from('job_posts').insert(payload);if(error)return showToast(error.message||'No pude crear la búsqueda.');e.target.reset();document.getElementById('adminJobPublish').checked=true;showToast('Búsqueda creada.');await loadAdminConectaData();await loadPublicJobs();});
        document.getElementById('opsNewTaskFormV16')?.addEventListener('submit',async e=>{e.preventDefault();const due=document.getElementById('opsNewDueV16').value;const payload={title:document.getElementById('opsNewTitleV16').value.trim(),description:document.getElementById('opsNewDescriptionV16').value.trim(),lane:document.getElementById('opsNewLaneV16').value,severity:document.getElementById('opsNewSeverityV16').value,due_at:due?new Date(due).toISOString():null,created_by:currentLutminUser.id};const {error}=await supabaseClient.from('operational_tasks').insert(payload);if(error){showToast(error.message);return;}e.currentTarget.reset();showToast('Tarea creada.');await loadAdminOpsV16();});
        document.getElementById('execGoalFormV17')?.addEventListener('submit',async e=>{e.preventDefault();const metric=document.getElementById('execGoalMetricV17').value;const value=Number(document.getElementById('execGoalValueV17').value||0);const notes=document.getElementById('execGoalNotesV17').value.trim();const {error}=await supabaseClient.rpc('save_executive_kpi_goal',{p_period_month:monthBoundsV17().month,p_metric_key:metric,p_target_value:value,p_notes:notes});if(error){showToast('No pude guardar la meta: '+error.message);return;}showToast('Meta guardada.');e.currentTarget.reset();await loadExecutiveV17();});
        document.getElementById('riskSettingsFormV17')?.addEventListener('submit',async e=>{e.preventDefault();const payload={inactive_days:Number(document.getElementById('riskInactiveDaysV17').value||7),low_progress_percent:Number(document.getElementById('riskLowProgressV17').value||30),low_progress_after_days:Number(document.getElementById('riskAfterDaysV17').value||14),company_attention_percent:Number(document.getElementById('riskCompanyPercentV17').value||60),updated_by:currentLutminUser.id,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('executive_risk_settings').update(payload).eq('id',true);if(error){showToast(error.message);return;}closeRiskSettingsV17();showToast('Reglas de riesgo actualizadas.');await loadExecutiveV17();});
      }
      host.dataset.lutminV31CoreBound='1';return true;
    }catch(err){console.error('[Lutmin V31] No pude enlazar la vista',view,err);return false;}
  }
  window.LutminV31CoreBindings={bind};
})();
