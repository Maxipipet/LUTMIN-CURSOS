// LUTMIN V39.0 · cache versionada + actualización determinística.
const CACHE='lutmin-runtime-v39-0';
const CORE='lutmin-core-v39-0';
const VERSION='39.0';
const VERSION_TOKEN='v=39.0';
const CORE_ASSETS=[
  './assets/css/tailwind-v36.css?v=39.0',
  './assets/css/v30-loader.css?v=39.0',
  './assets/css/v30-runtime.css?v=39.0',
  './assets/css/v31-views.css?v=39.0',
  './assets/js/core/module-loader-v33.js?v=39.0',
  './assets/js/core/data-runtime-v30.js?v=39.0',
  './assets/js/core/view-loader-v32.js?v=39.0',
  './assets/js/core/workspace-nav-v34.js?v=39.0',
  './assets/js/core/app-core.js?v=39.0',
  './assets/js/core/lazy-core-bindings-v32.js?v=39.0',
  './assets/js/core/ui-runtime-v30.js?v=39.0',
  './assets/js/core/update-manager-v32.js?v=39.0'
];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CORE);await Promise.allSettled(CORE_ASSETS.map(url=>cache.add(url)));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lutmin-')&&![CACHE,CORE].includes(k)).map(k=>caches.delete(k)));await self.clients.claim();})()));
async function cacheFirst(req){const runtime=await caches.open(CACHE);const core=await caches.open(CORE);const hit=(await core.match(req))||(await runtime.match(req));if(hit)return hit;const res=await fetch(req);if(res&&res.ok)runtime.put(req,res.clone()).catch(()=>{});return res;}
async function networkFirst(req){const runtime=await caches.open(CACHE);try{const res=await fetch(req,{cache:'no-cache'});if(res&&res.ok)runtime.put(req,res.clone()).catch(()=>{});return res;}catch(err){const hit=await runtime.match(req,{ignoreSearch:true});if(hit)return hit;throw err;}}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;if(req.mode==='navigate'){event.respondWith(networkFirst(req));return;}const versioned=url.search.includes(VERSION_TOKEN);if(versioned&&['script','style'].includes(req.destination)){event.respondWith(cacheFirst(req));return;}if(versioned&&url.pathname.includes('/assets/views/')){event.respondWith(cacheFirst(req));return;}if(['image','font'].includes(req.destination))event.respondWith(cacheFirst(req));});
self.addEventListener('message',event=>{
  const type=event.data?.type;
  const reply=payload=>{try{if(event.ports?.[0])event.ports[0].postMessage(payload);else event.source?.postMessage?.(payload);}catch(_){ }};
  if(type==='SKIP_WAITING'){self.skipWaiting();reply({ok:true,version:VERSION});return;}
  if(type==='CLEAR_CACHES'){event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));reply({ok:true,version:VERSION});})());return;}
  if(type==='GET_VERSION'){reply({type:'LUTMIN_VERSION',version:VERSION});return;}
});
