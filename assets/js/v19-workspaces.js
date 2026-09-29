(()=>{
  // =========================================================
  // LUTMIN V19.0 · WORKSPACE NAVIGATION SYSTEM
  // Unifica la lógica: Workspace > Módulo > Submódulo > Acción.
  // No agrega dependencias, APIs ni costo.
  // =========================================================
  const stateV190={
    active:{company:'summary',companyConecta:'overview',instructor:'overview',admin:'overview'},
    installed:false
  };
  const escV190=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function itemHtmlV190(scope,key,label,icon){
    return `<button type="button" class="workspace-tree-item-v190" data-v190-scope="${scope}" data-v190-key="${key}" onclick="openWorkspaceSectionV190('${scope}','${key}',event)"><i class="fa-solid ${icon}"></i><span>${escV190(label)}</span></button>`;
  }
  function groupHtmlV190(scope,label,items){
    return `<p class="workspace-tree-label-v190">${escV190(label)}</p>${items.map(x=>itemHtmlV190(scope,...x)).join('')}`;
  }
  const topNavScopesV330=new Set(['admin','company','companyConecta']);
  const treesV190={
    company:{parent:'companyDesktopTab',id:'companyTreeV190',groups:[
      ['Gestión del equipo',[
        ['summary','Resumen','fa-house'],['team','Colaboradores','fa-users'],['training','Capacitación','fa-graduation-cap'],['agenda','Agenda y asistencia','fa-calendar-check']
      ]],
      ['Talento y cumplimiento',[
        ['compliance','Cumplimiento','fa-shield-check'],['development','Desarrollo y brechas','fa-route'],['autopilot','Autopilot','fa-satellite-dish']
      ]]
    ]},
    companyConecta:{parent:'companyConectaDesktopTab',id:'companyConectaTreeV190',groups:[
      ['Búsquedas',[
        ['overview','Panel','fa-chart-pie'],['publish','Nueva búsqueda','fa-plus'],['jobs','Mis publicaciones','fa-rectangle-list']
      ]],
      ['Candidatos',[
        ['applications','Postulaciones','fa-user-check'],['pipeline','Pipeline','fa-table-columns'],['interviews','Entrevistas','fa-calendar-check']
      ]],
      ['Talento',[
        ['talent','Banco de talento','fa-users-viewfinder'],['favorites','Favoritos','fa-star']
      ]]
    ]},
    instructor:{parent:'instructorDesktopTab',id:'instructorTreeV190',groups:[
      ['Docencia',[
        ['overview','Resumen','fa-house'],['agenda','Agenda y asistencia','fa-calendar-check'],['activities','Actividades','fa-list-check'],['students','Alumnos','fa-users']
      ]]
    ]},
    admin:{parent:'adminDesktopTab',id:'adminTreeV190',groups:[
      ['Control',[
        ['overview','Resumen','fa-house'],['agents','Autopilot','fa-wand-magic-sparkles'],['operations','Operación','fa-list-check']
      ]],
      ['Gestión',[
        ['academic','Academia','fa-graduation-cap'],['people','Personas','fa-users'],['companies','Empresas','fa-building'],['development','Desarrollo','fa-route']
      ]],
      ['Negocio',[
        ['commercial','Comercial','fa-bullseye'],['finance','Finanzas','fa-wallet'],['talent','Talento','fa-briefcase']
      ]],
      ['Sistema',[
        ['communications','Comunicación','fa-bullhorn'],['system','Sistema','fa-gear']
      ]]
    ]}
  };

  function ensureTreeV190(scope){
    const cfg=treesV190[scope],parent=document.getElementById(cfg.parent);if(!parent)return null;
    if(topNavScopesV330.has(scope)){
      document.getElementById(cfg.id)?.remove();
      parent.classList.remove('workspace-parent-v190');
      parent.querySelector('.workspace-chevron-v190')?.remove();
      parent.removeAttribute('aria-controls');parent.removeAttribute('aria-expanded');
      return null;
    }
    let tree=document.getElementById(cfg.id);
    if(!tree){
      tree=document.createElement('div');tree.id=cfg.id;tree.className='workspace-tree-v190 is-collapsed';tree.dataset.v190Scope=scope;
      tree.innerHTML=cfg.groups.map(g=>groupHtmlV190(scope,g[0],g[1])).join('');
      parent.insertAdjacentElement('afterend',tree);
    }
    parent.classList.add('workspace-parent-v190');
    if(!parent.querySelector('.workspace-chevron-v190')){
      const ch=document.createElement('i');ch.className='fa-solid fa-chevron-down workspace-chevron-v190';parent.appendChild(ch);
    }
    parent.setAttribute('aria-controls',cfg.id);
    if(!parent.hasAttribute('aria-expanded'))parent.setAttribute('aria-expanded','false');
    if(!parent.dataset.v190Bound){
      parent.dataset.v190Bound='1';
      parent.addEventListener('click',()=>setTimeout(()=>toggleTreeV190(scope),0));
    }
    return tree;
  }
  function setTreeOpenV190(scope,open){
    const cfg=treesV190[scope],parent=document.getElementById(cfg.parent),tree=document.getElementById(cfg.id);if(!parent||!tree)return;
    parent.setAttribute('aria-expanded',open?'true':'false');tree.classList.toggle('is-collapsed',!open);
    try{sessionStorage.setItem(`lutmin-v190-tree-${scope}`,open?'1':'0')}catch(_){ }
  }
  function toggleTreeV190(scope){
    const parent=document.getElementById(treesV190[scope]?.parent);if(!parent)return;
    const open=parent.getAttribute('aria-expanded')==='true';
    // En Empresa dejamos un solo árbol principal abierto para no llenar el lateral.
    if(!open&&['company','companyConecta'].includes(scope)){
      setTreeOpenV190(scope==='company'?'companyConecta':'company',false);
    }
    setTreeOpenV190(scope,!open);
  }
  function setActiveV190(scope,key){
    stateV190.active[scope]=key;
    document.querySelectorAll(`[data-v190-scope="${scope}"]`).forEach(b=>b.classList.toggle('active',b.dataset.v190Key===key));
    document.querySelectorAll('[data-v341-company-key]').forEach(b=>{
      const active=scope==='company'&&b.dataset.v341CompanyKey===key;
      b.classList.toggle('bg-lutmin-dark',active);
      b.classList.toggle('text-white',active);
      b.classList.toggle('shadow-sm',active);
      b.classList.toggle('text-slate-600',!active);
      b.classList.toggle('hover:bg-slate-50',!active);
      b.setAttribute('aria-current',active?'page':'false');
    });
    try{localStorage.setItem(`lutmin-v190-active-${scope}`,key)}catch(_){ }
  }
  function focusV190(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('workspace-focus-v190');setTimeout(()=>el.classList.remove('workspace-focus-v190'),900);}
  function showCompanyModuleV341(key='summary'){
    document.querySelectorAll('[data-company-module-panel]').forEach(panel=>{
      const active=panel.dataset.companyModulePanel===key;
      panel.classList.toggle('hidden',!active);
      panel.setAttribute('aria-hidden',active?'false':'true');
    });
    setActiveV190('company',key);
  }
  function syncCompanyDynamicHostsV341(){
    const pairs=[
      ['companyOnboardingV200','companyOnboardingHostV341'],
      ['companyAcademyPlanV36','companyAcademyHostV341'],
      ['companyComplianceV40','companyComplianceHostV341'],
      ['companyDevelopmentV100','companyDevelopmentHostV341'],
      ['companyAutopilotV110','companyAutopilotHostV341']
    ];
    pairs.forEach(([id,hostId])=>{const el=document.getElementById(id),host=document.getElementById(hostId);if(el&&host&&el.parentElement!==host)host.appendChild(el);});
  }
  async function ensureCompanyModulesV190(key='summary'){
    const ready=await window.LutminV30Modules?.ensureCompanySection?.(key);
    if(ready===false)return false;
    try{
      if(key==='onboarding'){
        if(typeof ensureCompanyOnboardingUi==='function')ensureCompanyOnboardingUi();
        syncCompanyDynamicHostsV341();
        if(typeof loadCompanyOnboardingV200==='function')await (window.LutminV29Data?.load?window.LutminV29Data.load('company:onboarding',()=>loadCompanyOnboardingV200(),{ttl:20000}):loadCompanyOnboardingV200());
      }
      if(key==='training'){
        if(typeof initV36CompanyUi==='function')initV36CompanyUi();
        syncCompanyDynamicHostsV341();
        if(typeof loadCompanyAcademyV36==='function')await loadCompanyAcademyV36();
      }
      if(key==='compliance'){
        if(typeof initCompanyComplianceV40==='function')initCompanyComplianceV40();
        syncCompanyDynamicHostsV341();
        if(typeof loadCompanyComplianceV40==='function')await loadCompanyComplianceV40();
      }
      if(key==='development'){
        if(typeof ensureCompanyDevelopmentPanelV100==='function')ensureCompanyDevelopmentPanelV100();
        syncCompanyDynamicHostsV341();
        if(typeof loadCompanyDevelopmentV100==='function')await loadCompanyDevelopmentV100();
      }
      if(key==='autopilot'){
        if(typeof ensureCompanyAutopilotV110==='function')ensureCompanyAutopilotV110();
        syncCompanyDynamicHostsV341();
        if(typeof loadCompanyAutopilotV110==='function')await loadCompanyAutopilotV110(false);
      }
      syncCompanyDynamicHostsV341();
    }catch(err){console.warn('[Lutmin V35.0] Módulo Empresa no disponible:',key,err);}
    return true;
  }
  async function openCompanyV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('company');
    showCompanyModuleV341(key);
    // El dataset general sólo se pide donde realmente se usa.
    if(['summary','team','onboarding','training','agenda'].includes(key)){
      try{
        if(typeof loadCompanyPortalData==='function'){
          if(window.LutminV29Data?.load)await window.LutminV29Data.load('company',()=>loadCompanyPortalData(),{ttl:12000});
          else await loadCompanyPortalData();
        }
      }catch(_){ }
    }
    await ensureCompanyModulesV190(key);
    syncCompanyDynamicHostsV341();
    showCompanyModuleV341(key);
    window.LutminV34Nav?.apply?.('company_admin');
  }
  async function openCompanyConectaV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('company-conecta');
    try{if(typeof loadCompanyConectaData==='function'){if(window.LutminV29Data?.load)await window.LutminV29Data.load('company-conecta',()=>loadCompanyConectaData(),{ttl:15000});else await loadCompanyConectaData();}}catch(_){ }
    if(typeof setCompanyConectaView==='function')setCompanyConectaView(key);
    setActiveV190('companyConecta',key);setTreeOpenV190('companyConecta',true);setTreeOpenV190('company',false);
    setTimeout(()=>{const el=document.querySelector(`[data-company-conecta-view="${key}"]`);if(el)focusV190(el);},80);
  }
  async function openInstructorV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('instructor');
    if(typeof setInstructorTabV50==='function')setInstructorTabV50(key);
    else {window.instructorTabV50=key;if(typeof renderInstructorPortalV50==='function')renderInstructorPortalV50();}
    setActiveV190('instructor',key);setTreeOpenV190('instructor',true);
    setTimeout(()=>focusV190(document.getElementById('instructorBodyV50')),70);
  }
  function openAdminV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('admin');
    if(typeof setAdminModuleV19==='function')setAdminModuleV19(key);
    setActiveV190('admin',key);setTreeOpenV190('admin',true);
  }
  window.openWorkspaceSectionV190=async function(scope,key,event){
    event?.stopPropagation?.();
    if(scope==='company')return openCompanyV190(key);
    if(scope==='companyConecta')return openCompanyConectaV190(key);
    if(scope==='instructor')return openInstructorV190(key);
    if(scope==='admin')return openAdminV190(key);
  };

  function hideTreesForRoleV190(){
    const role=currentLutminUser?.role;
    Object.entries(treesV190).forEach(([scope,cfg])=>{
      const tree=document.getElementById(cfg.id),parent=document.getElementById(cfg.parent);if(!parent)return;
      const visible=(role==='company_admin'&&['company','companyConecta'].includes(scope))||(role==='instructor'&&scope==='instructor')||(role==='admin'&&scope==='admin');
      // V33: Admin y Conecta mantienen módulos arriba. El lateral sólo selecciona workspace.
      parent.classList.toggle('hidden',!visible);
      parent.setAttribute('aria-hidden',visible?'false':'true');
      if(tree){tree.classList.toggle('hidden',!visible);tree.setAttribute('aria-hidden',visible?'false':'true');}
      if(!visible)setTreeOpenV190(scope,false);
    });
    // abrir el árbol del workspace activo, conservando el estado del usuario cuando sea posible
    if(role==='company_admin'){
      document.getElementById('companyTreeV190')?.remove();
      document.getElementById('companyConectaTreeV190')?.remove();
    } else if(role==='instructor') setTreeOpenV190('instructor',true);
    else if(role==='admin') setTreeOpenV190('admin',true);
  }
  function ensureCompanyTopNavV341(){
    const nav=document.getElementById('companyModuleNavV341');
    if(!nav)return;
    const active=stateV190.active.company||'summary';
    showCompanyModuleV341(active);
  }
  function markRedundantInlineNavsV190(){
    document.getElementById('instructorTabsV50')?.classList.add('v190-inline-nav-hide');
    // V33: Conecta conserva su navegación modular superior; no se reemplaza por árbol lateral.
    document.querySelector('.company-conecta-nav')?.parentElement?.classList.remove('v190-company-conecta-inline');
    const p=document.querySelector('[data-campus-panel="instructor"] > div:first-child p');if(p)p.textContent='Portal Docente';
  }
  function restoreActiveV190(){
    ['company','companyConecta','instructor','admin'].forEach(scope=>{
      let key=null;try{key=localStorage.getItem(`lutmin-v190-active-${scope}`)}catch(_){ }
      if(scope==='admin'&&typeof activeAdminModuleV19!=='undefined')key=activeAdminModuleV19||key;
      if(scope==='instructor'&&typeof instructorTabV50!=='undefined')key=instructorTabV50||key;
      if(key)setActiveV190(scope,key);
    });
  }
  function installV190(){
    Object.keys(treesV190).forEach(ensureTreeV190);markRedundantInlineNavsV190();restoreActiveV190();ensureCompanyTopNavV341();hideTreesForRoleV190();syncCompanyDynamicHostsV341();window.LutminV34Nav?.apply?.(currentLutminUser?.role);stateV190.installed=true;
  }
  const oldPaintV190=typeof paintCurrentLutminUser==='function'?paintCurrentLutminUser:null;
  if(oldPaintV190){paintCurrentLutminUser=function(){const r=oldPaintV190.apply(this,arguments);setTimeout(()=>{installV190();hideTreesForRoleV190();},0);return r;};}
  const oldGoV190=typeof goToCampusTab==='function'?goToCampusTab:null;
  if(oldGoV190){goToCampusTab=function(tab){const r=oldGoV190.apply(this,arguments);setTimeout(()=>{
    hideTreesForRoleV190();
    if(tab==='company')ensureCompanyTopNavV341();
    if(tab==='instructor')setTreeOpenV190('instructor',true);
    if(tab==='admin')setTreeOpenV190('admin',true);
  },0);return r;};}
  // V33: Administración usa navegación superior y un único loader modular.
  // No envolvemos setAdminModuleV19: evita montajes/cargas duplicadas.
  const oldInstructorTabV190=typeof setInstructorTabV50==='function'?setInstructorTabV50:null;
  if(oldInstructorTabV190){setInstructorTabV50=function(tab){const r=oldInstructorTabV190.apply(this,arguments);setActiveV190('instructor',tab);return r;};}
  // V33: Conecta conserva sus módulos superiores; tampoco necesita wrapper lateral.

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV190,0));else setTimeout(installV190,0);
})();
