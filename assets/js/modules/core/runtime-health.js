// LUTMIN V26.0 · arquitectura modular + diagnóstico local
// Sin APIs externas ni consultas adicionales. Mide únicamente recursos y contratos del navegador.
(function(){
  const REQUIRED_GLOBALS=[
    'openStudentAccess','openCompanyPortalAccess','openAccessSwitcher','goToCampusTab',
    'loadCampusData','loadAdminData','loadCompanyPortalData','loadTalentCenter',
    'setAdminModuleV19','openConectaModuleV210','completeOpenLesson'
  ];
  const MODULE_GROUPS={
    core:['assets/js/core/app-core.js','assets/js/modules/core/qa-security.js','assets/js/modules/core/ux-support.js','assets/js/modules/core/workspaces-command.js'],
    academy:['assets/js/modules/academy/learning-paths-quality.js','assets/js/modules/academy/operations.js','assets/js/modules/academy/competencies-pro.js','assets/js/modules/academy/compliance.js'],
    talent:['assets/js/modules/talent/development.js','assets/js/modules/talent/pre-interview.js','assets/js/modules/talent/intelligence-core.js','assets/js/modules/talent/cv-parser.js','assets/js/modules/talent/evidence-career.js','assets/js/modules/talent/zero-friction.js'],
    agents:['assets/js/modules/agents/autopilot.js','assets/js/modules/agents/autopilot-company.js'],
    teacher:['assets/js/modules/teacher/portal.js'],
    platform:['assets/js/modules/platform/superplatform.js']
  };

  function localResources(){
    return performance.getEntriesByType('resource').filter(r=>{
      try{return new URL(r.name,location.href).origin===location.origin;}catch(_){return false;}
    });
  }
  function health(){
    const missing=REQUIRED_GLOBALS.filter(name=>typeof window[name]!=='function');
    const resources=localResources();
    const js=resources.filter(r=>/\.js(?:\?|$)/.test(r.name));
    const css=resources.filter(r=>/\.css(?:\?|$)/.test(r.name));
    const bytes=resources.reduce((n,r)=>n+(Number(r.transferSize)||0),0);
    const cached=resources.filter(r=>Number(r.transferSize)===0&&Number(r.decodedBodySize)>0).length;
    return {
      ok:missing.length===0,
      missing,
      moduleFiles:Object.values(MODULE_GROUPS).flat().length,
      jsLoaded:js.length,
      cssLoaded:css.length,
      transferredBytes:bytes,
      cachedResources:cached,
      domNodes:document.getElementsByTagName('*').length
    };
  }
  window.LUTMIN_V26={version:'26.0',groups:MODULE_GROUPS,health};

  function formatBytes(v){
    if(v<1024)return `${v} B`;
    if(v<1024*1024)return `${(v/1024).toFixed(1)} KB`;
    return `${(v/1024/1024).toFixed(2)} MB`;
  }
  function render(){
    if(document.getElementById('adminArchitectureV260'))return true;
    const host=document.getElementById('adminSystemGuideV19');
    if(!host)return false;
    const box=document.createElement('div');
    box.id='adminArchitectureV260';
    box.dataset.adminModuleV19='system';
    box.className='p-5 sm:p-6 border-t border-slate-100';
    box.innerHTML=`
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p class="text-[10px] uppercase tracking-widest font-extrabold text-cyan-600">Arquitectura modular</p>
          <h4 class="mt-1 text-lg font-extrabold text-lutmin-dark">Salud del frontend</h4>
          <p class="mt-1 text-xs text-slate-500 max-w-2xl">Verifica que los contratos críticos del sistema estén disponibles y muestra cuánto trabajo está haciendo esta sesión. No envía datos ni realiza consultas adicionales.</p>
        </div>
        <button id="refreshArchitectureV260" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold">Revisar ahora</button>
      </div>
      <div id="architectureStatsV260" class="mt-4 grid grid-cols-2 xl:grid-cols-5 gap-3"></div>
      <div id="architectureStatusV260" class="mt-4"></div>`;
    host.appendChild(box);
    document.getElementById('refreshArchitectureV260')?.addEventListener('click',paint);
    paint();
    return true;
  }
  function paint(){
    const h=health();
    const stats=document.getElementById('architectureStatsV260');
    const status=document.getElementById('architectureStatusV260');
    if(!stats||!status)return;
    const rows=[
      ['MÓDULOS',h.moduleFiles],['JS CARGADOS',h.jsLoaded],['CSS CARGADOS',h.cssLoaded],['TRANSFERIDO',formatBytes(h.transferredBytes)],['NODOS DOM',h.domNodes]
    ];
    stats.innerHTML=rows.map(([label,value])=>`<div class="rounded-2xl bg-slate-50 p-4"><p class="text-[10px] font-bold text-slate-400">${label}</p><p class="mt-1 text-xl font-black text-lutmin-dark">${value}</p></div>`).join('');
    status.innerHTML=h.ok
      ? `<div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800"><strong>Core operativo.</strong> Los ${REQUIRED_GLOBALS.length} contratos críticos están disponibles.</div>`
      : `<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800"><strong>Revisar módulos:</strong> ${h.missing.join(', ')}</div>`;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(render())return;
    setTimeout(()=>{if(render())return;setTimeout(render,1800);},500);
  },{once:true});
})();
