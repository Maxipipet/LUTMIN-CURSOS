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
    try{localStorage.setItem(`lutmin-v190-active-${scope}`,key)}catch(_){ }
  }
  function focusV190(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});el.classList.add('workspace-focus-v190');setTimeout(()=>el.classList.remove('workspace-focus-v190'),900);}
  async function ensureCompanyModulesV190(){
    try{if(typeof initV36CompanyUi==='function')initV36CompanyUi();}catch(_){ }
    try{if(typeof initCompanyComplianceV40==='function')initCompanyComplianceV40();}catch(_){ }
    try{if(typeof ensureCompanyDevelopmentPanelV100==='function')ensureCompanyDevelopmentPanelV100();}catch(_){ }
    try{if(typeof ensureCompanyAutopilotV110==='function')ensureCompanyAutopilotV110();}catch(_){ }
  }
  async function openCompanyV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('company');
    try{if(typeof loadCompanyPortalData==='function')await loadCompanyPortalData();}catch(_){ }
    await ensureCompanyModulesV190();
    const map={summary:'companyPortalName',team:'companyPortalMembers',training:'companyTrainingPlans',agenda:'companyPortalAgenda',compliance:'companyComplianceV40',development:'companyDevelopmentV100',autopilot:'companyAutopilotV110'};
    if(key==='compliance'&&typeof loadCompanyComplianceV40==='function')try{await loadCompanyComplianceV40()}catch(_){ }
    if(key==='development'&&typeof loadCompanyDevelopmentV100==='function')try{await loadCompanyDevelopmentV100()}catch(_){ }
    if(key==='autopilot'&&typeof loadCompanyAutopilotV110==='function')try{await loadCompanyAutopilotV110(false)}catch(_){ }
    setActiveV190('company',key);setTreeOpenV190('company',true);setTreeOpenV190('companyConecta',false);
    setTimeout(()=>focusV190(document.getElementById(map[key]||'companyPortalName')),100);
  }
  async function openCompanyConectaV190(key){
    if(typeof goToCampusTab==='function')goToCampusTab('company-conecta');
    try{if(typeof loadCompanyConectaData==='function')await loadCompanyConectaData();}catch(_){ }
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
      const tree=document.getElementById(cfg.id),parent=document.getElementById(cfg.parent);if(!tree||!parent)return;
      const visible=(role==='company_admin'&&['company','companyConecta'].includes(scope))||(role==='instructor'&&scope==='instructor')||(role==='admin'&&scope==='admin');
      // V20.1: aislar también el botón padre, no sólo el árbol.
      // V19 aplicaba display:flex!important al padre y podía anular la clase hidden.
      parent.classList.toggle('hidden',!visible);
      parent.setAttribute('aria-hidden',visible?'false':'true');
      tree.classList.toggle('hidden',!visible);
      tree.setAttribute('aria-hidden',visible?'false':'true');
      if(!visible)setTreeOpenV190(scope,false);
    });
    // abrir el árbol del workspace activo, conservando el estado del usuario cuando sea posible
    if(role==='company_admin'){
      const panel=document.querySelector('.campus-panel:not(.hidden)')?.dataset?.campusPanel;
      const s=panel==='company-conecta'?'companyConecta':'company';
      setTreeOpenV190(s,true);setTreeOpenV190(s==='company'?'companyConecta':'company',false);
    } else if(role==='instructor') setTreeOpenV190('instructor',true);
    else if(role==='admin') setTreeOpenV190('admin',true);
  }
  function markRedundantInlineNavsV190(){
    document.getElementById('instructorTabsV50')?.classList.add('v190-inline-nav-hide');
    const any=document.querySelector('.company-conecta-nav');if(any)any.parentElement?.classList.add('v190-company-conecta-inline');
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
    Object.keys(treesV190).forEach(ensureTreeV190);markRedundantInlineNavsV190();restoreActiveV190();hideTreesForRoleV190();stateV190.installed=true;
  }
  const oldPaintV190=typeof paintCurrentLutminUser==='function'?paintCurrentLutminUser:null;
  if(oldPaintV190){paintCurrentLutminUser=function(){const r=oldPaintV190.apply(this,arguments);setTimeout(()=>{installV190();hideTreesForRoleV190();},0);return r;};}
  const oldGoV190=typeof goToCampusTab==='function'?goToCampusTab:null;
  if(oldGoV190){goToCampusTab=function(tab){const r=oldGoV190.apply(this,arguments);setTimeout(()=>{
    hideTreesForRoleV190();
    if(tab==='company')setTreeOpenV190('company',true);
    if(tab==='company-conecta')setTreeOpenV190('companyConecta',true);
    if(tab==='instructor')setTreeOpenV190('instructor',true);
    if(tab==='admin')setTreeOpenV190('admin',true);
  },0);return r;};}
  // Sincronizar submenús cuando otra parte del sistema cambie el módulo interno.
  const oldSetAdminV190=typeof setAdminModuleV19==='function'?setAdminModuleV19:null;
  if(oldSetAdminV190){setAdminModuleV19=function(module,opts){const r=oldSetAdminV190.apply(this,arguments);setActiveV190('admin',module);return r;};}
  const oldInstructorTabV190=typeof setInstructorTabV50==='function'?setInstructorTabV50:null;
  if(oldInstructorTabV190){setInstructorTabV50=function(tab){const r=oldInstructorTabV190.apply(this,arguments);setActiveV190('instructor',tab);return r;};}
  const oldCompanyViewV190=typeof setCompanyConectaView==='function'?setCompanyConectaView:null;
  if(oldCompanyViewV190){setCompanyConectaView=function(view){const r=oldCompanyViewV190.apply(this,arguments);setActiveV190('companyConecta',view);return r;};}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV190,0));else setTimeout(installV190,0);
})();
