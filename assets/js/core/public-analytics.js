// LUTMIN · analítica pública y panel de métricas. Carga liviana del shell público.
// =========================================================
    // SISTEMA · ANALÍTICA PÚBLICA SIN COOKIES / SIN SERVICIOS PAGOS
    // =========================================================
    function publicSessionIdV20(){
      let id=sessionStorage.getItem('lutmin-public-session-v20');
      if(!id){ id=(crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`); sessionStorage.setItem('lutmin-public-session-v20',id); }
      return id;
    }
    async function trackPublicEventV20(eventType,meta={}){
      if(!supabaseClient) return;
      const qs=new URLSearchParams(location.search);
      const payload={...meta,path:location.pathname,utm_source:qs.get('utm_source')||'',utm_medium:qs.get('utm_medium')||'',utm_campaign:qs.get('utm_campaign')||''};
      try{ await supabaseClient.rpc('track_public_event_v20',{p_event_type:eventType,p_session_id:publicSessionIdV20(),p_meta:payload}); }catch(_){ }
    }
    document.addEventListener('click',e=>{
      const el=e.target.closest('[data-public-event]');
      if(el) trackPublicEventV20(el.dataset.publicEvent,{label:(el.textContent||'').trim().slice(0,120)});
    });
    window.addEventListener('load',()=>trackPublicEventV20('page_view',{title:document.title}));

    const _openPublicCourseV20 = typeof openPublicCourse==='function' ? openPublicCourse : null;
    if(_openPublicCourseV20){ openPublicCourse=function(courseId){ trackPublicEventV20('course_open',{course_id:courseId}); return _openPublicCourseV20(courseId); }; }
    const _openInterestModalV20 = typeof openInterestModal==='function' ? openInterestModal : null;
    if(_openInterestModalV20){ openInterestModal=function(courseId,offeringId){ trackPublicEventV20('course_interest',{course_id:courseId,offering_id:offeringId}); return _openInterestModalV20(courseId,offeringId); }; }

    async function loadPublicWebMetricsV20(){
      if(!supabaseClient||currentLutminUser?.role!=='admin') return;
      const root=document.getElementById('publicWebMetricsV20'); if(!root)return;
      const {data,error}=await supabaseClient.rpc('get_public_metrics_v20',{p_days:30});
      if(error){root.innerHTML=`<p class="text-xs text-amber-700">Métricas web pendientes: ${escapeHtml(error.message)}</p>`;return;}
      const m=data||{};
      root.innerHTML=`<div class="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">VISITAS</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.page_view||0)}</p></div>
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">CURSOS ABIERTOS</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.course_open||0)}</p></div>
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">INTERÉS CURSO</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.course_interest||0)}</p></div>
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">ACCESO ALUMNO</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.student_access||0)+Number(m.hero_student_access||0)+Number(m.campus_student_access||0)}</p></div>
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">ACCESO EMPRESA</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.company_access||0)+Number(m.hero_company_access||0)+Number(m.company_portal_cta||0)}</p></div>
        <div class="p-4 rounded-2xl bg-slate-50"><p class="text-[10px] font-bold text-slate-400">CONTACTOS</p><p class="mt-1 text-2xl font-black text-lutmin-dark">${Number(m.contact_submit||0)}</p></div>
      </div>`;
    }

    // Inyectamos panel en Resumen sin volver más larga toda la administración.
    function ensurePublicMetricsPanelV20(){
      if(document.getElementById('publicWebMetricsPanelV20')) return;
      const admin=document.querySelector('section[data-campus-panel="admin"]'); if(!admin)return;
      const anchor=[...admin.children].find(el=>el.querySelector?.('#adminStudentsStat'));
      if(!anchor)return;
      const panel=document.createElement('div'); panel.id='publicWebMetricsPanelV20'; panel.dataset.adminModuleV19='overview'; panel.className='mt-6 bg-white rounded-3xl border border-slate-100 p-5 sm:p-6';
      panel.innerHTML='<div class="flex items-center justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-extrabold text-lutmin-light">Sitio público · últimos 30 días</p><h3 class="mt-1 font-extrabold text-lutmin-dark text-lg">Rendimiento web</h3><p class="mt-1 text-xs text-slate-500">Medición básica dentro de Supabase, sin cookies publicitarias ni servicios pagos.</p></div><button onclick="loadPublicWebMetricsV20()" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Actualizar</button></div><div id="publicWebMetricsV20" class="mt-4"><p class="text-xs text-slate-500">Cargando...</p></div>';
      anchor.insertAdjacentElement('afterend',panel);
      panel.classList.toggle('hidden',activeAdminModuleV19!=='overview');
      loadPublicWebMetricsV20();
    }
    setTimeout(()=>{ensurePublicMetricsPanelV20();},800);
