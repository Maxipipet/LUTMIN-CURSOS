
// =========================================================
// LUTMIN V16.0 · WORKSPACES + COMMAND CENTER
// Aísla Alumno / Empresa / Docente / Administración y evita
// que un contexto cargue pantallas o llamadas de otro contexto.
// =========================================================
const workspaceConfigV160={
  student:{label:'Campus Lutmin',eyebrow:'Espacio de aprendizaje',icon:'fa-graduation-cap',home:'dashboard',allowed:['dashboard','courses','agenda','activities','certificates','talent','profile','notifications','support']},
  company_admin:{label:'Portal Empresa',eyebrow:'Espacio corporativo',icon:'fa-building',home:'company',allowed:['company','company-conecta','profile','notifications','support']},
  instructor:{label:'Portal Docente',eyebrow:'Gestión académica',icon:'fa-chalkboard-user',home:'instructor',allowed:['instructor','profile','notifications','support']},
  admin:{label:'Administración Lutmin',eyebrow:'Gestión interna',icon:'fa-shield-halved',home:'admin',allowed:['admin','profile','notifications','support']}
};
function workspaceV160(){return workspaceConfigV160[currentLutminUser?.role]||workspaceConfigV160.student;}
function currentCampusPanelV160(){return document.querySelector('.campus-panel:not(.hidden)')?.dataset?.campusPanel||null;}
function enforceWorkspaceRouteV160(){
  if(!currentLutminUser)return;
  const cfg=workspaceV160(),active=currentCampusPanelV160();
  if(!cfg.allowed.includes(active))goToCampusTab(cfg.home);
}
function applyWorkspaceChromeV160(){
  if(!currentLutminUser)return;
  const cfg=workspaceV160(),isStudent=currentLutminUser.role==='student';
  const desk=document.getElementById('campusSidebarProductLabel');if(desk){desk.textContent=cfg.label;desk.classList.remove('mt-8');desk.classList.add('mt-6');}
  const mob=document.getElementById('campusMobileProductLabel');if(mob)mob.textContent=cfg.label;
  const heading=document.getElementById('campusProfileHeading');if(heading)heading.textContent=isStudent?'Mi perfil profesional':'Mi cuenta';
  const publicBtn=document.getElementById('campusPublicProfileBtn');if(publicBtn)publicBtn.classList.toggle('hidden',!isStudent);
  const profilePanel=document.querySelector('[data-campus-panel="profile"]');
  if(profilePanel){const eyebrow=profilePanel.querySelector('p');if(eyebrow)eyebrow.textContent=isStudent?'Campus · identidad profesional':cfg.eyebrow;}
  const notif=document.querySelector('[data-campus-panel="notifications"]');
  if(notif){const desc=notif.querySelector('h2 + p');if(desc)desc.textContent=isStudent?'Cursos, pagos, certificados y avisos importantes en un solo lugar.':currentLutminUser.role==='admin'?'Alertas operativas, soporte, comunicaciones y eventos relevantes de la plataforma.':currentLutminUser.role==='company_admin'?'Avisos de capacitación, equipo, cumplimiento y novedades de la organización.':'Avisos de comisiones, alumnos, actividades y novedades académicas.';}
  // Badge visible del contexto actual, también ayuda a evitar confundir perfiles.
  const existing=document.getElementById('workspaceBadgeV160');if(existing)existing.remove();
  const name=document.getElementById('campusSidebarName');if(name){const badge=document.createElement('div');badge.id='workspaceBadgeV160';badge.className='mt-2 v160-workspace-chip bg-white/10 text-blue-100';badge.innerHTML=`<i class="fa-solid ${cfg.icon}"></i>${cfg.label}`;name.insertAdjacentElement('afterend',badge);}
}

