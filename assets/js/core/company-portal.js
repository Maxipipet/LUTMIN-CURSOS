// =============================================================
// LUTMIN V52.0 · COMPANY PORTAL RUNTIME
// Portal operativo de empresa. Carga sólo para acceso Empresa.
// =============================================================
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

