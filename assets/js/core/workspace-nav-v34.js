// =============================================================
// LUTMIN V35.0 · WORKSPACE NAV NORMALIZER
// Un workspace activo = una navegación. Evita tabs heredados duplicados.
// =============================================================
(function(){
  'use strict';
  const VERSION='35.0';
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
    return true;
  }
  window.LutminV34Nav={version:VERSION,apply,status:()=>({...state})};
  window.addEventListener('lutmin:v30:modules-ready',()=>setTimeout(()=>apply(),0));
  window.addEventListener('lutmin:v32:view-ready',()=>setTimeout(()=>apply(),0));
})();
