// =============================================================
// LUTMIN V53.0 · STUDENT CAMPUS RUNTIME
// Cursos, clases, evaluaciones y agenda. Carga sólo para Alumno.
// =============================================================
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

