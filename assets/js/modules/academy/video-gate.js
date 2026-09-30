(function(){
  'use strict';

  const state={
    lessonId:null,lesson:null,required:false,minPercent:98,
    maxPosition:0,localMax:0,duration:0,percent:0,complete:false,
    timer:null,player:null,native:null,lastPing:0,pingInFlight:false,provider:'none',
    playing:false,lastTickAt:0,lastPosition:0,forcingSeek:false,muted:false
  };
  let youtubeReadyPromise=null;
  const origRender=window.renderLessonVideo;
  const origComplete=window.completeOpenLesson;
  const origOpenLesson=window.openLessonById;

  function reset(){
    if(state.timer){clearInterval(state.timer);state.timer=null;}
    if(state.player?.destroy){try{state.player.destroy();}catch(_){}}
    Object.assign(state,{lessonId:null,lesson:null,required:false,minPercent:98,maxPosition:0,localMax:0,duration:0,percent:0,complete:false,timer:null,player:null,native:null,lastPing:0,pingInFlight:false,provider:'none',playing:false,lastTickAt:0,lastPosition:0,forcingSeek:false,muted:false});
  }
  function isYouTube(url){try{const u=new URL(url);const h=u.hostname.replace(/^www\./,'');return ['youtube.com','m.youtube.com','youtu.be'].includes(h);}catch(_){return false;}}
  function youtubeId(url){try{const u=new URL(url);const h=u.hostname.replace(/^www\./,'');if(h==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||null;let id=u.searchParams.get('v');if(!id&&u.pathname.startsWith('/shorts/'))id=u.pathname.split('/')[2];if(!id&&u.pathname.startsWith('/embed/'))id=u.pathname.split('/')[2];return id||null;}catch(_){return null;}}
  function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const m=Math.floor(sec/60),s=sec%60;return `${m}:${String(s).padStart(2,'0')}`;}

  function statusNode(){
    const area=document.getElementById('lessonVideoArea'); if(!area)return null;
    let n=document.getElementById('v24VideoGateStatus');
    if(!n){n=document.createElement('div');n.id='v24VideoGateStatus';n.className='v24-video-gate-status';area.insertAdjacentElement('afterend',n);}return n;
  }
  function renderStatus(message){
    const n=statusNode(); if(!n)return;
    if(!state.required){n.classList.add('hidden');return;}
    n.classList.remove('hidden');
    const pct=Math.max(0,Math.min(100,Math.round(state.percent||0)));
    n.dataset.state=state.complete?'complete':'locked';
    n.innerHTML=`<div class="flex items-start justify-between gap-3"><div><p class="font-extrabold">${state.complete?'Video completado':'Visualización obligatoria'}</p><p class="mt-1">${message||(state.complete?'Ya podés completar la clase.':'Podés pausar y retroceder. El avance manual, la velocidad acelerada y la reproducción en segundo plano están bloqueados.')}</p></div><span class="v24-core-pill ${state.complete?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}">${pct}%</span></div><div class="v24-video-gate-progress"><span style="width:${pct}%"></span></div>`;
  }
  function updateButton(){
    const btn=document.getElementById('lessonCompleteBtn'); if(!btn||!state.lessonId)return;
    const ctx=typeof getOpenLessonContext==='function'?getOpenLessonContext(state.lessonId):null;
    const already=!!ctx?.summary?.completedSet?.has(state.lessonId);
    if(already){btn.disabled=true;return;}
    if(state.required&&!state.complete){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-lock mr-2"></i>Terminá el video para completar';}
    else{btn.disabled=false;btn.innerHTML='Marcar clase como completada';}
  }
  async function rpc(name,args){
    const client=window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null);
    if(!client)throw new Error('Supabase no disponible');
    const {data,error}=await client.rpc(name,args); if(error)throw error; return data;
  }
  async function loadServerState(lesson,duration=0){
    state.lessonId=lesson.id;state.lesson=lesson;state.required=lesson.video_completion_required===true;state.minPercent=Number(lesson.video_min_watch_percent||98);
    if(!state.required){state.complete=true;state.percent=100;renderStatus();updateButton();return;}
    try{
      const data=await rpc('video_watch_state_v24',{p_lesson_id:lesson.id});
      state.maxPosition=Number(data?.max_position||0);state.localMax=state.maxPosition;state.duration=Number(data?.duration_seconds||duration||0);state.percent=Number(data?.percent||0);state.complete=!!data?.completed;
    }catch(e){console.warn('V24.1 video state',e);state.complete=false;}
    renderStatus();updateButton();updateControls();
  }
  async function ping(position,duration,isPlaying=true){
    if(!state.required||!state.lessonId||!isPlaying||state.pingInFlight)return;
    const now=Date.now();if(now-state.lastPing<2800)return;state.lastPing=now;state.pingInFlight=true;
    try{
      const data=await rpc('ping_video_watch_v24',{p_lesson_id:state.lessonId,p_position_seconds:Number(position||0),p_duration_seconds:Number(duration||0),p_is_playing:true});
      state.maxPosition=Number(data?.max_position||state.maxPosition||0);
      state.localMax=Math.max(state.maxPosition,Math.min(state.localMax||0,state.maxPosition+1.25));
      state.duration=Number(data?.duration_seconds||duration||0);state.percent=Number(data?.percent||0);state.complete=!!data?.completed;
      renderStatus();updateButton();updateControls();
    }catch(e){console.warn('V24.1 video ping',e);}finally{state.pingInFlight=false;}
  }

  function shell(area){
    area.innerHTML=`<div id="v241PlayerShell" class="v241-player-shell" tabindex="-1">
      <div id="v241MediaStage" class="v241-media-stage">
        <div class="v241-lock-note"><i class="fa-solid fa-shield-halved"></i><span>Avance bloqueado · retroceso permitido</span></div>
        <div id="v241SeekFlash" class="v241-seek-flash"><span><i class="fa-solid fa-lock mr-2"></i>No podés adelantar este video</span></div>
      </div>
      <div class="v241-controls" aria-label="Controles del video">
        <button id="v241PlayBtn" type="button" class="v241-control-btn" title="Reproducir / pausar"><i class="fa-solid fa-play"></i></button>
        <button id="v241BackBtn" type="button" class="v241-control-btn" title="Retroceder 10 segundos"><i class="fa-solid fa-rotate-left"></i></button>
        <button id="v241MuteBtn" type="button" class="v241-control-btn" title="Silenciar"><i class="fa-solid fa-volume-high"></i></button>
        <div class="v241-progress" aria-label="Progreso no interactivo"><span id="v241ProgressFill"></span></div>
        <span id="v241Time" class="v241-time">0:00 / 0:00</span>
        <button id="v241FullBtn" type="button" class="v241-control-btn" title="Pantalla completa"><i class="fa-solid fa-expand"></i></button>
      </div>
    </div>`;
    bindShellControls();
    return document.getElementById('v241MediaStage');
  }
  function flashSeek(){const n=document.getElementById('v241SeekFlash');if(!n)return;n.classList.add('show');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),850);}
  function currentTime(){try{return state.provider==='youtube'?Number(state.player?.getCurrentTime?.()||0):Number(state.native?.currentTime||0);}catch(_){return 0;}}
  function duration(){try{return state.provider==='youtube'?Number(state.player?.getDuration?.()||state.duration||0):Number(state.native?.duration||state.duration||0);}catch(_){return Number(state.duration||0);}}
  function isPlaying(){if(state.provider==='youtube'){try{return state.player?.getPlayerState?.()===window.YT?.PlayerState?.PLAYING;}catch(_){return false;}}return !!state.native&&!state.native.paused&&!state.native.ended;}
  function seekTo(sec){sec=Math.max(0,Number(sec)||0);state.forcingSeek=true;try{if(state.provider==='youtube')state.player?.seekTo?.(sec,true);else if(state.native)state.native.currentTime=sec;}catch(_){}setTimeout(()=>{state.forcingSeek=false;state.lastPosition=sec;state.lastTickAt=performance.now();},80);}
  function playPause(){try{if(state.provider==='youtube'){const st=state.player?.getPlayerState?.();if(st===YT.PlayerState.PLAYING)state.player.pauseVideo();else state.player.playVideo();}else if(state.native){if(state.native.paused)state.native.play();else state.native.pause();}}catch(_){}}
  function rewind10(){const target=Math.max(0,currentTime()-10);seekTo(target);}
  function toggleMute(){try{if(state.provider==='youtube'){if(state.player.isMuted()){state.player.unMute();state.muted=false;}else{state.player.mute();state.muted=true;}}else if(state.native){state.native.muted=!state.native.muted;state.muted=state.native.muted;}updateControls();}catch(_){}}
  async function fullscreen(){const el=document.getElementById('v241PlayerShell');try{if(document.fullscreenElement)await document.exitFullscreen();else await el?.requestFullscreen?.();}catch(_){}}
  function bindShellControls(){
    document.getElementById('v241PlayBtn')?.addEventListener('click',playPause);
    document.getElementById('v241BackBtn')?.addEventListener('click',rewind10);
    document.getElementById('v241MuteBtn')?.addEventListener('click',toggleMute);
    document.getElementById('v241FullBtn')?.addEventListener('click',fullscreen);
  }
  function updateControls(){
    const cur=currentTime(),dur=duration();
    const fill=document.getElementById('v241ProgressFill');if(fill)fill.style.width=`${dur>0?Math.max(0,Math.min(100,(cur*100)/dur)):0}%`;
    const t=document.getElementById('v241Time');if(t)t.textContent=`${fmt(cur)} / ${fmt(dur)}`;
    const p=document.querySelector('#v241PlayBtn i');if(p)p.className=`fa-solid ${isPlaying()?'fa-pause':'fa-play'}`;
    const m=document.querySelector('#v241MuteBtn i');if(m)m.className=`fa-solid ${state.muted?'fa-volume-xmark':'fa-volume-high'}`;
  }

  function monitorTick(){
    if(!state.required||state.complete)return updateControls();
    const now=performance.now(),cur=currentTime(),dur=duration(),playing=isPlaying();
    if(!state.lastTickAt){state.lastTickAt=now;state.lastPosition=cur;state.localMax=Math.max(state.localMax||0,state.maxPosition||0);return updateControls();}
    const wall=Math.max(.001,(now-state.lastTickAt)/1000),delta=cur-state.lastPosition;
    if(state.provider==='youtube'){try{if(Number(state.player?.getPlaybackRate?.()||1)!==1)state.player?.setPlaybackRate?.(1);}catch(_){}}
    else if(state.native&&Math.abs(Number(state.native.playbackRate||1)-1)>.01){state.native.playbackRate=1;}

    const hardAhead=(state.localMax||0)+1.35;
    if(!state.forcingSeek&&cur>hardAhead){flashSeek();seekTo(Math.max(0,state.localMax||state.maxPosition||0));return;}

    if(playing){
      const naturalAllowance=wall*1.35+.22;
      if(delta>=-.7&&delta<=naturalAllowance){
        state.localMax=Math.max(state.localMax||0,cur);
      }else if(delta>naturalAllowance){
        flashSeek();seekTo(Math.max(0,state.localMax||state.maxPosition||0));return;
      }
      ping(Math.min(cur,state.localMax||cur),dur,true);
    }
    state.lastTickAt=now;state.lastPosition=cur;updateControls();
  }
  function startMonitor(){if(state.timer)clearInterval(state.timer);state.lastTickAt=0;state.lastPosition=currentTime();state.timer=setInterval(monitorTick,250);}

  function ensureYouTubeApi(){
    if(window.YT?.Player)return Promise.resolve();
    if(youtubeReadyPromise)return youtubeReadyPromise;
    youtubeReadyPromise=new Promise((resolve,reject)=>{
      const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{try{prev?.();}catch(_){}resolve();};
      if(!document.querySelector('script[data-v24-youtube]')){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.dataset.v24Youtube='1';s.onerror=reject;document.head.appendChild(s);}
      setTimeout(()=>{if(window.YT?.Player)resolve();},2500);
    });return youtubeReadyPromise;
  }
  async function renderTrackedYouTube(area,url,lesson){
    const id=youtubeId(url);if(!id)throw new Error('YouTube inválido');
    const stage=shell(area);const holder=document.createElement('div');holder.id='v241YoutubePlayer';stage.prepend(holder);
    await ensureYouTubeApi();state.provider='youtube';state.lesson=lesson;
    state.player=new YT.Player('v241YoutubePlayer',{videoId:id,playerVars:{controls:0,disablekb:1,fs:0,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3},events:{
      onReady:async e=>{try{e.target.setPlaybackRate(1);}catch(_){}const d=Number(e.target.getDuration()||0);state.duration=d;await loadServerState(lesson,d);if(state.maxPosition>2&&!state.complete)e.target.seekTo(Math.max(0,state.maxPosition-1),true);state.localMax=Math.max(state.localMax,state.maxPosition);startMonitor();updateControls();},
      onStateChange:e=>{state.playing=e.data===YT.PlayerState.PLAYING;updateControls();if(e.data===YT.PlayerState.ENDED)ping(Math.min(state.localMax||0,state.duration||0),state.duration,true);},
      onPlaybackRateChange:e=>{if(Number(e.data||1)!==1){try{state.player?.setPlaybackRate?.(1);}catch(_){}}}
    }});
  }
  async function renderTrackedNative(area,safe,lesson){
    const stage=shell(area);const v=document.createElement('video');v.id='v241NativeLessonVideo';v.className='w-full h-full';v.playsInline=true;v.preload='metadata';v.disablePictureInPicture=true;v.controls=false;v.setAttribute('controlsList','nodownload noplaybackrate nofullscreen');v.innerHTML=`<source src="${escapeHtml(safe)}">Tu navegador no puede reproducir este video.`;stage.prepend(v);
    state.provider='native';state.native=v;
    v.addEventListener('loadedmetadata',async()=>{state.duration=Number(v.duration||0);v.playbackRate=1;await loadServerState(lesson,state.duration);if(state.maxPosition>2&&!state.complete)v.currentTime=Math.max(0,state.maxPosition-1);state.localMax=Math.max(state.localMax,state.maxPosition);startMonitor();updateControls();});
    v.addEventListener('seeking',()=>{if(state.forcingSeek||state.complete)return;if(v.currentTime>(state.localMax||0)+.75){flashSeek();seekTo(state.localMax||0);}});
    v.addEventListener('ratechange',()=>{if(Math.abs(Number(v.playbackRate||1)-1)>.01)v.playbackRate=1;});
    ['play','pause','ended','volumechange'].forEach(ev=>v.addEventListener(ev,()=>{state.playing=!v.paused&&!v.ended;state.muted=v.muted;updateControls();}));
  }

  async function render(lesson){
    reset();state.lesson=lesson;state.required=lesson?.video_completion_required===true;state.minPercent=Number(lesson?.video_min_watch_percent||98);
    const area=document.getElementById('lessonVideoArea');if(!area)return;
    area.innerHTML='<div class="text-center px-6 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-3xl"></i><p class="mt-3 text-xs">Cargando video...</p></div>';
    const safe=await resolveLessonVideoUrl(lesson);
    if(!safe){await origRender?.(lesson);await loadServerState(lesson,0);if(state.required){state.complete=false;renderStatus('Esta clase exige video, pero no tiene un video compatible cargado.');updateButton();}return;}
    if(!state.required){await origRender?.(lesson);state.complete=true;state.percent=100;updateButton();return;}
    if(isYouTube(safe)){try{await renderTrackedYouTube(area,safe,lesson);return;}catch(e){console.error('V24.1 YouTube',e);}}
    if(lesson?.video_path||/\.(mp4|webm|ogg)(\?.*)?$/i.test(safe)){await renderTrackedNative(area,safe,lesson);return;}
    await origRender?.(lesson);await loadServerState(lesson,0);state.complete=false;renderStatus('Este proveedor no permite bloquear el avance de forma confiable. Para clases obligatorias usá YouTube No listado o MP4/WEBM privado.');updateButton();
  }

  async function complete(){
    if(!currentLutminUser||!supabaseClient||!openLessonId)return;
    const ctx=getOpenLessonContext(openLessonId);if(!ctx)return;
    if(state.required&&!state.complete){showToast('Terminá el video antes de completar la clase.');updateButton();return;}
    const btn=document.getElementById('lessonCompleteBtn');btn.disabled=true;btn.textContent='Guardando...';
    try{
      const data=await rpc('complete_lesson_v24',{p_lesson_id:openLessonId});
      if(data?.ok===false)throw new Error(data?.message||'No se pudo completar la clase');
      showToast(`Clase ${ctx.lesson.sort_order} completada. Tu progreso quedó guardado.`);await loadCampusData();await openLessonById(openLessonId);
    }catch(e){
      console.error('V24.1 complete',e);const msg=String(e?.message||'');
      if(!state.required&&/function|schema cache|does not exist|404/i.test(msg)){return origComplete?.();}
      showToast(state.required?'Todavía falta completar la visualización del video.':'No pude guardar esta clase como completada.');updateButton();
    }
  }

  // En clases obligatorias, salir de la pestaña pausa el video. No cuenta reproducción en segundo plano.
  document.addEventListener('visibilitychange',()=>{if(!state.required||state.complete||!document.hidden)return;try{if(state.provider==='youtube')state.player?.pauseVideo?.();else state.native?.pause?.();}catch(_){}});
  // Defensa de teclado: no existe avance por teclas. El retroceso queda disponible mediante el botón propio.
  document.addEventListener('keydown',e=>{if(!state.required||state.complete||!document.getElementById('lessonModal')||document.getElementById('lessonModal').classList.contains('hidden'))return;const blocked=['ArrowRight','End','PageDown'];if(blocked.includes(e.key)){e.preventDefault();e.stopImmediatePropagation();flashSeek();}},true);

  window.renderLessonVideo=render;
  window.completeOpenLesson=complete;
  window.openLessonById=async function(id){const r=await origOpenLesson(id);setTimeout(updateButton,0);return r;};
  window.LutminVideoGateV241={state,reset,renderStatus,updateButton,ping,rewind10};
})();
