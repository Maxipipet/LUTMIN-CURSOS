// =============================================================
// LUTMIN · WORKSPACE NAV NORMALIZER
// Un workspace activo = una navegación. Evita tabs heredados duplicados.
// =============================================================
(function(){
  'use strict';
  const VERSION='53.0';
  const state={role:null,applies:0,duplicatesHidden:0};
  const allowed={
    student:new Set(['dashboard','courses','agenda','activities','certificates','talent','notifications','support','profile']),
    company_admin:new Set(['company','company-conecta','notifications','support','profile']),
    instructor:new Set(['instructor','notifications','support','profile']),
    admin:new Set(['admin','notifications','support','profile'])
  };
  const canonical={
    desktop:{talent:'studentConectaParentV183',company:'companyDesktopTab','company-conecta':'companyConectaDesktopTab',instructor:'instructorDesktopTab',admin:'adminDesktopTab'},
    mobile:{company:'companyMobileTab','company-conecta':'companyConectaMobileTab',instructor:'instructorMobileTab',admin:'adminMobileTab'}
  };
  function visible(el,on){if(!el)return;el.classList.toggle('hidden',!on);el.hidden=!on;el.setAttribute('aria-hidden',on?'false':'true');}
  function normalize(container,role,mode){
    if(!container)return;
    const ok=allowed[role]||allowed.student;
    const byTab=new Map();
    container.querySelectorAll('.campus-tab[data-campus-tab]').forEach(el=>{
      const tab=el.dataset.campusTab;
      if(!byTab.has(tab))byTab.set(tab,[]);
      byTab.get(tab).push(el);
    });
    for(const [tab,els] of byTab){
      const should=ok.has(tab);
      const preferredId=canonical[mode]?.[tab];
      const keep=(preferredId&&els.find(x=>x.id===preferredId))||els[0];
      els.forEach(el=>{
        const on=should&&el===keep;
        if(should&&el!==keep){el.dataset.v34NavDuplicate='1';state.duplicatesHidden+=1;}
        visible(el,on);
      });
    }
  }
  function reorderCompany(){
    const nav=document.getElementById('campusSidebarNavV183');
    const company=document.getElementById('companyDesktopTab');
    const conecta=document.getElementById('companyConectaDesktopTab');
    const notice=nav?.querySelector('[data-campus-tab="notifications"]');
    if(nav&&company&&notice){nav.insertBefore(company,notice);const tree=document.getElementById('companyTreeV190');if(tree)company.insertAdjacentElement('afterend',tree);}
    if(nav&&conecta&&notice)nav.insertBefore(conecta,notice);
    const mConecta=document.getElementById('companyConectaMobileTab');
    const mCompany=document.getElementById('companyMobileTab');
    const mNav=mCompany?.parentElement;
    const mNotice=mNav?.querySelector('[data-campus-tab="notifications"]');
    if(mNav&&mCompany&&mNotice)mNav.insertBefore(mCompany,mNotice);
    if(mNav&&mConecta&&mNotice)mNav.insertBefore(mConecta,mNotice);
  }

  // V36 · Estado visual y accesibilidad coherentes para todos los módulos superiores.
  const topNavGroups=[
    ['adminModuleNavV19','[data-admin-v19-btn]'],
    ['companyModuleNavV341','[data-v341-company-key]'],
    ['talentModuleNavV342','[data-talent-module-key]'],
    [null,'#conectaHubV210 [data-v210-module]'],
    [null,'[data-campus-panel="company-conecta"] [data-company-conecta-nav]']
  ];
  function enhanceTopNav(root,selector){
    const scope=root||document;
    const buttons=[...scope.querySelectorAll(selector)];
    if(!buttons.length)return;
    const host=root||buttons[0].parentElement;
    host?.setAttribute?.('role','tablist');
    buttons.forEach((btn,index)=>{
      btn.setAttribute('role','tab');
      if(!btn.hasAttribute('aria-current'))btn.setAttribute('aria-current',index===0?'page':'false');
      const active=btn.getAttribute('aria-current')==='page'||btn.classList.contains('active');
      btn.setAttribute('aria-selected',active?'true':'false');
      btn.dataset.lutminActive=active?'true':'false';
      btn.tabIndex=active?0:-1;
      if(btn.dataset.v36KeyboardBound)return;
      btn.dataset.v36KeyboardBound='1';
      btn.addEventListener('keydown',ev=>{
        if(!['ArrowRight','ArrowLeft','Home','End'].includes(ev.key))return;
        ev.preventDefault();
        const current=[...host.querySelectorAll(selector)].filter(x=>!x.classList.contains('hidden'));
        const i=current.indexOf(btn);if(i<0||!current.length)return;
        let next=i;
        if(ev.key==='ArrowRight')next=(i+1)%current.length;
        if(ev.key==='ArrowLeft')next=(i-1+current.length)%current.length;
        if(ev.key==='Home')next=0;
        if(ev.key==='End')next=current.length-1;
        current[next]?.focus();current[next]?.click();
      });
    });
  }
  function enhanceAllTopNavs(){
    topNavGroups.forEach(([id,selector])=>enhanceTopNav(id?document.getElementById(id):null,selector));
  }

  function apply(role=state.role){
    if(!role)return false;
    state.role=role;state.applies+=1;
    // Estos workspaces usan módulos superiores; ningún árbol V19 debe reaparecer.
    document.getElementById('adminTreeV190')?.remove();
    document.getElementById('companyTreeV190')?.remove();
    document.getElementById('companyConectaTreeV190')?.remove();
    const desktop=document.getElementById('campusSidebarNavV183')||document.getElementById('campusSidebarRole')?.closest('aside')?.querySelector('nav');
    const mobile=document.getElementById('adminMobileTab')?.parentElement||document.getElementById('companyMobileTab')?.parentElement;
    normalize(desktop,role,'desktop');normalize(mobile,role,'mobile');
    if(role==='company_admin')reorderCompany();
    enhanceAllTopNavs();
    return true;
  }
  window.LutminWorkspaceNav={version:VERSION,apply,status:()=>({...state})};
  window.LutminV34Nav=window.LutminWorkspaceNav;
  window.addEventListener('lutmin:v30:modules-ready',()=>setTimeout(()=>apply(),0));
  window.addEventListener('lutmin:v32:view-ready',()=>setTimeout(()=>apply(),0));
  window.addEventListener('lutmin:navigation-change',()=>setTimeout(enhanceAllTopNavs,0));
})();
