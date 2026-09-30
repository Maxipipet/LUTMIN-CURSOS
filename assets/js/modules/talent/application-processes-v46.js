// =========================================================
// LUTMIN V46.0 · CENTRO DE PROCESOS DE POSTULACIÓN
// Seguimiento local, próximas acciones, fechas y calendario.
// Sin APIs pagas. No decide contrataciones.
// =========================================================
(function(){
  'use strict';
  const VERSION='46.0';
  const FILTER_KEY='lutmin-process-filter-v46';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const api=()=>window.LutminDossierV46||window.LutminDossierV45||null;
  let filter='all';
  try{filter=sessionStorage.getItem(FILTER_KEY)||'all'}catch(_){ }

  function statusLabel(status,raw){
    if(raw==='hired')return 'Seleccionado/a';
    if(raw==='rejected')return 'Finalizado';
    if(raw==='withdrawn')return 'Retirada';
    return ({saved:'Guardada',preparing:'Preparando',applied:'Postulado/a',followup:'Seguimiento',interview:'Entrevista',closed:'Cerrada'})[status]||'Preparando';
  }
  function statusIcon(status){return ({saved:'fa-bookmark',preparing:'fa-pen-ruler',applied:'fa-paper-plane',followup:'fa-arrow-rotate-right',interview:'fa-comments',closed:'fa-circle-check'})[status]||'fa-pen-ruler';}
  function formatDate(value,withTime=false){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';try{return d.toLocaleString('es-AR',withTime?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'});}catch(_){return d.toLocaleDateString('es-AR')}}
  function toLocalInput(value){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
  function sourceLabel(p){return p.external?'Externa':'Lutmin';}
  function interviews(){return talentData?.applicationDetails?.interviews||[];}
  function enrich(rows){
    const ints=interviews();
    return rows.map(p=>{
      if(p.external)return p;
      const iv=ints.find(i=>i.application_id===p.application_id&&i.status!=='cancelled');
      if(!iv)return p;
      const status=p.status==='closed'?'closed':'interview';
      const next=api()?.nextAction?.({...p,status,interview_at:iv.scheduled_at,meta:{...(p.meta||{}),interview_at:p.meta?.interview_at||iv.scheduled_at}})||p.next_action;
      return {...p,status,interview_at:iv.scheduled_at,interview:iv,next_action:next};
    });
  }
  function rows(){return enrich(api()?.allProcesses?.(talentData?.applications||[],talentData?.jobs||[])||[]);}
  function attentionRows(list){return list.filter(p=>(p.next_action?.priority||0)>=70&&p.status!=='closed');}
  function filterRows(list){
    if(filter==='all')return list;
    if(filter==='attention')return attentionRows(list);
    return list.filter(p=>p.status===filter);
  }
  function ensureHost(){
    const panel=document.querySelector('[data-talent-module-panel="applications"]');if(!panel)return null;
    let host=document.getElementById('talentProcessesV46');
    if(!host){host=document.createElement('div');host.id='talentProcessesV46';host.className='process-v46';panel.prepend(host);}
    const legacy=document.getElementById('conectaApplicationsV182');if(legacy)legacy.classList.add('hidden');
    return host;
  }
  function tone(action){return ['urgent','amber','green','blue','muted'].includes(action?.tone)?action.tone:'muted';}
  function dueText(p){const a=p.next_action||{};if(!a.due_at)return'';const d=new Date(a.due_at),days=Math.ceil((d-Date.now())/86400000);if(Number.isNaN(days))return'';if(days<0)return`Vencido hace ${Math.abs(days)} día(s)`;if(days===0)return'Hoy';if(days===1)return'Mañana';return`En ${days} días`;}
  function metric(list,status){return list.filter(p=>p.status===status).length;}
  function nextDate(p){return p.meta?.interview_at||p.interview_at||p.meta?.follow_up_at||p.meta?.deadline||p.deadline||null;}
  function card(p){
    const d=p.dossier||{},versions=d.versions?.length||0,a=p.next_action||{},dt=dueText(p);
    return `<article class="process-v46-card is-${esc(p.status)}" data-process-id="${esc(p.id)}">
      <div class="process-v46-card-main"><div class="process-v46-icon"><i class="fa-solid ${statusIcon(p.status)}"></i></div><div class="process-v46-copy"><div class="process-v46-eyebrow"><span>${esc(sourceLabel(p))}</span><b>${esc(statusLabel(p.status,p.raw_status))}</b></div><h4>${esc(p.title)}</h4><p>${esc(p.company||'Empresa no informada')}</p><small>${versions} versión(es) de expediente${p.updated_at?` · actualizado ${esc(formatDate(p.updated_at))}`:''}</small></div></div>
      <div class="process-v46-next is-${tone(a)}"><span>PRÓXIMA ACCIÓN</span><strong>${esc(a.label||'Revisar proceso')}</strong><p>${esc(a.detail||'')}</p>${dt?`<small><i class="fa-regular fa-clock"></i>${esc(dt)}</small>`:''}</div>
      <div class="process-v46-actions"><button type="button" data-process-v46-open="${esc(p.id)}" data-external="${p.external?'1':'0'}"><i class="fa-solid fa-wand-magic-sparkles"></i>Abrir paquete</button><button type="button" data-process-v46-plan="${esc(p.id)}"><i class="fa-regular fa-calendar"></i>Planificar</button>${nextDate(p)?`<button type="button" data-process-v46-calendar="${esc(p.id)}"><i class="fa-regular fa-calendar-plus"></i>Calendario</button>`:''}${p.external?`<select data-process-v46-status="${esc(p.id)}"><option value="saved" ${p.status==='saved'?'selected':''}>Guardada</option><option value="preparing" ${p.status==='preparing'?'selected':''}>Preparando</option><option value="applied" ${p.status==='applied'?'selected':''}>Postulado/a</option><option value="followup" ${p.status==='followup'?'selected':''}>Seguimiento</option><option value="interview" ${p.status==='interview'?'selected':''}>Entrevista</option><option value="closed" ${p.status==='closed'?'selected':''}>Cerrada</option></select>`:''}</div>
    </article>`;
  }
  function render(){
    const host=ensureHost();if(!host)return false;const all=rows(),attention=attentionRows(all),shown=filterRows(all);
    host.innerHTML=`<header class="process-v46-hero"><div><p>LUTMIN CONECTA · SEGUIMIENTO</p><h3>Mis procesos</h3><span>Qué estás preparando, qué ya enviaste y cuál es el próximo paso. Las fechas y notas locales no se comparten con empresas.</span></div><div class="process-v46-hero-badge"><strong>${attention.length}</strong><span>requieren atención</span></div></header>
      <section class="process-v46-metrics"><button data-process-v46-filter="attention"><span>Atención</span><strong>${attention.length}</strong></button><button data-process-v46-filter="preparing"><span>Preparando</span><strong>${metric(all,'preparing')+metric(all,'saved')}</strong></button><button data-process-v46-filter="applied"><span>Postulados</span><strong>${metric(all,'applied')}</strong></button><button data-process-v46-filter="followup"><span>Seguimiento</span><strong>${metric(all,'followup')}</strong></button><button data-process-v46-filter="interview"><span>Entrevistas</span><strong>${metric(all,'interview')}</strong></button></section>
      <nav class="process-v46-filters">${[['all','Todos'],['attention','Requieren atención'],['preparing','Preparando'],['applied','Postulados'],['followup','Seguimiento'],['interview','Entrevistas'],['closed','Cerrados']].map(([k,l])=>`<button type="button" class="${filter===k?'is-active':''}" data-process-v46-filter="${k}">${l}</button>`).join('')}</nav>
      <section class="process-v46-list">${shown.length?shown.map(card).join(''):`<div class="process-v46-empty"><i class="fa-regular fa-folder-open"></i><strong>No hay procesos en esta vista</strong><p>Prepará una oportunidad desde el Agente o postulate a una búsqueda de Lutmin.</p><button type="button" data-process-v46-go-agent>Ir al Agente</button></div>`}</section>`;
    return true;
  }
  function findProcess(id){return rows().find(x=>x.id===id)||null;}
  function setAgentState(p){
    try{const key='lutmin-agent-v45',s=JSON.parse(localStorage.getItem(key)||'{}')||{};localStorage.setItem(key,JSON.stringify({...s,job_source:p.external?'external':'lutmin',last_job_id:p.id,mode:'tailor',updated_at:new Date().toISOString()}));}catch(_){ }
    if(p.external)api()?.selectExternal?.(p.id);
  }
  async function openProcess(id){const p=findProcess(id);if(!p)return false;setAgentState(p);await window.openTalentModuleV38?.('agent');setTimeout(()=>window.refreshTalentAgentV40?.(),0);return true;}
  function ensureModal(){let m=document.getElementById('processPlanModalV46');if(m)return m;m=document.createElement('div');m.id='processPlanModalV46';m.className='hidden process-v46-modal';m.innerHTML='<div class="process-v46-modal-card"><button type="button" data-process-v46-close aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button><div id="processPlanBodyV46"></div></div>';document.body.appendChild(m);return m;}
  function openPlan(id){const p=findProcess(id);if(!p)return;const m=ensureModal(),meta=api()?.processMeta?.(id)||{};const interview=meta.interview_at||p.interview_at||'';m.dataset.processId=id;document.getElementById('processPlanBodyV46').innerHTML=`<p class="process-v46-kicker">PLAN DE SEGUIMIENTO</p><h3>${esc(p.title)}</h3><p class="process-v46-sub">${esc(p.company||'')}</p><div class="process-v46-form"><label>Fecha límite<input id="processDeadlineV46" type="date" value="${meta.deadline?String(meta.deadline).slice(0,10):(p.deadline?String(p.deadline).slice(0,10):'')}"></label><label>Próximo seguimiento<input id="processFollowV46" type="datetime-local" value="${toLocalInput(meta.follow_up_at)}"></label><label>Entrevista<input id="processInterviewV46" type="datetime-local" value="${toLocalInput(interview)}" ${p.interview&&!p.external?'readonly':''}></label><label class="is-wide">Nota privada<textarea id="processNoteV46" rows="4" maxlength="1200" placeholder="Ej.: envié CV por LinkedIn, volver a consultar el viernes...">${esc(meta.note||'')}</textarea></label></div><div class="process-v46-modal-actions"><button type="button" data-process-v46-close>Cancelar</button><button type="button" data-process-v46-save-plan="${esc(id)}">Guardar plan</button></div>`;m.classList.remove('hidden');}
  function closePlan(){document.getElementById('processPlanModalV46')?.classList.add('hidden');}
  function localIso(id){const v=document.getElementById(id)?.value;if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
  function savePlan(id){const p=findProcess(id);if(!p)return;api()?.updateProcessMeta?.(id,{deadline:document.getElementById('processDeadlineV46')?.value||null,follow_up_at:localIso('processFollowV46'),interview_at:localIso('processInterviewV46')||p.interview_at||null,note:document.getElementById('processNoteV46')?.value||''},{title:p.title,company:p.company,external:p.external,status:p.status});closePlan();render();showToast?.('Plan de seguimiento guardado.');}
  function calendarText(p){const meta=api()?.processMeta?.(p.id)||{},when=meta.interview_at||p.interview_at||meta.follow_up_at||meta.deadline||p.deadline;if(!when)return null;const d=new Date(when);if(Number.isNaN(d.getTime()))return null;const end=new Date(d.getTime()+45*60000),fmt=x=>x.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const kind=(meta.interview_at||p.interview_at)?'Entrevista':meta.follow_up_at?'Seguimiento':'Fecha límite';return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lutmin//Procesos V46//ES','BEGIN:VEVENT',`UID:${p.id}-${Date.now()}@lutmin.local`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(d)}`,`DTEND:${fmt(end)}`,`SUMMARY:${kind} · ${p.title}` ,`DESCRIPTION:${(meta.note||`${p.company||''} · ${sourceLabel(p)}`).replace(/\n/g,' ')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');}
  function downloadCalendar(id){const p=findProcess(id),txt=p&&calendarText(p);if(!txt){openPlan(id);showToast?.('Definí una fecha para agregarla al calendario.');return;}const blob=new Blob([txt],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lutmin_${String(p.title||'proceso').replace(/[^a-z0-9]+/gi,'_').slice(0,55)}.ics`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);}

  document.addEventListener('click',e=>{
    const f=e.target.closest?.('[data-process-v46-filter]');if(f){e.preventDefault();filter=f.dataset.processV46Filter||'all';try{sessionStorage.setItem(FILTER_KEY,filter)}catch(_){ }render();return;}
    const o=e.target.closest?.('[data-process-v46-open]');if(o){e.preventDefault();openProcess(o.dataset.processV46Open);return;}
    const p=e.target.closest?.('[data-process-v46-plan]');if(p){e.preventDefault();openPlan(p.dataset.processV46Plan);return;}
    const c=e.target.closest?.('[data-process-v46-calendar]');if(c){e.preventDefault();downloadCalendar(c.dataset.processV46Calendar);return;}
    if(e.target.closest?.('[data-process-v46-close]')){e.preventDefault();closePlan();return;}
    const s=e.target.closest?.('[data-process-v46-save-plan]');if(s){e.preventDefault();savePlan(s.dataset.processV46SavePlan);return;}
    if(e.target.closest?.('[data-process-v46-go-agent]')){e.preventDefault();window.openTalentModuleV38?.('agent');return;}
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-process-v46-status]')){const id=e.target.dataset.processV46Status,status=e.target.value;api()?.setExternalStatus?.(id,status);render();showToast?.(`Estado actualizado: ${statusLabel(status)}.`);}},true);
  window.addEventListener('lutmin:navigation-change',e=>{if(e?.detail?.scope==='talent'&&e.detail.key==='applications')setTimeout(render,0)});
  window.LutminProcessesV46={version:VERSION,render,rows,openProcess,openPlan,downloadCalendar};
})();
