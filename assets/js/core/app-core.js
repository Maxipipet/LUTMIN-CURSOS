
    // =========================================================
    // CONFIGURACIÓN SUPABASE
    // =========================================================
    // PASO SIMPLE: reemplazá estos dos textos con los datos de tu proyecto Supabase.
    // NUNCA pegues acá una clave service_role. Solo la clave pública/publishable (o anon).
    // =========================================================
    // V2.4 - CARGA DIFERIDA DE LIBRERÍAS PESADAS
    // Mantiene exactamente la estética V2.1 y evita descargar
    // QR/PDF hasta que realmente se usan.
    // =========================================================
    const lutminExternalScripts = new Map();
    function loadExternalScriptOnce(src, testFn) {
      if (typeof testFn === 'function' && testFn()) return Promise.resolve(true);
      if (lutminExternalScripts.has(src)) return lutminExternalScripts.get(src);
      const promise = new Promise(resolve => {
        const existing = [...document.scripts].find(s => s.src === src);
        if (existing) {
          if (typeof testFn !== 'function' || testFn()) return resolve(true);
          existing.addEventListener('load', () => resolve(typeof testFn !== 'function' || testFn()), { once:true });
          existing.addEventListener('error', () => resolve(false), { once:true });
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(typeof testFn !== 'function' || testFn());
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      lutminExternalScripts.set(src, promise);
      return promise;
    }
    const ensureQRCodeLib = () => loadExternalScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', () => Boolean(window.QRCode));
    const ensureJsPdfLib = () => loadExternalScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => Boolean(window.jspdf?.jsPDF));

    const LUTMIN_PUBLIC_CACHE_TTL = 2 * 60 * 1000;
    function getSessionCache(key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || Date.now() - Number(parsed.at || 0) > LUTMIN_PUBLIC_CACHE_TTL) { sessionStorage.removeItem(key); return null; }
        return parsed.data;
      } catch (_) { return null; }
    }
    function setSessionCache(key, data) {
      try { sessionStorage.setItem(key, JSON.stringify({ at:Date.now(), data })); } catch (_) {}
    }

    const SUPABASE_URL = 'https://kkpzycsjozrvbimpvfnl.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SVmP0GZYPBDCRJEopfaVew_AEdawzyJ';

    const supabaseConfigured =
      SUPABASE_URL.startsWith('https://') &&
      !SUPABASE_URL.includes('PEGAR_AQUI') &&
      SUPABASE_PUBLISHABLE_KEY.length > 20 &&
      !SUPABASE_PUBLISHABLE_KEY.includes('PEGAR_AQUI');

    const supabaseClient = supabaseConfigured
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
      : null;

    let currentLutminUser = null;

    // V35 · puente explícito para runtimes cargados bajo demanda.
    // Los scripts clásicos comparten bindings léxicos globales, pero esos bindings
    // no aparecen como propiedades de window. V24.1/V25 consultan window.*;
    // exponemos getters vivos sin duplicar estado ni crear otro cliente Supabase.
    function exposeLutminRuntimeGlobal(name, getter) {
      try {
        const current = Object.getOwnPropertyDescriptor(window, name);
        if (!current || current.configurable) {
          Object.defineProperty(window, name, { configurable:true, enumerable:false, get:getter });
        }
      } catch (_) {}
    }
    exposeLutminRuntimeGlobal('supabaseClient', () => supabaseClient);
    exposeLutminRuntimeGlobal('currentLutminUser', () => currentLutminUser);
    let currentAccessMode = sessionStorage.getItem('lutmin-access-mode') || null;
    let currentAccessContext = { student:false, admin:false, companies:[], instructor:false, instructor_groups:[] };
    // V3.8: evita que el evento USER_UPDATED vuelva a abrir el cambio de contraseña
    // mientras estamos terminando el primer acceso.
    let passwordUpdateInFlight = false;
    let suppressPasswordGateUntil = 0;
    let supportTickets = [];
    let supportMessages = [];
    let adminAccessRoles = [];
    let notificationCenterData = { notifications: [], announcements: [], unread_count: 0 };
    let talentData = { profile:null, skills:[], experiences:[], jobs:[], applications:[], certificates:[] };
    let publicJobsData = [];
    let companyTalentData = [];
    let companyJobPipelineData = { jobs:[], applications:[] };
    let adminTalentProfiles = [];
    let adminTalentSkills = [];
    let adminTalentProfileRequests = [];
    let adminJobs = [];
    let adminJobApplications = [];


    // =========================================================
    // V35 · ESTADO ADMIN COMPARTIDO + DISPATCHER ESTABLE
    // La implementación pesada vive en admin-workspace-v35.js y sólo se
    // descarga cuando el acceso activo es Administración. Mantener este
    // estado acá preserva compatibilidad con módulos históricos y logout.
    // =========================================================
    let adminProfiles = [];
    let adminCourses = [];
    let adminLessons = [];
    let adminEnrollments = [];
    let adminProgressRows = [];
    let adminAssessments = [];
    let adminAssessmentQuestions = [];
    let adminAssessmentAttempts = [];
    let adminCertificates = [];
    let adminStudentNotes = [];
    let adminOfferings = [];
    let adminCourseLeads = [];
    let adminPayments = [];
    let adminCompanies = [];
    let adminCompanyMembers = [];
    let activeAdminLeadId = null;
    let activeAdminPaymentEnrollmentId = null;
    let activeAdminStudentDetailId = null;
    let lastAdminFilteredStudents = [];
    let adminAuditRows = [];
    let adminAnnouncements = [];
    let adminControlCenter = {};
    let adminTrainingGroups = [];
    let adminTrainingMembers = [];
    let adminTrainingSessions = [];
    let adminAttendance = [];
    let adminTrainingPlans = [];
    let adminTrainingPlanCourses = [];
    let adminOpsTasksV16 = [];
    let adminAutomationRulesV16 = [];
    let adminInternalRolesV16 = [];
    let adminUserInternalRolesV16 = [];
    let adminManagementSnapshotsV16 = [];
    let activeOpsLaneV16 = 'all';
    let activeAttendanceSessionId = null;
    let studentAgendaData = { sessions: [] };

    // Punto único y estable para refrescar Administración. Los módulos opcionales
    // pueden envolver esta función sin que una carga tardía destruya sus wrappers.
    async function loadAdminData() {
      if (!supabaseClient || currentLutminUser?.role !== 'admin') return false;
      const activeModule = document.getElementById('adminModuleHostV32')?.dataset?.adminModuleV32
        || localStorage.getItem('lutmin-admin-module-v19') || 'overview';
      if (window.LutminV33AdminData?.loadForModule) {
        const ok = await window.LutminV33AdminData.loadForModule(activeModule,{force:true});
        try { await window.LutminV30Admin?.loadForModule?.(activeModule,{force:true}); } catch (_) {}
        return ok;
      }
      if (!window.LutminV35AdminCore?.loadLegacy) {
        const ready = await window.LutminV30Modules?.ensureAdminModule?.(activeModule);
        if (ready === false) return false;
      }
      if (window.LutminV33AdminData?.loadForModule) {
        const ok = await window.LutminV33AdminData.loadForModule(activeModule,{force:true});
        try { await window.LutminV30Admin?.loadForModule?.(activeModule,{force:true}); } catch (_) {}
        return ok;
      }
      return window.LutminV35AdminCore?.loadLegacy?.() ?? false;
    }

    // =========================================================
    // MENÚ MÓVIL
    // =========================================================
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });

    // =========================================================
    // FILTRO DE CURSOS
    // =========================================================
    document.querySelectorAll('.course-filter').forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;

        document.querySelectorAll('.course-filter').forEach(btn => {
          btn.classList.remove('bg-lutmin-dark', 'text-white');
          btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        });

        button.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        button.classList.add('bg-lutmin-dark', 'text-white');

        document.querySelectorAll('.course-card').forEach(card => {
          card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter);
        });
      });
    });

    // =========================================================
    // ACCORDEÓN FAQ
    // =========================================================
    function toggleFaq(btn) {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('i');
      const isHidden = content.classList.contains('hidden');

      document.querySelectorAll('#faq .px-6.pb-6').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('#faq i').forEach(el => el.classList.remove('rotate-180'));

      if (isHidden) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
      }
    }

    // =========================================================
    // MODALES
    // =========================================================
    function openModal(id) {
      document.getElementById(id).classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
      if (!document.querySelector('.fixed:not(.hidden)[id$="Modal"]')) {
        document.body.classList.remove('overflow-hidden');
      }
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        ['courseModal','interestModal','campusModal','lessonModal','assessmentModal','publicTalentModal','companyCandidateModal','profileModal','accessSwitcherModal','adminAccountPasswordModal','supportThreadModal','certificateModal','authModal','passwordModal','adminCourseEditModal','adminLessonEditModal','adminStudentDetailModal','leadConvertModal','paymentModal','adminCompanyEditModal','attendanceModal'].forEach(id => {
          const el = document.getElementById(id);
          if (id === 'passwordModal' && (passwordModalMode === 'first' || passwordModalMode === 'recovery')) return;
          if (!el.classList.contains('hidden')) closeModal(id);
        });
      }
    });

    // =========================================================
    // CATÁLOGO PÚBLICO + INTERESADOS - ETAPA 10
    // =========================================================
    let currentCourse = '';
    let publicCatalog = [];
    let currentPublicCourseId = null;
    let currentPublicOfferingId = null;

    function publicCourseImage(category) {
      if (category === 'gestion') return 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=80';
      if (category === 'iso') return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80';
      return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80';
    }

    function categoryLabel(category) {
      return category === 'gestion' ? 'Gestión' : category === 'iso' ? 'ISO' : 'Técnico';
    }

    function formatPublicDate(value) {
      if (!value) return 'A confirmar';
      const [y,m,d] = String(value).slice(0,10).split('-');
      return `${d}/${m}/${y}`;
    }

    function formatPublicMoney(value, currency = 'ARS') {
      const amount = Number(value || 0);
      if (!amount) return 'Consultar';
      try { return new Intl.NumberFormat('es-AR', { style:'currency', currency, maximumFractionDigits:0 }).format(amount); }
      catch (_) { return `${currency} ${Math.round(amount).toLocaleString('es-AR')}`; }
    }

    async function loadPublicSiteStatsV21({ force = false } = {}) {
      if (!supabaseClient) return;
      try {
        let data = force ? null : getSessionCache('lutmin:v24:public-stats');
        if (!data) {
          const response = await supabaseClient.rpc('get_public_site_stats');
          if (response.error || !response.data) return;
          data = response.data;
          setSessionCache('lutmin:v24:public-stats', data);
        }
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value ?? 0); };
        set('publicStatCourses', data.published_courses);
        set('publicStatCertificates', data.valid_certificates);
        set('publicStatCompanies', data.active_companies);
        set('publicStatOfferings', data.open_offerings);
      } catch (_) {}
    }

    let publicCatalogLoadPromise = null;
    async function loadPublicCatalog({ force = false } = {}) {
      if (!supabaseClient) return;
      if (publicCatalogLoadPromise && !force) return publicCatalogLoadPromise;
      publicCatalogLoadPromise = (async () => {
        let data = force ? null : getSessionCache('lutmin:v24:catalog');
        if (!data) {
          const response = await supabaseClient.rpc('get_public_course_catalog');
          if (response.error) {
            console.error('Catálogo público:', response.error);
            return;
          }
          data = response.data;
          setSessionCache('lutmin:v24:catalog', data);
        }
        publicCatalog = Array.isArray(data) ? data : [];
        renderPublicCatalog();
      })();
      try { await publicCatalogLoadPromise; } finally { publicCatalogLoadPromise = null; }
    }

    function renderPublicCatalog() {
      const grid = document.getElementById('courseGrid');
      if (!grid) return;
      if (!publicCatalog.length) {
        grid.innerHTML = '<div class="md:col-span-2 xl:col-span-3 rounded-3xl bg-white border border-slate-100 p-8 text-center text-slate-500">Próximamente publicaremos nuevas capacitaciones.</div>';
        return;
      }
      grid.innerHTML = publicCatalog.map(course => {
        const offers = Array.isArray(course.offerings) ? course.offerings : [];
        const next = offers[0] || null;
        const commercial = next
          ? `<div class="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-100"><p class="text-[10px] font-extrabold text-blue-600 uppercase">Próxima edición</p><p class="mt-1 text-xs font-bold text-lutmin-dark">${formatPublicDate(next.start_date)} · ${escapeHtml(String(next.modality || '').replace(/^./, x => x.toUpperCase()))}</p><p class="mt-1 text-xs text-slate-600">${formatPublicMoney(next.price, next.currency)}${next.available_seats === null ? '' : ` · ${next.available_seats} cupos disponibles`}</p></div>`
          : '<div class="mt-4 p-3 rounded-2xl bg-slate-50 text-xs text-slate-500"><strong>Próxima fecha:</strong> a confirmar. Podés dejarnos tus datos.</div>';
        return `<article data-category="${escapeHtml(course.category || 'tecnico')}" class="course-card bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-soft transition group">
          <div class="h-52 overflow-hidden relative"><img src="${publicCourseImage(course.category)}" alt="${escapeHtml(course.title)}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"><span class="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-full text-xs font-extrabold text-lutmin-dark">${categoryLabel(course.category)}</span>${course.featured?'<span class="absolute top-4 right-4 bg-lutmin-dark/95 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide"><i class="fa-solid fa-star text-amber-300 mr-1"></i>Destacado</span>':''}</div>
          <div class="p-6"><div class="flex items-center gap-4 text-xs text-slate-500 font-semibold"><span><i class="fa-regular fa-clock mr-1"></i>${Number(course.duration_hours || 0)} h</span><span><i class="fa-solid fa-signal mr-1"></i>${escapeHtml(course.level || 'Inicial')}</span></div><h3 class="mt-3 text-xl font-extrabold text-lutmin-dark">${escapeHtml(course.title)}</h3><p class="mt-2 text-sm text-slate-600 leading-relaxed">${escapeHtml(course.description || '')}</p>${commercial}<div class="mt-5 flex items-center justify-between gap-3"><button onclick="openPublicCourse('${course.id}')" class="text-lutmin-light font-extrabold text-sm">Ver curso →</button><span class="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">Certificado</span></div></div>
        </article>`;
      }).join('');

      const active = document.querySelector('.course-filter.bg-lutmin-dark')?.dataset?.filter || 'all';
      document.querySelectorAll('.course-card').forEach(card => card.classList.toggle('hidden', active !== 'all' && card.dataset.category !== active));
    }

    function openCourse(title, duration, level, description) {
      currentCourse = title;
      currentPublicCourseId = null;
      currentPublicOfferingId = null;
      document.getElementById('courseTitle').textContent = title;
      document.getElementById('courseDuration').textContent = duration;
      document.getElementById('courseLevel').textContent = level;
      document.getElementById('courseDescription').textContent = description;
      const offers = document.getElementById('publicCourseOfferings');
      if (offers) { offers.innerHTML = ''; offers.classList.add('hidden'); }
      openModal('courseModal');
    }

    function openPublicCourse(courseId) {
      const course = publicCatalog.find(c => c.id === courseId);
      if (!course) return;
      currentCourse = course.title;
      currentPublicCourseId = course.id;
      currentPublicOfferingId = null;
      document.getElementById('courseTitle').textContent = course.title;
      document.getElementById('courseDuration').textContent = `${Number(course.duration_hours || 0)} horas`;
      document.getElementById('courseLevel').textContent = course.level || 'Inicial';
      document.getElementById('courseDescription').textContent = course.description || '';
      const offersArea = document.getElementById('publicCourseOfferings');
      const offers = Array.isArray(course.offerings) ? course.offerings : [];
      offersArea.classList.remove('hidden');
      offersArea.innerHTML = offers.length
        ? `<h4 class="font-extrabold text-lutmin-dark">Próximas ediciones</h4><div class="mt-3 space-y-3">${offers.map(o => `<div class="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="font-bold text-lutmin-dark">${formatPublicDate(o.start_date)} · ${escapeHtml(String(o.modality || '').replace(/^./, x => x.toUpperCase()))}</p><p class="mt-1 text-xs text-slate-600">${o.location ? `${escapeHtml(o.location)} · ` : ''}${formatPublicMoney(o.price, o.currency)}${o.available_seats === null ? '' : ` · ${o.available_seats} cupos`}</p></div><button onclick="openInterestModal('${course.id}','${o.id}')" class="px-4 py-2.5 rounded-xl bg-lutmin-light text-white text-xs font-extrabold">Me interesa esta edición</button></div>`).join('')}</div>`
        : '<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600"><strong>Próxima fecha a confirmar.</strong> Podés dejar tus datos y te contactamos cuando abramos una edición.</div>';
      openModal('courseModal');
    }

    function courseToContact() {
      closeModal('courseModal');
      document.getElementById('asunto').value = 'Formación / Cursos';
      document.getElementById('mensaje').value = `Hola, me interesa recibir información sobre el curso "${currentCourse}".`;
      document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    }

    function openInterestFromCurrentCourse() {
      if (currentPublicCourseId) openInterestModal(currentPublicCourseId, currentPublicOfferingId);
      else courseToContact();
    }

    function openInterestModal(courseId, offeringId = null) {
      const course = publicCatalog.find(c => c.id === courseId);
      if (!course) return;
      currentPublicCourseId = courseId;
      currentPublicOfferingId = offeringId || null;
      document.getElementById('interestCourseLabel').textContent = course.title;
      const offers = Array.isArray(course.offerings) ? course.offerings : [];
      const wrap = document.getElementById('interestOfferingWrap');
      const select = document.getElementById('interestOffering');
      if (offers.length) {
        wrap.classList.remove('hidden');
        select.innerHTML = '<option value="">Cualquier edición / deseo información</option>' + offers.map(o => `<option value="${o.id}">${formatPublicDate(o.start_date)} · ${escapeHtml(String(o.modality || '').replace(/^./, x => x.toUpperCase()))} · ${formatPublicMoney(o.price, o.currency)}</option>`).join('');
        if (offeringId && [...select.options].some(o => o.value === offeringId)) select.value = offeringId;
      } else {
        wrap.classList.add('hidden');
        select.innerHTML = '<option value="">Sin edición seleccionada</option>';
      }
      document.getElementById('interestStatus').classList.add('hidden');
      closeModal('courseModal');
      openModal('interestModal');
    }

    document.getElementById('interestForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!supabaseClient || !currentPublicCourseId) return;
      const btn = document.getElementById('interestSubmitBtn');
      const status = document.getElementById('interestStatus');
      btn.disabled = true; btn.textContent = 'Enviando...'; status.classList.add('hidden');
      const offeringValue = document.getElementById('interestOffering').value || null;
      const { data, error } = await supabaseClient.rpc('register_course_interest', {
        p_course_id: currentPublicCourseId,
        p_offering_id: offeringValue,
        p_full_name: document.getElementById('interestName').value.trim(),
        p_email: document.getElementById('interestEmail').value.trim().toLowerCase(),
        p_phone: document.getElementById('interestPhone').value.trim(),
        p_city: document.getElementById('interestCity').value.trim(),
        p_message: document.getElementById('interestMessage').value.trim(),
        p_source: 'web-catalogo',
        p_consent: document.getElementById('interestConsent').checked
      });
      btn.disabled = false; btn.textContent = 'Enviar consulta';
      if (error) { console.error(error); showToast(error.message || 'No pude registrar tu consulta.'); return; }
      status.innerHTML = '<strong>¡Listo!</strong> Recibimos tus datos. El equipo de Lutmin podrá ver tu consulta desde Administración.';
      status.classList.remove('hidden');
      showToast('Consulta registrada correctamente.');
      event.target.reset();
    });

    // =========================================================
    // LOGIN MULTIACCESO REAL - V1.3
    // =========================================================
    let authLoginContext = 'student';

    async function loadAccessContext() {
      if (!supabaseClient) return {student:false,admin:false,companies:[],instructor:false,instructor_groups:[]};
      const [baseRes,instructorRes] = await Promise.all([
        supabaseClient.rpc('get_my_access_context'),
        supabaseClient.rpc('my_instructor_access_v50')
      ]);
      if (baseRes.error) console.error('Access context',baseRes.error);
      if (instructorRes.error && !String(instructorRes.error.message||'').toLowerCase().includes('function')) console.error('Instructor context',instructorRes.error);
      const data=baseRes.data||{}; const instructor=instructorRes.data||{};
      return { student:Boolean(data?.student), admin:Boolean(data?.admin), companies:Array.isArray(data?.companies)?data.companies:[], instructor:Boolean(instructor?.instructor), instructor_groups:Array.isArray(instructor?.groups)?instructor.groups:[] };
    }

    function accessCount(ctx=currentAccessContext) {
      return (ctx.student?1:0)+(ctx.admin?1:0)+(ctx.companies?.length?1:0)+(ctx.instructor?1:0);
    }

    function openAuthModal(context = 'student') {
      // V29: mientras la persona completa el login, precargamos sólo el núcleo liviano.
      window.LutminV29Modules?.warm?.('auth-modal');
      authLoginContext = context === 'company' ? 'company' : 'student';
      document.getElementById('authStatus').textContent = '';
      document.getElementById('authForm').reset();
      const company = authLoginContext === 'company';
      document.getElementById('authEyebrow').textContent = company ? 'Acceso Empresa' : 'Acceso Alumno';
      document.getElementById('authTitle').textContent = company ? 'Ingresar como empresa' : 'Ingresar como alumno';
      document.getElementById('authDescription').textContent = company
        ? 'Usá el correo y la contraseña del responsable de empresa.'
        : 'Usá tu cuenta para cursos, progreso, certificados y Lutmin Conecta.';
      openModal('authModal');
    }

    async function openStudentAccess() {
      if (!supabaseClient) return openAuthModal('student');
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session) return openAuthModal('student');
      const ok=await loadCurrentLutminUser(session.user,'student');
      if(!ok) return;
      openModal('campusModal');
    }
    async function openCampus(){ return openStudentAccess(); }

    async function openCompanyPortalAccess() {
      if (!supabaseClient) return openAuthModal('company');
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return openAuthModal('company');
      const ok=await loadCurrentLutminUser(session.user,'company');
      if(!ok) return;
      openModal('campusModal');
      goToCampusTab('company');
    }

    document.getElementById('authForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (!supabaseClient) { document.getElementById('authStatus').textContent='Primero tenemos que conectar Supabase.'; return; }
      const email=document.getElementById('authEmail').value.trim(); const password=document.getElementById('authPassword').value; const btn=document.getElementById('authSubmitBtn');
      btn.disabled=true; btn.textContent='Ingresando...'; document.getElementById('authStatus').textContent='';
      try {
        const {data,error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error) throw error;
        const ok=await loadCurrentLutminUser(data.user,authLoginContext);
        if(!ok) return;
        closeModal('authModal'); openModal('campusModal');
        if(currentLutminUser.role==='company_admin') goToCampusTab('company');
        if(currentLutminUser.role==='admin') goToCampusTab('admin');
        if(currentLutminUser.role==='instructor') goToCampusTab('instructor');
        showToast(currentLutminUser.role==='company_admin'?'Acceso Empresa abierto.':currentLutminUser.role==='admin'?'Administración abierta.':currentLutminUser.role==='instructor'?'Portal Docente abierto.':'Acceso Alumno abierto.');
      } catch(error) {
        console.error(error); const message=String(error?.message||'').toLowerCase();
        document.getElementById('authStatus').textContent=message.includes('confirm')?'La cuenta existe, pero falta confirmar el correo.':'No pudimos ingresar. Revisá el correo y la contraseña.';
      } finally { btn.disabled=false; btn.textContent='Ingresar'; }
    });

    async function loadCurrentLutminUser(user, requestedMode = null) {
      if (!user || !supabaseClient) return false;
      let fullName=user.user_metadata?.full_name||user.email||'Usuario Lutmin';
      const {data:profile,error}=await supabaseClient.from('profiles').select('full_name,email,role,active,must_change_password').eq('id',user.id).maybeSingle();
      if(!error&&profile?.full_name) fullName=profile.full_name;
      if(!error&&profile?.active===false){await supabaseClient.auth.signOut();currentLutminUser=null;showToast('Tu cuenta está desactivada. Contactá a Lutmin.');closeModal('campusModal');return false;}
      currentAccessContext=await loadAccessContext();
      let mode=requestedMode||currentAccessMode;
      if(mode==='company'&&!currentAccessContext.companies.length){showToast('Este correo no tiene acceso Empresa habilitado.');return false;}
      if(mode==='instructor'&&!currentAccessContext.instructor){showToast('Este correo no tiene acceso Docente habilitado.');return false;}
      if(mode==='student'&&!currentAccessContext.student&&!currentAccessContext.admin){if(currentAccessContext.instructor)mode='instructor';else{showToast('Este correo no tiene acceso Alumno habilitado.');return false;}}
      if(!mode){ mode=currentAccessContext.admin?'admin':currentAccessContext.student?'student':currentAccessContext.companies.length?'company':currentAccessContext.instructor?'instructor':null; }
      if(mode==='student'&&currentAccessContext.admin&&!currentAccessContext.student) mode='admin';
      if(mode==='admin'&&!currentAccessContext.admin) mode=currentAccessContext.student?'student':currentAccessContext.companies.length?'company':currentAccessContext.instructor?'instructor':null;
      if(!mode){showToast('La cuenta existe pero no tiene accesos activos.');return false;}
      currentAccessMode=mode; sessionStorage.setItem('lutmin-access-mode',mode);
      const effectiveRole=mode==='company'?'company_admin':mode==='admin'?'admin':mode==='instructor'?'instructor':'student';
      // V31: primero monta el HTML del workspace. Después carga su runtime.
      const viewReadyV31=await window.LutminV31Views?.ensureForRole?.(effectiveRole);
      if(viewReadyV31===false){showToast('No pude preparar la interfaz de este acceso. Actualizá la página y volvé a intentar.');return false;}
      // V29/V30: carga únicamente el runtime que corresponde a los accesos disponibles.
      if(window.LutminV29Modules?.ensureAuthenticated){
        const modulesReady=await window.LutminV29Modules.ensureAuthenticated({role:effectiveRole,capabilities:currentAccessContext});
        if(modulesReady===false){showToast('No pude cargar los módulos necesarios de Lutmin. Actualizá la página y volvé a intentar.');return false;}
      }
      currentLutminUser={id:user.id,email:profile?.email||user.email,fullName,role:effectiveRole,baseRole:profile?.role||'student',active:profile?.active!==false,mustChangePassword:Boolean(profile?.must_change_password)};
      paintCurrentLutminUser();
      try{await supabaseClient.rpc('touch_lutmin_last_seen')}catch(_){}
      const v29InitialLoad=(key,loader,ttl=12000)=>window.LutminV29Data?.load?window.LutminV29Data.load(key,loader,{ttl,force:true}):loader();
      if(effectiveRole==='company_admin'){goToCampusTab('company');setTimeout(()=>{if(typeof window.openWorkspaceSectionV190==='function')window.openWorkspaceSectionV190('company','summary');else v29InitialLoad('company',()=>loadCompanyPortalData(),12000);},0);}
      else if(effectiveRole==='admin'){goToCampusTab('admin');setTimeout(()=>v29InitialLoad('admin',()=>loadAdminData(),12000),0);}
      else if(effectiveRole==='instructor'){goToCampusTab('instructor');setTimeout(()=>v29InitialLoad('instructor',()=>loadInstructorPortalV50(),15000),0);}
      else {goToCampusTab('dashboard');setTimeout(()=>v29InitialLoad('dashboard',()=>loadCampusData(),12000),0);if(new URL(location.href).searchParams.get('checkin'))setTimeout(async()=>{await window.LutminV30Modules?.ensureFeature?.('activities');await window.processPendingCheckinV50?.();},180);}
      setTimeout(()=>v29InitialLoad('notifications',()=>loadNotificationCenter(),12000),180);
      if(effectiveRole==='student'){const hydrateStudent=async()=>{if(currentLutminUser?.role!=='student')return;const ready=await window.LutminV30Modules?.ensureFeature?.('student-enhancements');if(ready===false||currentLutminUser?.role!=='student')return;await Promise.allSettled([window.loadStudentPathsV25?.(),window.loadPendingSurveysV25?.(),window.loadStudentComplianceV40?.()]);};if('requestIdleCallback' in window)requestIdleCallback(()=>hydrateStudent(),{timeout:2600});else setTimeout(()=>hydrateStudent(),1600);}
      if(currentLutminUser.mustChangePassword && effectiveRole!=='admin' && Date.now() > suppressPasswordGateUntil) {
        setTimeout(()=>{
          if(currentLutminUser?.mustChangePassword && Date.now() > suppressPasswordGateUntil && !passwordUpdateInFlight) openPasswordModal('first');
        },50);
      }
      return true;
    }

    function paintCurrentLutminUser() {
      if(!currentLutminUser)return;
      const name=currentLutminUser.fullName||'Usuario Lutmin'; const firstName=name.split(' ')[0]||'Usuario'; const initials=name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')||'LU';
      document.getElementById('campusGreetingName').textContent=firstName; document.getElementById('campusSidebarName').textContent=name; document.getElementById('campusProfileName').textContent=name; document.getElementById('campusProfileInitials').textContent=initials;
      const isAdmin=currentLutminUser.role==='admin', isCompanyAdmin=currentLutminUser.role==='company_admin', isInstructor=currentLutminUser.role==='instructor';
      document.getElementById('adminDesktopTab')?.classList.toggle('hidden',!isAdmin); document.getElementById('adminMobileTab')?.classList.toggle('hidden',!isAdmin);
      document.getElementById('companyDesktopTab')?.classList.toggle('hidden',!isCompanyAdmin); document.getElementById('companyMobileTab')?.classList.toggle('hidden',!isCompanyAdmin); document.getElementById('companyConectaDesktopTab')?.classList.toggle('hidden',!isCompanyAdmin); document.getElementById('companyConectaMobileTab')?.classList.toggle('hidden',!isCompanyAdmin);
      document.getElementById('instructorDesktopTab')?.classList.toggle('hidden',!isInstructor); document.getElementById('instructorMobileTab')?.classList.toggle('hidden',!isInstructor);
      document.querySelectorAll('[data-student-only="true"]').forEach(el=>el.classList.toggle('hidden',isCompanyAdmin||isAdmin||isInstructor));
      document.querySelectorAll('[data-talent-tab="true"]').forEach(el=>el.classList.toggle('hidden',currentLutminUser.role!=='student'));
      window.LutminV34Nav?.apply?.(currentLutminUser.role);
      const roleLabel=document.getElementById('campusSidebarRole'); if(roleLabel)roleLabel.textContent=isAdmin?'Administrador':isCompanyAdmin?'Empresa':isInstructor?'Docente':'Alumno';
      const profileSubtitle=document.getElementById('campusProfileSubtitle'), profileStatus=document.getElementById('campusProfileStatus'), profileCertCount=document.getElementById('campusProfileCertCount');
      if(profileSubtitle)profileSubtitle.textContent=isAdmin?'Cuenta administradora de Lutmin':isCompanyAdmin?'Responsable de empresa':isInstructor?'Perfil docente':'Perfil profesional de alumno';
      if(profileStatus)profileStatus.textContent=isCompanyAdmin?'Acceso corporativo':isAdmin?'Administración':isInstructor?'Acceso docente':'Disponible';
      if(profileCertCount)profileCertCount.classList.toggle('hidden',isCompanyAdmin||isAdmin||isInstructor);
      document.getElementById('switchAccessBtn')?.classList.toggle('hidden',accessCount()<=1);
      if(!isCompanyAdmin) resetCompanyBranding();
    }

    function openAccessSwitcher(){
      const root=document.getElementById('accessSwitcherOptions'); if(!root)return;
      const opts=[];
      if(currentAccessContext.student)opts.push(`<button onclick="switchAccessMode('student')" class="w-full p-4 rounded-2xl bg-blue-50 text-blue-900 text-left font-extrabold"><i class="fa-solid fa-graduation-cap w-7"></i>Acceso Alumno<span class="block ml-7 mt-1 text-xs font-normal text-blue-700">Cursos, certificados y Conecta</span></button>`);
      if(currentAccessContext.companies?.length)opts.push(`<button onclick="switchAccessMode('company')" class="w-full p-4 rounded-2xl bg-cyan-50 text-cyan-900 text-left font-extrabold"><i class="fa-solid fa-building w-7"></i>Acceso Empresa<span class="block ml-7 mt-1 text-xs font-normal text-cyan-700">${escapeHtml(currentAccessContext.companies.map(c=>c.name).join(' · '))}</span></button>`);
      if(currentAccessContext.instructor)opts.push(`<button onclick="switchAccessMode('instructor')" class="w-full p-4 rounded-2xl bg-emerald-50 text-emerald-900 text-left font-extrabold"><i class="fa-solid fa-chalkboard-user w-7"></i>Acceso Docente<span class="block ml-7 mt-1 text-xs font-normal text-emerald-700">${escapeHtml((currentAccessContext.instructor_groups||[]).map(g=>g.name).slice(0,3).join(' · ')||'Comisiones asignadas')}</span></button>`);
      if(currentAccessContext.admin)opts.push(`<button onclick="switchAccessMode('admin')" class="w-full p-4 rounded-2xl bg-slate-100 text-slate-900 text-left font-extrabold"><i class="fa-solid fa-shield-halved w-7"></i>Administración Lutmin</button>`);
      root.innerHTML=opts.join(''); openModal('accessSwitcherModal');
    }
    async function switchAccessMode(mode){
      const {data:{session}}=await supabaseClient.auth.getSession(); if(!session)return;
      closeModal('accessSwitcherModal'); const ok=await loadCurrentLutminUser(session.user,mode); if(!ok)return; openModal('campusModal');
      goToCampusTab(mode==='company'?'company':mode==='admin'?'admin':mode==='instructor'?'instructor':'dashboard');
    }

    async function logoutLutmin() {
      if (supabaseClient) await supabaseClient.auth.signOut();
      currentLutminUser = null;
      window.LutminV29Data?.invalidate?.();
      currentAccessMode = null; currentAccessContext = {student:false,admin:false,companies:[],instructor:false,instructor_groups:[]}; sessionStorage.removeItem('lutmin-access-mode');
      notificationCenterData = { notifications: [], announcements: [], unread_count: 0 };
      adminProfiles = []; adminCourses = []; adminLessons = []; adminEnrollments = []; adminProgressRows = []; adminAssessments = []; adminAssessmentQuestions = []; adminAssessmentAttempts = []; adminCertificates = []; adminOfferings = []; adminCourseLeads = []; adminCompanies = []; adminCompanyMembers = []; companyPortalData = null;
      adminAuditRows = []; adminAnnouncements = []; adminControlCenter = {};
      adminTrainingGroups = []; adminTrainingMembers = []; adminTrainingSessions = []; adminAttendance = []; adminTrainingPlans=[]; adminTrainingPlanCourses=[]; studentAgendaData = { sessions: [] }; adminAccessRoles=[]; supportTickets=[]; supportMessages=[];
      talentData = { profile:null, skills:[], experiences:[], jobs:[], applications:[], certificates:[] }; companyTalentData=[]; companyJobPipelineData={jobs:[],applications:[]}; adminTalentProfiles=[]; adminTalentSkills=[]; adminJobs=[]; adminJobApplications=[];
      try{window.LutminV35AdminCore?.reset?.();}catch(_){}
      goToCampusTab('dashboard');
      closeModal('campusModal');
      showToast('Sesión cerrada.');
    }

    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        // updateUser({password}) dispara USER_UPDATED. Antes eso volvía a leer
        // must_change_password=true unos milisegundos antes de que la RPC lo apagara,
        // generando el loop infinito del modal.
        if (session?.user && !(passwordUpdateInFlight && event === 'USER_UPDATED')) {
          loadCurrentLutminUser(session.user, currentAccessMode);
        }
        if (!session) currentLutminUser = null;
        if (event === 'PASSWORD_RECOVERY') {
          setTimeout(() => openPasswordModal('recovery'), 100);
        }
      });
    }

    // =========================================================
    // CAMPUS DEMO
    // =========================================================
    // openCampus() ya está definido arriba como alias de Acceso Alumno.

    document.querySelectorAll('.campus-tab').forEach(button => {
      button.addEventListener('click', async () => {
        const tab = button.dataset.campusTab;
        if (tab === 'admin' && currentLutminUser?.role !== 'admin') return;
        if ((tab === 'company' || tab === 'company-conecta') && currentLutminUser?.role !== 'company_admin') return;
        if (tab === 'instructor' && currentLutminUser?.role !== 'instructor') return;
        if (tab === 'activities' && currentLutminUser?.role !== 'student') return;
        if (currentLutminUser?.role === 'company_admin' && !['company','company-conecta','profile','notifications','support'].includes(tab)) return;
        if (currentLutminUser?.role === 'instructor' && !['instructor','profile','notifications','support'].includes(tab)) return;
        const viewReady=await window.LutminV31Views?.ensureForTab?.(tab);
        if(viewReady===false){showToast('No pude preparar esta vista. Actualizá la página y volvé a intentar.');return;}
        const featureReady=await window.LutminV29Modules?.ensureFeatureForTab?.(tab,currentLutminUser?.role);
        if(featureReady===false){showToast('No pude preparar este módulo. Actualizá la página y volvé a intentar.');return;}
        goToCampusTab(tab);
        const v29NavLoad=(key,loader,ttl)=>window.LutminV29Data?.load?window.LutminV29Data.load(key,loader,{ttl}):loader();
        if (tab === 'admin') await v29NavLoad('admin',()=>loadAdminData(),12000);
        if (tab === 'company') await v29NavLoad('company',()=>loadCompanyPortalData(),12000);
        if (tab === 'company-conecta') await v29NavLoad('company-conecta',()=>loadCompanyConectaData(),15000);
        if (tab === 'instructor') await v29NavLoad('instructor',()=>loadInstructorPortalV50(),15000);
        if (tab === 'agenda') await v29NavLoad('agenda',()=>loadStudentAgenda(),20000);
        if (tab === 'activities') await v29NavLoad('activities',()=>loadStudentActivitiesV50(),15000);
        if (tab === 'talent') await v29NavLoad('talent',()=>loadTalentCenter(),18000);
        if (tab === 'notifications') await v29NavLoad('notifications',()=>loadNotificationCenter(),12000);
        if (tab === 'support') await v29NavLoad('support',()=>loadSupportCenter(),25000);
      });
    });

    // =========================================================
    // SEGURIDAD DE CUENTA - ETAPA 7
    // =========================================================
    let passwordModalMode = 'change';

    function appBaseUrl() {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      return url.toString();
    }

    function openPasswordModal(mode = 'change') {
      passwordModalMode = mode;
      document.getElementById('passwordForm').reset();
      document.getElementById('passwordStatus').textContent = '';
      const first = mode === 'first';
      const recovery = mode === 'recovery';
      document.getElementById('passwordModalTitle').textContent = first ? 'Creá tu contraseña personal' : recovery ? 'Recuperar contraseña' : 'Cambiar contraseña';
      document.getElementById('passwordModalDescription').textContent = first
        ? 'La contraseña que te dio Lutmin era provisoria. Antes de continuar, elegí una que solamente conozcas vos.'
        : recovery ? 'Elegí una contraseña nueva para recuperar tu cuenta.' : 'Elegí una contraseña nueva para tu Campus.';
      document.getElementById('passwordModalClose').classList.toggle('hidden', first || recovery);
      openModal('passwordModal');
    }

    function closePasswordModal() {
      if (passwordModalMode === 'first' || passwordModalMode === 'recovery') return;
      closeModal('passwordModal');
    }

    document.getElementById('passwordForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const p1 = document.getElementById('newPassword').value;
      const p2 = document.getElementById('newPasswordRepeat').value;
      const status = document.getElementById('passwordStatus');
      if (p1.length < 8) { status.textContent = 'Usá al menos 8 caracteres.'; return; }
      if (p1 !== p2) { status.textContent = 'Las contraseñas no coinciden.'; return; }
      const btn = document.getElementById('passwordSubmitBtn');
      btn.disabled = true; btn.textContent = 'Guardando...';
      passwordUpdateInFlight = true;
      suppressPasswordGateUntil = Date.now() + 8000;
      try {
        const { error: passwordError } = await supabaseClient.auth.updateUser({ password: p1 });
        if (passwordError) throw passwordError;

        // No ocultamos errores: la marca de primer acceso debe quedar realmente apagada
        // antes de permitir continuar.
        const { error: finishError } = await supabaseClient.rpc('finish_first_password_change');
        if (finishError) throw new Error('La contraseña se cambió, pero no pude finalizar el primer acceso. Volvé a tocar Guardar contraseña.');

        const { data: verifiedProfile, error: verifyError } = await supabaseClient
          .from('profiles')
          .select('must_change_password')
          .eq('id', currentLutminUser?.id)
          .maybeSingle();
        if (verifyError || verifiedProfile?.must_change_password === true) {
          throw new Error('La contraseña se cambió, pero la cuenta todavía figura como provisoria. Volvé a tocar Guardar contraseña.');
        }

        if (currentLutminUser) currentLutminUser.mustChangePassword = false;
        passwordModalMode = 'change';
        closeModal('passwordModal');
        status.textContent = '';
        showToast('Contraseña personal guardada. Ya podés usar Lutmin normalmente.');
        const url = new URL(window.location.href);
        if (url.searchParams.has('reset')) { url.searchParams.delete('reset'); history.replaceState({}, '', url.toString()); }
      } catch (error) {
        console.error(error);
        status.textContent = error?.message || 'No se pudo cambiar la contraseña.';
      } finally {
        btn.disabled = false; btn.textContent = 'Guardar contraseña';
        setTimeout(() => { passwordUpdateInFlight = false; }, 1200);
      }
    });

    async function requestPasswordReset() {
      if (!supabaseClient) return;
      const input = document.getElementById('authEmail');
      const status = document.getElementById('authStatus');
      const email = input.value.trim();
      if (!email) { status.textContent = 'Escribí primero tu correo y volvé a tocar “Olvidaste tu contraseña”.'; input.focus(); return; }
      status.textContent = 'Enviando correo de recuperación...';
      const redirect = new URL(appBaseUrl());
      redirect.searchParams.set('reset', '1');
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: redirect.toString() });
      status.textContent = error ? 'No pude enviar el correo. Revisá la dirección e intentá otra vez.' : 'Te enviamos un correo para crear una contraseña nueva.';
      if (error) console.error(error);
    }

    // =========================================================
    // CAMPUS REAL: CURSOS, CLASES Y PROGRESO
    // =========================================================
    let campusCourseSummaries = [];
    let activeCampusCourseId = null;
    let campusAssessments = [];
    let campusAssessmentAttempts = [];
    let campusCertificates = [];
    let currentCertificate = null;
    let openAssessmentId = null;
    let openAssessmentQuestions = [];

    function formatMinutes(minutes) {
      const total = Math.max(0, Number(minutes || 0));
      const hours = Math.floor(total / 60);
      const mins = total % 60;
      if (hours && mins) return `${hours} h ${mins} min`;
      if (hours) return `${hours} h`;
      return `${mins} min`;
    }

    function setCampusToday() {
      const el = document.getElementById('campusToday');
      if (!el) return;
      const text = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
      }).format(new Date());
      el.textContent = text.charAt(0).toUpperCase() + text.slice(1);
    }

    async function loadCampusData() {
      if (!currentLutminUser || !supabaseClient) return;
      setCampusToday();

      const { data: enrollments, error: enrollError } = await supabaseClient
        .from('enrollments')
        .select('id,status,enrolled_at,price_amount,payment_currency,payment_status,payment_due_date,access_granted_at,course:courses(id,slug,title,description,duration_hours,level,category)')
        .eq('user_id', currentLutminUser.id)
        .order('enrolled_at', { ascending: true });

      if (enrollError) {
        console.error('Error cargando inscripciones:', enrollError);
        showToast('No pudimos cargar tus cursos. Revisá la conexión o consultá a Administración.');
        return;
      }

      const validEnrollments = (enrollments || []).filter(item => item.course);
      const courseIds = validEnrollments.map(item => item.course.id);

      let lessons = [];
      if (courseIds.length) {
        const { data, error } = await supabaseClient
          .from('lessons')
          .select('id,course_id,title,description,content,duration_minutes,sort_order,video_url,video_path,material_url,material_path,published,required,video_completion_required,video_min_watch_percent')
          .in('course_id', courseIds)
          .order('sort_order', { ascending: true });
        if (error) console.error('Error cargando clases:', error);
        lessons = data || [];
      }

      const { data: progressRows, error: progressError } = await supabaseClient
        .from('lesson_progress')
        .select('lesson_id,completed,completed_at')
        .eq('user_id', currentLutminUser.id)
        .eq('completed', true);

      if (progressError) console.error('Error cargando progreso:', progressError);
      const completedSet = new Set((progressRows || []).map(row => row.lesson_id));

      campusAssessments = [];
      campusAssessmentAttempts = [];
      if (courseIds.length) {
        const { data: assessmentRows, error: assessmentError } = await supabaseClient
          .from('assessments')
          .select('id,course_id,title,description,passing_score,published,max_attempts,random_question_count,time_limit_minutes,show_answer_review')
          .in('course_id', courseIds)
          .eq('published', true);
        if (assessmentError) console.error('Error cargando evaluaciones:', assessmentError);
        campusAssessments = assessmentRows || [];

        if (campusAssessments.length) {
          const { data: attemptRows, error: attemptError } = await supabaseClient
            .from('assessment_attempts')
            .select('id,assessment_id,score,passed,correct_count,total_questions,submitted_at')
            .eq('user_id', currentLutminUser.id)
            .in('assessment_id', campusAssessments.map(a => a.id))
            .order('submitted_at', { ascending: false });
          if (attemptError) console.error('Error cargando intentos:', attemptError);
          campusAssessmentAttempts = attemptRows || [];
        }
      }

      const { data: certificateRows, error: certificateError } = await supabaseClient
        .from('certificates')
        .select('id,user_id,course_id,code,full_name,course_title,duration_hours,score,status,issued_at,revoked_at,revoked_reason,certificate_kind,issuer_display_name,issuer_legal_name,issuer_tax_id,private_legend,verification_note,course_version,modality,training_location,instructor_name,responsible_name,responsible_role,expires_at')
        .eq('user_id', currentLutminUser.id)
        .order('issued_at', { ascending: false });
      if (certificateError) console.error('Error cargando certificados:', certificateError);
      campusCertificates = certificateRows || [];

      campusCourseSummaries = validEnrollments.map(enrollment => {
        const courseLessons = lessons
          .filter(lesson => lesson.course_id === enrollment.course.id && lesson.published !== false)
          .sort((a, b) => a.sort_order - b.sort_order);
        const requiredLessons = courseLessons.filter(lesson => lesson.required !== false);
        const completedLessons = requiredLessons.filter(lesson => completedSet.has(lesson.id));
        const total = requiredLessons.length;
        const completed = completedLessons.length;
        const percent = total ? Math.round((completed / total) * 100) : 100;
        const nextLesson = courseLessons.find(lesson => !completedSet.has(lesson.id) && lesson.required !== false) || courseLessons.find(lesson => !completedSet.has(lesson.id)) || null;
        const remainingMinutes = requiredLessons
          .filter(lesson => !completedSet.has(lesson.id))
          .reduce((sum, lesson) => sum + Number(lesson.duration_minutes || 0), 0);

        const assessment = campusAssessments.find(a => a.course_id === enrollment.course.id) || null;
        const attempts = assessment ? campusAssessmentAttempts.filter(a => a.assessment_id === assessment.id) : [];
        const bestAttempt = attempts.length ? attempts.reduce((best, item) => Number(item.score) > Number(best.score) ? item : best, attempts[0]) : null;
        const passedAttempt = attempts.find(item => item.passed) || null;

        return {
          enrollmentId: enrollment.id,
          enrollmentStatus: enrollment.status,
          priceAmount: Number(enrollment.price_amount || 0),
          paymentCurrency: enrollment.payment_currency || 'ARS',
          paymentStatus: enrollment.payment_status || 'not_required',
          paymentDueDate: enrollment.payment_due_date || null,
          course: enrollment.course,
          lessons: courseLessons,
          completedSet,
          completed,
          total,
          percent,
          nextLesson,
          remainingMinutes,
          assessment,
          attempts,
          bestAttempt,
          passedAttempt
        };
      });

      if (!activeCampusCourseId || !campusCourseSummaries.some(x => x.course.id === activeCampusCourseId)) {
        const unfinished = campusCourseSummaries.find(x => x.percent < 100 && x.enrollmentStatus === 'active');
        activeCampusCourseId = (unfinished || campusCourseSummaries[0])?.course.id || null;
      }

      renderCampus();
    }

    function renderCampus() {
      const hasCourses = campusCourseSummaries.length > 0;
      document.getElementById('campusEmptyState')?.classList.toggle('hidden', hasCourses);
      document.getElementById('campusDashboardContent')?.classList.toggle('hidden', !hasCourses);
      document.getElementById('upcomingLessonsSection')?.classList.toggle('hidden', !hasCourses);

      const totalHours = campusCourseSummaries.reduce((sum, item) => sum + Number(item.course.duration_hours || 0), 0);
      const activeCount = campusCourseSummaries.filter(item => item.enrollmentStatus === 'active' && item.percent < 100).length;
      document.getElementById('campusHoursStat').textContent = `${totalHours} h`;
      document.getElementById('campusActiveStat').textContent = String(activeCount);
      const validCerts = campusCertificates.filter(c => c.status === 'valid');
      document.getElementById('campusCertificatesStat').textContent = String(validCerts.length);
      document.getElementById('campusProfileCertCount').textContent = `${validCerts.length} certificado${validCerts.length === 1 ? '' : 's'}`;

      renderCoursesGrid();
      renderCertificatesGrid();
      if (!hasCourses) return;

      const active = campusCourseSummaries.find(item => item.course.id === activeCampusCourseId) || campusCourseSummaries[0];
      document.getElementById('activeCourseTitle').textContent = active.course.title;
      const accessPending = active.enrollmentStatus === 'pending_payment';
      document.getElementById('upcomingLessonsSection')?.classList.toggle('hidden', accessPending);
      document.getElementById('progressLabel').textContent = accessPending ? 'Pago' : `${active.percent}%`;
      document.getElementById('progressBar').style.width = accessPending ? '0%' : `${active.percent}%`;
      document.getElementById('currentLessonCount').textContent = `${active.completed} de ${active.total}`;
      document.getElementById('remainingTime').textContent = formatMinutes(active.remainingMinutes);
      document.getElementById('activeCourseStatus').textContent = accessPending
        ? 'Pago pendiente'
        : active.passedAttempt
        ? 'Aprobado'
        : active.percent >= 100 && active.assessment
          ? 'Evaluación pendiente'
          : active.percent >= 100
            ? 'Clases completas'
            : 'En curso';

      const button = document.getElementById('completeClassBtn');
      if (accessPending) {
        document.getElementById('activeCourseLesson').textContent = `Tu matrícula está registrada. El acceso se habilita cuando Administración confirma el pago de ${formatPublicMoney(active.priceAmount, active.paymentCurrency)}.`;
        button.disabled = true;
        button.textContent = active.paymentStatus === 'partial' ? 'Pago parcial registrado' : 'Pago pendiente';
      } else if (active.nextLesson) {
        document.getElementById('activeCourseLesson').textContent = `Próxima: Clase ${active.nextLesson.sort_order} · ${active.nextLesson.title}`;
        button.disabled = false;
        button.textContent = `Abrir clase ${active.nextLesson.sort_order}`;
      } else if (active.assessment) {
        if (active.passedAttempt) {
          document.getElementById('activeCourseLesson').textContent = `Evaluación aprobada con ${Math.round(Number(active.passedAttempt.score))}%`;
          button.disabled = false;
          button.textContent = 'Ver evaluación aprobada';
        } else {
          document.getElementById('activeCourseLesson').textContent = 'Completaste las clases. Ya podés rendir la evaluación final.';
          button.disabled = false;
          button.textContent = active.attempts.length ? 'Reintentar evaluación' : 'Realizar evaluación final';
        }
      } else {
        document.getElementById('activeCourseLesson').textContent = '¡Completaste todas las clases de este curso!';
        button.disabled = true;
        button.textContent = 'Curso completado';
      }

      const upcoming = active.lessons.filter(lesson => !active.completedSet.has(lesson.id)).slice(0, 3);
      const grid = document.getElementById('nextLessonsGrid');
      grid.innerHTML = upcoming.length ? upcoming.map((lesson, index) => {
        const unlocked = active.nextLesson?.id === lesson.id;
        return `
        <button ${unlocked ? `onclick="openLessonById('${lesson.id}')"` : 'disabled'} class="text-left bg-white border rounded-2xl p-4 sm:p-5 flex justify-between sm:block items-center transition ${unlocked ? 'border-slate-100 hover:border-lutmin-light hover:shadow-sm' : 'border-slate-100 opacity-60 cursor-not-allowed'}">
          <div>
            <p class="text-[10px] sm:text-xs ${unlocked ? 'text-lutmin-light' : 'text-slate-400'} font-bold">CLASE ${lesson.sort_order}</p>
            <h4 class="font-bold text-sm sm:text-base mt-1 sm:mt-2">${escapeHtml(lesson.title)}</h4>
          </div>
          <p class="text-[10px] sm:text-xs text-slate-500 sm:mt-2">${unlocked ? formatMinutes(lesson.duration_minutes) : '<i class="fa-solid fa-lock mr-1"></i>Bloqueada'}</p>
        </button>`;
      }).join('') : `
        <div class="bg-white border border-slate-100 rounded-2xl p-5 sm:col-span-3">
          <p class="font-bold text-lutmin-dark">No quedan clases pendientes.</p>
          ${active.assessment ? `<button onclick="openAssessmentForCourse('${active.course.id}')" class="mt-3 text-sm font-bold text-violet-600">${active.passedAttempt ? 'Ver evaluación aprobada' : 'Ir a evaluación final'} →</button>` : '<p class="mt-2 text-xs text-slate-500">Este curso todavía no tiene evaluación publicada.</p>'}
        </div>`;
    }

    function renderCertificatesGrid() {
      const grid = document.getElementById('campusCertificatesGrid');
      if (!grid) return;
      if (!campusCertificates.length) {
        grid.innerHTML = `<div class="bg-white p-6 rounded-3xl border border-slate-100 sm:col-span-2 xl:col-span-3"><div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center"><i class="fa-solid fa-award"></i></div><h3 class="mt-4 font-extrabold text-lutmin-dark">Todavía no tenés certificados</h3><p class="mt-2 text-sm text-slate-500">Se emiten según la configuración privada del curso: por aprobación o por participación/finalización.</p></div>`;
        return;
      }
      grid.innerHTML = campusCertificates.map(cert => {
        const valid = cert.status === 'valid' && (!cert.expires_at || new Date(cert.expires_at).getTime() >= Date.now());
        const expired = cert.status === 'valid' && cert.expires_at && new Date(cert.expires_at).getTime() < Date.now();
        return `<button onclick="openOwnedCertificate('${cert.id}')" class="text-left bg-white p-5 sm:p-6 rounded-3xl border ${valid ? 'border-slate-100 hover:border-lutmin-light' : 'border-red-100'} transition">
          <div class="flex items-start justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-bold ${valid ? 'text-green-600' : 'text-red-600'}">${valid ? 'Válido' : (expired ? 'Vencido' : 'Revocado')}</p><h3 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(cert.course_title)}</h3><p class="mt-2 text-xs text-slate-500">${cert.certificate_kind==='participation'?'Participación':`${Math.round(Number(cert.score))}%`} · ${formatCertificateDate(cert.issued_at)}${cert.expires_at?` · hasta ${formatCertificateDate(cert.expires_at)}`:''}</p></div><i class="fa-solid fa-award text-2xl ${valid ? 'text-lutmin-light' : 'text-red-400'}"></i></div>
          <p class="mt-4 text-[10px] text-slate-400 break-all">${escapeHtml(cert.code)}</p>
        </button>`;
      }).join('');
    }

    function formatCertificateDate(value) {
      if (!value) return '-';
      try { return new Intl.DateTimeFormat('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(value)); }
      catch (_) { return '-'; }
    }

    function certificateVerificationUrl(code) {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('cert', code);
      return url.toString();
    }

    async function showCertificate(cert, options = {}) {
      if (!cert) return;
      currentCertificate = cert;
      const valid = cert.status === 'valid' || cert.certificate_status === 'valid' || cert.is_valid === true;
      const status = cert.status || cert.certificate_status || (valid ? 'valid' : 'revoked');
      const code = cert.code || cert.certificate_code || '';
      const fullName = cert.full_name || 'Alumno';
      const courseTitle = cert.course_title || 'Curso Lutmin';
      const hours = Number(cert.duration_hours || 0);
      const score = Number(cert.score || 0);
      const issued = cert.issued_at;
      const reason = cert.revoked_reason || '';
      const kind = cert.certificate_kind || 'approval';
      const expired = status === 'expired' || (status === 'valid' && cert.expires_at && new Date(cert.expires_at).getTime() < Date.now());
      const effectiveValid = valid && !expired;
      const privateLegend = cert.private_legend || 'Certificación privada de capacitación. No constituye título oficial ni habilitación profesional.';

      document.getElementById('certificateCourseTitle').textContent = courseTitle;
      document.getElementById('certificateStudentName').textContent = fullName;
      document.getElementById('certificateHours').textContent = `${hours} hora${hours === 1 ? '' : 's'}`;
      document.getElementById('certificateScore').textContent = `${Math.round(score)}%`;
      document.getElementById('certificateIssuedAt').textContent = formatCertificateDate(issued);
      document.getElementById('certificateCode').textContent = code;
      document.getElementById('certificateStatusLabel').textContent = expired ? 'Certificado privado vencido' : (effectiveValid ? 'Certificado privado válido' : 'Certificado revocado');
      document.getElementById('certificateStatusLabel').className = `mt-7 text-[10px] sm:text-xs uppercase tracking-[.2em] font-extrabold ${effectiveValid ? 'text-green-600' : (expired ? 'text-amber-600' : 'text-red-600')}`;
      document.getElementById('certificateStatusIcon').className = `w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl shrink-0 ${effectiveValid ? 'bg-green-50 text-green-600' : (expired ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}`;
      document.getElementById('certificateStatusIcon').innerHTML = `<i class="fa-solid ${effectiveValid ? 'fa-circle-check' : (expired ? 'fa-clock' : 'fa-circle-xmark')}"></i>`;
      const reasonEl = document.getElementById('certificateRevokedReason');
      reasonEl.textContent = reason ? `Motivo: ${reason}` : '';
      reasonEl.classList.toggle('hidden', effectiveValid || expired || !reason);
      document.getElementById('certificatePrintBtn').classList.toggle('hidden', !effectiveValid);
      document.getElementById('certificateDownloadBtn')?.classList.toggle('hidden', !effectiveValid);

      document.getElementById('certificateKindLabel').textContent = kind === 'participation' ? 'CERTIFICADO PRIVADO DE PARTICIPACIÓN' : 'CERTIFICADO PRIVADO DE APROBACIÓN';
      document.getElementById('certificateIssuerLabel').textContent = cert.issuer_display_name || 'Lutmin Consultora';
      document.getElementById('certificateIssuerLegal').textContent = [cert.issuer_legal_name, cert.issuer_tax_id ? `CUIT ${cert.issuer_tax_id}` : ''].filter(Boolean).join(' · ');
      document.getElementById('certificateVersionLabel').textContent = cert.course_version ? `Versión del curso: ${cert.course_version}` : '';
      document.getElementById('certificateExpiryLabel').textContent = cert.expires_at ? `Vigencia hasta: ${formatCertificateDate(cert.expires_at)}` : 'Sin vencimiento configurado';
      document.getElementById('certificatePrivateLegend').textContent = privateLegend;
      document.getElementById('certificateTrainingMeta').textContent = [cert.modality ? `Modalidad: ${cert.modality}` : '', cert.training_location ? `Sede: ${cert.training_location}` : '', cert.instructor_name ? `Instructor: ${cert.instructor_name}` : ''].filter(Boolean).join(' · ');
      document.getElementById('certificateScore').closest('div').classList.toggle('hidden', kind === 'participation');

      const qr = document.getElementById('certificateQr');
      qr.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-3xl text-slate-300"></i>';
      if (code) await ensureQRCodeLib();
      qr.innerHTML = '';
      if (code && window.QRCode) {
        new QRCode(qr, { text: certificateVerificationUrl(code), width: 116, height: 116, correctLevel: QRCode.CorrectLevel.M });
      } else {
        qr.innerHTML = '<i class="fa-solid fa-qrcode text-5xl text-slate-300"></i>';
      }
      openModal('certificateModal');
    }

    function openOwnedCertificate(id) {
      const cert = campusCertificates.find(c => c.id === id);
      if (cert) showCertificate(cert);
    }

    async function verifyPublicCertificate(code, { updateField = true } = {}) {
      const clean = String(code || '').trim();
      const status = document.getElementById('publicCertificateStatus');
      if (!clean) {
        if (status) status.textContent = 'Ingresá el código del certificado.';
        return null;
      }
      if (status) status.textContent = 'Verificando...';
      const { data, error } = await supabaseClient.rpc('verify_certificate', { p_code: clean });
      if (error) {
        console.error(error);
        if (status) status.textContent = 'No se pudo validar el certificado.';
        return null;
      }
      const cert = Array.isArray(data) ? data[0] : data;
      if (!cert) {
        if (status) status.textContent = 'No encontramos un certificado con ese código.';
        return null;
      }
      if (updateField) document.getElementById('publicCertificateCode').value = cert.certificate_code || clean;
      if (status) status.textContent = cert.is_valid ? 'Certificado privado válido.' : (cert.certificate_status === 'expired' ? 'El certificado privado existe, pero su vigencia finalizó.' : 'El certificado privado existe, pero está revocado.');
      await showCertificate(cert, { public: true });
      return cert;
    }

    document.getElementById('publicCertificateForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      await verifyPublicCertificate(document.getElementById('publicCertificateCode').value);
    });

    async function copyCertificateVerificationLink() {
      const code = currentCertificate?.code || currentCertificate?.certificate_code;
      if (!code) return;
      const link = certificateVerificationUrl(code);
      try { await navigator.clipboard.writeText(link); showToast('Enlace de validación copiado.'); }
      catch (_) { window.prompt('Copiá este enlace:', link); }
    }

    function certificateSafeFilename(value) {
      return String(value || 'certificado').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'certificado';
    }

    async function loadImageAsDataUrl(url) {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) { reject(e); }
        };
        img.onerror = reject;
        img.src = url;
      });
    }

    async function downloadCurrentCertificatePdf() {
      const c = currentCertificate;
      if (!c) return;
      const status = c.status || c.certificate_status || 'valid';
      const expired = status === 'expired' || (status === 'valid' && c.expires_at && new Date(c.expires_at).getTime() < Date.now());
      if (status !== 'valid' || expired) { showToast(expired ? 'El certificado está vencido.' : 'Un certificado revocado no se puede descargar como válido.'); return; }
      if (!(await ensureJsPdfLib())) { showToast('No se pudo cargar el generador de PDF.'); return; }

      const code = c.code || c.certificate_code || '';
      const fullName = c.full_name || 'Alumno';
      const course = c.course_title || 'Curso Lutmin';
      const hours = Number(c.duration_hours || 0);
      const score = Math.round(Number(c.score || 0));
      const issued = formatCertificateDate(c.issued_at);
      const verify = certificateVerificationUrl(code);
      const kind = c.certificate_kind || 'approval';
      const privateLegend = c.private_legend || 'Certificación privada de capacitación. No constituye título oficial ni habilitación profesional.';
      const certificateHeading = kind === 'participation' ? 'CERTIFICADO PRIVADO DE PARTICIPACIÓN' : 'CERTIFICADO PRIVADO DE APROBACIÓN';
      const completionPhrase = kind === 'participation' ? 'ha completado la capacitación privada' : 'ha aprobado la capacitación privada';
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;

      doc.setDrawColor(0, 11, 60); doc.setLineWidth(1.5); doc.rect(10, 10, W - 20, H - 20);
      doc.setDrawColor(47, 141, 253); doc.setLineWidth(.45); doc.rect(14, 14, W - 28, H - 28);

      try {
        const logoData = await loadImageAsDataUrl(new URL('LOGO.png', window.location.href).href);
        doc.addImage(logoData, 'PNG', 23, 21, 34, 18, undefined, 'FAST');
      } catch (_) {}

      doc.setTextColor(47, 141, 253); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(certificateHeading, W / 2, 42, { align: 'center' });
      doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
      doc.text(`${c.issuer_display_name || 'Lutmin Consultora'} deja constancia de que`, W / 2, 57, { align: 'center' });

      doc.setTextColor(0, 11, 60); doc.setFont('helvetica', 'bold'); doc.setFontSize(29);
      const nameLines = doc.splitTextToSize(fullName, 220);
      doc.text(nameLines, W / 2, 75, { align: 'center' });

      doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
      doc.text(completionPhrase, W / 2, 97, { align: 'center' });
      doc.setTextColor(0, 11, 60); doc.setFont('helvetica', 'bold'); doc.setFontSize(23);
      const courseLines = doc.splitTextToSize(course, 220);
      doc.text(courseLines, W / 2, 112, { align: 'center' });

      doc.setFillColor(248, 250, 252); doc.roundedRect(55, 130, 187, 22, 4, 4, 'F');
      doc.setFontSize(11); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
      doc.text(`Carga horaria: ${hours} h`, 78, 143);
      if (kind !== 'participation') doc.text(`Calificación: ${score}%`, 130, 143);
      doc.text(`Emisión: ${issued}`, 184, 143);

      const qrCanvas = document.querySelector('#certificateQr canvas');
      const qrImg = document.querySelector('#certificateQr img');
      try {
        const qrData = qrCanvas?.toDataURL('image/png') || qrImg?.src;
        if (qrData) doc.addImage(qrData, 'PNG', 235, 157, 29, 29, undefined, 'FAST');
      } catch (_) {}

      doc.setTextColor(0, 11, 60); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`Código verificable: ${code}`, 24, 169);
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      const verifyLines = doc.splitTextToSize(verify, 185);
      doc.text(verifyLines, 24, 178);
      doc.setFontSize(7.2); doc.setTextColor(71,85,105);
      const legendLines = doc.splitTextToSize(privateLegend, 180);
      doc.text(legendLines, 24, 190);
      const signerLeft = c.instructor_name || 'Instructor / capacitador';
      const signerRight = c.responsible_name || 'Responsable de emisión';
      doc.setDrawColor(148,163,184); doc.setLineWidth(.25); doc.line(78,168,128,168); doc.line(166,168,216,168);
      doc.setTextColor(71,85,105); doc.setFontSize(7.2); doc.text(signerLeft,103,172,{align:'center'}); doc.text(c.instructor_name?'Instructor / capacitador':'',103,176,{align:'center'});
      doc.text(signerRight,191,172,{align:'center'}); doc.text(c.responsible_role || 'Responsable Lutmin',191,176,{align:'center'});
      if(c.issuer_legal_name || c.issuer_tax_id){ doc.setFontSize(6.8); doc.text([c.issuer_legal_name||'', c.issuer_tax_id?`CUIT ${c.issuer_tax_id}`:''].filter(Boolean).join(' · '),24,202); }

      const fileName = `Certificado_Lutmin_${certificateSafeFilename(fullName)}_${certificateSafeFilename(course)}_${certificateSafeFilename(code)}.pdf`;
      doc.save(fileName);
      showToast('PDF descargado.');
    }

    function printCurrentCertificate() {
      const c = currentCertificate;
      if (!c) return;
      const status = c.status || c.certificate_status || 'valid';
      const expired = status === 'expired' || (status === 'valid' && c.expires_at && new Date(c.expires_at).getTime() < Date.now());
      if (status !== 'valid' || expired) { showToast(expired ? 'El certificado está vencido.' : 'Un certificado revocado no se puede imprimir como válido.'); return; }
      const code = c.code || c.certificate_code || '';
      const fullName = c.full_name || 'Alumno';
      const course = c.course_title || 'Curso Lutmin';
      const hours = Number(c.duration_hours || 0);
      const score = Math.round(Number(c.score || 0));
      const issued = formatCertificateDate(c.issued_at);
      const verify = certificateVerificationUrl(code);
      const kind = c.certificate_kind || 'approval';
      const heading = kind === 'participation' ? 'CERTIFICADO PRIVADO DE PARTICIPACIÓN' : 'CERTIFICADO PRIVADO DE APROBACIÓN';
      const phrase = kind === 'participation' ? 'ha completado la capacitación privada' : 'ha aprobado la capacitación privada';
      const legend = c.private_legend || 'Certificación privada de capacitación. No constituye título oficial ni habilitación profesional.';
      const issuer = c.issuer_display_name || 'Lutmin Consultora';
      const issuerLegal = [c.issuer_legal_name, c.issuer_tax_id ? `CUIT ${c.issuer_tax_id}` : ''].filter(Boolean).join(' · ');
      const trainingMeta = [c.modality ? `Modalidad: ${c.modality}` : '', c.training_location ? `Sede: ${c.training_location}` : '', c.course_version ? `Versión: ${c.course_version}` : ''].filter(Boolean).join(' · ');
      const expiryText = c.expires_at ? `Vigencia hasta: ${formatCertificateDate(c.expires_at)}` : 'Sin vencimiento configurado';
      const logo = new URL('LOGO.png', window.location.href).href;
      const qrImg = document.querySelector('#certificateQr img')?.src || (document.querySelector('#certificateQr canvas')?.toDataURL ? document.querySelector('#certificateQr canvas').toDataURL('image/png') : '');
      const w = window.open('', '_blank', 'width=1100,height=800');
      if (!w) { showToast('El navegador bloqueó la ventana de impresión.'); return; }
      const scoreMeta = kind !== 'participation' ? ` · Calificación: <strong>${score}%</strong>` : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificado ${escapeHtml(code)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;margin:0;color:#000B3C}.sheet{border:4px solid #000B3C;min-height:175mm;padding:15mm 18mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;text-align:center}.logo{height:55px;object-fit:contain;margin:auto}.eyebrow{margin-top:20px;letter-spacing:.16em;font-weight:700;font-size:12px;color:#2F8DFD}.name{font-size:36px;font-weight:800;margin:18px 0 8px}.course{font-size:28px;font-weight:800;margin:10px}.meta{font-size:14px;color:#475569;margin-top:15px;line-height:1.8}.code{margin-top:18px;font-size:11px;color:#64748b}.verify{font-size:8px;word-break:break-all;color:#94a3b8;margin-top:6px}.legend{margin:16px auto 0;max-width:850px;font-size:10px;line-height:1.45;color:#64748b}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:70px;max-width:620px;margin:20px auto 0}.sign{border-top:1px solid #94a3b8;padding-top:6px;font-size:10px;color:#475569}</style></head><body><div class="sheet"><img class="logo" src="${logo}"><div class="eyebrow">${escapeHtml(heading)}</div><p>${escapeHtml(issuer)} deja constancia de que</p><div class="name">${escapeHtml(fullName)}</div><p>${escapeHtml(phrase)}</p><div class="course">${escapeHtml(course)}</div><div class="meta">Carga horaria: <strong>${hours} h</strong>${scoreMeta} · Emitido: <strong>${issued}</strong><br>${escapeHtml(trainingMeta)}${trainingMeta?' · ':''}${escapeHtml(expiryText)}</div>${qrImg ? `<img src="${qrImg}" style="width:95px;height:95px;margin:18px auto 0">` : ''}<div class="code">Código verificable: <strong>${escapeHtml(code)}</strong></div><div class="verify">${escapeHtml(verify)}</div><div class="legend">${escapeHtml(legend)}</div><div class="signatures"><div class="sign">${escapeHtml(c.instructor_name || 'Instructor / capacitador')}<br><span>${c.instructor_name?'Instructor / capacitador':''}</span></div><div class="sign">${escapeHtml(c.responsible_name || 'Responsable de emisión')}<br><span>${escapeHtml(c.responsible_role || 'Responsable Lutmin')}</span></div></div>${issuerLegal?`<div style="margin-top:14px;font-size:9px;color:#64748b">${escapeHtml(issuerLegal)}</div>`:''}</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script>
<!-- LUTMIN V20.2 · ADMIN TOP NAV RESTAURADA -->
</body></html>`;
      w.document.write(html);
      w.document.close();
    }

    function renderCoursesGrid() {
      const grid = document.getElementById('campusCoursesGrid');
      if (!grid) return;
      if (!campusCourseSummaries.length) {
        grid.innerHTML = `
          <div class="bg-white rounded-3xl border border-slate-100 p-6 sm:col-span-2 xl:col-span-3">
            <p class="font-extrabold text-lutmin-dark">No tenés cursos asignados.</p>
            <p class="mt-2 text-sm text-slate-500">El administrador de Lutmin debe inscribirte a uno.</p>
          </div>`;
        return;
      }

      grid.innerHTML = campusCourseSummaries.map(item => {
        const accessPending = item.enrollmentStatus === 'pending_payment';
        if (accessPending) {
          const paymentText = item.paymentStatus === 'partial' ? 'Pago parcial' : 'Pago pendiente';
          return `<div class="bg-white rounded-3xl border border-amber-100 p-5 sm:p-6"><span class="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">${paymentText}</span><h3 class="mt-4 font-extrabold text-base sm:text-lg text-lutmin-dark">${escapeHtml(item.course.title)}</h3><p class="mt-2 text-sm text-slate-500">Matrícula: <strong>${formatPublicMoney(item.priceAmount, item.paymentCurrency)}</strong></p><p class="mt-2 text-xs text-slate-500">El curso se habilita automáticamente cuando Administración completa o bonifica el pago.</p></div>`;
        }
        const finished = item.percent >= 100;
        const approved = Boolean(item.passedAttempt);
        const badge = approved
          ? '<span class="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 font-bold">Aprobado</span>'
          : finished && item.assessment
            ? '<span class="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-violet-50 text-violet-700 font-bold">Evaluación pendiente</span>'
            : finished
              ? '<span class="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">Clases completas</span>'
              : '<span class="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">En curso</span>';
        return `
          <div class="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6">
            ${badge}
            <h3 class="mt-3 sm:mt-4 font-extrabold text-base sm:text-lg text-lutmin-dark">${escapeHtml(item.course.title)}</h3>
            <p class="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">${item.percent}% de clases · ${item.completed} de ${item.total}</p>
            <div class="mt-3 sm:mt-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${finished ? 'bg-green-500' : 'bg-lutmin-light'} rounded-full" style="width:${item.percent}%"></div></div>
            <div class="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              <button onclick="openCourseLessons('${item.course.id}')" class="text-sm font-bold text-lutmin-light">${finished ? 'Ver clases' : 'Continuar curso'} →</button>
              ${finished && item.assessment ? `<button onclick="openAssessmentForCourse('${item.course.id}')" class="text-sm font-bold ${approved ? 'text-green-600' : 'text-violet-600'}">${approved ? `Aprobado ${Math.round(Number(item.passedAttempt.score))}%` : (item.attempts.length ? 'Reintentar evaluación' : 'Evaluación final')} →</button>` : ''}
            </div>
          </div>`;
      }).join('');
    }

    function setActiveCourse(courseId) {
      activeCampusCourseId = courseId;
      renderCampus();
      goToCampusTab('dashboard');
    }

    function goToCampusTab(tab) {
      if (tab === 'admin' && currentLutminUser?.role !== 'admin') tab = currentLutminUser?.role === 'company_admin' ? 'company' : currentLutminUser?.role==='instructor'?'instructor':'dashboard';
      if ((tab === 'company' || tab === 'company-conecta') && currentLutminUser?.role !== 'company_admin') tab = currentLutminUser?.role==='instructor'?'instructor':'dashboard';
      if (tab === 'instructor' && currentLutminUser?.role !== 'instructor') tab = currentLutminUser?.role==='company_admin'?'company':'dashboard';
      if (tab === 'activities' && currentLutminUser?.role !== 'student') tab = currentLutminUser?.role==='instructor'?'instructor':currentLutminUser?.role==='company_admin'?'company':'dashboard';
      if (tab === 'talent' && currentLutminUser?.role !== 'student') tab = currentLutminUser?.role === 'company_admin' ? 'company' : currentLutminUser?.role==='instructor'?'instructor':'dashboard';
      if (currentLutminUser?.role === 'company_admin' && !['company','company-conecta','profile','notifications','support'].includes(tab)) tab = 'company';
      if (currentLutminUser?.role === 'instructor' && !['instructor','profile','notifications','support'].includes(tab)) tab = 'instructor';
      if (currentLutminUser?.role === 'admin' && !['admin','profile','notifications','support'].includes(tab)) tab = 'admin';
      document.querySelectorAll('.campus-tab').forEach(btn => {
        if (btn.dataset.campusTab === tab) {
          btn.classList.add('bg-white/10', 'font-bold');
          btn.classList.remove('text-slate-300');
        } else {
          btn.classList.remove('bg-white/10', 'font-bold');
          btn.classList.add('text-slate-300');
        }
      });
      document.querySelectorAll('.campus-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.campusPanel !== tab);
      });
    }

    let openLessonId = null;

    function openCurrentLesson() {
      const active = campusCourseSummaries.find(item => item.course.id === activeCampusCourseId) || campusCourseSummaries[0];
      if (!active) return;
      if (active.enrollmentStatus === 'pending_payment') { showToast('El curso se habilita cuando Administración confirma el pago.'); return; }
      const lesson = active.nextLesson || active.lessons[0];
      if (lesson) openLessonById(lesson.id);
    }

    function openCourseLessons(courseId) {
      activeCampusCourseId = courseId;
      const course = campusCourseSummaries.find(item => item.course.id === courseId);
      if (!course) return;
      if (course.enrollmentStatus === 'pending_payment') { showToast('El curso se habilita cuando Administración confirma el pago.'); return; }
      const lesson = course.nextLesson || course.lessons[0];
      if (lesson) openLessonById(lesson.id);
      else showToast('Este curso todavía no tiene clases cargadas.');
    }

    function getOpenLessonContext(lessonId = openLessonId) {
      for (const summary of campusCourseSummaries) {
        const lesson = summary.lessons.find(item => item.id === lessonId);
        if (lesson) return { summary, lesson };
      }
      return null;
    }

    function safeExternalUrl(value) {
      try {
        const url = new URL(String(value || '').trim());
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return url.href;
      } catch (_) {
        return null;
      }
    }

    function getGoogleDrivePreviewUrl(urlValue) {
      const safe = safeExternalUrl(urlValue);
      if (!safe) return null;
      try {
        const url = new URL(safe);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        if (!['drive.google.com','docs.google.com'].includes(host)) return null;
        const parts = url.pathname.split('/').filter(Boolean);
        let id = null;
        if (url.searchParams.get('id')) id = url.searchParams.get('id');
        const dIndex = parts.indexOf('d');
        if (!id && dIndex >= 0 && parts[dIndex + 1]) id = parts[dIndex + 1];
        if (!id && parts[0] === 'file' && parts[1] === 'd') id = parts[2];
        if (!id) return null;
        if (host === 'drive.google.com') return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
        const kind = parts[0];
        if (['document','presentation','spreadsheets'].includes(kind)) {
          return `https://docs.google.com/${kind}/d/${encodeURIComponent(id)}/preview`;
        }
      } catch (_) {}
      return null;
    }

    function getVideoEmbed(urlValue) {
      const safe = safeExternalUrl(urlValue);
      if (!safe) return null;
      const drivePreview = getGoogleDrivePreviewUrl(safe);
      if (drivePreview) return drivePreview;
      try {
        const url = new URL(safe);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        if (host === 'youtu.be') {
          const id = url.pathname.split('/').filter(Boolean)[0];
          return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
          let id = url.searchParams.get('v');
          if (!id && url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2];
          if (!id && url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
          return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
        }
        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
          const parts = url.pathname.split('/').filter(Boolean);
          const id = parts.find(part => /^\d+$/.test(part));
          return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
        }
      } catch (_) {}
      return null;
    }

    async function resolveLessonVideoUrl(lesson) {
      if (lesson?.video_path) {
        const { data, error } = await supabaseClient.storage
          .from('course-materials')
          .createSignedUrl(lesson.video_path, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
        console.error('No pude firmar el video privado:', error);
      }
      return safeExternalUrl(lesson?.video_url);
    }

    async function resolveLessonMaterialUrl(lesson) {
      if (lesson?.material_path) {
        const { data, error } = await supabaseClient.storage
          .from('course-materials')
          .createSignedUrl(lesson.material_path, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
        console.error('No pude firmar el material:', error);
      }
      return safeExternalUrl(lesson?.material_url);
    }

    function sanitizeStorageFilename(name) {
      const original = String(name || 'archivo').trim();
      const dot = original.lastIndexOf('.');
      const ext = dot >= 0 ? original.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
      const base = (dot >= 0 ? original.slice(0, dot) : original)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70) || 'archivo';
      return `${base}${ext}`;
    }

    async function uploadLessonMaterial(courseId, file) {
      if (!file) return null;
      const maxBytes = 20 * 1024 * 1024;
      if (file.size > maxBytes) throw new Error('El archivo supera el máximo de 20 MB.');
      const allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','png','jpg','jpeg','webp','txt','zip'];
      const ext = String(file.name || '').split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) throw new Error('Ese tipo de archivo no está permitido.');
      const safeName = sanitizeStorageFilename(file.name);
      const path = `${courseId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabaseClient.storage.from('course-materials').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined
      });
      if (error) throw error;
      return path;
    }

    async function uploadLessonPrivateVideo(courseId, file) {
      if (!file) return null;
      const maxBytes = 80 * 1024 * 1024;
      if (file.size > maxBytes) throw new Error('El video supera el máximo de 80 MB. Para videos largos usá YouTube No listado o Drive.');
      const ext = String(file.name || '').split('.').pop().toLowerCase();
      if (!['mp4','webm'].includes(ext)) throw new Error('Para video privado usá MP4 o WEBM.');
      const safeName = sanitizeStorageFilename(file.name);
      const path = `${courseId}/videos/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabaseClient.storage.from('course-materials').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined
      });
      if (error) throw error;
      return path;
    }

    async function renderLessonVideo(lesson) {
      const area = document.getElementById('lessonVideoArea');
      area.innerHTML = `<div class="text-center px-6 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-3xl"></i><p class="mt-3 text-xs">Cargando video...</p></div>`;
      const safe = await resolveLessonVideoUrl(lesson);
      if (!safe) {
        area.innerHTML = `<div class="text-center px-6 text-slate-400"><i class="fa-solid fa-play-circle text-4xl"></i><p class="mt-3 text-sm font-bold">Esta clase todavía no tiene video cargado.</p><p class="mt-1 text-xs">El contenido escrito igualmente está disponible.</p></div>`;
        return;
      }
      const embed = lesson?.video_path ? null : getVideoEmbed(safe);
      if (embed) {
        area.innerHTML = `<iframe class="w-full h-full" src="${escapeHtml(embed)}" title="Video de la clase" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        return;
      }
      if (lesson?.video_path || /\.(mp4|webm|ogg)(\?.*)?$/i.test(safe)) {
        area.innerHTML = `<video class="w-full h-full" controls controlsList="nodownload" preload="metadata"><source src="${escapeHtml(safe)}">Tu navegador no puede reproducir este video.</video>`;
        return;
      }
      area.innerHTML = `<div class="text-center px-6"><i class="fa-solid fa-arrow-up-right-from-square text-white text-3xl"></i><p class="mt-3 text-sm font-bold text-white">El video está alojado externamente.</p><a class="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-white text-lutmin-dark font-bold text-sm" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">Abrir video</a></div>`;
    }

    function isLessonUnlocked(summary, lesson) {
      if (!summary || !lesson || lesson.published === false) return false;
      if (summary.completedSet.has(lesson.id)) return true;
      return summary.lessons
        .filter(item => item.sort_order < lesson.sort_order && item.published !== false && item.required !== false)
        .every(item => summary.completedSet.has(item.id));
    }

    async function openLessonById(lessonId) {
      const context = getOpenLessonContext(lessonId);
      if (!context) {
        showToast('No encontré esa clase dentro de tus cursos.');
        return;
      }
      const { summary, lesson } = context;
      if (!isLessonUnlocked(summary, lesson)) {
        const next = summary.nextLesson;
        showToast(next
          ? `Primero completá la Clase ${next.sort_order}: ${next.title}.`
          : 'Esta clase todavía no está disponible.');
        return;
      }
      activeCampusCourseId = summary.course.id;
      openLessonId = lesson.id;

      document.getElementById('lessonCourseName').textContent = summary.course.title;
      document.getElementById('lessonNumberBadge').textContent = `Clase ${lesson.sort_order} de ${summary.total}`;
      document.getElementById('lessonDurationBadge').textContent = formatMinutes(lesson.duration_minutes);
      document.getElementById('lessonTitle').textContent = lesson.title;
      document.getElementById('lessonDescription').textContent = lesson.description || 'Clase del Campus Lutmin.';

      const content = String(lesson.content || '').trim() || String(lesson.description || '').trim() || 'El administrador todavía no cargó contenido escrito para esta clase.';
      document.getElementById('lessonContent').innerHTML = escapeHtml(content.replace(/\\n/g, '\n')).replace(/\n/g, '<br>');

      await renderLessonVideo(lesson);

      const materialArea = document.getElementById('lessonMaterialArea');
      materialArea.innerHTML = `<p class="text-sm text-slate-400">Cargando material...</p>`;
      const material = await resolveLessonMaterialUrl(lesson);
      const isDriveMaterial = !!getGoogleDrivePreviewUrl(material);
      materialArea.innerHTML = material
        ? `<a href="${escapeHtml(material)}" target="_blank" rel="noopener noreferrer" class="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-lutmin-dark font-bold text-sm"><i class="${isDriveMaterial ? 'fa-brands fa-google-drive' : 'fa-solid fa-file-arrow-up'}"></i>${isDriveMaterial ? 'Abrir en Google Drive' : 'Abrir material'}</a>`
        : `<p class="text-sm text-slate-400">Sin material adjunto por el momento.</p>`;

      const completed = summary.completedSet.has(lesson.id);
      document.getElementById('lessonCompletedBadge').classList.toggle('hidden', !completed);
      const completeBtn = document.getElementById('lessonCompleteBtn');
      completeBtn.disabled = completed;
      completeBtn.innerHTML = completed
        ? '<i class="fa-solid fa-circle-check mr-2"></i>Clase completada'
        : 'Marcar clase como completada';

      const list = document.getElementById('lessonCourseList');
      list.innerHTML = summary.lessons.map(item => {
        const done = summary.completedSet.has(item.id);
        const unlocked = isLessonUnlocked(summary, item);
        const active = item.id === lesson.id;
        return `<button ${unlocked ? `onclick="openLessonById('${item.id}')"` : 'disabled'} class="text-left p-3 rounded-xl border transition ${active ? 'border-lutmin-light bg-blue-50' : unlocked ? 'border-slate-100 bg-slate-50 hover:border-slate-300' : 'border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed'}">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold ${active ? 'text-lutmin-light' : 'text-slate-400'}">CLASE ${item.sort_order}</span>
            ${done ? '<i class="fa-solid fa-circle-check text-green-500 text-xs"></i>' : unlocked ? '' : '<i class="fa-solid fa-lock text-slate-400 text-xs"></i>'}
          </div>
          <p class="mt-1 text-xs font-bold text-lutmin-dark line-clamp-2">${escapeHtml(item.title)}</p>
        </button>`;
      }).join('');

      openModal('lessonModal');
    }

    async function completeOpenLesson() {
      if (!currentLutminUser || !supabaseClient || !openLessonId) return;
      const context = getOpenLessonContext(openLessonId);
      if (!context) return;
      const { summary, lesson } = context;
      if (!isLessonUnlocked(summary, lesson) || summary.completedSet.has(lesson.id)) {
        showToast('Primero completá la clase anterior.');
        return;
      }
      const button = document.getElementById('lessonCompleteBtn');
      button.disabled = true;
      button.textContent = 'Guardando...';

      const { error } = await supabaseClient
        .from('lesson_progress')
        .upsert({
          user_id: currentLutminUser.id,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });

      if (error) {
        console.error(error);
        showToast('No pude guardar esta clase como completada.');
        button.disabled = false;
        button.textContent = 'Marcar clase como completada';
        return;
      }

      showToast(`Clase ${lesson.sort_order} completada. Tu progreso quedó guardado.`);
      await loadCampusData();
      openLessonById(lesson.id);
    }

    async function completeCurrentLesson() {
      const active = campusCourseSummaries.find(item => item.course.id === activeCampusCourseId) || campusCourseSummaries[0];
      if (!active) return;
      if (active.nextLesson) {
        openCurrentLesson();
        return;
      }
      if (active.assessment) {
        openAssessmentForCourse(active.course.id);
        return;
      }
      showToast('Completaste todas las clases. La evaluación todavía no está publicada.');
    }

    async function openAssessmentForCourse(courseId) {
      const summary = campusCourseSummaries.find(item => item.course.id === courseId);
      if (!summary?.assessment) {
        showToast('Este curso todavía no tiene una evaluación publicada.');
        return;
      }
      if (summary.percent < 100) {
        showToast('Primero completá todas las clases del curso.');
        return;
      }

      openAssessmentId = summary.assessment.id;
      document.getElementById('assessmentCourseName').textContent = summary.course.title;
      document.getElementById('assessmentTitle').textContent = summary.assessment.title;
      document.getElementById('assessmentDescription').textContent = summary.assessment.description || 'Evaluación final del curso.';
      document.getElementById('assessmentPassingBadge').textContent = `Aprobación ${summary.assessment.passing_score}%`;
      document.getElementById('assessmentAttemptBadge').textContent = summary.attempts.length
        ? `${summary.attempts.length} intento${summary.attempts.length === 1 ? '' : 's'} · mejor ${Math.round(Number(summary.bestAttempt?.score || 0))}%`
        : 'Sin intentos';

      const result = document.getElementById('assessmentResult');
      const form = document.getElementById('assessmentForm');
      const submitBtn = document.getElementById('assessmentSubmitBtn');

      if (summary.passedAttempt) {
        result.className = 'mt-6 rounded-3xl border border-green-200 bg-green-50 p-5 sm:p-6 text-green-800';
        result.innerHTML = `<div class="flex items-start gap-3"><i class="fa-solid fa-circle-check text-2xl"></i><div><p class="font-black text-lg">Evaluación aprobada</p><p class="mt-1 text-sm">Obtuviste ${Math.round(Number(summary.passedAttempt.score))}% · ${summary.passedAttempt.correct_count} de ${summary.passedAttempt.total_questions} respuestas correctas.</p></div></div>`;
        result.classList.remove('hidden');
        form.classList.add('hidden');
        openModal('assessmentModal');
        return;
      }

      result.classList.add('hidden');
      form.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = summary.attempts.length ? 'Entregar nuevo intento' : 'Entregar evaluación';
      document.getElementById('assessmentQuestions').innerHTML = '<div class="p-5 bg-white rounded-2xl text-sm text-slate-500">Cargando preguntas...</div>';
      openModal('assessmentModal');

      const { data: questions, error } = await supabaseClient
        .from('assessment_questions')
        .select('id,question_text,option_a,option_b,option_c,option_d,sort_order,points')
        .eq('assessment_id', summary.assessment.id)
        .order('sort_order');

      if (error) {
        console.error(error);
        document.getElementById('assessmentQuestions').innerHTML = '<div class="p-5 bg-red-50 rounded-2xl text-sm text-red-700">No pude cargar las preguntas.</div>';
        submitBtn.disabled = true;
        return;
      }

      openAssessmentQuestions = questions || [];
      if (!openAssessmentQuestions.length) {
        document.getElementById('assessmentQuestions').innerHTML = '<div class="p-5 bg-amber-50 rounded-2xl text-sm text-amber-800">La evaluación todavía no tiene preguntas.</div>';
        submitBtn.disabled = true;
        return;
      }

      document.getElementById('assessmentQuestions').innerHTML = openAssessmentQuestions.map((q, index) => {
        const options = [['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]];
        return `<fieldset class="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6">
          <legend class="sr-only">Pregunta ${index + 1}</legend>
          <div class="flex items-start gap-3">
            <span class="w-8 h-8 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center font-black text-sm shrink-0">${index + 1}</span>
            <div class="min-w-0 flex-1">
              <p class="font-extrabold text-lutmin-dark">${escapeHtml(q.question_text)}</p>
              <div class="mt-4 space-y-2">
                ${options.map(([letter, label]) => `<label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-violet-300 cursor-pointer">
                  <input type="radio" name="assessment_${q.id}" value="${letter}" class="mt-1" required>
                  <span class="text-sm text-slate-700"><strong>${letter}.</strong> ${escapeHtml(label)}</span>
                </label>`).join('')}
              </div>
            </div>
          </div>
        </fieldset>`;
      }).join('');
    }

    document.getElementById('assessmentForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!openAssessmentId || !openAssessmentQuestions.length) return;
      const answers = [];
      for (const q of openAssessmentQuestions) {
        const selected = document.querySelector(`input[name="assessment_${q.id}"]:checked`);
        if (!selected) {
          showToast('Respondé todas las preguntas antes de entregar.');
          return;
        }
        answers.push({ question_id: q.id, selected_option: selected.value });
      }

      const btn = document.getElementById('assessmentSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Corrigiendo...';

      const { data, error } = await supabaseClient.rpc('submit_assessment', {
        p_assessment_id: openAssessmentId,
        p_answers: answers
      });

      if (error) {
        console.error(error);
        showToast(error.message || 'No pude entregar la evaluación.');
        btn.disabled = false;
        btn.textContent = 'Entregar evaluación';
        return;
      }

      const passed = Boolean(data?.passed);
      const score = Math.round(Number(data?.score || 0));
      const result = document.getElementById('assessmentResult');
      result.className = `mt-6 rounded-3xl border p-5 sm:p-6 ${passed ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`;
      result.innerHTML = `<div class="flex items-start gap-3"><i class="fa-solid ${passed ? 'fa-circle-check' : 'fa-rotate'} text-2xl"></i><div><p class="font-black text-lg">${passed ? '¡Evaluación aprobada!' : 'Todavía no alcanzaste la aprobación'}</p><p class="mt-1 text-sm">Resultado: <strong>${score}%</strong> · ${data?.correct_count ?? 0} de ${data?.total_questions ?? 0} respuestas correctas. Se aprueba con ${data?.passing_score ?? 70}%.</p>${passed ? '<p class="mt-2 text-sm">El curso quedó aprobado y tu certificado se emitió automáticamente.</p>' : '<p class="mt-2 text-sm">Podés repasar el contenido y volver a intentarlo.</p>'}</div></div>`;
      result.classList.remove('hidden');
      document.getElementById('assessmentForm').classList.add('hidden');
      showToast(passed ? `¡Aprobaste con ${score}%!` : `Resultado ${score}%. Podés volver a intentarlo.`);
      await loadCampusData();
      if (passed) {
        const assessment = campusAssessments.find(a => a.id === openAssessmentId);
        const cert = assessment ? campusCertificates.find(c => c.course_id === assessment.course_id) : null;
        if (cert) {
          result.insertAdjacentHTML('beforeend', `<button onclick="openOwnedCertificate('${cert.id}')" class="mt-4 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-extrabold"><i class="fa-solid fa-award mr-2"></i>Ver certificado</button>`);
        }
      }
    });

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }


    // =========================================================
    // AGENDA DEL ALUMNO - V1.1
    // =========================================================
    async function loadStudentAgenda(){
      if(!supabaseClient || !currentLutminUser || currentLutminUser.role==='company_admin') return;
      const {data,error}=await supabaseClient.rpc('get_my_training_agenda');
      if(error){console.error(error);showToast('No pude cargar tu agenda.');return;}
      studentAgendaData=data||{sessions:[]}; renderStudentAgenda();
    }

    function renderStudentAgenda(){
      const sessions=Array.isArray(studentAgendaData?.sessions)?studentAgendaData.sessions:[]; const root=document.getElementById('studentAgendaList'); const stats=document.getElementById('studentAgendaStats'); if(!root||!stats)return;
      const today=new Date().toISOString().slice(0,10); const upcoming=sessions.filter(x=>x.status!=='cancelled'&&String(x.session_date)>=today); const present=sessions.filter(x=>x.attendance_status==='present').length; const absent=sessions.filter(x=>x.attendance_status==='absent').length;
      stats.innerHTML=`<div class="bg-white rounded-2xl border border-slate-100 p-4"><p class="text-[10px] font-bold text-slate-400 uppercase">Próximos</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${upcoming.length}</p></div><div class="bg-white rounded-2xl border border-slate-100 p-4"><p class="text-[10px] font-bold text-slate-400 uppercase">Presentes</p><p class="mt-1 text-2xl font-black text-green-600">${present}</p></div><div class="bg-white rounded-2xl border border-slate-100 p-4"><p class="text-[10px] font-bold text-slate-400 uppercase">Ausencias</p><p class="mt-1 text-2xl font-black text-red-500">${absent}</p></div><div class="bg-white rounded-2xl border border-slate-100 p-4"><p class="text-[10px] font-bold text-slate-400 uppercase">Total encuentros</p><p class="mt-1 text-2xl font-black text-lutmin-light">${sessions.length}</p></div>`;
      if(!sessions.length){root.innerHTML='<div class="p-7 rounded-3xl bg-white border border-slate-100 text-sm text-slate-500">Todavía no tenés encuentros programados. Tus cursos asincrónicos siguen disponibles en Mis cursos.</div>';return;}
      root.innerHTML=sessions.map(x=>{const d=x.session_date?new Date(`${x.session_date}T12:00:00`).toLocaleDateString('es-AR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}):'—';const time=x.start_time?String(x.start_time).slice(0,5):'';const attendance={present:['Presente','bg-green-50 text-green-700'],absent:['Ausente','bg-red-50 text-red-700'],justified:['Justificado','bg-amber-50 text-amber-700'],pending:['Pendiente','bg-slate-100 text-slate-600']}[x.attendance_status]||['Pendiente','bg-slate-100 text-slate-600'];return `<div class="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><p class="text-[10px] font-bold uppercase tracking-widest text-indigo-600">${escapeHtml(x.course_title||'Curso')} · ${escapeHtml(x.group_name||'')}</p><h3 class="mt-1 text-lg font-extrabold text-lutmin-dark">${escapeHtml(x.title||'Encuentro')}</h3><p class="mt-2 text-sm text-slate-500"><i class="fa-regular fa-calendar mr-2"></i>${d}${time?' · '+time+' hs':''}</p><p class="mt-1 text-xs text-slate-500"><i class="fa-solid fa-location-dot mr-2"></i>${escapeHtml(x.location||x.modality||'A definir')}${x.instructor_name?' · '+escapeHtml(x.instructor_name):''}</p></div><span class="px-3 py-1.5 rounded-full text-xs font-bold ${attendance[1]}">${attendance[0]}</span></div><div class="mt-4 flex flex-wrap gap-2">${x.meeting_url?`<a href="${escapeHtml(x.meeting_url)}" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-video mr-2"></i>Ingresar al encuentro</a>`:''}<button onclick="downloadSessionIcsById('${x.id}')" class="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold"><i class="fa-regular fa-calendar-plus mr-2"></i>Agregar al calendario</button></div></div>`;}).join('');
    }

    function downloadSessionIcsById(sessionId){
      const x=(studentAgendaData?.sessions||[]).find(s=>s.id===sessionId); if(!x)return; if(!x.session_date)return; const start=(x.start_time||'09:00:00').replace(/:/g,'').slice(0,6); const end=(x.end_time||x.start_time||'10:00:00').replace(/:/g,'').slice(0,6); const date=String(x.session_date).replace(/-/g,''); const esc=v=>String(v||'').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n'); const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lutmin//Campus//ES\r\nBEGIN:VEVENT\r\nUID:${x.id}@lutmin\r\nDTSTART:${date}T${start}\r\nDTEND:${date}T${end}\r\nSUMMARY:${esc((x.course_title||'Lutmin')+' - '+(x.title||'Capacitación'))}\r\nLOCATION:${esc(x.location||x.meeting_url||'')}\r\nDESCRIPTION:${esc(x.group_name||'')}\r\nEND:VEVENT\r\nEND:VCALENDAR`; const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lutmin_${slugifyLutmin(x.title||'capacitacion')}.ics`;a.click();URL.revokeObjectURL(a.href);
    }

    // =========================================================
    // PORTAL EMPRESAS - ETAPA 13
    // =========================================================
    let companyPortalData = null;
    let companyPortalCertificates = [];

    async function loadCompanyPortalData() {
      if(await window.LutminV31Views?.ensureForTab?.('company')===false)return;
      if (!supabaseClient || currentLutminUser?.role !== 'company_admin') return;
      const { data, error } = await supabaseClient.rpc('get_company_portal');
      if (error) {
        console.error('Portal empresa:', error);
        showToast(error.message || 'No pude cargar el Portal Empresas.');
        return;
      }
      companyPortalData = data || null;
      renderCompanyPortal();
    }

    function companyMemberCourseStatus(item) {
      if (item?.certificate?.status === 'valid') return 'Aprobado';
      if (Number(item?.progress || 0) >= 100) return 'Clases completas';
      if (Number(item?.progress || 0) > 0) return 'En curso';
      return 'Sin comenzar';
    }

    function resetCompanyBranding(){
      document.getElementById('companySidebarBrand')?.classList.add('hidden'); document.getElementById('lutminSidebarLogo')?.classList.remove('hidden');
      const label=document.getElementById('campusSidebarProductLabel'); if(label){label.textContent='Campus Lutmin';label.classList.add('mt-8');}
      document.getElementById('companyMobileBrand')?.classList.add('hidden'); document.getElementById('companyMobileBrand')?.classList.remove('flex');
      const ml=document.getElementById('campusMobileProductLabel'); if(ml)ml.textContent='Campus Lutmin';
    }
    function paintCompanyBranding(company){
      if(!company)return; const name=company.display_name||company.name||'Mi empresa', initials=companyInitials(name), url=companyBrandingPublicUrl(company.logo_path);
      const brand=document.getElementById('companySidebarBrand'); brand?.classList.remove('hidden'); document.getElementById('lutminSidebarLogo')?.classList.add('hidden');
      const label=document.getElementById('campusSidebarProductLabel'); if(label){label.textContent='Portal Empresa · Lutmin';label.classList.remove('mt-8');}
      const sideName=document.getElementById('companySidebarName'); if(sideName)sideName.textContent=name; const industry=document.getElementById('companySidebarIndustry'); if(industry)industry.textContent=company.industry||'Espacio corporativo';
      const sideImg=document.getElementById('companySidebarLogo'),sideInit=document.getElementById('companySidebarInitials'); if(sideImg&&sideInit){sideImg.classList.toggle('hidden',!url);sideInit.classList.toggle('hidden',Boolean(url));if(url)sideImg.src=url;sideInit.textContent=initials;}
      const mobile=document.getElementById('companyMobileBrand'); mobile?.classList.remove('hidden'); mobile?.classList.add('flex'); const mn=document.getElementById('companyMobileName');if(mn)mn.textContent=name; const mi=document.getElementById('companyMobileInitials'),mimg=document.getElementById('companyMobileLogo');if(mi&&mimg){mimg.classList.toggle('hidden',!url);mi.classList.toggle('hidden',Boolean(url));if(url)mimg.src=url;mi.textContent=initials;}
      const ml=document.getElementById('campusMobileProductLabel');if(ml)ml.textContent='Portal Empresa';
      const pimg=document.getElementById('companyPortalLogo'),pinit=document.getElementById('companyPortalInitials');if(pimg&&pinit){pimg.classList.toggle('hidden',!url);pinit.classList.toggle('hidden',Boolean(url));if(url)pimg.src=url;pinit.textContent=initials;}
      const wrap=document.getElementById('companyPortalLogoWrap');if(wrap)wrap.style.borderColor=company.brand_secondary||'#2F8DFD';
    }

    function companyExecutiveMetrics(){
      const members=Array.isArray(companyPortalData?.members)?companyPortalData.members:[]; const courses=members.flatMap(m=>(m.courses||[]).map(c=>({...c,member:m}))); const now=Date.now(), today=new Date().toISOString().slice(0,10);
      const avg=courses.length?Math.round(courses.reduce((a,c)=>a+Number(c.progress||0),0)/courses.length):0;
      const sessions=(companyPortalData?.training||[]).flatMap(g=>(g.sessions||[])); const present=sessions.reduce((n,x)=>n+Number(x.present||0),0), absent=sessions.reduce((n,x)=>n+Number(x.absent||0),0), justified=sessions.reduce((n,x)=>n+Number(x.justified||0),0), marked=present+absent+justified; const attendance=marked?Math.round(100*present/marked):null;
      const upcoming=sessions.filter(x=>x.status!=='cancelled'&&String(x.session_date||'')>=today).length;
      const alerts=members.filter(m=>{const low=(m.courses||[]).some(c=>Number(c.progress||0)<50&&Number(c.progress||0)<100);const old=!m.last_seen_at||now-new Date(m.last_seen_at).getTime()>7*86400000;return low||old;});
      return {members,courses,avg,attendance,upcoming,alerts,present,absent,justified};
    }
    function renderCompanyExecutive(){
      const x=companyExecutiveMetrics(); const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;}; set('companyStatAvgProgress',`${x.avg}%`);set('companyStatAttendance',x.attendance===null?'—':`${x.attendance}%`);set('companyStatUpcoming',String(x.upcoming));set('companyStatAlerts',String(x.alerts.length));
      const root=document.getElementById('companyExecutiveAlerts');if(root){root.innerHTML=x.alerts.length?x.alerts.slice(0,8).map(m=>{const low=(m.courses||[]).filter(c=>Number(c.progress||0)<50).sort((a,b)=>Number(a.progress||0)-Number(b.progress||0))[0];const days=m.last_seen_at?Math.floor((Date.now()-new Date(m.last_seen_at).getTime())/86400000):null;return `<div class="rounded-2xl bg-amber-50 border border-amber-100 p-4"><p class="font-bold text-sm text-amber-950">${escapeHtml(m.full_name||m.email||'Colaborador')}</p><p class="mt-1 text-xs text-amber-800">${low?`${escapeHtml(low.title||'Curso')} · ${Math.round(Number(low.progress||0))}% de avance`:''}${low&&days!==null?' · ':''}${days===null?'Sin ingresos registrados':days>7?`${days} días sin ingresar`:''}</p></div>`;}).join(''):'<div class="rounded-2xl bg-green-50 border border-green-100 p-4 text-sm font-bold text-green-700"><i class="fa-solid fa-circle-check mr-2"></i>No hay alertas académicas relevantes.</div>';}
    }
    function renderCompanyPlans(){
      const root=document.getElementById('companyTrainingPlans');if(!root)return;const plans=Array.isArray(companyPortalData?.plans)?companyPortalData.plans:[],members=companyPortalData?.members||[];if(!plans.length){root.innerHTML='<div class="text-sm text-slate-500">Todavía no hay planes creados por Lutmin.</div>';return;}
      root.innerHTML=plans.map(p=>{const pcs=p.courses||[];let done=0,total=members.length*pcs.length;members.forEach(m=>pcs.forEach(pc=>{const c=(m.courses||[]).find(x=>x.course_id===pc.course_id);if(c&&(c.certificate?.status==='valid'||Number(c.progress||0)>=100))done++;}));const pct=total?Math.round(100*done/total):0;return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark">${escapeHtml(p.name)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(p.objective||'Plan corporativo')}</p></div><span class="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold h-fit">${escapeHtml(trainingPlanStatusLabel(p.status))}</span></div><div class="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-violet-600 rounded-full" style="width:${pct}%"></div></div><div class="mt-2 flex justify-between text-[11px] text-slate-500"><span>${done}/${total||0} cumplimientos</span><strong>${pct}%</strong></div><div class="mt-3 flex flex-wrap gap-1.5">${pcs.map(pc=>`<span class="px-2 py-1 rounded-lg bg-slate-50 text-[10px] font-bold text-slate-600">${escapeHtml(pc.title)}${pc.due_date?' · '+new Date(pc.due_date+'T12:00:00').toLocaleDateString('es-AR'):''}</span>`).join('')}</div></div>`;}).join('');
    }

    async function downloadCompanyExecutivePdf(){
      if(!companyPortalData?.company)return showToast('No hay empresa cargada.'); if(!(await ensureJsPdfLib()))return showToast('No pude iniciar el generador PDF.');
      const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),company=companyPortalData.company,m=companyExecutiveMetrics(),name=company.display_name||company.name||'Empresa'; let y=20;
      doc.setFont('helvetica','bold');doc.setFontSize(21);doc.text(name,18,y);y+=8;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(90);doc.text('Reporte ejecutivo de capacitación · Lutmin',18,y);y+=12;doc.setTextColor(0);
      const cards=[['Colaboradores',String(m.members.length)],['Avance promedio',`${m.avg}%`],['Asistencia',m.attendance===null?'—':`${m.attendance}%`],['Certificados',String(companyPortalCertificates.filter(c=>c.status==='valid').length)],['Próximos encuentros',String(m.upcoming)],['Requieren atención',String(m.alerts.length)]];
      cards.forEach((c,i)=>{const col=i%3,row=Math.floor(i/3),x=18+col*59,yy=y+row*24;doc.setFillColor(247,249,252);doc.roundedRect(x,yy,54,19,2,2,'F');doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110);doc.text(c[0].toUpperCase(),x+4,yy+6);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(0,11,60);doc.text(c[1],x+4,yy+14);}); y+=55;
      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Planes de capacitación',18,y);y+=7;doc.setFontSize(8);doc.setFont('helvetica','normal');const plans=companyPortalData.plans||[];if(!plans.length){doc.text('Sin planes corporativos registrados.',18,y);y+=7;}else{plans.slice(0,8).forEach(p=>{doc.setFont('helvetica','bold');doc.text(`• ${p.name}`,18,y);doc.setFont('helvetica','normal');doc.text(`  ${trainingPlanStatusLabel(p.status)} · ${(p.courses||[]).length} curso(s)`,18,y+4);y+=10;});}
      y+=4;doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Atención recomendada',18,y);y+=7;doc.setFontSize(8);doc.setFont('helvetica','normal');if(!m.alerts.length){doc.text('Sin alertas académicas relevantes.',18,y);}else{m.alerts.slice(0,10).forEach(a=>{doc.text(`• ${a.full_name||a.email||'Colaborador'}`,18,y);y+=5;});}
      doc.setFontSize(7);doc.setTextColor(130);doc.text(`Generado por Lutmin · ${new Date().toLocaleString('es-AR')}`,18,288);doc.save(`Lutmin_Reporte_${slugifyLutmin(name)}_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    function renderCompanyPortal() {
      const root = document.getElementById('companyPortalMembers');
      if (!root) return;
      if (!companyPortalData?.company) {
        root.innerHTML = '<div class="p-8 text-sm text-slate-500">Tu cuenta todavía no está vinculada a una empresa activa.</div>';
        return;
      }
      const company = companyPortalData.company;
      const members = Array.isArray(companyPortalData.members) ? companyPortalData.members : [];
      const q = String(document.getElementById('companyPortalSearch')?.value || '').trim().toLowerCase();
      const filtered = members.filter(m => !q || `${m.full_name || ''} ${m.email || ''}`.toLowerCase().includes(q));
      companyPortalCertificates = members.flatMap(m => (m.courses || []).map(c => c.certificate).filter(Boolean));

      document.getElementById('companyPortalName').textContent = company.display_name || company.name || 'Mi empresa';
      document.getElementById('companyPortalMeta').textContent = [company.cuit ? `CUIT ${company.cuit}` : '', company.contact_email || '', company.phone || ''].filter(Boolean).join(' · ') || 'Seguimiento corporativo';
      document.getElementById('companyStatMembers').textContent = String(members.length);
      document.getElementById('companyStatActive').textContent = String(members.reduce((n,m) => n + (m.courses || []).filter(c => c.status === 'active' && Number(c.progress || 0) < 100).length, 0));
      document.getElementById('companyStatCompleted').textContent = String(members.reduce((n,m) => n + (m.courses || []).filter(c => Number(c.progress || 0) >= 100 || c.status === 'completed').length, 0));
      document.getElementById('companyStatCertificates').textContent = String(companyPortalCertificates.filter(c => c.status === 'valid').length);
      paintCompanyBranding(company);
      renderCompanyExecutive();
      renderCompanyPlans();
      renderCompanyPortalAgenda();

      if (!filtered.length) {
        root.innerHTML = '<div class="p-8 text-sm text-slate-500">No hay colaboradores para mostrar.</div>';
        return;
      }
      root.innerHTML = filtered.map(member => {
        const courses = Array.isArray(member.courses) ? member.courses : [];
        const lastSeen = member.last_seen_at ? new Date(member.last_seen_at).toLocaleString('es-AR') : 'Sin ingresos registrados';
        const courseHtml = courses.length ? courses.map(c => {
          const pct = Math.max(0, Math.min(100, Number(c.progress || 0)));
          const certBtn = c.certificate ? `<button onclick="showCompanyCertificate('${escapeHtml(c.certificate.code)}')" class="text-[11px] font-bold ${c.certificate.status === 'valid' ? 'text-green-700' : 'text-red-600'}">${c.certificate.status === 'valid' ? 'Ver certificado' : 'Certificado revocado'}</button>` : '';
          return `<div class="rounded-2xl bg-slate-50 p-4"><div class="flex justify-between gap-3"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(c.title || 'Curso')}</p><p class="mt-1 text-[11px] text-slate-500">${companyMemberCourseStatus(c)} · ${c.completed_lessons || 0}/${c.total_lessons || 0} clases</p></div><span class="font-black text-lutmin-light">${Math.round(pct)}%</span></div><div class="mt-3 h-2 rounded-full bg-white overflow-hidden"><div class="h-full bg-lutmin-light rounded-full" style="width:${pct}%"></div></div>${certBtn ? `<div class="mt-3">${certBtn}</div>` : ''}</div>`;
        }).join('') : '<div class="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">Sin cursos asignados.</div>';
        return `<div class="p-5 sm:p-6"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p class="font-extrabold text-lutmin-dark">${escapeHtml(member.full_name || member.email || 'Colaborador')}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(member.email || '')}</p><p class="mt-1 text-[11px] text-slate-400">Último acceso: ${escapeHtml(lastSeen)}</p></div><div class="lg:w-2/3 grid md:grid-cols-2 gap-3">${courseHtml}</div></div></div>`;
      }).join('');
    }

    function renderCompanyPortalAgenda() {
      const root = document.getElementById('companyPortalAgenda');
      if (!root) return;
      const groups = Array.isArray(companyPortalData?.training) ? companyPortalData.training : [];
      const rows = groups.flatMap(g => (g.sessions || []).map(s => ({...s, group:g}))).sort((a,b) => String(a.session_date||'').localeCompare(String(b.session_date||'')) || String(a.start_time||'').localeCompare(String(b.start_time||'')));
      if (!rows.length) { root.innerHTML='<div class="lg:col-span-2 text-sm text-slate-500">Todavía no hay comisiones o encuentros programados.</div>'; return; }
      root.innerHTML = rows.map(x => {
        const d = x.session_date ? new Date(`${x.session_date}T12:00:00`).toLocaleDateString('es-AR') : 'Sin fecha';
        const time = x.start_time ? String(x.start_time).slice(0,5) : '';
        const total = Number(x.group.members || 0);
        const marked = Number(x.present||0)+Number(x.absent||0)+Number(x.justified||0);
        return `<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="text-[10px] font-bold uppercase text-indigo-600">${escapeHtml(x.group.course_title || '')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(x.title || x.group.name)}</h4><p class="mt-1 text-xs text-slate-500">${d}${time ? ' · '+time+' hs' : ''} · ${escapeHtml(x.group.name || '')}</p></div><span class="px-2.5 py-1 rounded-full bg-white text-[10px] font-bold h-fit">${escapeHtml(x.status || 'scheduled')}</span></div><p class="mt-3 text-xs text-slate-500"><strong>${x.present||0}</strong> presentes · <strong>${x.absent||0}</strong> ausentes · <strong>${x.justified||0}</strong> justificados · ${marked}/${total} registrados</p>${x.meeting_url ? `<a href="${escapeHtml(x.meeting_url)}" target="_blank" rel="noopener" class="mt-3 inline-flex text-xs font-bold text-lutmin-light">Abrir encuentro →</a>` : ''}</div>`;
      }).join('');
    }

    function showCompanyCertificate(code) {
      const cert = companyPortalCertificates.find(c => c.code === code);
      if (!cert) return showToast('No encontré ese certificado.');
      showCertificate(cert, { public: false });
    }

    function exportCompanyPortalCsv() {
      if (!companyPortalData?.members?.length) return showToast('No hay datos para exportar.');
      const rows = [['Colaborador','Email','Curso','Progreso','Estado','Certificado']];
      companyPortalData.members.forEach(m => {
        const courses = m.courses || [];
        if (!courses.length) rows.push([m.full_name || '', m.email || '', '', '0%', 'Sin cursos', '']);
        courses.forEach(c => rows.push([m.full_name || '', m.email || '', c.title || '', `${Math.round(Number(c.progress || 0))}%`, companyMemberCourseStatus(c), c.certificate?.code || '']));
      });
      const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Lutmin_Empresa_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    }

    function supportStatusLabel(v){return({open:'Abierto',in_progress:'En gestión',waiting_user:'Esperando respuesta',closed:'Cerrado'})[v]||v;}
    function supportStatusClass(v){return v==='closed'?'bg-slate-100 text-slate-600':v==='waiting_user'?'bg-amber-50 text-amber-700':v==='in_progress'?'bg-blue-50 text-blue-700':'bg-green-50 text-green-700';}
    async function loadSupportCenter(){
      if(!supabaseClient||!currentLutminUser)return;
      const [tRes,mRes]=await Promise.all([supabaseClient.from('support_tickets').select('id,created_by,company_id,subject,category,priority,status,created_at,updated_at').order('updated_at',{ascending:false}),supabaseClient.from('support_messages').select('id,ticket_id,sender_id,message,created_at').order('created_at')]);
      if(tRes.error||mRes.error){console.error(tRes.error||mRes.error);return showToast('No pude cargar la Mesa de ayuda. Revisá la configuración del módulo.');}
      supportTickets=tRes.data||[];supportMessages=mRes.data||[];renderSupportCenter();
    }
    function renderSupportCenter(){
      const root=document.getElementById('supportTicketsList');if(!root)return;
      const intro=document.getElementById('supportIntro');if(intro)intro.textContent=currentLutminUser?.role==='admin'?'Acá ves y respondés consultas de alumnos y empresas.':'Podés dejar una consulta y seguir la respuesta desde acá.';
      if(!supportTickets.length){root.innerHTML='<div class="p-6 text-sm text-slate-500">Todavía no hay consultas.</div>';return;}
      root.innerHTML=supportTickets.map(t=>{const msgs=supportMessages.filter(m=>m.ticket_id===t.id);const last=msgs[msgs.length-1];const date=new Date(t.updated_at||t.created_at).toLocaleString('es-AR');return `<button onclick="openSupportThread('${t.id}')" class="w-full p-5 text-left hover:bg-slate-50"><div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap gap-2"><span class="px-2 py-1 rounded-full ${supportStatusClass(t.status)} text-[10px] font-bold">${supportStatusLabel(t.status)}</span><span class="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">${escapeHtml(t.category)}</span>${t.priority==='alta'?'<span class="px-2 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">Alta</span>':''}</div><p class="mt-2 font-extrabold text-sm text-lutmin-dark">${escapeHtml(t.subject)}</p><p class="mt-1 text-xs text-slate-500 line-clamp-1">${escapeHtml(last?.message||'')}</p></div><span class="text-[10px] text-slate-400 shrink-0">${date}</span></div></button>`}).join('');
    }
    document.getElementById('supportTicketForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); let companyId=null; if(currentLutminUser?.role==='company_admin')companyId=currentAccessContext.companies?.[0]?.id||null;
      const {error}=await supabaseClient.rpc('create_support_ticket',{p_subject:document.getElementById('supportSubject').value.trim(),p_category:document.getElementById('supportCategory').value,p_priority:document.getElementById('supportPriority').value,p_message:document.getElementById('supportMessage').value.trim(),p_company_id:companyId});
      if(error)return showToast(error.message||'No pude crear la consulta.'); event.target.reset();showToast('Consulta enviada.');await loadSupportCenter();
    });
    async function openSupportThread(ticketId){
      if(!supportTickets.length)await loadSupportCenter(); const t=supportTickets.find(x=>x.id===ticketId);if(!t)return;
      document.getElementById('supportActiveTicket').value=t.id;document.getElementById('supportThreadTitle').textContent=t.subject;document.getElementById('supportThreadStatus').value=t.status;
      document.getElementById('supportAdminStatusWrap').classList.toggle('hidden',currentLutminUser?.role!=='admin');
      const msgs=supportMessages.filter(m=>m.ticket_id===t.id);document.getElementById('supportThreadMessages').innerHTML=msgs.map(m=>{const mine=m.sender_id===currentLutminUser.id;return `<div class="flex ${mine?'justify-end':'justify-start'}"><div class="max-w-[85%] rounded-2xl ${mine?'bg-lutmin-dark text-white':'bg-slate-100 text-slate-700'} px-4 py-3"><p class="text-sm whitespace-pre-wrap">${escapeHtml(m.message)}</p><p class="mt-1 text-[9px] ${mine?'text-slate-300':'text-slate-400'}">${new Date(m.created_at).toLocaleString('es-AR')}</p></div></div>`}).join('')||'<div class="text-sm text-slate-500">Sin mensajes.</div>';
      openModal('supportThreadModal');
    }
    document.getElementById('supportReplyForm')?.addEventListener('submit',async event=>{event.preventDefault();const id=document.getElementById('supportActiveTicket').value;const {error}=await supabaseClient.rpc('add_support_message',{p_ticket_id:id,p_message:document.getElementById('supportReplyText').value.trim()});if(error)return showToast(error.message||'No pude enviar la respuesta.');document.getElementById('supportReplyText').value='';await loadSupportCenter();await openSupportThread(id);});
    document.getElementById('supportThreadStatus')?.addEventListener('change',async event=>{if(currentLutminUser?.role!=='admin')return;const id=document.getElementById('supportActiveTicket').value;const {error}=await supabaseClient.rpc('admin_set_support_status',{p_ticket_id:id,p_status:event.target.value});if(error)return showToast(error.message||'No pude cambiar el estado.');await loadSupportCenter();showToast('Estado actualizado.');});

    function notificationKindMeta(kind) {
      const map = {
        success: ['fa-circle-check','bg-green-50','text-green-600'],
        course: ['fa-book-open','bg-blue-50','text-blue-600'],
        payment: ['fa-wallet','bg-amber-50','text-amber-600'],
        certificate: ['fa-award','bg-violet-50','text-violet-600'],
        company: ['fa-building','bg-cyan-50','text-cyan-600'],
        warning: ['fa-triangle-exclamation','bg-red-50','text-red-600'],
        system: ['fa-bullhorn','bg-slate-100','text-slate-700'],
        info: ['fa-circle-info','bg-blue-50','text-blue-600']
      };
      return map[kind] || map.info;
    }

    function notificationDate(value) {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(d);
    }

    function paintNotificationBadges() {
      const count = Number(notificationCenterData?.unread_count || 0);
      ['notificationBadgeDesktop','notificationBadgeMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count > 99 ? '99+' : String(count);
        el.classList.toggle('hidden', count <= 0);
        if (id === 'notificationBadgeMobile') el.classList.toggle('flex', count > 0);
      });
      const stat = document.getElementById('notificationUnreadStat');
      if (stat) stat.textContent = String(count);
    }

    async function loadNotificationCenter() {
      if (!supabaseClient || !currentLutminUser) return;
      const { data, error } = await supabaseClient.rpc('get_my_notification_center', { p_limit: 60 });
      if (error) {
        console.error('Notificaciones:', error);
        return;
      }
      notificationCenterData = {
        notifications: Array.isArray(data?.notifications) ? data.notifications : [],
        announcements: Array.isArray(data?.announcements) ? data.announcements : [],
        unread_count: Number(data?.unread_count || 0)
      };
      paintNotificationBadges();
      renderNotificationCenter();
    }

    function renderNotificationCenter() {
      const root = document.getElementById('notificationCenterList');
      if (!root) return;
      const direct = notificationCenterData.notifications || [];
      const announcements = notificationCenterData.announcements || [];
      document.getElementById('notificationDirectStat').textContent = String(direct.length);
      document.getElementById('notificationAnnouncementStat').textContent = String(announcements.length);
      paintNotificationBadges();

      const rows = [
        ...direct.map(x => ({...x, sortDate:x.created_at})),
        ...announcements.map(x => ({...x, sortDate:x.created_at}))
      ].sort((a,b) => new Date(b.sortDate) - new Date(a.sortDate));

      if (!rows.length) {
        root.innerHTML = '<div class="p-8 text-center"><div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto"><i class="fa-regular fa-bell"></i></div><p class="mt-3 font-bold text-lutmin-dark">No hay novedades todavía</p><p class="mt-1 text-xs text-slate-500">Los avisos importantes van a aparecer acá.</p></div>';
        return;
      }

      root.innerHTML = rows.map(item => {
        const [icon,bg,text] = notificationKindMeta(item.kind || (item.source === 'announcement' ? 'system':'info'));
        const unread = !item.read;
        const sourceLabel = item.source === 'announcement' ? 'Comunicado Lutmin' : 'Notificación';
        return `<button onclick="openNotificationItem('${item.source}','${item.id}','${escapeHtml(item.action_tab || '')}')" class="w-full text-left p-5 sm:p-6 hover:bg-slate-50 transition ${unread ? 'bg-blue-50/30' : ''}"><div class="flex gap-4"><div class="w-11 h-11 rounded-xl ${bg} ${text} flex items-center justify-center shrink-0"><i class="fa-solid ${icon}"></i></div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="font-extrabold text-lutmin-dark">${escapeHtml(item.title || 'Novedad')}</p>${unread ? '<span class="w-2 h-2 rounded-full bg-red-500"></span>' : ''}<span class="text-[10px] uppercase font-bold text-slate-400">${sourceLabel}</span></div><p class="mt-1 text-sm text-slate-600 leading-relaxed">${escapeHtml(item.body || '')}</p><p class="mt-2 text-[10px] text-slate-400">${notificationDate(item.created_at)}</p></div></div></button>`;
      }).join('');
    }

    async function openNotificationItem(source, id, actionTab) {
      if (source === 'announcement') await supabaseClient.rpc('mark_announcement_read', { p_announcement_id:id });
      else await supabaseClient.rpc('mark_notification_read', { p_notification_id:id });
      await loadNotificationCenter();
      if (actionTab) {
        const allowedForCompany = ['company','profile','notifications'];
        if (currentLutminUser?.role !== 'company_admin' || allowedForCompany.includes(actionTab)) {
          goToCampusTab(actionTab);
          if (actionTab === 'admin' && currentLutminUser?.role === 'admin') await loadAdminData();
        }
      }
    }

    async function markAllNotificationCenterRead() {
      if (!supabaseClient || !currentLutminUser) return;
      const { error } = await supabaseClient.rpc('mark_all_notifications_read');
      if (error) { showToast('No pude marcar las novedades.'); return; }
      await loadNotificationCenter();
      showToast('Novedades marcadas como leídas.');
    }

    function talentAvailabilityLabel(value) {
      return ({available:'Disponible',open:'Escucha propuestas',not_available:'No disponible'})[value] || 'Disponible';
    }
    function jobTypeLabel(value) {
      return ({full_time:'Jornada completa',part_time:'Media jornada',temporary:'Temporal',contract:'Contrato',internship:'Pasantía'})[value] || value || '';
    }
    function jobStatusLabel(value) {
      return ({draft:'Borrador',published:'Publicada',paused:'Pausada',closed:'Cerrada',filled:'Cubierta',new:'Nueva',reviewing:'En revisión',interview:'Entrevista',finalist:'Finalista',rejected:'Finalizada',hired:'Seleccionado/a',withdrawn:'Retirada'})[value] || value || '';
    }
    function publicTalentUrl(slug) {
      const u = new URL(window.location.href); u.search=''; u.hash=''; u.searchParams.set('talento',slug); return u.toString();
    }
    function scrollToPublicJobs(){ document.getElementById('publicJobsWrap')?.scrollIntoView({behavior:'smooth',block:'center'}); }

    async function loadPublicJobs() {
      if(!supabaseClient) return;
      const {data,error}=await supabaseClient.rpc('get_public_jobs');
      if(error){ console.error('Public jobs',error); return; }
      publicJobsData=Array.isArray(data)?data:[]; renderPublicJobs();
    }
    function renderPublicJobs(){
      const root=document.getElementById('publicJobsGrid'); if(!root)return;
      if(!publicJobsData.length){root.innerHTML='<div class="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay búsquedas publicadas. Podés crear tu perfil igualmente y dejarlo disponible para empresas.</div>';return;}
      root.innerHTML=publicJobsData.slice(0,6).map(j=>`<div class="rounded-2xl border border-slate-100 p-4 hover:border-blue-200 transition"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-slate-400">${escapeHtml(j.company_name||'Lutmin')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(j.title)}</h4><p class="mt-1 text-xs text-slate-500">${escapeHtml(j.location||'Ubicación a definir')} · ${escapeHtml(j.modality||'')}</p></div><span class="h-fit px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">${escapeHtml(jobTypeLabel(j.employment_type))}</span></div><p class="mt-3 text-xs text-slate-600 line-clamp-2">${escapeHtml(j.description||'')}</p><button onclick="openPublicJobApplication('${j.id}')" class="mt-3 text-xs text-lutmin-light font-extrabold">Ver y postularme →</button></div>`).join('');
    }
    async function openPublicJobApplication(jobId){
      if(!supabaseClient)return; const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){openAuthModal('campus');document.getElementById('authStatus').textContent='Ingresá con tu cuenta de alumno para postularte.';return;}
      await loadCurrentLutminUser(session.user); if(currentLutminUser?.role!=='student')return showToast('Las postulaciones están disponibles para alumnos.');
      openModal('campusModal'); goToCampusTab('talent'); await loadTalentCenter(); setTimeout(()=>document.querySelector(`[data-talent-job="${jobId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),150);
    }
    async function openConectaCampus(){
      if(!supabaseClient)return; const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){openAuthModal('campus');document.getElementById('authStatus').textContent='Ingresá con Acceso Alumno para completar tu perfil profesional.';return;}
      await loadCurrentLutminUser(session.user); if(currentLutminUser?.role!=='student')return showToast('Lutmin Conecta está disponible para cuentas de alumno.'); openModal('campusModal');goToCampusTab('talent');await loadTalentCenter();
    }

    async function loadTalentCenter(){
      if(await window.LutminV31Views?.ensureForTab?.('talent')===false)return;
      if(await window.LutminV29Modules?.ensureFeatureForTab?.('talent',currentLutminUser?.role)===false)return;
      if(!supabaseClient||currentLutminUser?.role!=='student')return;
      await supabaseClient.from('talent_profiles').upsert({user_id:currentLutminUser.id},{onConflict:'user_id',ignoreDuplicates:true});
      const [profileRes,skillsRes,expRes,appsRes,certRes,jobsRes,savedJobsRes,statsRes,detailsRes,requestRes]=await Promise.all([
        supabaseClient.from('talent_profiles').select('*').eq('user_id',currentLutminUser.id).maybeSingle(),
        supabaseClient.from('talent_skills').select('*').eq('user_id',currentLutminUser.id).order('level',{ascending:false}),
        supabaseClient.from('talent_experiences').select('*').eq('user_id',currentLutminUser.id).order('start_date',{ascending:false}),
        supabaseClient.from('job_applications').select('id,job_id,message,status,created_at,updated_at').eq('user_id',currentLutminUser.id).order('created_at',{ascending:false}),
        supabaseClient.from('certificates').select('code,course_title,duration_hours,score,issued_at,status').eq('user_id',currentLutminUser.id).eq('status','valid').order('issued_at',{ascending:false}),
        supabaseClient.rpc('get_public_jobs'),
        supabaseClient.from('talent_saved_jobs').select('job_id,created_at').eq('user_id',currentLutminUser.id),
        supabaseClient.rpc('my_talent_conecta_stats'),
        supabaseClient.rpc('my_conecta_application_details'),
        supabaseClient.rpc('my_talent_profile_request_status')
      ]);
      const err=[profileRes,skillsRes,expRes,appsRes,certRes,jobsRes,savedJobsRes,statsRes,detailsRes,requestRes].find(x=>x.error)?.error; if(err){console.error(err);return showToast('No pude cargar Lutmin Conecta. Revisá la conexión o el diagnóstico del sistema.');}
      talentData={profile:profileRes.data||null,skills:skillsRes.data||[],experiences:expRes.data||[],applications:appsRes.data||[],certificates:certRes.data||[],jobs:Array.isArray(jobsRes.data)?jobsRes.data:[],savedJobs:savedJobsRes.data||[],stats:statsRes.data||{},applicationDetails:detailsRes.data||{history:[],interviews:[]},requestStatus:requestRes.data||{approval_status:'draft'}};
      renderTalentCenter();
    }
    function renderTalentCenter(){
      const p=talentData.profile||{};
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??'';}; set('talentHeadline',p.headline);set('talentCity',p.city);set('talentProvince',p.province);set('talentPhone',p.phone);set('talentLinkedin',p.linkedin_url);set('talentYears',p.years_experience||0);set('talentAvailability',p.availability||'available');set('talentBio',p.bio);set('talentExternalCvUrl',p.external_cv_url);set('talentExternalCvLabel',p.external_cv_label||'CV externo');set('talentDesiredRole',p.desired_role);set('talentDesiredModality',p.desired_modality||'indistinto');set('talentDesiredLocation',p.desired_location);
      document.getElementById('talentTravel').checked=!!p.willing_travel;document.getElementById('talentVisible').checked=(p.approval_status==='approved'?!!p.visible:p.requested_visible!==false);document.getElementById('talentShareContact').checked=p.share_contact_with_companies!==false;document.getElementById('talentShareExternalCv').checked=p.share_external_cv_with_companies!==false;document.getElementById('talentRelocation').checked=!!p.open_to_relocation;
      const openCvBtn=document.getElementById('talentOpenExternalCvBtn');if(openCvBtn)openCvBtn.classList.toggle('hidden',!p.external_cv_url);
      const strength=calculateTalentProfileStrength(p,talentData.skills,talentData.experiences,talentData.certificates);document.getElementById('talentProfileStrength').textContent=`${strength.score}%`;document.getElementById('talentProfileStrengthBar').style.width=`${strength.score}%`;document.getElementById('talentProfileMissing').innerHTML=strength.missing.length?`Para mejorar tu perfil: <strong>${strength.missing.map(escapeHtml).join(' · ')}</strong>`:'<span class="text-green-700 font-bold">Perfil completo para mostrar a empresas.</span>';document.getElementById('talentViews30Stat').textContent=String(talentData.stats?.views_30d||0);document.getElementById('talentSavedJobsStat').textContent=String(talentData.savedJobs?.length||0);document.getElementById('talentApplicationsStat').textContent=String(talentData.applications?.length||0);
      const badge=document.getElementById('talentVisibilityBadge');badge.textContent=p.visible?'Visible para empresas':'Privado';badge.className=`px-3 py-1 rounded-full text-[10px] font-bold ${p.visible?'bg-green-50 text-green-700':'bg-slate-100 text-slate-600'}`;renderTalentApprovalState();
      document.getElementById('talentSkillCount').textContent=String(talentData.skills.length);
      document.getElementById('talentSkillsList').innerHTML=talentData.skills.length?talentData.skills.map(x=>`<span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">${escapeHtml(x.skill)} · ${x.level}/5 <button onclick="deleteTalentSkill('${x.id}')" class="text-blue-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button></span>`).join(''):'<span class="text-xs text-slate-400">Todavía no agregaste competencias.</span>';
      document.getElementById('talentExperiencesList').innerHTML=talentData.experiences.length?talentData.experiences.map(x=>`<div class="rounded-2xl bg-slate-50 p-4"><div class="flex justify-between gap-3"><div><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(x.position_title)}</p><p class="text-xs text-slate-500">${escapeHtml(x.company_name)} · ${x.start_date||'—'} ${x.current_job?'→ Actualidad':x.end_date?'→ '+x.end_date:''}</p></div><button onclick="deleteTalentExperience('${x.id}')" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash"></i></button></div>${x.description?`<p class="mt-2 text-xs text-slate-600">${escapeHtml(x.description)}</p>`:''}</div>`).join(''):'<p class="text-xs text-slate-400">Todavía no cargaste experiencia laboral.</p>';
      const appByJob=new Map(talentData.applications.map(a=>[a.job_id,a]));
      const savedSet=new Set((talentData.savedJobs||[]).map(x=>x.job_id));
      const jobsRoot=document.getElementById('talentJobsList'); jobsRoot.innerHTML=talentData.jobs.length?talentData.jobs.map(j=>{const a=appByJob.get(j.id),saved=savedSet.has(j.id),match=talentJobMatchSummary(j);return `<div class="p-5" data-talent-job="${j.id}"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><p class="text-[10px] uppercase text-slate-400 font-bold">${escapeHtml(j.company_name||'Lutmin')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(j.title)}</h4><p class="mt-1 text-xs text-slate-500">${escapeHtml(j.location||'A definir')} · ${escapeHtml(j.modality||'')} · ${escapeHtml(jobTypeLabel(j.employment_type))}</p>${match?`<p class="mt-2 text-[11px] font-bold text-blue-700"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>${escapeHtml(match)}</p>`:''}</div><div class="flex items-center gap-2">${a?`<span class="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold">${escapeHtml(jobStatusLabel(a.status))}</span>`:''}<button onclick="toggleSavedTalentJob('${j.id}')" class="w-9 h-9 rounded-xl ${saved?'bg-amber-50 text-amber-500':'bg-slate-100 text-slate-400'}" title="${saved?'Quitar de guardadas':'Guardar búsqueda'}"><i class="fa-${saved?'solid':'regular'} fa-bookmark"></i></button></div></div><p class="mt-3 text-sm text-slate-600">${escapeHtml(j.description||'')}</p>${j.requirements?`<div class="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>Requisitos:</strong> ${escapeHtml(j.requirements)}</div>`:''}<div class="mt-4">${a?'<span class="text-xs text-slate-400">Ya estás postulado/a a esta búsqueda.</span>':`<button onclick="applyTalentJob('${j.id}')" class="px-4 py-2.5 rounded-xl bg-lutmin-light text-white text-xs font-bold">Postularme</button>`}</div></div>`}).join(''):'<div class="p-6 text-sm text-slate-500">No hay búsquedas abiertas en este momento.</div>';
      const appsRoot=document.getElementById('talentApplicationsList');appsRoot.innerHTML=talentData.applications.length?talentData.applications.map(a=>{const j=talentData.jobs.find(x=>x.id===a.job_id)||publicJobsData.find(x=>x.id===a.job_id);const hist=(talentData.applicationDetails?.history||[]).filter(h=>h.application_id===a.id).slice(0,4);return `<div class="p-4"><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(j?.title||'Búsqueda laboral')}</p><p class="mt-1 text-xs text-slate-500">${new Date(a.created_at).toLocaleDateString('es-AR')}</p><span class="mt-2 inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">${escapeHtml(jobStatusLabel(a.status))}</span>${hist.length?`<div class="mt-3 border-l-2 border-violet-100 pl-3 space-y-1">${hist.map(h=>`<p class="text-[10px] text-slate-500">${new Date(h.created_at).toLocaleDateString('es-AR')} · ${escapeHtml(h.event_type==='interview_scheduled'?'Entrevista programada':jobStatusLabel(h.to_status)||'Actualización')}</p>`).join('')}</div>`:''}${['new','reviewing'].includes(a.status)?`<button onclick="withdrawTalentApplication('${a.id}')" class="mt-3 block text-[11px] text-red-600 font-bold">Retirar postulación</button>`:''}</div>`}).join(''):'<div class="p-5 text-sm text-slate-500">Todavía no te postulaste a ninguna búsqueda.</div>';
      const savedRoot=document.getElementById('talentSavedJobsList');const savedJobs=talentData.jobs.filter(j=>savedSet.has(j.id));savedRoot.innerHTML=savedJobs.length?savedJobs.map(j=>`<div class="rounded-2xl bg-slate-50 p-4"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-slate-400">${escapeHtml(j.company_name||'Lutmin')}</p><p class="font-extrabold text-lutmin-dark">${escapeHtml(j.title)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(j.location||'A definir')} · ${escapeHtml(j.modality||'')}</p></div><button onclick="toggleSavedTalentJob('${j.id}')" class="text-amber-500"><i class="fa-solid fa-bookmark"></i></button></div><button onclick="document.querySelector('[data-talent-job=\'${j.id}\']')?.scrollIntoView({behavior:'smooth',block:'center'})" class="mt-3 text-xs text-lutmin-light font-bold">Ver oportunidad →</button></div>`).join(''):'<p class="md:col-span-2 text-sm text-slate-400">Todavía no guardaste búsquedas.</p>';
      const interviewsRoot=document.getElementById('talentInterviewsList');if(interviewsRoot){const rows=(talentData.applicationDetails?.interviews||[]).filter(i=>i.status!=='cancelled');interviewsRoot.innerHTML=rows.length?rows.map(i=>`<div class="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(i.company_name||'Empresa')}</p><p class="font-extrabold text-lutmin-dark">${escapeHtml(i.job_title||'Entrevista')}</p><p class="mt-1 text-xs text-slate-500">${new Date(i.scheduled_at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})} · ${escapeHtml(i.modality||'')}</p>${i.location?`<p class="mt-1 text-[11px] text-slate-500">${escapeHtml(i.location)}</p>`:''}</div><div class="flex gap-2">${i.meeting_url&&i.status==='scheduled'?`<a href="${escapeHtml(i.meeting_url)}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Abrir reunión</a>`:''}<span class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">${i.status==='completed'?'Realizada':'Programada'}</span></div></div>`).join(''):'<div class="p-5 text-sm text-slate-500">No tenés entrevistas programadas.</div>';}

    }
    function calculateTalentProfileStrength(p,skills,experiences,certificates){const checks=[['título profesional',!!p.headline],['ubicación',!!(p.city||p.province)],['descripción',!!p.bio],['teléfono o LinkedIn',!!(p.phone||p.linkedin_url)],['competencias',(skills||[]).length>=2],['experiencia',(experiences||[]).length>=1],['preferencia laboral',!!p.desired_role],['CV externo o certificado',!!p.external_cv_url||(certificates||[]).length>0]];const done=checks.filter(x=>x[1]).length;return{score:Math.round(done/checks.length*100),missing:checks.filter(x=>!x[1]).map(x=>x[0])};}
    function openGoogleDriveForCv(){window.open('https://drive.google.com/drive/my-drive','_blank','noopener,noreferrer');showToast('Subí tu CV a Drive, compartilo mediante enlace y pegá ese enlace en Lutmin.');}
    function openMyExternalCv(){const url=talentData.profile?.external_cv_url||document.getElementById('talentExternalCvUrl')?.value.trim();if(!url)return showToast('Todavía no cargaste un enlace de CV.');window.open(url,'_blank','noopener,noreferrer');}
    async function toggleSavedTalentJob(jobId){const exists=(talentData.savedJobs||[]).some(x=>x.job_id===jobId);const q=exists?supabaseClient.from('talent_saved_jobs').delete().eq('user_id',currentLutminUser.id).eq('job_id',jobId):supabaseClient.from('talent_saved_jobs').insert({user_id:currentLutminUser.id,job_id:jobId});const {error}=await q;if(error)return showToast(error.message||'No pude actualizar guardadas.');showToast(exists?'Búsqueda quitada de guardadas.':'Búsqueda guardada.');await loadTalentCenter();}
    function talentJobMatchSummary(job){const p=talentData.profile||{},skills=(talentData.skills||[]).map(x=>(x.skill||'').toLowerCase()).filter(Boolean);const text=`${job.title||''} ${job.description||''} ${job.requirements||''}`.toLowerCase();const hits=skills.filter(sk=>text.includes(sk)).slice(0,3);const prefs=[];if(p.desired_modality&&p.desired_modality!=='indistinto'&&String(job.modality||'').toLowerCase()===p.desired_modality)prefs.push('modalidad');if(p.desired_location&&String(job.location||'').toLowerCase().includes(String(p.desired_location).toLowerCase()))prefs.push('ubicación');if(hits.length)return `Coincide con ${hits.join(', ')}${prefs.length?' · '+prefs.join(' y '):''}`;if(prefs.length)return `Coincide con tu preferencia de ${prefs.join(' y ')}`;return '';}

    document.getElementById('talentProfileForm')?.addEventListener('submit',async e=>{e.preventDefault();if(currentLutminUser?.role!=='student')return;const cvUrl=document.getElementById('talentExternalCvUrl').value.trim();if(cvUrl&&!/^https:\/\//i.test(cvUrl))return showToast('El enlace del CV debe comenzar con https://');const approved=talentData?.profile?.approval_status==='approved';const wantVisible=document.getElementById('talentVisible').checked;const payload={user_id:currentLutminUser.id,headline:document.getElementById('talentHeadline').value.trim()||null,bio:document.getElementById('talentBio').value.trim()||null,city:document.getElementById('talentCity').value.trim()||null,province:document.getElementById('talentProvince').value.trim()||null,phone:document.getElementById('talentPhone').value.trim()||null,linkedin_url:document.getElementById('talentLinkedin').value.trim()||null,years_experience:Number(document.getElementById('talentYears').value||0),availability:document.getElementById('talentAvailability').value,willing_travel:document.getElementById('talentTravel').checked,requested_visible:wantVisible,visible:approved?wantVisible:false,share_contact_with_companies:document.getElementById('talentShareContact').checked,external_cv_url:cvUrl||null,external_cv_label:document.getElementById('talentExternalCvLabel').value.trim()||null,share_external_cv_with_companies:document.getElementById('talentShareExternalCv').checked,desired_role:document.getElementById('talentDesiredRole').value.trim()||null,desired_modality:document.getElementById('talentDesiredModality').value||'indistinto',desired_location:document.getElementById('talentDesiredLocation').value.trim()||null,open_to_relocation:document.getElementById('talentRelocation').checked,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('talent_profiles').upsert(payload,{onConflict:'user_id'});if(error)return showToast(error.message||'No pude guardar el perfil.');showToast(approved?'Perfil profesional actualizado.':'Perfil guardado. Lutmin actualizó su estado automáticamente.');await loadTalentCenter();});

    function renderTalentApprovalState(){const p=talentData?.profile||{},rs=talentData?.requestStatus||{},status=p.approval_status||rs.approval_status||'draft';const title=document.getElementById('talentApprovalTitle'),text=document.getElementById('talentApprovalText'),badge=document.getElementById('talentApprovalBadge'),btn=document.getElementById('talentSubmitReviewBtn'),reason=document.getElementById('talentApprovalReason'),visible=document.getElementById('talentVisible'),label=document.getElementById('talentVisibleLabel');if(!title||!text||!badge)return;const cfg={draft:['Tu perfil se mantiene ordenado automáticamente','Lutmin completa, ordena y mantiene tu perfil sin generar tareas administrativas innecesarias.','BORRADOR','bg-slate-100 text-slate-600'],pending:['Solicitud en revisión','Tu perfil ya llegó a Lutmin. Mientras se revisa podés seguir completando datos, competencias y experiencia.','EN REVISIÓN','bg-amber-50 text-amber-700'],approved:['Perfil aprobado','Tu perfil profesional está habilitado. Vos decidís si querés aparecer en el banco de talento.','APROBADO','bg-green-50 text-green-700'],rejected:['Necesitamos algunos cambios','Revisá la observación de Lutmin, corregí el perfil y volvé a enviarlo.','A CORREGIR','bg-red-50 text-red-700']}[status]||null;title.textContent=cfg[0];text.textContent=cfg[1];badge.textContent=cfg[2];badge.className=`px-3 py-1.5 rounded-full text-[10px] font-extrabold ${cfg[3]}`;if(btn){btn.classList.toggle('hidden',status==='pending'||status==='approved');btn.innerHTML=status==='rejected'?'<i class="fa-solid fa-rotate mr-2"></i>Volver a enviar a revisión':'<i class="fa-solid fa-rotate mr-2"></i>Optimizar perfil';}if(reason){const msg=p.rejection_reason||rs.rejection_reason||rs.latest_request?.review_note||'';reason.classList.toggle('hidden',status!=='rejected'||!msg);reason.textContent=msg?`Observación de Lutmin: ${msg}`:'';}if(visible){visible.disabled=status==='pending';visible.classList.toggle('opacity-50',status==='pending');}if(label)label.textContent=status==='approved'?'Mostrarme a empresas':'Mostrarme a empresas cuando sea aprobado';}

    async function submitTalentProfileForReview(){if(!supabaseClient||currentLutminUser?.role!=='student')return;const p=talentData?.profile||{};if(p.approval_status==='approved')return showToast('Tu perfil ya está aprobado.');if(p.approval_status==='pending')return showToast('Tu solicitud ya está en revisión.');const ok=window.confirm('¿Enviar tu perfil profesional a revisión de Lutmin? Podrás seguir editando datos, pero no aparecerás a empresas hasta la aprobación.');if(!ok)return;const {error}=await supabaseClient.rpc('submit_talent_profile_request');if(error)return showToast(error.message||'No pude enviar la solicitud.');showToast('Solicitud enviada a Lutmin. Te avisaremos cuando sea revisada.');await loadTalentCenter();}

    document.getElementById('talentSkillForm')?.addEventListener('submit',async e=>{e.preventDefault();const skill=document.getElementById('talentSkillName').value.trim();if(!skill)return;const known=(competencyDataV33||[]).find(c=>String(c.name||'').trim().toLowerCase()===skill.toLowerCase()||String(c.code||'').trim().toLowerCase()===skill.toLowerCase());const payload={user_id:currentLutminUser.id,skill:known?.name||skill,level:Number(document.getElementById('talentSkillLevel').value||3),competency_id:known?.competency_id||null};const {error}=await supabaseClient.from('talent_skills').upsert(payload,{onConflict:'user_id,skill'});if(error)return showToast(error.message||'No pude agregar la competencia.');e.target.reset();document.getElementById('talentSkillLevel').value='3';await loadTalentCenter();});
    async function deleteTalentSkill(id){const {error}=await supabaseClient.from('talent_skills').delete().eq('id',id);if(error)return showToast('No pude quitar la competencia.');await loadTalentCenter();}
    document.getElementById('talentExperienceForm')?.addEventListener('submit',async e=>{e.preventDefault();const current=document.getElementById('talentExpCurrent').checked;const payload={user_id:currentLutminUser.id,company_name:document.getElementById('talentExpCompany').value.trim(),position_title:document.getElementById('talentExpPosition').value.trim(),start_date:document.getElementById('talentExpStart').value||null,end_date:current?null:(document.getElementById('talentExpEnd').value||null),current_job:current,description:document.getElementById('talentExpDescription').value.trim()||null};const {error}=await supabaseClient.from('talent_experiences').insert(payload);if(error)return showToast(error.message||'No pude agregar la experiencia.');e.target.reset();await loadTalentCenter();});
    async function deleteTalentExperience(id){const {error}=await supabaseClient.from('talent_experiences').delete().eq('id',id);if(error)return showToast('No pude quitar la experiencia.');await loadTalentCenter();}
    async function applyTalentJob(jobId){if(talentData?.profile?.approval_status!=='approved')return showToast('Completá tu perfil profesional para habilitar postulaciones automáticamente.');const message=window.prompt('Mensaje opcional para acompañar tu postulación:','')||'';const {error}=await supabaseClient.from('job_applications').insert({job_id:jobId,user_id:currentLutminUser.id,message:message||null});if(error)return showToast(error.code==='23505'?'Ya estás postulado/a a esta búsqueda.':error.message||'No pude registrar la postulación.');showToast('Postulación enviada.');await loadTalentCenter();}
    async function withdrawTalentApplication(id){if(!confirm('¿Retirar esta postulación?'))return;const {error}=await supabaseClient.from('job_applications').update({status:'withdrawn',updated_at:new Date().toISOString()}).eq('id',id);if(error)return showToast(error.message||'No pude retirar la postulación.');await loadTalentCenter();}
    async function copyMyTalentProfileLink(){if(!talentData.profile?.visible)return showToast('Primero activá “Mostrarme a empresas” y guardá el perfil.');const url=publicTalentUrl(talentData.profile.public_slug);try{await navigator.clipboard.writeText(url);showToast('Enlace público copiado.');}catch(_){window.prompt('Copiá este enlace:',url);}}
    async function downloadTalentCvPdf(){if(!(await ensureJsPdfLib()))return showToast('No se pudo cargar el generador PDF.');if(!talentData.profile)return showToast('Primero completá tu perfil.');const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});const p=talentData.profile;let y=20;doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text(currentLutminUser.fullName||'Perfil profesional',18,y);y+=8;doc.setFontSize(12);doc.setTextColor(47,141,253);doc.text(p.headline||'Perfil profesional Lutmin',18,y);y+=10;doc.setTextColor(80);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text([p.city,p.province].filter(Boolean).join(', ')||'Ubicación no informada',18,y);y+=5;doc.text(`${talentAvailabilityLabel(p.availability)}${p.willing_travel?' · Disponible para viajar':''}`,18,y);y+=10;if(p.bio){doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.text('Sobre mí',18,y);y+=6;doc.setFont('helvetica','normal');doc.setTextColor(70);const lines=doc.splitTextToSize(p.bio,174);doc.text(lines,18,y);y+=lines.length*4.5+6;}doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.text('Competencias',18,y);y+=6;doc.setFont('helvetica','normal');doc.setTextColor(70);doc.text(doc.splitTextToSize(talentData.skills.map(x=>talentSkillTextV33(x)).join(' · ')||'Sin competencias cargadas',174),18,y);y+=12;if(talentData.experiences.length){doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.text('Experiencia',18,y);y+=7;for(const x of talentData.experiences){if(y>270){doc.addPage();y=20;}doc.setFont('helvetica','bold');doc.setTextColor(40);doc.text(`${x.position_title} · ${x.company_name}`,18,y);y+=5;doc.setFont('helvetica','normal');doc.setTextColor(100);doc.text(`${x.start_date||''} - ${x.current_job?'Actualidad':x.end_date||''}`,18,y);y+=4;if(x.description){const lines=doc.splitTextToSize(x.description,170);doc.text(lines,18,y);y+=lines.length*4+4;}}}if(talentData.certificates.length){if(y>235){doc.addPage();y=20;}y+=4;doc.setFont('helvetica','bold');doc.setTextColor(10,24,79);doc.text('Certificaciones Lutmin',18,y);y+=7;doc.setFont('helvetica','normal');doc.setTextColor(70);for(const c of talentData.certificates){doc.text(`• ${c.course_title} · ${c.duration_hours} h · ${Math.round(Number(c.score||0))}% · ${c.code}`,18,y);y+=5;}}doc.setFontSize(7);doc.setTextColor(140);doc.text('CV generado desde Lutmin Conecta. Los certificados pueden verificarse mediante su código.',18,290);doc.save(`CV_${slugifyLutmin(currentLutminUser.fullName||'Lutmin')}.pdf`);}

    async function showPublicTalentProfile(slug){if(!supabaseClient||!slug)return;openModal('publicTalentModal');const root=document.getElementById('publicTalentContent');root.innerHTML='<div class="text-sm text-slate-500">Cargando perfil...</div>';const {data,error}=await supabaseClient.rpc('get_public_talent_profile',{p_slug:slug});if(error||!data){root.innerHTML='<div class="p-8 text-center"><h3 class="text-xl font-black text-lutmin-dark">Perfil no disponible</h3><p class="mt-2 text-sm text-slate-500">La persona puede haber desactivado la visibilidad.</p></div>';return;}const p=data.profile||{},skills=data.skills||[],exp=data.experiences||[],certs=data.certificates||[];const initials=String(p.full_name||'L').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();root.innerHTML=`<div class="flex flex-col sm:flex-row gap-5 sm:items-center"><div class="w-20 h-20 rounded-3xl bg-lutmin-dark text-white flex items-center justify-center text-2xl font-black">${escapeHtml(initials)}</div><div><p class="text-[10px] uppercase tracking-widest font-bold text-lutmin-light">Lutmin Conecta</p><h2 class="mt-1 text-3xl font-black text-lutmin-dark">${escapeHtml(p.full_name||'Perfil profesional')}</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(p.headline||'Perfil profesional')}</p><div class="mt-3 flex flex-wrap gap-2"><span class="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">${escapeHtml(talentAvailabilityLabel(p.availability))}</span>${p.city||p.province?`<span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">${escapeHtml([p.city,p.province].filter(Boolean).join(', '))}</span>`:''}${p.willing_travel?'<span class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Disponible para viajar</span>':''}</div></div></div>${p.bio?`<div class="mt-7"><h3 class="font-extrabold text-lutmin-dark">Sobre mí</h3><p class="mt-2 text-sm text-slate-600 leading-relaxed">${escapeHtml(p.bio)}</p></div>`:''}<div class="mt-7 grid lg:grid-cols-2 gap-5"><div><h3 class="font-extrabold text-lutmin-dark">Competencias</h3><div class="mt-3 flex flex-wrap gap-2">${skills.length?skills.map(x=>talentSkillBadgeHtmlV33(x,'public')).join(''):'<span class="text-xs text-slate-400">Sin competencias cargadas.</span>'}</div></div><div><h3 class="font-extrabold text-lutmin-dark">Certificaciones verificadas</h3><div class="mt-3 space-y-2">${certs.length?certs.map(c=>`<div class="rounded-xl bg-green-50 p-3"><p class="font-bold text-sm text-green-900">${escapeHtml(c.course_title)}</p><p class="text-[11px] text-green-700">${c.duration_hours} h · ${Math.round(Number(c.score||0))}% · ${escapeHtml(c.code)}</p></div>`).join(''):'<p class="text-xs text-slate-400">Sin certificados visibles.</p>'}</div></div></div><div class="mt-7"><h3 class="font-extrabold text-lutmin-dark">Experiencia</h3><div class="mt-3 space-y-2">${exp.length?exp.map(x=>`<div class="rounded-2xl bg-slate-50 p-4"><p class="font-bold text-sm">${escapeHtml(x.position_title)} · ${escapeHtml(x.company_name)}</p><p class="mt-1 text-xs text-slate-500">${x.start_date||''} → ${x.current_job?'Actualidad':x.end_date||''}</p>${x.description?`<p class="mt-2 text-xs text-slate-600">${escapeHtml(x.description)}</p>`:''}</div>`).join(''):'<p class="text-xs text-slate-400">Sin experiencia cargada.</p>'}</div></div>`;}

    // EMPRESAS: banco de talento + búsquedas
    let companyConectaCurrentView='overview';
    let companyCandidateData=null;
    let companyConectaSummary=null;

    async function loadCompanyConectaData(){
      if(await window.LutminV31Views?.ensureForTab?.('company-conecta')===false)return;
      if(await window.LutminV29Modules?.ensureFeatureForTab?.('company-conecta',currentLutminUser?.role)===false)return;
      if(!supabaseClient||currentLutminUser?.role!=='company_admin')return;
      const [pipelineRes,summaryRes]=await Promise.all([
        supabaseClient.rpc('company_job_pipeline'),
        supabaseClient.rpc('company_conecta_summary')
      ]);
      if(pipelineRes.error){console.error(pipelineRes.error);showToast('No pude cargar las búsquedas de la empresa.');return;}
      companyJobPipelineData=pipelineRes.data||{jobs:[],applications:[]};
      companyConectaSummary=summaryRes.error?null:(summaryRes.data||null);
      renderCompanyConectaHub();
    }

    function setCompanyConectaView(view){
      companyConectaCurrentView=view||'overview';
      document.querySelectorAll('.company-conecta-view').forEach(el=>el.classList.toggle('hidden',el.dataset.companyConectaView!==companyConectaCurrentView));
      document.querySelectorAll('.company-conecta-nav').forEach(btn=>{
        const active=btn.dataset.companyConectaNav===companyConectaCurrentView;
        btn.classList.toggle('bg-lutmin-dark',active);btn.classList.toggle('text-white',active);btn.classList.toggle('text-slate-600',!active);
      });
      if((view==='talent'||view==='favorites')&&!companyTalentData.length)searchCompanyTalent();
      if(view==='applications')renderCompanyConectaApplications();
      if(view==='pipeline')renderCompanyPipelineBoard();
      if(view==='interviews')renderCompanyInterviews();
      if(view==='favorites')renderCompanyConectaFavorites();
    }

    function renderCompanyConectaHub(){
      const jobs=companyJobPipelineData?.jobs||[],apps=companyJobPipelineData?.applications||[];
      const stat=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=String(val)};
      stat('companyConectaJobsStat',companyConectaSummary?.jobs??jobs.length);stat('companyConectaAppsStat',companyConectaSummary?.applications??apps.length);stat('companyConectaNewStat',companyConectaSummary?.new_applications??apps.filter(a=>a.status==='new').length);stat('companyConectaFavStat',companyConectaSummary?.favorites??(companyTalentData||[]).filter(x=>x.favorite).length);

      const recent=document.getElementById('companyConectaRecentApps');
      if(recent)recent.innerHTML=apps.length?apps.slice(0,6).map(a=>companyApplicationCard(a,true)).join(''):'<div class="p-6 text-sm text-slate-500">Todavía no hay postulaciones.</div>';

      const jobsRoot=document.getElementById('companyConectaJobsList');
      if(jobsRoot)jobsRoot.innerHTML=jobs.length?jobs.map(j=>{const count=apps.filter(a=>a.job_id===j.id).length;return `<div class="p-5 sm:p-6"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><div class="flex flex-wrap items-center gap-2"><h4 class="font-extrabold text-lutmin-dark">${escapeHtml(j.title)}</h4><span class="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold">${escapeHtml(jobStatusLabel(j.status))}</span></div><p class="mt-1 text-xs text-slate-500">${escapeHtml(j.location||'A definir')} · ${escapeHtml(j.modality||'')} · ${count} postulaciones · ${Number(j.vacancy_count||1)} vacante(s)</p>${j.description?`<p class="mt-3 text-sm text-slate-600 line-clamp-2">${escapeHtml(j.description)}</p>`:''}</div><div class="flex flex-wrap gap-2"><button onclick="companyOpenApplicationsForJob('${j.id}')" class="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold">Ver postulaciones (${count})</button>${j.status==='published'?`<button onclick="companySetJobStatus('${j.id}','paused')" class="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Pausar</button>`:''}${j.status==='paused'?`<button onclick="companySetJobStatus('${j.id}','published')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Reactivar</button>`:''}${!['closed','filled'].includes(j.status)?`<button onclick="companySetJobStatus('${j.id}','filled')" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Marcar cubierta</button>`:''}<button onclick="duplicateCompanyJob('${j.id}')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Duplicar</button></div></div></div>`}).join(''):'<div class="p-6 text-sm text-slate-500">Todavía no solicitaste búsquedas laborales.</div>';

      const filter=document.getElementById('companyApplicationJobFilter');
      if(filter){const val=filter.value;filter.innerHTML='<option value="">Todas las búsquedas</option>'+jobs.map(j=>`<option value="${j.id}">${escapeHtml(j.title)}</option>`).join('');if([...filter.options].some(o=>o.value===val))filter.value=val;}
      const pipeFilter=document.getElementById('companyPipelineJobFilter');if(pipeFilter){const val=pipeFilter.value;pipeFilter.innerHTML='<option value="">Todas las búsquedas</option>'+jobs.map(j=>`<option value="${j.id}">${escapeHtml(j.title)}</option>`).join('');if([...pipeFilter.options].some(o=>o.value===val))pipeFilter.value=val;}
      renderCompanyConectaApplications();
      renderCompanyPipelineBoard();
      renderCompanyInterviews();
      renderCompanyTalentResults();
      renderCompanyConectaFavorites();
      setCompanyConectaView(companyConectaCurrentView);
    }

    function companyApplicationCard(a,compact=false){
      const tags=Array.isArray(a.tags)?a.tags:[];
      return `<div class="${compact?'p-5':'p-5 sm:p-6'}"><div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div class="min-w-0"><p class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(a.job_title||'Búsqueda')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(a.full_name||a.email||'Candidato')}</h4><p class="mt-1 text-xs text-slate-500">${escapeHtml(a.headline||a.desired_role||'Perfil profesional')} · ${escapeHtml([a.city,a.province].filter(Boolean).join(', ')||'Ubicación no informada')}</p><p class="mt-1 text-[11px] text-slate-400">Postulación: ${new Date(a.created_at).toLocaleDateString('es-AR')}${a.next_interview?` · Entrevista ${new Date(a.next_interview).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}`:''}</p>${tags.length?`<div class="mt-2 flex flex-wrap gap-1">${tags.map(t=>`<span class="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold">${escapeHtml(t)}</span>`).join('')}</div>`:''}</div><div class="flex flex-wrap items-center gap-2"><button onclick="openCompanyCandidateProfile('${a.user_id}','${a.id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold"><i class="fa-solid fa-user mr-1"></i>Ver perfil</button>${a.external_cv_url?`<button onclick="openCompanyExternalCv('${a.user_id}','${escapeHtml(a.external_cv_url)}')" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold"><i class="fa-solid fa-file-arrow-down mr-1"></i>CV</button>`:''}<select onchange="companySetApplicationStatus('${a.id}',this.value)" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"><option value="new" ${a.status==='new'?'selected':''}>Nueva</option><option value="reviewing" ${a.status==='reviewing'?'selected':''}>En revisión</option><option value="interview" ${a.status==='interview'?'selected':''}>Entrevista</option><option value="finalist" ${a.status==='finalist'?'selected':''}>Finalista</option><option value="hired" ${a.status==='hired'?'selected':''}>Seleccionado/a</option><option value="rejected" ${a.status==='rejected'?'selected':''}>Finalizada</option></select></div></div></div>`;
    }

    function renderCompanyConectaApplications(){
      const root=document.getElementById('companyConectaApplicationsList');if(!root)return;
      const job=document.getElementById('companyApplicationJobFilter')?.value||'',status=document.getElementById('companyApplicationStatusFilter')?.value||'';
      let rows=[...(companyJobPipelineData?.applications||[])];
      if(job)rows=rows.filter(x=>x.job_id===job);if(status)rows=rows.filter(x=>x.status===status);
      root.innerHTML=rows.length?rows.map(a=>companyApplicationCard(a,false)).join(''):'<div class="p-6 text-sm text-slate-500">No hay postulaciones con estos filtros.</div>';
    }

    function companyOpenApplicationsForJob(jobId){
      setCompanyConectaView('applications');const sel=document.getElementById('companyApplicationJobFilter');if(sel){sel.value=jobId;renderCompanyConectaApplications();}
    }

    function renderCompanyPipelineBoard(){
      const root=document.getElementById('companyPipelineBoard');if(!root)return;
      const jobId=document.getElementById('companyPipelineJobFilter')?.value||'';
      let apps=[...(companyJobPipelineData?.applications||[])].filter(a=>!jobId||a.job_id===jobId);
      const columns=[['new','Nuevos'],['reviewing','En revisión'],['interview','Entrevista'],['finalist','Finalistas'],['hired','Seleccionados']];
      root.innerHTML=`<div class="flex gap-3 min-w-[1050px]">${columns.map(([key,label])=>{const rows=apps.filter(a=>a.status===key);return `<div class="w-[205px] shrink-0 rounded-2xl bg-slate-50 border border-slate-100"><div class="p-3 border-b border-slate-100 flex justify-between"><span class="text-xs font-extrabold text-lutmin-dark">${label}</span><span class="text-[10px] font-black text-slate-400">${rows.length}</span></div><div class="p-2 space-y-2">${rows.length?rows.map(a=>`<button onclick="openCompanyCandidateProfile('${a.user_id}','${a.id}')" class="w-full text-left bg-white rounded-xl border border-slate-100 p-3 hover:border-violet-200"><p class="text-[10px] text-violet-600 font-bold">${escapeHtml(a.job_title||'')}</p><p class="mt-1 text-xs font-extrabold text-lutmin-dark">${escapeHtml(a.full_name||'Candidato')}</p><p class="mt-1 text-[10px] text-slate-400">${escapeHtml(a.headline||a.desired_role||'Perfil')}</p>${a.next_interview?`<p class="mt-2 text-[10px] text-violet-700 font-bold"><i class="fa-solid fa-calendar mr-1"></i>${new Date(a.next_interview).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}</p>`:''}</button>`).join(''):'<p class="p-3 text-[10px] text-slate-400">Sin candidatos.</p>'}</div></div>`}).join('')}</div>`;
    }

    function renderCompanyInterviews(){
      const root=document.getElementById('companyInterviewsList');if(!root)return;
      const rows=[...(companyJobPipelineData?.interviews||[])].sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
      root.innerHTML=rows.length?rows.map(i=>`<div class="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><p class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(i.job_title||'Búsqueda')}</p><h4 class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(i.full_name||'Candidato')}</h4><p class="mt-1 text-xs text-slate-500">${new Date(i.scheduled_at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})} · ${escapeHtml(i.modality||'')}</p>${i.location?`<p class="mt-1 text-[11px] text-slate-500">${escapeHtml(i.location)}</p>`:''}</div><div class="flex flex-wrap gap-2"><button onclick="openCompanyCandidateProfile('${i.user_id}','${i.application_id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Ver candidato</button>${i.meeting_url&&i.status==='scheduled'?`<a href="${escapeHtml(i.meeting_url)}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Abrir reunión</a>`:''}${i.status==='scheduled'?`<button onclick="companyUpdateInterviewStatus('${i.id}','completed')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Marcar realizada</button><button onclick="companyUpdateInterviewStatus('${i.id}','cancelled')" class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Cancelar</button>`:`<span class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">${i.status==='completed'?'Realizada':'Cancelada'}</span>`}</div></div>`).join(''):'<div class="p-6 text-sm text-slate-500">Todavía no hay entrevistas programadas.</div>';
    }

    async function companyUpdateInterviewStatus(id,status){const {error}=await supabaseClient.rpc('company_update_interview_status',{p_interview_id:id,p_status:status});if(error)return showToast(error.message||'No pude actualizar la entrevista.');showToast('Entrevista actualizada.');await loadCompanyConectaData();if(companyCandidateData)await openCompanyCandidateProfile(companyCandidateData.userId,companyCandidateData.applicationId);}

    async function searchCompanyTalent(){
      if(currentLutminUser?.role!=='company_admin')return;
      const q=document.getElementById('companyTalentQuery')?.value.trim()||'',skill=document.getElementById('companyTalentSkill')?.value.trim()||'';
      const {data,error}=await supabaseClient.rpc('company_search_talent',{p_query:q||null,p_skill:skill||null});
      if(error)return showToast(error.message||'No pude buscar talento.');
      companyTalentData=Array.isArray(data)?data:[];renderCompanyTalentResults();renderCompanyConectaFavorites();
      const fav=document.getElementById('companyConectaFavStat');if(fav)fav.textContent=String(companyTalentData.filter(x=>x.favorite).length);
    }

    function companyTalentCard(x){return `<div class="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="font-extrabold text-lutmin-dark">${escapeHtml(x.full_name||'Perfil')}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(x.headline||x.desired_role||'Perfil profesional')} · ${escapeHtml([x.city,x.province].filter(Boolean).join(', ')||'Sin ubicación')}</p></div><button onclick="toggleCompanyTalentFavorite('${x.user_id}')" class="w-9 h-9 rounded-xl bg-white text-lg ${x.favorite?'text-amber-500':'text-slate-300'}"><i class="fa-solid fa-star"></i></button></div><div class="mt-3 flex flex-wrap gap-1.5">${(x.skills||[]).slice(0,5).map(s=>talentSkillBadgeHtmlV33(s,'compact')).join('')}</div><p class="mt-3 text-[11px] text-slate-500">${(x.certificates||[]).length} certificados Lutmin · ${x.years_experience||0} años de experiencia</p><div class="mt-3 flex flex-wrap gap-2"><button onclick="openCompanyCandidateProfile('${x.user_id}')" class="px-3 py-2 rounded-xl bg-lutmin-dark text-white text-xs font-bold">Ver perfil completo</button>${x.external_cv_url?`<button onclick="openCompanyExternalCv('${x.user_id}','${escapeHtml(x.external_cv_url)}')" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">Ver CV</button>`:''}</div></div>`;}

    function renderCompanyTalentResults(){const root=document.getElementById('companyTalentResults');if(!root)return;root.innerHTML=companyTalentData.length?companyTalentData.map(companyTalentCard).join(''):'<div class="md:col-span-2 text-sm text-slate-500">No encontramos perfiles con esos filtros.</div>';}
    function renderCompanyConectaFavorites(){const root=document.getElementById('companyConectaFavoritesList');if(!root)return;const rows=(companyTalentData||[]).filter(x=>x.favorite);root.innerHTML=rows.length?rows.map(companyTalentCard).join(''):'<div class="md:col-span-2 text-sm text-slate-500">Todavía no guardaste candidatos como favoritos.</div>';}

    async function openCompanyCandidateProfile(userId,applicationId=null){
      if(!userId)return;openModal('companyCandidateModal');const root=document.getElementById('companyCandidateContent');root.innerHTML='<div class="text-sm text-slate-500">Cargando perfil...</div>';
      try{await supabaseClient.rpc('record_company_talent_view',{p_user_id:userId});}catch(_){ }
      const {data,error}=await supabaseClient.rpc('company_get_candidate_profile',{p_user_id:userId});
      if(error||!data){root.innerHTML='<div class="p-8 text-center"><h3 class="text-xl font-black text-lutmin-dark">No pude abrir el perfil</h3><p class="mt-2 text-sm text-slate-500">'+escapeHtml(error?.message||'Perfil no disponible.')+'</p></div>';return;}
      companyCandidateData={...data,userId,applicationId};renderCompanyCandidateProfile();
    }

    function renderCompanyCandidateProfile(){
      const root=document.getElementById('companyCandidateContent');if(!root||!companyCandidateData)return;
      const d=companyCandidateData,p=d.profile||{},skills=d.skills||[],exp=d.experiences||[],certs=d.certificates||[],apps=d.applications||[],history=d.history||[],interviews=d.interviews||[],tags=d.tags||[];
      const initials=String(p.full_name||'C').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();const activeApp=d.applicationId?apps.find(x=>x.id===d.applicationId):apps[0];
      const appHistory=activeApp?history.filter(h=>h.application_id===activeApp.id):history;const appInterviews=activeApp?interviews.filter(i=>i.application_id===activeApp.id):interviews;
      root.innerHTML=`<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 pr-10"><div class="flex gap-4"><div class="w-16 h-16 rounded-2xl bg-lutmin-dark text-white flex items-center justify-center text-xl font-black shrink-0">${escapeHtml(initials)}</div><div><p class="text-[10px] uppercase tracking-widest text-violet-600 font-extrabold">Perfil de candidato</p><h2 class="mt-1 text-2xl sm:text-3xl font-black text-lutmin-dark">${escapeHtml(p.full_name||'Candidato')}</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(p.headline||p.desired_role||'Perfil profesional')}</p><div class="mt-2 flex flex-wrap gap-2"><span class="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold">${escapeHtml([p.city,p.province].filter(Boolean).join(', ')||'Ubicación no informada')}</span>${p.years_experience!=null?`<span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">${Number(p.years_experience)||0} años experiencia</span>`:''}${p.favorite?'<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">★ Favorito</span>':''}</div></div></div><button onclick="toggleCompanyCandidateFavorite()" class="px-3 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">${p.favorite?'Quitar favorito':'★ Guardar candidato'}</button></div>
      <div class="mt-5 rounded-2xl bg-amber-50/70 border border-amber-100 p-4"><div class="flex flex-col sm:flex-row gap-3 sm:items-center"><div class="flex-1"><label class="text-[10px] uppercase font-bold text-amber-700">Etiquetas privadas</label><div class="mt-2 flex flex-wrap gap-1.5">${tags.length?tags.map(t=>`<span class="px-2.5 py-1 rounded-full bg-white text-amber-800 text-[10px] font-bold">${escapeHtml(t)}</span>`).join(''):'<span class="text-xs text-slate-500">Sin etiquetas.</span>'}</div></div><button onclick="editCompanyCandidateTags()" class="px-3 py-2 rounded-xl bg-white text-amber-800 text-xs font-bold">Editar etiquetas</button></div></div>
      <div class="mt-6 grid lg:grid-cols-[1.2fr_.8fr] gap-5"><div class="space-y-5"><div class="rounded-3xl bg-slate-50 p-5"><h3 class="font-extrabold text-lutmin-dark">Sobre el perfil</h3><p class="mt-3 text-sm text-slate-600 leading-relaxed">${escapeHtml(p.bio||'La persona todavía no agregó una presentación.')}</p><div class="mt-4 grid sm:grid-cols-2 gap-3 text-xs"><div><span class="text-slate-400">Busca</span><p class="font-bold text-lutmin-dark">${escapeHtml(p.desired_role||'No informado')}</p></div><div><span class="text-slate-400">Modalidad</span><p class="font-bold text-lutmin-dark">${escapeHtml(p.desired_modality||'Indistinto')}</p></div><div><span class="text-slate-400">Zona buscada</span><p class="font-bold text-lutmin-dark">${escapeHtml(p.desired_location||'No informada')}</p></div><div><span class="text-slate-400">Viajes / reubicación</span><p class="font-bold text-lutmin-dark">${p.willing_travel?'Viajes · ':''}${p.open_to_relocation?'Acepta reubicación':'Sin reubicación informada'}</p></div></div></div>
      <div><h3 class="font-extrabold text-lutmin-dark">Competencias</h3><div class="mt-3 flex flex-wrap gap-2">${skills.length?skills.map(x=>talentSkillBadgeHtmlV33(x,'company')).join(''):'<span class="text-sm text-slate-400">Sin competencias cargadas.</span>'}</div></div>
      <div><h3 class="font-extrabold text-lutmin-dark">Experiencia laboral</h3><div class="mt-3 space-y-3">${exp.length?exp.map(x=>`<div class="rounded-2xl border border-slate-100 p-4"><p class="font-bold text-sm text-lutmin-dark">${escapeHtml(x.position_title)} · ${escapeHtml(x.company_name)}</p><p class="mt-1 text-[11px] text-slate-500">${escapeHtml(x.start_date||'')} ${x.current_job?'→ Actualidad':x.end_date?'→ '+escapeHtml(x.end_date):''}</p>${x.description?`<p class="mt-2 text-xs text-slate-600">${escapeHtml(x.description)}</p>`:''}</div>`).join(''):'<p class="text-sm text-slate-400">Sin experiencia cargada.</p>'}</div></div>
      <div><h3 class="font-extrabold text-lutmin-dark">Certificados Lutmin</h3><div class="mt-3 space-y-2">${certs.length?certs.map(c=>`<div class="rounded-xl bg-green-50 p-3 flex justify-between gap-3"><div><p class="font-bold text-xs text-green-900">${escapeHtml(c.course_title)}</p><p class="text-[10px] text-green-700">${c.duration_hours||0} h · ${Math.round(Number(c.score||0))}% · ${escapeHtml(c.code||'')}</p></div><i class="fa-solid fa-circle-check text-green-500"></i></div>`).join(''):'<p class="text-sm text-slate-400">Sin certificados Lutmin.</p>'}</div></div>
      ${activeApp?`<div class="rounded-3xl border border-violet-100 p-5"><h3 class="font-extrabold text-lutmin-dark">Historial del proceso</h3><div class="mt-4 border-l-2 border-violet-100 pl-4 space-y-3">${appHistory.length?appHistory.map(h=>`<div><p class="text-xs font-bold text-lutmin-dark">${escapeHtml(h.event_type==='interview_scheduled'?'Entrevista programada':h.event_type==='applied'?'Postulación enviada':jobStatusLabel(h.to_status)||'Actualización')}</p><p class="text-[10px] text-slate-400">${new Date(h.created_at).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}</p></div>`).join(''):'<p class="text-xs text-slate-400">Todavía no hay movimientos registrados.</p>'}</div></div>`:''}</div>
      <div class="space-y-4"><div class="rounded-3xl bg-lutmin-dark text-white p-5"><p class="text-xs uppercase tracking-widest text-blue-200 font-bold">Contacto y CV</p>${p.email?`<p class="mt-4 text-sm"><i class="fa-solid fa-envelope w-6 text-lutmin-light"></i>${escapeHtml(p.email)}</p>`:''}${p.phone?`<p class="mt-2 text-sm"><i class="fa-solid fa-phone w-6 text-lutmin-light"></i>${escapeHtml(p.phone)}</p>`:''}${p.linkedin_url?`<a href="${escapeHtml(p.linkedin_url)}" target="_blank" rel="noopener" class="mt-2 block text-sm text-blue-200"><i class="fa-brands fa-linkedin w-6"></i>LinkedIn</a>`:''}${p.external_cv_url?`<button onclick="openCompanyExternalCv('${p.user_id}','${escapeHtml(p.external_cv_url)}')" class="mt-4 w-full py-3 rounded-xl bg-white text-lutmin-dark font-bold text-sm"><i class="fa-solid fa-file-arrow-down mr-2"></i>${escapeHtml(p.external_cv_label||'Abrir CV')}</button>`:'<p class="mt-4 text-xs text-slate-300">El candidato no compartió un CV externo.</p>'}</div>
      ${activeApp?`<div class="rounded-3xl border border-violet-100 bg-violet-50 p-5"><p class="text-[10px] uppercase font-bold text-violet-600">Postulación</p><p class="mt-2 font-extrabold text-lutmin-dark">${escapeHtml(activeApp.job_title||'Búsqueda')}</p>${activeApp.message?`<p class="mt-2 text-xs text-slate-600">“${escapeHtml(activeApp.message)}”</p>`:''}<select onchange="companySetApplicationStatus('${activeApp.id}',this.value,true)" class="mt-4 w-full px-3 py-2.5 rounded-xl bg-white border border-violet-100 text-xs"><option value="new" ${activeApp.status==='new'?'selected':''}>Nueva</option><option value="reviewing" ${activeApp.status==='reviewing'?'selected':''}>En revisión</option><option value="interview" ${activeApp.status==='interview'?'selected':''}>Entrevista</option><option value="finalist" ${activeApp.status==='finalist'?'selected':''}>Finalista</option><option value="hired" ${activeApp.status==='hired'?'selected':''}>Seleccionado/a</option><option value="rejected" ${activeApp.status==='rejected'?'selected':''}>Finalizada</option></select></div>`:''}
      ${activeApp?`<div class="rounded-3xl border border-violet-100 p-5"><h3 class="font-extrabold text-lutmin-dark">Programar entrevista</h3><input id="candidateInterviewDate" type="datetime-local" class="mt-3 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"><select id="candidateInterviewModality" class="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"><option value="virtual">Virtual</option><option value="presencial">Presencial</option><option value="telefonica">Telefónica</option></select><input id="candidateInterviewPlace" class="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="Lugar / detalle"><input id="candidateInterviewUrl" type="url" class="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="Link Meet / Teams (opcional)"><button onclick="scheduleCompanyInterview('${activeApp.id}')" class="mt-3 w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold">Programar entrevista</button>${appInterviews.length?`<div class="mt-4 space-y-2">${appInterviews.slice(0,3).map(i=>`<div class="rounded-xl bg-violet-50 p-3"><p class="text-xs font-bold text-violet-900">${new Date(i.scheduled_at).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}</p><p class="text-[10px] text-violet-700">${escapeHtml(i.modality||'')} · ${escapeHtml(i.status||'')}</p></div>`).join('')}</div>`:''}</div>`:''}
      <div class="rounded-3xl border border-slate-100 p-5"><label class="text-xs font-bold text-slate-600">Nota privada de la empresa</label><textarea id="companyCandidateNote" rows="5" class="mt-2 w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" placeholder="Observaciones internas, próximos pasos, impresión de entrevista...">${escapeHtml(d.company_note||'')}</textarea><button onclick="saveCompanyCandidateNote()" class="mt-3 w-full py-2.5 rounded-xl bg-slate-100 text-lutmin-dark text-xs font-bold">Guardar nota</button></div></div></div>`;
    }

    async function editCompanyCandidateTags(){if(!companyCandidateData)return;const current=(companyCandidateData.tags||[]).join(', ');const value=window.prompt('Etiquetas separadas por coma. Ej: Entrevistar, Perfil técnico, Disponible inmediato',current);if(value===null)return;const tags=value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);const {data,error}=await supabaseClient.rpc('company_set_candidate_tags',{p_user_id:companyCandidateData.userId,p_tags:tags});if(error)return showToast(error.message||'No pude guardar las etiquetas.');companyCandidateData.tags=Array.isArray(data)?data:tags;showToast('Etiquetas actualizadas.');renderCompanyCandidateProfile();await loadCompanyConectaData();}
    async function scheduleCompanyInterview(applicationId){const date=document.getElementById('candidateInterviewDate')?.value;if(!date)return showToast('Indicá fecha y hora.');const modality=document.getElementById('candidateInterviewModality')?.value||'virtual',location=document.getElementById('candidateInterviewPlace')?.value.trim()||null,url=document.getElementById('candidateInterviewUrl')?.value.trim()||null;const iso=new Date(date).toISOString();const {error}=await supabaseClient.rpc('company_schedule_interview',{p_application_id:applicationId,p_scheduled_at:iso,p_duration_minutes:45,p_modality:modality,p_location:location,p_meeting_url:url,p_notes:null});if(error)return showToast(error.message||'No pude programar la entrevista.');showToast('Entrevista programada y candidato notificado.');await loadCompanyConectaData();await openCompanyCandidateProfile(companyCandidateData.userId,applicationId);}

    async function saveCompanyCandidateNote(){if(!companyCandidateData)return;const note=document.getElementById('companyCandidateNote')?.value||'';const {error}=await supabaseClient.rpc('company_save_candidate_note',{p_user_id:companyCandidateData.userId,p_note:note});if(error)return showToast(error.message||'No pude guardar la nota.');companyCandidateData.company_note=note;showToast('Nota privada guardada.');}
    async function toggleCompanyCandidateFavorite(){if(!companyCandidateData)return;const {data,error}=await supabaseClient.rpc('company_toggle_talent_favorite',{p_user_id:companyCandidateData.userId});if(error)return showToast(error.message||'No pude actualizar favoritos.');companyCandidateData.profile.favorite=Boolean(data);const item=(companyTalentData||[]).find(x=>x.user_id===companyCandidateData.userId);if(item)item.favorite=Boolean(data);showToast(data?'Candidato guardado.':'Candidato quitado de favoritos.');renderCompanyTalentResults();renderCompanyConectaFavorites();await loadCompanyConectaData();renderCompanyCandidateProfile();}
    async function openCompanyTalentProfile(slug,userId){await openCompanyCandidateProfile(userId);}
    async function openCompanyExternalCv(userId,url){try{await supabaseClient.rpc('record_company_talent_view',{p_user_id:userId});}catch(_){ }window.open(url,'_blank','noopener,noreferrer');}
    async function toggleCompanyTalentFavorite(userId){const {data,error}=await supabaseClient.rpc('company_toggle_talent_favorite',{p_user_id:userId});if(error)return showToast(error.message||'No pude actualizar favoritos.');const item=(companyTalentData||[]).find(x=>x.user_id===userId);if(item)item.favorite=Boolean(data);renderCompanyTalentResults();renderCompanyConectaFavorites();await loadCompanyConectaData();}

    document.getElementById('companyJobRequestForm')?.addEventListener('submit',async e=>{e.preventDefault();const companyId=companyPortalData?.company?.id;if(!companyId)return showToast('No hay empresa vinculada.');const payload={company_id:companyId,title:document.getElementById('companyJobTitle').value.trim(),description:document.getElementById('companyJobDescription').value.trim(),requirements:document.getElementById('companyJobRequirements').value.trim()||null,location:document.getElementById('companyJobLocation').value.trim()||null,modality:document.getElementById('companyJobModality').value,employment_type:document.getElementById('companyJobType').value,vacancy_count:Number(document.getElementById('companyJobVacancies')?.value||1),closes_at:document.getElementById('companyJobCloses')?.value||null,status:'draft',created_by:currentLutminUser.id};const {error}=await supabaseClient.from('job_posts').insert(payload);if(error)return showToast(error.message||'No pude enviar la búsqueda.');e.target.reset();showToast('Búsqueda enviada a revisión de Lutmin.');companyConectaCurrentView='jobs';await loadCompanyConectaData();});

    async function companySetJobStatus(id,status){const {error}=await supabaseClient.rpc('company_set_job_status',{p_job_id:id,p_status:status});if(error)return showToast(error.message||'No pude cambiar el estado de la búsqueda.');showToast('Búsqueda actualizada.');await loadCompanyConectaData();await loadPublicJobs();}
    async function duplicateCompanyJob(id){const {error}=await supabaseClient.rpc('company_duplicate_job',{p_job_id:id});if(error)return showToast(error.message||'No pude duplicar la búsqueda.');showToast('Búsqueda duplicada como borrador.');await loadCompanyConectaData();}
    function renderCompanyJobPipeline(){renderCompanyConectaHub();}
    async function companySetApplicationStatus(id,status,keepModal=false){const {error}=await supabaseClient.rpc('set_job_application_status',{p_application_id:id,p_status:status,p_internal_notes:null});if(error)return showToast(error.message||'No pude actualizar la postulación.');showToast('Estado actualizado.');await loadCompanyConectaData();if(keepModal&&companyCandidateData)await openCompanyCandidateProfile(companyCandidateData.userId,id);}

    // ADMINISTRACIÓN: búsquedas y postulaciones
    async function loadAdminConectaData(){if(!supabaseClient||currentLutminUser?.role!=='admin')return;const [profilesRes,skillsRes,jobsRes,appsRes,requestsRes]=await Promise.all([supabaseClient.from('talent_profiles').select('*').order('updated_at',{ascending:false}),supabaseClient.from('talent_skills').select('*'),supabaseClient.from('job_posts').select('*').order('created_at',{ascending:false}),supabaseClient.from('job_applications').select('*').order('created_at',{ascending:false}),supabaseClient.rpc('admin_list_talent_profile_requests')]);const err=[profilesRes,skillsRes,jobsRes,appsRes,requestsRes].find(x=>x.error)?.error;if(err){console.error(err);return showToast('No pude cargar Conecta. Revisá la conexión o el diagnóstico del sistema.');}adminTalentProfiles=profilesRes.data||[];adminTalentSkills=skillsRes.data||[];adminJobs=jobsRes.data||[];adminJobApplications=appsRes.data||[];adminTalentProfileRequests=Array.isArray(requestsRes.data)?requestsRes.data:[];renderAdminConecta();}
    function renderAdminTalentProfileRequests(){const root=document.getElementById('adminTalentProfileRequestsList');if(!root)return;const rows=[...adminTalentProfileRequests].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||new Date(b.submitted_at)-new Date(a.submitted_at));if(!rows.length){root.innerHTML='<div class="lg:col-span-2 rounded-2xl bg-white border border-violet-100 p-5 text-sm text-slate-500">Todavía no hay solicitudes de perfiles profesionales.</div>';return;}root.innerHTML=rows.slice(0,20).map(r=>{const pending=r.status==='pending',approved=r.status==='approved',skills=(r.skills||[]).slice(0,5),exps=r.experiences||[],certs=r.certificates||[];return `<div class="rounded-2xl bg-white border ${pending?'border-amber-200':'border-slate-100'} p-4"><div class="flex justify-between gap-3"><div class="min-w-0"><p class="font-extrabold text-lutmin-dark truncate">${escapeHtml(r.full_name||r.email||'Alumno')}</p><p class="text-[11px] text-slate-500 truncate">${escapeHtml(r.email||'')}</p><p class="mt-1 text-xs font-bold text-violet-700">${escapeHtml(r.headline||r.desired_role||'Perfil profesional')}</p></div><span class="h-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${pending?'bg-amber-50 text-amber-700':approved?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}">${pending?'PENDIENTE':approved?'APROBADO':'RECHAZADO'}</span></div><div class="mt-3 grid grid-cols-3 gap-2 text-center"><div class="rounded-xl bg-slate-50 p-2"><p class="text-lg font-black">${skills.length}</p><p class="text-[9px] text-slate-400">COMPETENCIAS</p></div><div class="rounded-xl bg-slate-50 p-2"><p class="text-lg font-black">${exps.length}</p><p class="text-[9px] text-slate-400">EXPERIENCIAS</p></div><div class="rounded-xl bg-slate-50 p-2"><p class="text-lg font-black">${certs.length}</p><p class="text-[9px] text-slate-400">CERTIFICADOS</p></div></div><p class="mt-3 text-xs text-slate-600 line-clamp-3">${escapeHtml(r.bio||'Sin descripción')}</p><div class="mt-3 flex flex-wrap gap-1.5">${skills.map(x=>`<span class="px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold">${escapeHtml(x.skill)} ${x.level}/5</span>`).join('')}</div>${r.external_cv_url?`<a href="${escapeHtml(r.external_cv_url)}" target="_blank" rel="noopener" class="mt-3 inline-flex px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-[11px] font-bold"><i class="fa-solid fa-file-lines mr-2"></i>Ver CV externo</a>`:''}${pending?`<div class="mt-4 grid grid-cols-2 gap-2"><button onclick="adminReviewTalentRequest('${r.id}','approved')" class="py-2.5 rounded-xl bg-green-600 text-white text-xs font-extrabold"><i class="fa-solid fa-check mr-2"></i>Aprobar</button><button onclick="adminReviewTalentRequest('${r.id}','rejected')" class="py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-extrabold"><i class="fa-solid fa-xmark mr-2"></i>Pedir cambios</button></div>`:`${r.review_note?`<p class="mt-3 text-[11px] text-slate-500">Observación: ${escapeHtml(r.review_note)}</p>`:''}`}</div>`;}).join('');}
    async function adminReviewTalentRequest(id,decision){if(currentLutminUser?.role!=='admin')return;let note='';if(decision==='rejected'){note=window.prompt('Indicá qué debería corregir o completar el alumno:','')||'';if(!note.trim())return showToast('Escribí una observación para pedir cambios.');}else{const ok=window.confirm('¿Aprobar este perfil profesional? Si el alumno pidió visibilidad, quedará disponible para empresas.');if(!ok)return;}const {error}=await supabaseClient.rpc('admin_review_talent_profile_request',{p_request_id:id,p_decision:decision,p_note:note||null});if(error)return showToast(error.message||'No pude revisar la solicitud.');showToast(decision==='approved'?'Perfil profesional aprobado.':'Solicitud devuelta para correcciones.');await loadAdminConectaData();}
    function renderAdminConecta(){const visible=adminTalentProfiles.filter(x=>x.visible).length,open=adminJobs.filter(x=>x.status==='published').length,activeApps=adminJobApplications.filter(x=>!['rejected','hired','withdrawn'].includes(x.status)).length,pendingRequests=adminTalentProfileRequests.filter(x=>x.status==='pending').length;document.getElementById('adminTalentProfilesStat').textContent=String(visible);const reqStat=document.getElementById('adminTalentRequestsStat');if(reqStat)reqStat.textContent=String(pendingRequests);document.getElementById('adminJobsStat').textContent=String(open);document.getElementById('adminApplicationsStat').textContent=String(activeApps);renderAdminTalentProfileRequests();const companySel=document.getElementById('adminJobCompany');if(companySel){const val=companySel.value;companySel.innerHTML='<option value="">Lutmin / Empresa confidencial</option>'+adminCompanies.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');if([...companySel.options].some(o=>o.value===val))companySel.value=val;}const jobsRoot=document.getElementById('adminJobsList');jobsRoot.innerHTML=adminJobs.length?adminJobs.map(j=>{const company=adminCompanies.find(c=>c.id===j.company_id);const count=adminJobApplications.filter(a=>a.job_id===j.id).length;return `<div class="rounded-2xl border border-slate-100 p-4"><div class="flex justify-between gap-3"><div><p class="text-[10px] uppercase font-bold text-slate-400">${escapeHtml(company?.name||'Lutmin / Confidencial')}</p><p class="font-extrabold text-lutmin-dark">${escapeHtml(j.title)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(j.location||'A definir')} · ${escapeHtml(j.modality)} · ${count} postulaciones</p></div><span class="h-fit px-2.5 py-1 rounded-full ${j.status==='published'?'bg-green-50 text-green-700':j.status==='closed'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'} text-[10px] font-bold">${escapeHtml(jobStatusLabel(j.status))}</span></div><div class="mt-3 flex gap-2">${j.status!=='published'?`<button onclick="adminSetJobStatus('${j.id}','published')" class="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-[11px] font-bold">Publicar</button>`:''}${j.status!=='closed'?`<button onclick="adminSetJobStatus('${j.id}','closed')" class="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[11px] font-bold">Cerrar</button>`:''}${j.status!=='draft'?`<button onclick="adminSetJobStatus('${j.id}','draft')" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">Borrador</button>`:''}</div></div>`}).join(''):'<div class="text-sm text-slate-500">Todavía no hay búsquedas.</div>';const appsRoot=document.getElementById('adminApplicationsList');appsRoot.innerHTML=adminJobApplications.length?adminJobApplications.map(a=>{const j=adminJobs.find(x=>x.id===a.job_id),p=adminProfiles.find(x=>x.id===a.user_id),tp=adminTalentProfiles.find(x=>x.user_id===a.user_id);return `<div class="p-5 sm:p-6 grid lg:grid-cols-[1fr_220px] gap-4 items-center"><div><p class="text-[10px] uppercase font-bold text-violet-600">${escapeHtml(j?.title||'Búsqueda')}</p><p class="mt-1 font-extrabold text-lutmin-dark">${escapeHtml(p?.full_name||p?.email||'Alumno')}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(tp?.headline||'Perfil profesional')} · ${new Date(a.created_at).toLocaleDateString('es-AR')}</p>${a.message?`<p class="mt-2 text-xs text-slate-600">“${escapeHtml(a.message)}”</p>`:''}</div><select onchange="adminSetApplicationStatus('${a.id}',this.value)" class="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"><option value="new" ${a.status==='new'?'selected':''}>Nueva</option><option value="reviewing" ${a.status==='reviewing'?'selected':''}>En revisión</option><option value="interview" ${a.status==='interview'?'selected':''}>Entrevista</option><option value="finalist" ${a.status==='finalist'?'selected':''}>Finalista</option><option value="rejected" ${a.status==='rejected'?'selected':''}>Finalizada</option><option value="hired" ${a.status==='hired'?'selected':''}>Seleccionado/a</option><option value="withdrawn" ${a.status==='withdrawn'?'selected':''}>Retirada</option></select></div>`}).join(''):'<div class="p-6 text-sm text-slate-500">Todavía no hay postulaciones.</div>';}
    document.getElementById('adminJobForm')?.addEventListener('submit',async e=>{e.preventDefault();const publish=document.getElementById('adminJobPublish').checked;const payload={company_id:document.getElementById('adminJobCompany').value||null,title:document.getElementById('adminJobTitle').value.trim(),description:document.getElementById('adminJobDescription').value.trim(),requirements:document.getElementById('adminJobRequirements').value.trim()||null,location:document.getElementById('adminJobLocation').value.trim()||null,modality:document.getElementById('adminJobModality').value,employment_type:document.getElementById('adminJobType').value,closes_at:document.getElementById('adminJobCloses').value||null,status:publish?'published':'draft',published_at:publish?new Date().toISOString():null,created_by:currentLutminUser.id};const {error}=await supabaseClient.from('job_posts').insert(payload);if(error)return showToast(error.message||'No pude crear la búsqueda.');e.target.reset();document.getElementById('adminJobPublish').checked=true;showToast('Búsqueda creada.');await loadAdminConectaData();await loadPublicJobs();});
    async function adminSetJobStatus(id,status){const {error}=await supabaseClient.rpc('admin_set_job_status',{p_job_id:id,p_status:status});if(error)return showToast(error.message||'No pude cambiar el estado.');await loadAdminConectaData();await loadPublicJobs();}
    async function adminSetApplicationStatus(id,status){const notes=window.prompt('Nota interna opcional:',adminJobApplications.find(x=>x.id===id)?.internal_notes||'');const {error}=await supabaseClient.rpc('set_job_application_status',{p_application_id:id,p_status:status,p_internal_notes:notes||null});if(error)return showToast(error.message||'No pude actualizar la postulación.');showToast('Postulación actualizada.');await loadAdminConectaData();}

    // =========================================================
    // V3.1 · SOLICITUD PÚBLICA DE CUENTA / PERFIL CONECTA
    // =========================================================
    let publicTalentSkillsDraftV31=[];
    let publicTalentExperiencesDraftV31=[];
    let adminPublicTalentRequestsV31=[];
    let activeAdminPublicTalentRequestV31=null;
    let lastCreatedTalentCredentialsV31=null;

    async function openPublicTalentAccountRequest(){
      if(supabaseClient){const {data:{session}}=await supabaseClient.auth.getSession();if(session){await loadCurrentLutminUser(session.user);if(currentLutminUser?.role==='student'){openModal('campusModal');goToCampusTab('talent');await loadTalentCenter();return;}}}
      publicTalentSkillsDraftV31=[]; publicTalentExperiencesDraftV31=[];
      const form=document.getElementById('publicTalentAccountForm'); if(form)form.reset();
      const years=document.getElementById('ptaYears'); if(years)years.value='0';
      const share=document.getElementById('ptaShareContact'); if(share)share.checked=true;
      const shareCv=document.getElementById('ptaShareCv'); if(shareCv)shareCv.checked=true;
      renderPublicTalentDraftsV31();
      const status=document.getElementById('ptaStatus'); if(status){status.classList.add('hidden');status.textContent='';}
      openModal('publicTalentAccountModal');
    }
    function renderPublicTalentDraftsV31(){
      const skills=document.getElementById('ptaSkillsList'), exps=document.getElementById('ptaExperiencesList'), count=document.getElementById('ptaSkillCount');
      if(count)count.textContent=String(publicTalentSkillsDraftV31.length);
      if(skills)skills.innerHTML=publicTalentSkillsDraftV31.length?publicTalentSkillsDraftV31.map((x,i)=>`<span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">${escapeHtml(x.skill)} · ${x.level}/5 <button type="button" onclick="removePublicTalentSkillV31(${i})" class="text-blue-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button></span>`).join(''):'<span class="text-xs text-slate-400">Todavía no agregaste competencias.</span>';
      if(exps)exps.innerHTML=publicTalentExperiencesDraftV31.length?publicTalentExperiencesDraftV31.map((x,i)=>`<div class="rounded-xl bg-slate-50 p-3"><div class="flex justify-between gap-3"><div><p class="text-xs font-bold text-lutmin-dark">${escapeHtml(x.position_title)}</p><p class="text-[11px] text-slate-500">${escapeHtml(x.company_name)}${x.current_job?' · Actualidad':''}</p></div><button type="button" onclick="removePublicTalentExperienceV31(${i})" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash"></i></button></div></div>`).join(''):'<span class="text-xs text-slate-400">Todavía no agregaste experiencia laboral.</span>';
    }
    function removePublicTalentSkillV31(i){publicTalentSkillsDraftV31.splice(i,1);renderPublicTalentDraftsV31();}
    function removePublicTalentExperienceV31(i){publicTalentExperiencesDraftV31.splice(i,1);renderPublicTalentDraftsV31();}
    document.getElementById('ptaAddSkillBtn')?.addEventListener('click',()=>{const skill=document.getElementById('ptaSkillName').value.trim(),level=Number(document.getElementById('ptaSkillLevel').value||3);if(!skill)return showToast('Escribí una competencia.');if(publicTalentSkillsDraftV31.some(x=>x.skill.toLowerCase()===skill.toLowerCase()))return showToast('Esa competencia ya está agregada.');publicTalentSkillsDraftV31.push({skill,level});document.getElementById('ptaSkillName').value='';renderPublicTalentDraftsV31();});
    document.getElementById('ptaAddExperienceBtn')?.addEventListener('click',()=>{const company_name=document.getElementById('ptaExpCompany').value.trim(),position_title=document.getElementById('ptaExpPosition').value.trim();if(!company_name||!position_title)return showToast('Completá empresa y puesto.');const current_job=document.getElementById('ptaExpCurrent').checked;publicTalentExperiencesDraftV31.push({company_name,position_title,start_date:document.getElementById('ptaExpStart').value||null,end_date:current_job?null:(document.getElementById('ptaExpEnd').value||null),current_job,description:document.getElementById('ptaExpDescription').value.trim()||null});['ptaExpCompany','ptaExpPosition','ptaExpStart','ptaExpEnd','ptaExpDescription'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('ptaExpCurrent').checked=false;renderPublicTalentDraftsV31();});

    document.getElementById('publicTalentAccountForm')?.addEventListener('submit',async e=>{
      e.preventDefault(); if(!supabaseClient)return showToast('No pude conectar con Lutmin.');
      const cv=document.getElementById('ptaExternalCv').value.trim(),linkedin=document.getElementById('ptaLinkedin').value.trim();
      if(cv&&!/^https:\/\//i.test(cv))return showToast('El enlace del CV debe comenzar con https://');
      if(linkedin&&!/^https:\/\//i.test(linkedin))return showToast('El enlace de LinkedIn debe comenzar con https://');
      if(!document.getElementById('ptaConsent').checked)return showToast('Necesitamos tu autorización para enviar la solicitud.');
      const payload={
        p_full_name:document.getElementById('ptaFullName').value.trim(),p_email:document.getElementById('ptaEmail').value.trim().toLowerCase(),p_phone:document.getElementById('ptaPhone').value.trim()||null,p_headline:document.getElementById('ptaHeadline').value.trim(),p_bio:document.getElementById('ptaBio').value.trim(),p_city:document.getElementById('ptaCity').value.trim()||null,p_province:document.getElementById('ptaProvince').value.trim()||null,p_years_experience:Number(document.getElementById('ptaYears').value||0),p_linkedin_url:linkedin||null,p_external_cv_url:cv||null,p_desired_role:document.getElementById('ptaDesiredRole').value.trim()||null,p_desired_modality:document.getElementById('ptaDesiredModality').value||'indistinto',p_availability:document.getElementById('ptaAvailability').value||'available',p_desired_location:document.getElementById('ptaDesiredLocation').value.trim()||null,p_willing_travel:document.getElementById('ptaTravel').checked,p_open_to_relocation:document.getElementById('ptaRelocation').checked,p_share_contact:document.getElementById('ptaShareContact').checked,p_share_cv:document.getElementById('ptaShareCv').checked,p_skills:publicTalentSkillsDraftV31,p_experiences:publicTalentExperiencesDraftV31,p_consent:true
      };
      const btn=document.getElementById('ptaSubmitBtn'),status=document.getElementById('ptaStatus');btn.disabled=true;btn.textContent='Enviando solicitud...';
      try{const {data,error}=await supabaseClient.rpc('submit_public_talent_account_request',payload);if(error)throw error;status.className='rounded-2xl p-4 text-sm bg-green-50 border border-green-100 text-green-800';status.innerHTML='<strong>Solicitud enviada.</strong><br>Lutmin revisará tus datos. Si se aprueba, el equipo se comunicará con vos para enviarte tu acceso.';status.classList.remove('hidden');btn.textContent='Solicitud enviada';setTimeout(()=>closeModal('publicTalentAccountModal'),2600);}catch(err){status.className='rounded-2xl p-4 text-sm bg-red-50 border border-red-100 text-red-700';status.textContent=err?.message||'No pude enviar la solicitud.';status.classList.remove('hidden');btn.disabled=false;btn.textContent='Enviar solicitud a Lutmin';}
    });

    async function loadAdminPublicTalentRequestsV31(){
      if(!supabaseClient||currentLutminUser?.role!=='admin')return;
      const {data,error}=await supabaseClient.rpc('admin_list_public_talent_account_requests');
      if(error){console.error(error);const root=document.getElementById('adminPublicTalentRequestsList');if(root)root.innerHTML='<div class="lg:col-span-2 text-sm text-red-600">No pude cargar las solicitudes públicas.</div>';return;}
      adminPublicTalentRequestsV31=Array.isArray(data)?data:[];renderAdminPublicTalentRequestsV31();
    }
    function renderAdminPublicTalentRequestsV31(){
      const root=document.getElementById('adminPublicTalentRequestsList'),stat=document.getElementById('adminPublicTalentRequestsStat');if(!root)return;
      const pending=adminPublicTalentRequestsV31.filter(x=>x.status==='pending');if(stat)stat.textContent=String(pending.length);
      const rows=[...adminPublicTalentRequestsV31].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||new Date(b.submitted_at)-new Date(a.submitted_at));
      root.innerHTML=rows.length?rows.slice(0,20).map(r=>`<button type="button" onclick="openAdminPublicTalentRequestV31('${r.id}')" class="text-left rounded-2xl bg-white border ${r.status==='pending'?'border-blue-200':'border-slate-100'} p-4 hover:border-blue-300 transition"><div class="flex justify-between gap-3"><div class="min-w-0"><p class="font-extrabold text-lutmin-dark truncate">${escapeHtml(r.full_name)}</p><p class="text-[11px] text-slate-500 truncate">${escapeHtml(r.email)}</p><p class="mt-1 text-xs font-bold text-blue-700 truncate">${escapeHtml(r.headline||r.desired_role||'Perfil profesional')}</p></div><span class="h-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status==='pending'?'bg-amber-50 text-amber-700':r.status==='approved'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}">${r.status==='pending'?'PENDIENTE':r.status==='approved'?'APROBADA':'RECHAZADA'}</span></div><div class="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>${(r.skills||[]).length} competencias</span><span>·</span><span>${(r.experiences||[]).length} experiencias</span><span>·</span><span>${new Date(r.submitted_at).toLocaleDateString('es-AR')}</span></div><p class="mt-3 text-xs text-blue-700 font-bold">Ver solicitud completa →</p></button>`).join(''):'<div class="lg:col-span-2 text-sm text-slate-500">Todavía no hay solicitudes públicas de creación de cuenta.</div>';
    }
    function openAdminPublicTalentRequestV31(id){
      const r=adminPublicTalentRequestsV31.find(x=>x.id===id);if(!r)return;activeAdminPublicTalentRequestV31=r;lastCreatedTalentCredentialsV31=null;
      document.getElementById('adminPtaName').textContent=r.full_name||'Solicitud';document.getElementById('adminPtaEmail').textContent=r.email||'';
      const details=document.getElementById('adminPtaDetails');const skills=r.skills||[],exps=r.experiences||[];
      details.innerHTML=`${r.account_exists?'<div class="mb-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800"><strong>Este correo ya tiene una cuenta Lutmin.</strong> No crees otra cuenta ni cambies su contraseña desde este flujo. Pedile que ingrese por Acceso Alumno.</div>':''}<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm"><div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] text-slate-400 font-bold uppercase">Perfil</p><p class="mt-1 font-bold">${escapeHtml(r.headline||'—')}</p></div><div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] text-slate-400 font-bold uppercase">Ubicación</p><p class="mt-1 font-bold">${escapeHtml([r.city,r.province].filter(Boolean).join(', ')||'—')}</p></div><div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] text-slate-400 font-bold uppercase">Contacto</p><p class="mt-1 font-bold">${escapeHtml(r.phone||'—')}</p></div></div><div class="mt-4 rounded-2xl border border-slate-100 p-4"><p class="font-extrabold text-lutmin-dark">Sobre el perfil</p><p class="mt-2 text-sm text-slate-600 whitespace-pre-line">${escapeHtml(r.bio||'—')}</p></div><div class="mt-4 grid lg:grid-cols-2 gap-4"><div class="rounded-2xl border border-slate-100 p-4"><p class="font-extrabold text-lutmin-dark">Competencias</p><div class="mt-3 flex flex-wrap gap-2">${skills.length?skills.map(x=>`<span class="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">${escapeHtml(x.skill)} ${x.level}/5</span>`).join(''):'<span class="text-xs text-slate-400">Sin competencias cargadas.</span>'}</div></div><div class="rounded-2xl border border-slate-100 p-4"><p class="font-extrabold text-lutmin-dark">Experiencia</p><div class="mt-3 space-y-2">${exps.length?exps.map(x=>`<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs font-bold">${escapeHtml(x.position_title)}</p><p class="text-[11px] text-slate-500">${escapeHtml(x.company_name)}</p></div>`).join(''):'<span class="text-xs text-slate-400">Sin experiencias cargadas.</span>'}</div></div></div><div class="mt-4 flex flex-wrap gap-2">${r.external_cv_url?`<a href="${escapeHtml(r.external_cv_url)}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Ver CV externo</a>`:''}${r.linkedin_url?`<a href="${escapeHtml(r.linkedin_url)}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">LinkedIn</a>`:''}</div>`;
      document.getElementById('adminPtaApprovalBox').classList.toggle('hidden',r.status!=='pending'||!!r.account_exists);document.getElementById('adminPtaRejectBox').classList.toggle('hidden',r.status!=='pending');document.getElementById('adminPtaCreatedAccess').classList.add('hidden');document.getElementById('adminPtaPassword').value='';document.getElementById('adminPtaRejectReason').value='';openModal('adminPublicTalentRequestModal');
    }
    function generateAdminPtaPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';let out='Lut';for(let i=0;i<9;i++)out+=chars[Math.floor(Math.random()*chars.length)];document.getElementById('adminPtaPassword').value=out;}
    document.getElementById('adminPtaApproveBtn')?.addEventListener('click',async()=>{const r=activeAdminPublicTalentRequestV31;if(!r)return;const password=document.getElementById('adminPtaPassword').value;if(password.length<8)return showToast('Generá o escribí una contraseña provisoria de al menos 8 caracteres.');const btn=document.getElementById('adminPtaApproveBtn');btn.disabled=true;btn.textContent='Creando cuenta...';try{const {data:{session}}=await supabaseClient.auth.getSession();const response=await fetch(`${SUPABASE_URL}/functions/v1/hyper-create-student`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({action:'approve_public_talent_request',request_id:r.id,password})});const data=await response.json();if(!response.ok)throw new Error(data?.error||'No pude crear la cuenta.');lastCreatedTalentCredentialsV31={full_name:r.full_name,email:r.email,password};const text=`Lutmin Conecta\nNombre: ${r.full_name}\nUsuario: ${r.email}\nContraseña provisoria: ${password}\n\nIngresá desde Acceso Alumno. Al entrar se te pedirá cambiar la contraseña.`;document.getElementById('adminPtaCredentialText').textContent=text;document.getElementById('adminPtaMailLink').href=`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('Tu acceso a Lutmin Conecta')}&body=${encodeURIComponent(text)}`;document.getElementById('adminPtaCreatedAccess').classList.remove('hidden');document.getElementById('adminPtaApprovalBox').classList.add('hidden');document.getElementById('adminPtaRejectBox').classList.add('hidden');showToast('Solicitud aprobada y cuenta creada.');await loadAdminPublicTalentRequestsV31();await loadAdminData();}catch(err){showToast(err?.message||'No pude aprobar la solicitud.');}finally{btn.disabled=false;btn.textContent='Aprobar + crear cuenta';}});
    document.getElementById('adminPtaRejectBtn')?.addEventListener('click',async()=>{const r=activeAdminPublicTalentRequestV31;if(!r)return;const reason=document.getElementById('adminPtaRejectReason').value.trim()||null;if(!window.confirm('¿Rechazar esta solicitud de creación de perfil?'))return;const {error}=await supabaseClient.rpc('admin_reject_public_talent_account_request',{p_request_id:r.id,p_reason:reason});if(error)return showToast(error.message||'No pude rechazar la solicitud.');showToast('Solicitud rechazada.');closeModal('adminPublicTalentRequestModal');await loadAdminPublicTalentRequestsV31();});
    function copyAdminPtaCredentials(){if(!lastCreatedTalentCredentialsV31)return;const text=document.getElementById('adminPtaCredentialText').textContent;navigator.clipboard?.writeText(text).then(()=>showToast('Acceso copiado.')).catch(()=>showToast('Copiá el acceso manualmente.'));}

    // La carga normal de Conecta admin también incorpora solicitudes públicas.
    const originalLoadAdminConectaDataV31=loadAdminConectaData;
    loadAdminConectaData=async function(){await originalLoadAdminConectaDataV31();await loadAdminPublicTalentRequestsV31();};

    // Deep link de perfil público
    async function handleTalentDeepLink(){const slug=new URL(window.location.href).searchParams.get('talento');if(slug)await showPublicTalentProfile(slug);}


    // =========================================================
    // PERFIL / CERTIFICADO
    // =========================================================
    async function openProfile() {
      if (currentLutminUser?.role === 'student') {
        openModal('campusModal');
        const ready=await window.LutminV29Modules?.ensureFeatureForTab?.('talent','student');
        if(ready===false)return showToast('No pude preparar Lutmin Conecta.');
        goToCampusTab('talent');
        if(window.LutminV29Data?.load)await window.LutminV29Data.load('talent',()=>loadTalentCenter(),{ttl:18000});
        else await loadTalentCenter();
      } else { openConectaCampus(); }
    }
    function openCertificate() {
      if (campusCertificates?.length) showCertificate(campusCertificates[0]);
      else { document.getElementById('publicCertificateCode')?.focus(); document.querySelector('section form#publicCertificateForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }

    function profileToContact() {
      closeModal('profileModal');
      document.getElementById('asunto').value = 'Lutmin Conecta';
      document.getElementById('mensaje').value = 'Hola, me interesa recibir información sobre los perfiles profesionales de Lutmin Conecta.';
      document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    }

    // =========================================================
    // CONSULTORÍA
    // =========================================================
    function selectService(service) {
      document.getElementById('asunto').value =
        service === 'Capacitación In-Company' ? 'Capacitación In-Company'
        : service === 'Reclutamiento y Selección' ? 'Reclutamiento y Selección'
        : 'Consultoría Organizacional';

      document.getElementById('mensaje').value = `Hola, me interesa recibir información sobre el servicio de "${service}".`;
      document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    }

    // =========================================================
    // ENVÍO DE FORMULARIO VÍA FORMSPREE
    // =========================================================
    document.getElementById('contactForm').addEventListener('submit', async function(event) {
      event.preventDefault();

      const form = event.target;
      const endpoint = form.getAttribute('data-endpoint');
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";

      const formData = new FormData(form);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          showToast("¡Gracias! Tu mensaje ha sido enviado con éxito.");
          trackPublicEventV20('contact_submit',{area:form.querySelector('[name="asunto"]')?.value||''});
          form.reset();
        } else {
          showToast("Hubo un problema al enviar la consulta. Intenta nuevamente.");
        }
      } catch (error) {
        showToast("Error de conexión. Verifica tu red e intenta más tarde.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });

    // =========================================================
    // TOAST
    // =========================================================
    let toastTimer;
    function showToast(message) {
      clearTimeout(toastTimer);
      const toast = document.getElementById('toast');
      document.getElementById('toastText').textContent = message;
      toast.classList.remove('hidden');
      toastTimer = setTimeout(() => toast.classList.add('hidden'), 4500);
    }

    // =========================================================
    // ENLACES PÚBLICOS DE CERTIFICADOS / RECUPERACIÓN
    // =========================================================
    window.addEventListener('load', async () => {
      if (!supabaseClient) return;
      await loadPublicCatalog();
      const params = new URLSearchParams(window.location.search);
      const certCode = params.get('cert');
      if (certCode) {
        document.getElementById('publicCertificateCode').value = certCode;
        setTimeout(() => verifyPublicCertificate(certCode, { updateField: true }), 250);
      }
    });

    // =========================================================
    // NAV ACTIVA
    // =========================================================
    const sections = ['inicio','formacion','conecta','empresas','consultora','certificados-publicos'];
    const navLinks = [...document.querySelectorAll('.nav-link')];

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.remove('active-nav'));
        const active = navLinks.find(link => link.getAttribute('href') === `#${entry.target.id}`);
        if (active) active.classList.add('active-nav');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

    sections.forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    // V1.2: contenido público de Conecta
    if (supabaseClient) { loadPublicJobs(); handleTalentDeepLink(); }
  

    // =========================================================
    // V1.6 · CENTRO OPERATIVO + AUTOMATIZACIONES + REPORTES
    // =========================================================

    // V2.4: pequeños ajustes de rendimiento, sin tocar el diseño V2.1.
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('img').forEach((img, index) => {
        img.decoding = 'async';
        if (index > 1 && !img.hasAttribute('loading')) img.loading = 'lazy';
      });
    });
    window.addEventListener('online', () => { if (typeof showToast === 'function') showToast('Conexión restablecida.'); });
    window.addEventListener('offline', () => { if (typeof showToast === 'function') showToast('Sin conexión. Algunas acciones pueden quedar temporalmente no disponibles.'); });

