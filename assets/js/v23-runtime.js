(()=>{
  const VERSION='25.0';
  const STATE={
    pending:0,
    progressTimer:null,
    progressHideTimer:null,
    restoring:false,
    paletteOpen:false,
    paletteItems:[],
    paletteIndex:0,
    metrics:{},
    errors:[],
    recent:[],
    installed:false
  };
  window.__lutminRuntimeV230=STATE;

  function now(){return performance?.now?.()||Date.now()}
  function esc230(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function role(){return currentLutminUser?.role||''}
  function campusPanel(){return document.querySelector('.campus-panel:not(.hidden)')?.dataset?.campusPanel||''}

  function ensureRuntimeUi(){
    const modal=document.querySelector('#campusModal > div');
    if(modal&&!document.getElementById('lutminTopProgressV230')){
      const p=document.createElement('div');p.id='lutminTopProgressV230';p.setAttribute('aria-hidden','true');p.innerHTML='<span></span>';modal.prepend(p);
    }
    const scroll=document.querySelector('#campusModal .modal-scroll.flex-1')||document.querySelector('#campusModal [class*="overflow-y-auto"]');
    if(scroll&&!document.getElementById('lutminNetworkBannerV230')){
      const b=document.createElement('div');b.id='lutminNetworkBannerV230';b.setAttribute('role','status');
      b.innerHTML='<i class="fa-solid fa-wifi"></i><span>Sin conexión. Podés seguir viendo lo ya cargado; los cambios que requieren Supabase esperarán a recuperar internet.</span>';
      scroll.prepend(b);
    }
    if(!document.getElementById('lutminCommandPaletteV230')){
      const d=document.createElement('div');d.id='lutminCommandPaletteV230';d.setAttribute('aria-hidden','true');
      d.innerHTML='<div class="palette-shell" role="dialog" aria-modal="true" aria-label="Buscador rápido de Lutmin"><div class="palette-head"><input id="lutminCommandInputV230" autocomplete="off" placeholder="Ir a un módulo o función…"></div><div id="lutminCommandListV230" class="palette-list"></div></div>';
      document.body.appendChild(d);
      d.addEventListener('mousedown',e=>{if(e.target===d)closePalette()});
      d.querySelector('#lutminCommandInputV230')?.addEventListener('input',renderPalette);
      d.querySelector('#lutminCommandInputV230')?.addEventListener('keydown',paletteKeydown);
    }
    updateNetworkState();
  }

  function progressStart(){
    STATE.pending++;
    if(STATE.pending!==1)return;
    clearTimeout(STATE.progressHideTimer);
    STATE.progressTimer=setTimeout(()=>{
      const p=document.getElementById('lutminTopProgressV230');
      if(p){p.classList.remove('is-done');p.classList.add('is-loading')}
    },160);
  }
  function progressEnd(){
    STATE.pending=Math.max(0,STATE.pending-1);
    if(STATE.pending>0)return;
    clearTimeout(STATE.progressTimer);
    const p=document.getElementById('lutminTopProgressV230');if(!p)return;
    p.classList.remove('is-loading');p.classList.add('is-done');
    STATE.progressHideTimer=setTimeout(()=>p.classList.remove('is-done'),280);
  }

  function recordMetric(name,ms,ok){
    const m=STATE.metrics[name]||(STATE.metrics[name]={count:0,total:0,max:0,errors:0,last:0});
    m.count++;m.total+=ms;m.max=Math.max(m.max,ms);m.last=ms;if(!ok)m.errors++;
    renderRuntimeDiagnostics();
  }
  function recordError(name,error){
    STATE.errors.unshift({name,message:String(error?.message||error||'Error'),at:new Date().toISOString()});
    STATE.errors=STATE.errors.slice(0,12);
  }

  function wrapLoader(name){
    const fn=window[name];
    if(typeof fn!=='function'||fn.__lutminV230Wrapped)return;
    const wrapped=async function(){
      progressStart();const t=now();let ok=true;
      try{return await fn.apply(this,arguments)}
      catch(e){ok=false;recordError(name,e);throw e}
      finally{recordMetric(name,now()-t,ok);progressEnd()}
    };
    wrapped.__lutminV230Wrapped=true;wrapped.__lutminV230Original=fn;window[name]=wrapped;
  }
  function installMeasuredLoaders(){
    [
      'loadCampusData','loadStudentAgenda','loadNotificationCenter','loadTalentCenter',
      'loadCompanyPortalData','loadCompanyConectaData','loadAdminData','loadInstructorPortalV50',
      'loadSupportCenter','loadOrganizationsV200','loadCareerTimelineV200','loadV140ProfileData',
      'loadV150StudentData','loadPersonalAutopilotV110'
    ].forEach(wrapLoader);
  }

  function updateNetworkState(){
    const b=document.getElementById('lutminNetworkBannerV230');if(!b)return;
    b.classList.toggle('is-offline',navigator.onLine===false);
  }

  function normalizeText(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function addRecent(id){
    STATE.recent=[id,...STATE.recent.filter(x=>x!==id)].slice(0,6);
    try{sessionStorage.setItem('lutmin-v230-recent',JSON.stringify(STATE.recent))}catch(_){}
  }
  function loadRecent(){
    try{const r=JSON.parse(sessionStorage.getItem('lutmin-v230-recent')||'[]');if(Array.isArray(r))STATE.recent=r.slice(0,6)}catch(_){}
  }

  function actionsForRole(){
    const r=role();
    const items=[];
    const add=(id,label,icon,group,run)=>items.push({id,label,icon,group,run,search:normalizeText(`${label} ${group}`)});
    const tab=(id,label,icon)=>add(`tab:${id}`,label,icon,'Campus',()=>window.LutminV29Data?.openTab?.(id)||goToCampusTab(id));

    if(r==='student'){
      tab('dashboard','Inicio','fa-house');
      tab('courses','Mis cursos','fa-book');
      tab('agenda','Agenda','fa-calendar-days');
      if(document.querySelector('[data-campus-tab="activities"]'))tab('activities','Actividades','fa-list-check');
      tab('certificates','Certificados','fa-award');
      add('conecta:summary','Lutmin Conecta · Resumen','fa-briefcase','Conecta',()=>window.LutminV29Data?.openConecta?.('summary'));
      [
        ['profile','Perfil profesional','fa-id-card'],
        ['jobs','Oportunidades laborales','fa-magnifying-glass'],
        ['applications','Mis postulaciones','fa-file-circle-check'],
        ['interviews','Entrevistas','fa-calendar-check'],
        ['organizations','Organizaciones','fa-building'],
        ['saved','Guardadas','fa-bookmark'],
        ['agent','Agente de empleabilidad','fa-wand-magic-sparkles'],
        ['career','Carrera y evidencias','fa-route'],
        ['timeline','Mi trayectoria','fa-timeline'],
        ['passport','Pasaporte profesional','fa-address-card']
      ].forEach(x=>add(`conecta:${x[0]}`,x[1],x[2],'Conecta',()=>window.LutminV29Data?.openConecta?.(x[0])));
      tab('notifications','Novedades','fa-bell');tab('support','Ayuda','fa-headset');tab('profile','Mi cuenta','fa-user');
    }else if(r==='company_admin'){
      tab('company','Mi empresa','fa-building');
      tab('company-conecta','Lutmin Conecta Empresa','fa-briefcase');
      [
        ['overview','Conecta Empresa · Panel','fa-chart-pie'],
        ['publish','Nueva búsqueda','fa-plus'],
        ['jobs','Mis publicaciones','fa-rectangle-list'],
        ['applications','Postulaciones','fa-user-check'],
        ['pipeline','Pipeline','fa-table-columns'],
        ['interviews','Entrevistas','fa-calendar-check'],
        ['talent','Banco de talento','fa-users-viewfinder'],
        ['favorites','Favoritos','fa-star'],
        ['interest','Talento interesado','fa-handshake-angle']
      ].forEach(x=>add(`companyConecta:${x[0]}`,x[1],x[2],'Empresa',()=>window.LutminV29Data?.openCompanyConecta?.(x[0])));
      tab('notifications','Novedades','fa-bell');tab('support','Ayuda','fa-headset');tab('profile','Mi cuenta','fa-user');
    }else if(r==='instructor'){
      tab('instructor','Portal Docente','fa-chalkboard-user');
      [['overview','Resumen'],['agenda','Agenda y asistencia'],['activities','Actividades'],['students','Alumnos']].forEach(x=>
        add(`instructor:${x[0]}`,`Docente · ${x[1]}`,'fa-chalkboard-user','Docente',()=>{goToCampusTab('instructor');setInstructorTabV50?.(x[0])})
      );
      tab('notifications','Novedades','fa-bell');tab('support','Ayuda','fa-headset');tab('profile','Mi cuenta','fa-user');
    }else if(r==='admin'){
      const mods=[
        ['overview','Resumen','fa-house'],['operations','Operación','fa-list-check'],['academic','Academia','fa-graduation-cap'],
        ['people','Personas','fa-users'],['companies','Empresas','fa-building'],['commercial','Comercial','fa-bullseye'],
        ['finance','Finanzas','fa-wallet'],['talent','Talento','fa-briefcase'],['communications','Comunicación','fa-bullhorn'],
        ['development','Desarrollo','fa-route'],['system','Sistema','fa-gear'],['agents','Autopilot','fa-wand-magic-sparkles']
      ];
      mods.forEach(x=>add(`admin:${x[0]}`,x[1],x[2],'Administración',()=>{goToCampusTab('admin');setAdminModuleV19?.(x[0])}));
      tab('notifications','Novedades','fa-bell');tab('support','Ayuda','fa-headset');tab('profile','Mi cuenta','fa-user');
    }
    return items;
  }

  function openPalette(){
    ensureRuntimeUi();
    if(role()==='admin'&&campusPanel()==='admin'){
      const existing=document.getElementById('adminGlobalSearchV19');
      if(existing){existing.focus();existing.select?.();return}
    }
    STATE.paletteItems=actionsForRole();STATE.paletteIndex=0;STATE.paletteOpen=true;
    const p=document.getElementById('lutminCommandPaletteV230');if(!p)return;
    p.classList.add('open');p.setAttribute('aria-hidden','false');
    const input=document.getElementById('lutminCommandInputV230');if(input){input.value='';setTimeout(()=>input.focus(),0)}
    renderPalette();
  }
  function closePalette(){
    STATE.paletteOpen=false;
    const p=document.getElementById('lutminCommandPaletteV230');p?.classList.remove('open');p?.setAttribute('aria-hidden','true');
  }
  function paletteKeydown(e){
    const visible=[...document.querySelectorAll('#lutminCommandListV230 .palette-item')];
    if(e.key==='ArrowDown'){e.preventDefault();STATE.paletteIndex=Math.min(visible.length-1,STATE.paletteIndex+1);paintPaletteActive(visible)}
    if(e.key==='ArrowUp'){e.preventDefault();STATE.paletteIndex=Math.max(0,STATE.paletteIndex-1);paintPaletteActive(visible)}
    if(e.key==='Enter'){e.preventDefault();visible[STATE.paletteIndex]?.click()}
    if(e.key==='Escape'){e.preventDefault();closePalette()}
  }
  function paintPaletteActive(items){
    items.forEach((el,i)=>el.classList.toggle('active',i===STATE.paletteIndex));
    items[STATE.paletteIndex]?.scrollIntoView({block:'nearest'});
  }
  function renderPalette(){
    const list=document.getElementById('lutminCommandListV230');if(!list)return;
    const q=normalizeText(document.getElementById('lutminCommandInputV230')?.value||'');
    let items=actionsForRole();
    const recentSet=new Set(STATE.recent);
    if(q)items=items.filter(x=>x.search.includes(q));
    else items.sort((a,b)=>(recentSet.has(b.id)?1:0)-(recentSet.has(a.id)?1:0));
    STATE.paletteItems=items;STATE.paletteIndex=0;
    if(!items.length){list.innerHTML='<div class="palette-empty">No encontré una función con ese nombre.</div>';return}
    let lastGroup='';
    list.innerHTML=items.map((x,i)=>{
      const g=x.group!==lastGroup?`<div class="palette-group">${esc230(x.group)}</div>`:'';lastGroup=x.group;
      return `${g}<button class="palette-item ${i===0?'active':''}" data-v230-action="${esc230(x.id)}"><i class="fa-solid ${esc230(x.icon)}"></i><span>${esc230(x.label)}</span></button>`
    }).join('');
    list.querySelectorAll('[data-v230-action]').forEach(btn=>btn.addEventListener('click',async()=>{
      const item=items.find(x=>x.id===btn.dataset.v230Action);if(!item)return;
      addRecent(item.id);closePalette();
      try{await item.run?.()}catch(e){recordError(item.id,e);showToast?.('No pude abrir ese módulo. Intentá nuevamente.')}
    }));
  }

  function currentRoute(){
    const p=campusPanel();const r=role();
    const route={role:r,panel:p,module:null};
    if(p==='admin'){
      route.module=(typeof activeAdminModuleV19!=='undefined'&&activeAdminModuleV19)||document.querySelector('[data-admin-v19-btn].bg-lutmin-dark')?.dataset?.adminV19Btn||'overview';
    }else if(p==='talent'){
      route.module=document.querySelector('[data-v210-module].active')?.dataset?.v210Module||window.__lutminConectaPanelsV212?.active||'summary';
    }else if(p==='company-conecta'){
      route.module=document.querySelector('.company-conecta-nav.bg-lutmin-dark')?.dataset?.companyConectaNav||'overview';
    }else if(p==='instructor'){
      route.module=typeof instructorTabV50!=='undefined'?instructorTabV50:null;
    }
    return route;
  }
  function routeHash(route){
    if(!route?.panel)return '';
    const mod=route.module?`/${encodeURIComponent(route.module)}`:'';
    return `#lutmin/${encodeURIComponent(route.role||'')}/${encodeURIComponent(route.panel)}${mod}`;
  }
  function parseRoute(){
    const m=location.hash.match(/^#lutmin\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);if(!m)return null;
    return {role:decodeURIComponent(m[1]||''),panel:decodeURIComponent(m[2]||''),module:m[3]?decodeURIComponent(m[3]):null};
  }
  function pushCurrentRoute(replace=false){
    if(STATE.restoring||!currentLutminUser)return;
    const route=currentRoute();if(!route.panel)return;
    const hash=routeHash(route);if(location.hash===hash)return;
    try{
      const state={...(history.state||{}),lutminRouteV230:route};
      history[replace?'replaceState':'pushState'](state,'',hash);
    }catch(_){}
  }
  async function restoreRoute(route){
    if(!route||route.role!==role())return;
    STATE.restoring=true;
    try{
      await window.LutminV29Modules?.ensureFeatureForTab?.(route.panel,role());
      if(window.LutminV29Data?.openTab)await window.LutminV29Data.openTab(route.panel);else goToCampusTab?.(route.panel);
      await new Promise(r=>setTimeout(r,30));
      if(route.panel==='admin'&&route.module)setAdminModuleV19?.(route.module);
      else if(route.panel==='talent'&&route.module)await openConectaModuleV210?.(route.module);
      else if(route.panel==='company-conecta'&&route.module)setCompanyConectaView?.(route.module);
      else if(route.panel==='instructor'&&route.module)setInstructorTabV50?.(route.module);
    }catch(e){recordError('restoreRoute',e)}
    finally{STATE.restoring=false}
  }
  function bindRouteClicks(){
    document.addEventListener('click',e=>{
      const nav=e.target.closest('.campus-tab,[data-v210-module],[data-admin-v19-btn],[data-company-conecta-nav],#instructorTabsV50 button');
      if(!nav)return;
      document.querySelector('.campus-panel:not(.hidden)')?.classList.add('v230-soft-switch','is-switching');
      setTimeout(()=>{
        document.querySelectorAll('.campus-panel.is-switching').forEach(x=>x.classList.remove('is-switching'));
        pushCurrentRoute(false);
      },90);
    },true);
  }

  function ensureRuntimeDiagnostics(){
    if(role()!=='admin')return;
    if(document.getElementById('adminRuntimeV230'))return;
    const host=document.querySelector('[data-admin-module-v19="system"]')||document.getElementById('adminSystemGuideV19');if(!host)return;
    const card=document.createElement('div');card.id='adminRuntimeV230';card.setAttribute('data-admin-module-v19','system');
    card.className='mt-6 bg-white rounded-3xl border border-slate-100 overflow-hidden';
    card.innerHTML='<div class="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-black text-lutmin-light">Rendimiento local</p><h3 class="mt-1 text-lg font-black text-lutmin-dark">Salud de esta sesión</h3><p class="mt-1 text-xs text-slate-500">Medición local del navegador. No se envía a servicios externos.</p></div><button onclick="window.renderRuntimeDiagnosticsV230?.()" class="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Actualizar</button></div><div id="adminRuntimeBodyV230" class="p-5 sm:p-6"></div>';
    host.insertAdjacentElement('afterend',card);renderRuntimeDiagnostics();
  }
  function renderRuntimeDiagnostics(){
    const body=document.getElementById('adminRuntimeBodyV230');if(!body)return;
    const rows=Object.entries(STATE.metrics).sort((a,b)=>b[1].total-a[1].total).slice(0,12);
    const connection=navigator.onLine===false?'Sin conexión':'En línea';
    body.innerHTML=`<div class="grid sm:grid-cols-4 gap-3 mb-5">
      <div class="rounded-2xl bg-slate-50 p-4"><p class="text-[9px] uppercase font-black text-slate-400">Conexión</p><p class="mt-1 font-black text-lutmin-dark">${connection}</p></div>
      <div class="rounded-2xl bg-slate-50 p-4"><p class="text-[9px] uppercase font-black text-slate-400">Cargas medidas</p><p class="mt-1 font-black text-lutmin-dark">${rows.reduce((n,x)=>n+x[1].count,0)}</p></div>
      <div class="rounded-2xl bg-slate-50 p-4"><p class="text-[9px] uppercase font-black text-slate-400">Errores locales</p><p class="mt-1 font-black ${STATE.errors.length?'text-rose-600':'text-emerald-600'}">${STATE.errors.length}</p></div>
      <div class="rounded-2xl bg-slate-50 p-4"><p class="text-[9px] uppercase font-black text-slate-400">Runtime</p><p class="mt-1 font-black text-lutmin-dark">V${VERSION}</p></div>
    </div>
    ${rows.length?`<div class="rounded-2xl border border-slate-100 overflow-hidden">
      <div class="metric-row metric-head bg-slate-50"><div>Proceso</div><div>Prom.</div><div>Máx.</div><div>Errores</div></div>
      ${rows.map(([name,m])=>`<div class="metric-row"><div class="name">${esc230(name)}</div><div class="num">${Math.round(m.total/m.count)} ms</div><div class="num">${Math.round(m.max)} ms</div><div class="num">${m.errors}</div></div>`).join('')}
    </div>`:'<div class="rounded-2xl bg-slate-50 p-5 text-xs text-slate-500">Todavía no hay cargas suficientes para mostrar métricas.</div>'}
    ${STATE.errors.length?`<div class="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-4"><p class="text-[10px] font-black uppercase tracking-widest text-rose-600">Últimos errores locales</p>${STATE.errors.slice(0,4).map(e=>`<p class="mt-2 text-xs text-rose-800"><strong>${esc230(e.name)}</strong>: ${esc230(e.message)}</p>`).join('')}</div>`:''}`;
  }
  window.renderRuntimeDiagnosticsV230=renderRuntimeDiagnostics;

  function installKeyboard(){
    document.addEventListener('keydown',e=>{
      const tag=document.activeElement?.tagName?.toLowerCase();
      const typing=['input','textarea','select'].includes(tag);
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();openPalette();return;
      }
      if(e.key==='Escape'&&STATE.paletteOpen){e.preventDefault();closePalette();return}
      if(!typing&&e.key==='/'&&currentLutminUser){e.preventDefault();openPalette()}
    });
  }

  function installRoleHooks(){
    const oldPaint=window.paintCurrentLutminUser;
    if(typeof oldPaint==='function'&&!oldPaint.__lutminV230){
      const w=function(){const r=oldPaint.apply(this,arguments);setTimeout(()=>{ensureRuntimeUi();ensureRuntimeDiagnostics();},40);return r};
      w.__lutminV230=true;window.paintCurrentLutminUser=w;
    }
    const oldAdmin=window.setAdminModuleV19;
    if(typeof oldAdmin==='function'&&!oldAdmin.__lutminV230){
      const w=function(){const r=oldAdmin.apply(this,arguments);setTimeout(()=>{ensureRuntimeDiagnostics();renderRuntimeDiagnostics()},0);return r};
      w.__lutminV230=true;window.setAdminModuleV19=w;
    }
  }

  function install(){
    if(STATE.installed)return;STATE.installed=true;
    loadRecent();ensureRuntimeUi();installMeasuredLoaders();installKeyboard();bindRouteClicks();installRoleHooks();ensureRuntimeDiagnostics();
    addEventListener('online',updateNetworkState);addEventListener('offline',updateNetworkState);
    addEventListener('popstate',()=>restoreRoute(history.state?.lutminRouteV230||parseRoute()));
    addEventListener('hashchange',()=>{if(!STATE.restoring){const r=parseRoute();if(r)restoreRoute(r)}});
    const route=parseRoute();if(route&&currentLutminUser)setTimeout(()=>restoreRoute(route),120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
