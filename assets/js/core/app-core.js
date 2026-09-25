
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

    // V33.1 · puente explícito para runtimes cargados bajo demanda.
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
      if(effectiveRole==='company_admin'){goToCampusTab('company');setTimeout(()=>v29InitialLoad('company',()=>loadCompanyPortalData(),12000),0);}
      else if(effectiveRole==='admin'){goToCampusTab('admin');setTimeout(()=>v29InitialLoad('admin',()=>loadAdminData(),12000),0);}
      else if(effectiveRole==='instructor'){goToCampusTab('instructor');setTimeout(()=>v29InitialLoad('instructor',()=>loadInstructorPortalV50(),15000),0);}
      else {goToCampusTab('dashboard');setTimeout(()=>v29InitialLoad('dashboard',()=>loadCampusData(),12000),0);setTimeout(()=>processPendingCheckinV50(),180);}
      setTimeout(()=>v29InitialLoad('notifications',()=>loadNotificationCenter(),12000),180);
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
      setTimeout(()=>loadCompanyConectaData(),180);
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

    // =========================================================
    // ADMINISTRACIÓN LUTMIN - ETAPA 9
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
    // V1.6 Centro Operativo
    let adminOpsTasksV16 = [];
    let adminAutomationRulesV16 = [];
    let adminInternalRolesV16 = [];
    let adminUserInternalRolesV16 = [];
    let adminManagementSnapshotsV16 = [];
    let activeOpsLaneV16 = 'all';
    let activeAttendanceSessionId = null;
    let studentAgendaData = { sessions: [] };
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

    async function loadAdminData() {
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
        btn.classList.toggle('bg-lutmin-dark',active);
        btn.classList.toggle('text-white',active);
        btn.classList.toggle('bg-slate-100',!active);
        btn.classList.toggle('text-slate-600',!active);
      });
      const mobileSelectV20=document.getElementById('adminModuleSelectV20'); if(mobileSelectV20) mobileSelectV20.value=module;
      const meta=ADMIN_MODULES_V19[module];
      const t=document.getElementById('adminModuleTitleV19'); if(t)t.textContent=meta.title;
      const d=document.getElementById('adminModuleDescriptionV19'); if(d)d.textContent=meta.description;
      localStorage.setItem('lutmin-admin-module-v19',module);
      if(currentLutminUser?.id && !opts.noSave){
        supabaseClient?.from('admin_workspace_preferences').upsert({user_id:currentLutminUser.id,last_module:module,updated_at:new Date().toISOString()},{onConflict:'user_id'}).then(()=>{}).catch(()=>{});
      }
      const scroller=document.querySelector('#campusModal .modal-scroll');
      if(scroller && !opts.noScroll) scroller.scrollTo({top:0,behavior:'smooth'});
      refreshAdminWorkspaceV19();
    }

    async function loadAdminWorkspacePrefsV19(){
      tagAdminBlocksV19();
      let module=localStorage.getItem('lutmin-admin-module-v19')||'overview';
      if(supabaseClient&&currentLutminUser?.id){
        const {data,error}=await supabaseClient.from('admin_workspace_preferences').select('last_module').eq('user_id',currentLutminUser.id).maybeSingle();
        if(!error&&data?.last_module) module=data.last_module;
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


    // V2.4: pequeños ajustes de rendimiento, sin tocar el diseño V2.1.
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('img').forEach((img, index) => {
        img.decoding = 'async';
        if (index > 1 && !img.hasAttribute('loading')) img.loading = 'lazy';
      });
    });
    window.addEventListener('online', () => { if (typeof showToast === 'function') showToast('Conexión restablecida.'); });
    window.addEventListener('offline', () => { if (typeof showToast === 'function') showToast('Sin conexión. Algunas acciones pueden quedar temporalmente no disponibles.'); });