// Decorar y hacer explícito el acceso activo.
const _openAccessSwitcherV160=typeof openAccessSwitcher==='function'?openAccessSwitcher:null;
if(_openAccessSwitcherV160){openAccessSwitcher=function(){_openAccessSwitcherV160.apply(this,arguments);setTimeout(()=>{const root=document.getElementById('accessSwitcherOptions');if(!root)return;root.querySelectorAll('button').forEach(btn=>{const txt=(btn.textContent||'').toLowerCase();const active=(currentLutminUser?.role==='admin'&&txt.includes('administración'))||(currentLutminUser?.role==='student'&&txt.includes('alumno'))||(currentLutminUser?.role==='company_admin'&&txt.includes('empresa'))||(currentLutminUser?.role==='instructor'&&txt.includes('docente'));if(active){btn.classList.add('ring-2','ring-lutmin-light');btn.insertAdjacentHTML('beforeend','<span class="float-right text-[9px] bg-white px-2 py-1 rounded-full">ACTUAL</span>');}});},0);};}

// El render de usuario ahora también pinta el workspace correcto.
const _paintCurrentLutminUserV160=typeof paintCurrentLutminUser==='function'?paintCurrentLutminUser:null;
if(_paintCurrentLutminUserV160){paintCurrentLutminUser=function(){const r=_paintCurrentLutminUserV160.apply(this,arguments);applyWorkspaceChromeV160();setTimeout(enforceWorkspaceRouteV160,0);return r;};}

// Guard final ante cualquier función vieja que intente volver al dashboard Alumno.
const _goToCampusTabV160=typeof goToCampusTab==='function'?goToCampusTab:null;
if(_goToCampusTabV160){goToCampusTab=function(tab){if(currentLutminUser){const cfg=workspaceV160();if(!cfg.allowed.includes(tab))tab=cfg.home;}const r=_goToCampusTabV160.call(this,tab);applyWorkspaceChromeV160();return r;};}

// Un admin/empresa/docente nunca debe recibir CTA de perfil profesional Alumno.
if(typeof openMyPublicProfileV40==='function'){
  const _openMyPublicProfileV160=openMyPublicProfileV40;
  openMyPublicProfileV40=async function(){
    if(currentLutminUser?.role!=='student'){
      if(currentAccessContext?.student){showToast('El perfil profesional pertenece al Acceso Alumno. Usá “Cambiar acceso” para abrirlo.');openAccessSwitcher();}
      else showToast('Este acceso no tiene un perfil profesional de alumno asociado.');
      return;
    }
    return _openMyPublicProfileV160.apply(this,arguments);
  };
}

// V14 automatizó la habilitación: este botón viejo pasa a ejecutar el motor,
// no a enviar una solicitud manual.
submitTalentProfileForReview=async function(){
  if(!supabaseClient||currentLutminUser?.role!=='student')return;
  if(typeof refreshMyProfileV140!=='function')return showToast('Guardá el perfil para volver a evaluar su estado.');
  const d=await refreshMyProfileV140(true);
  if(!d)return;
  if(d.status==='active')showToast('Perfil listo: quedó habilitado automáticamente.');
  else if(d.status==='review_required')showToast('Detecté una excepción puntual. Sólo ese caso requiere revisión humana.');
  else showToast('Te muestro qué falta para habilitar el perfil automáticamente.');
};

