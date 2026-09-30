/* LUTMIN · Core público y autenticación
 * Mantiene sólo shell público, sesión, utilidades compartidas y enrutamiento base.
 * Los portales autenticados y Conecta se cargan bajo demanda desde module-loader.js.
 */

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
    // Los runtimes lazy acceden al cargador de PDF sin depender del archivo físico que los contiene.
    window.ensureJsPdfLib = ensureJsPdfLib;
    window.ensureQRCodeLib = ensureQRCodeLib;

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


    // =========================================================
    // UTILIDADES COMPARTIDAS DEL SHELL
    // Disponibles para runtimes lazy sin obligarlos a duplicar helpers.
    // =========================================================
    function slugifyLutmin(value) {
      return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    function talentSkillTextV33(x) {
      if (!x) return '';
      const st=x.validation_status||null, score=x.validated_score_10;
      if(st==='valid'&&score!=null)return `${x.skill} (Validada ${Number(score).toFixed(1)}/10)`;
      if(st==='expired'&&score!=null)return `${x.skill} (Validación vencida ${Number(score).toFixed(1)}/10)`;
      if(Array.isArray(x.course_evidence)&&x.course_evidence.length)return `${x.skill} (Adquirida por curso)`;
      return `${x.skill||'Competencia'} (Declarada ${x.level||0}/5)`;
    }
    function talentSkillBadgeHtmlV33(x,mode='public') {
      const st=x?.validation_status||null, score=x?.validated_score_10;
      if(st==='valid'&&score!=null)return `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-100"><i class="fa-solid fa-circle-check text-emerald-500"></i>${escapeHtml(x.skill)} · ${Number(score).toFixed(1)}/10 <span class="font-semibold opacity-70">validada</span></span>`;
      if(st==='expired'&&score!=null)return `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-100"><i class="fa-solid fa-clock"></i>${escapeHtml(x.skill)} · ${Number(score).toFixed(1)}/10 <span class="font-semibold opacity-70">vencida</span></span>`;
      if(Array.isArray(x?.course_evidence)&&x.course_evidence.length)return `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-800 text-xs font-bold border border-violet-100"><i class="fa-solid fa-graduation-cap text-violet-500"></i>${escapeHtml(x.skill)} · ${Number(x.level||0)}/5 <span class="font-semibold opacity-70">por curso</span></span>`;
      return `<span class="inline-flex items-center gap-1 px-3 py-2 rounded-xl ${mode==='compact'?'bg-white':'bg-blue-50'} text-blue-800 text-xs font-bold">${escapeHtml(x?.skill||'Competencia')} · ${Number(x?.level||0)}/5 <span class="font-semibold opacity-60">declarada</span></span>`;
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
    // La implementación pesada vive en admin-workspace.js y sólo se
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
      if (window.LutminAdminData?.loadForModule) {
        const ok = await window.LutminAdminData.loadForModule(activeModule,{force:true});
        try { await window.LutminAdminRuntime?.loadForModule?.(activeModule,{force:true}); } catch (_) {}
        return ok;
      }
      if (!window.LutminV35AdminCore?.loadLegacy) {
        const ready = await window.LutminModules?.ensureAdminModule?.(activeModule);
        if (ready === false) return false;
      }
      if (window.LutminAdminData?.loadForModule) {
        const ok = await window.LutminAdminData.loadForModule(activeModule,{force:true});
        try { await window.LutminAdminRuntime?.loadForModule?.(activeModule,{force:true}); } catch (_) {}
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
      const modal=document.getElementById(id);
      if(!modal)return false;
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      return true;
    }

    function closeModal(id) {
      const modal=document.getElementById(id);
      if(!modal)return false;
      modal.classList.add('hidden');
      if (!document.querySelector('.fixed:not(.hidden)[id$="Modal"]')) {
        document.body.classList.remove('overflow-hidden');
      }
      return true;
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        ['courseModal','interestModal','campusModal','lessonModal','assessmentModal','publicTalentModal','companyCandidateModal','profileModal','accessSwitcherModal','adminAccountPasswordModal','supportThreadModal','certificateModal','authModal','passwordModal','adminCourseEditModal','adminLessonEditModal','adminStudentDetailModal','leadConvertModal','paymentModal','adminCompanyEditModal','attendanceModal'].forEach(id => {
          const el = document.getElementById(id);
          if (id === 'passwordModal' && (passwordModalMode === 'first' || passwordModalMode === 'recovery')) return;
          if (el && !el.classList.contains('hidden')) closeModal(id);
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
      window.LutminModules?.warm?.('auth-modal');
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
      // V53: el Campus autenticado se monta recién cuando existe un acceso válido.
      const shellReady=await window.LutminAppShell?.ensureCampus?.();
      if(shellReady===false){showToast('No pude preparar el Campus. Actualizá la página y volvé a intentar.');return false;}
      // V31: primero monta el HTML del workspace. Después carga su runtime.
      const viewReadyV31=await window.LutminViews?.ensureForRole?.(effectiveRole);
      if(viewReadyV31===false){showToast('No pude preparar la interfaz de este acceso. Actualizá la página y volvé a intentar.');return false;}
      // V29/V30: carga únicamente el runtime que corresponde a los accesos disponibles.
      if(window.LutminModules?.ensureAuthenticated){
        const modulesReady=await window.LutminModules.ensureAuthenticated({role:effectiveRole,capabilities:currentAccessContext});
        if(modulesReady===false){showToast('No pude cargar los módulos necesarios de Lutmin. Actualizá la página y volvé a intentar.');return false;}
      }
      currentLutminUser={id:user.id,email:profile?.email||user.email,fullName,role:effectiveRole,baseRole:profile?.role||'student',active:profile?.active!==false,mustChangePassword:Boolean(profile?.must_change_password)};
      paintCurrentLutminUser();
      try{await supabaseClient.rpc('touch_lutmin_last_seen')}catch(_){}
      const v29InitialLoad=(key,loader,ttl=12000)=>window.LutminData?.load?window.LutminData.load(key,loader,{ttl,force:true}):loader();
      if(effectiveRole==='company_admin'){goToCampusTab('company');setTimeout(()=>{if(typeof window.openWorkspaceSectionV190==='function')window.openWorkspaceSectionV190('company','summary');else v29InitialLoad('company',()=>loadCompanyPortalData(),12000);},0);}
      else if(effectiveRole==='admin'){goToCampusTab('admin');setTimeout(()=>v29InitialLoad('admin',()=>loadAdminData(),12000),0);}
      else if(effectiveRole==='instructor'){goToCampusTab('instructor');setTimeout(()=>v29InitialLoad('instructor',()=>loadInstructorPortalV50(),15000),0);}
      else {goToCampusTab('dashboard');setTimeout(()=>v29InitialLoad('dashboard',()=>loadCampusData(),12000),0);if(new URL(location.href).searchParams.get('checkin'))setTimeout(async()=>{await window.LutminModules?.ensureFeature?.('activities');await window.processPendingCheckinV50?.();},180);}
      setTimeout(()=>v29InitialLoad('notifications',()=>loadNotificationCenter(),12000),180);
      if(effectiveRole==='student'){const hydrateStudent=async()=>{if(currentLutminUser?.role!=='student')return;const ready=await window.LutminModules?.ensureFeature?.('student-enhancements');if(ready===false||currentLutminUser?.role!=='student')return;await Promise.allSettled([window.loadStudentPathsV25?.(),window.loadPendingSurveysV25?.(),window.loadStudentComplianceV40?.()]);};if('requestIdleCallback' in window)requestIdleCallback(()=>hydrateStudent(),{timeout:2600});else setTimeout(()=>hydrateStudent(),1600);}
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
      window.LutminData?.invalidate?.();
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

    // V53: navegación delegada. Funciona aunque el Campus se monte después
    // del arranque y evita registrar un listener por cada botón.
    document.addEventListener('click', async event => {
      const button=event.target.closest?.('.campus-tab');
      if(!button)return;
      const tab = button.dataset.campusTab;
      if(!tab)return;
      if (tab === 'admin' && currentLutminUser?.role !== 'admin') return;
      if ((tab === 'company' || tab === 'company-conecta') && currentLutminUser?.role !== 'company_admin') return;
      if (tab === 'instructor' && currentLutminUser?.role !== 'instructor') return;
      if (tab === 'activities' && currentLutminUser?.role !== 'student') return;
      if (currentLutminUser?.role === 'company_admin' && !['company','company-conecta','profile','notifications','support'].includes(tab)) return;
      if (currentLutminUser?.role === 'instructor' && !['instructor','profile','notifications','support'].includes(tab)) return;
      const viewReady=await window.LutminViews?.ensureForTab?.(tab);
      if(viewReady===false){showToast('No pude preparar esta vista. Actualizá la página y volvé a intentar.');return;}
      const featureReady=await window.LutminModules?.ensureFeatureForTab?.(tab,currentLutminUser?.role);
      if(featureReady===false){showToast('No pude preparar este módulo. Actualizá la página y volvé a intentar.');return;}
      goToCampusTab(tab);
      const v29NavLoad=(key,loader,ttl)=>window.LutminData?.load?window.LutminData.load(key,loader,{ttl}):loader();
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


    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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

    async function ensureStudentTalentRuntime() {
      if (await window.LutminViews?.ensureForTab?.('talent') === false) return false;
      if (await window.LutminModules?.ensureFeatureForTab?.('talent','student') === false) return false;
      return typeof loadTalentCenter === 'function';
    }

    async function openPublicJobApplication(jobId){
      if(!supabaseClient)return; const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){openAuthModal('campus');document.getElementById('authStatus').textContent='Ingresá con tu cuenta de alumno para postularte.';return;}
      await loadCurrentLutminUser(session.user); if(currentLutminUser?.role!=='student')return showToast('Las postulaciones están disponibles para alumnos.');
      if(!(await ensureStudentTalentRuntime()))return showToast('No pude preparar Lutmin Conecta.');
      openModal('campusModal'); goToCampusTab('talent'); await loadTalentCenter(); setTimeout(()=>document.querySelector(`[data-talent-job="${jobId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),150);
    }
    async function openConectaCampus(){
      if(!supabaseClient)return; const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){openAuthModal('campus');document.getElementById('authStatus').textContent='Ingresá con Acceso Alumno para completar tu perfil profesional.';return;}
      await loadCurrentLutminUser(session.user); if(currentLutminUser?.role!=='student')return showToast('Lutmin Conecta está disponible para cuentas de alumno.'); if(!(await ensureStudentTalentRuntime()))return showToast('No pude preparar Lutmin Conecta.'); openModal('campusModal');goToCampusTab('talent');await loadTalentCenter();
    }


    async function showPublicTalentProfile(slug){if(!supabaseClient||!slug)return;openModal('publicTalentModal');const root=document.getElementById('publicTalentContent');root.innerHTML='<div class="text-sm text-slate-500">Cargando perfil...</div>';const {data,error}=await supabaseClient.rpc('get_public_talent_profile',{p_slug:slug});if(error||!data){root.innerHTML='<div class="p-8 text-center"><h3 class="text-xl font-black text-lutmin-dark">Perfil no disponible</h3><p class="mt-2 text-sm text-slate-500">La persona puede haber desactivado la visibilidad.</p></div>';return;}const p=data.profile||{},skills=data.skills||[],exp=data.experiences||[],certs=data.certificates||[];const initials=String(p.full_name||'L').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();root.innerHTML=`<div class="flex flex-col sm:flex-row gap-5 sm:items-center"><div class="w-20 h-20 rounded-3xl bg-lutmin-dark text-white flex items-center justify-center text-2xl font-black">${escapeHtml(initials)}</div><div><p class="text-[10px] uppercase tracking-widest font-bold text-lutmin-light">Lutmin Conecta</p><h2 class="mt-1 text-3xl font-black text-lutmin-dark">${escapeHtml(p.full_name||'Perfil profesional')}</h2><p class="mt-1 text-sm text-slate-500">${escapeHtml(p.headline||'Perfil profesional')}</p><div class="mt-3 flex flex-wrap gap-2"><span class="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">${escapeHtml(talentAvailabilityLabel(p.availability))}</span>${p.city||p.province?`<span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">${escapeHtml([p.city,p.province].filter(Boolean).join(', '))}</span>`:''}${p.willing_travel?'<span class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Disponible para viajar</span>':''}</div></div></div>${p.bio?`<div class="mt-7"><h3 class="font-extrabold text-lutmin-dark">Sobre mí</h3><p class="mt-2 text-sm text-slate-600 leading-relaxed">${escapeHtml(p.bio)}</p></div>`:''}<div class="mt-7 grid lg:grid-cols-2 gap-5"><div><h3 class="font-extrabold text-lutmin-dark">Competencias</h3><div class="mt-3 flex flex-wrap gap-2">${skills.length?skills.map(x=>talentSkillBadgeHtmlV33(x,'public')).join(''):'<span class="text-xs text-slate-400">Sin competencias cargadas.</span>'}</div></div><div><h3 class="font-extrabold text-lutmin-dark">Certificaciones verificadas</h3><div class="mt-3 space-y-2">${certs.length?certs.map(c=>`<div class="rounded-xl bg-green-50 p-3"><p class="font-bold text-sm text-green-900">${escapeHtml(c.course_title)}</p><p class="text-[11px] text-green-700">${c.duration_hours} h · ${Math.round(Number(c.score||0))}% · ${escapeHtml(c.code)}</p></div>`).join(''):'<p class="text-xs text-slate-400">Sin certificados visibles.</p>'}</div></div></div><div class="mt-7"><h3 class="font-extrabold text-lutmin-dark">Experiencia</h3><div class="mt-3 space-y-2">${exp.length?exp.map(x=>`<div class="rounded-2xl bg-slate-50 p-4"><p class="font-bold text-sm">${escapeHtml(x.position_title)} · ${escapeHtml(x.company_name)}</p><p class="mt-1 text-xs text-slate-500">${x.start_date||''} → ${x.current_job?'Actualidad':x.end_date||''}</p>${x.description?`<p class="mt-2 text-xs text-slate-600">${escapeHtml(x.description)}</p>`:''}</div>`).join(''):'<p class="text-xs text-slate-400">Sin experiencia cargada.</p>'}</div></div>`;}


    // =========================================================
    // V3.1 · SOLICITUD PÚBLICA DE CUENTA / PERFIL CONECTA
    // =========================================================
    let publicTalentSkillsDraftV31=[];
    let publicTalentExperiencesDraftV31=[];
    let adminPublicTalentRequestsV31=[];
    let activeAdminPublicTalentRequestV31=null;
    let lastCreatedTalentCredentialsV31=null;

    async function openPublicTalentAccountRequest(){
      if(supabaseClient){const {data:{session}}=await supabaseClient.auth.getSession();if(session){await loadCurrentLutminUser(session.user);if(currentLutminUser?.role==='student'){if(!(await ensureStudentTalentRuntime()))return showToast('No pude preparar Lutmin Conecta.');openModal('campusModal');goToCampusTab('talent');await loadTalentCenter();return;}}}
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


    // Deep link de perfil público
    async function handleTalentDeepLink(){const slug=new URL(window.location.href).searchParams.get('talento');if(slug)await showPublicTalentProfile(slug);}


    // =========================================================
    // PERFIL / CERTIFICADO
    // =========================================================
    async function openProfile() {
      if (currentLutminUser?.role === 'student') {
        openModal('campusModal');
        const ready=await window.LutminModules?.ensureFeatureForTab?.('talent','student');
        if(ready===false)return showToast('No pude preparar Lutmin Conecta.');
        goToCampusTab('talent');
        if(window.LutminData?.load)await window.LutminData.load('talent',()=>loadTalentCenter(),{ttl:18000});
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

