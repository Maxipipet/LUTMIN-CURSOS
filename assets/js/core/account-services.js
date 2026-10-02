// =============================================================
// LUTMIN V56.0 · AUTHENTICATED ACCOUNT SERVICES
// Soporte y notificaciones compartidos por accesos autenticados.
// =============================================================
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