function adminStatV160(id){const n=Number((document.getElementById(id)?.textContent||'0').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;}
function renderAdminCommandCenterV160(){
  const root=document.getElementById('adminCommandCenterV160');if(!root||currentLutminUser?.role!=='admin')return;
  const pay=adminStatV160('adminPaymentsPendingStat'),leads=adminStatV160('adminLeadsStat'),profileEx=adminStatV160('adminTalentRequestsStat'),openings=adminStatV160('adminOpenOfferingsStat');
  const signals=[
    {n:pay,label:'pagos pendientes',icon:'fa-wallet',tone:pay?'amber':'emerald',module:'finance',detail:pay?'Requieren confirmación o seguimiento.':'No hay pagos pendientes visibles.'},
    {n:leads,label:'interesados activos',icon:'fa-bullseye',tone:leads?'violet':'emerald',module:'commercial',detail:leads?'Consultas comerciales para trabajar.':'Sin interesados pendientes.'},
    {n:profileEx,label:'excepciones de perfil',icon:'fa-user-shield',tone:profileEx?'rose':'emerald',module:'talent',detail:profileEx?'Sólo casos que no pudo resolver el motor automático.':'Sin excepciones de perfil.'},
    {n:openings,label:'ediciones abiertas',icon:'fa-calendar-days',tone:'blue',module:'academic',detail:'Oferta académica actualmente abierta.'}
  ];
  const priority=signals.filter(x=>x.n>0&&x.module!=='academic').reduce((a,b)=>a+b.n,0);
  const cls={amber:'bg-amber-50 text-amber-700 border-amber-100',violet:'bg-violet-50 text-violet-700 border-violet-100',rose:'bg-rose-50 text-rose-700 border-rose-100',blue:'bg-blue-50 text-blue-700 border-blue-100',emerald:'bg-emerald-50 text-emerald-700 border-emerald-100'};
  root.innerHTML=`<div class="rounded-[2rem] bg-lutmin-dark text-white overflow-hidden"><div class="p-5 sm:p-7 grid xl:grid-cols-[1.05fr_.95fr] gap-6"><div><div class="flex flex-wrap items-center gap-2"><span class="v160-workspace-chip bg-cyan-400/10 text-cyan-200"><i class="fa-solid fa-radar"></i>Centro de decisión</span><span class="v160-workspace-chip bg-white/10 text-slate-200">interno</span></div><h3 class="mt-4 text-2xl sm:text-3xl font-black">${priority?`${priority} situación${priority===1?'':'es'} para revisar`:'La operación está al día'}</h3><p class="mt-2 text-sm text-slate-300 max-w-xl">En vez de recorrer módulos, Lutmin concentra primero lo que puede requerir una acción humana. Los datos de alumno quedan aislados del workspace administrador.</p><div class="mt-5 flex flex-wrap gap-2"><button onclick="setAdminModuleV19('operations')" class="px-4 py-2.5 rounded-xl bg-white text-lutmin-dark text-xs font-extrabold">Ver prioridades</button><button onclick="setAdminModuleV19('talent')" class="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold">Talento</button><button onclick="setAdminModuleV19('system')" class="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold">Salud del sistema</button></div></div><div class="grid grid-cols-2 gap-3">${signals.map(x=>`<button onclick="setAdminModuleV19('${x.module}')" class="v160-action-card text-left rounded-2xl border p-4 ${cls[x.tone]}"><div class="flex items-center justify-between gap-2"><i class="fa-solid ${x.icon}"></i><strong class="text-2xl">${x.n}</strong></div><p class="mt-3 text-[10px] uppercase font-black tracking-wider">${x.label}</p><p class="mt-1 text-[10px] opacity-80 leading-relaxed">${x.detail}</p></button>`).join('')}</div></div></div>`;
}

// Actualiza el centro una vez que la carga administrativa termina.
if(typeof loadAdminData==='function'){
  const _loadAdminDataV160=loadAdminData;
  loadAdminData=async function(){const r=await _loadAdminDataV160.apply(this,arguments);if(currentLutminUser?.role==='admin'){applyWorkspaceChromeV160();renderAdminCommandCenterV160();}return r;};
}
if(typeof setAdminModuleV19==='function'){
  const _setAdminModuleV160=setAdminModuleV19;
  setAdminModuleV19=function(module){const r=_setAdminModuleV160.apply(this,arguments);if(module==='overview')setTimeout(renderAdminCommandCenterV160,0);return r;};
}

function initV160(){
  // paintCurrentLutminUser/loadAdminData ya actualizan workspace y centro de decisión.
  if(!new URL(location.href).searchParams.get('talento'))document.title='Lutmin | Plataforma';
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV160,4700),{once:true});
