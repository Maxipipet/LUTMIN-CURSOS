// LUTMIN V28.0 · cache versionada + actualización segura.
const CACHE='lutmin-runtime-v28-0';
const CORE='lutmin-core-v28-0';
const VERSION='28.0';
const VERSION_TOKEN='v=28.0';
const CORE_ASSETS=[
  './assets/css/v28-loader.css?v=28.0',
  './assets/js/core/module-loader-v28.js?v=28.0',
  './assets/js/core/app-core.js?v=28.0',
  './assets/js/core/update-manager-v28.js?v=28.0'
];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CORE);
  await Promise.allSettled(CORE_ASSETS.map(url=>cache.add(url)));
  // No skipWaiting automático: V28 deja que la UI avise antes de recargar.
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('lutmin-')&&![CACHE,CORE].includes(k)).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

async function cacheFirst(req){
  const runtime=await caches.open(CACHE);
  const core=await caches.open(CORE);
  const hit=(await core.match(req)) || (await runtime.match(req));
  if(hit)return hit;
  const res=await fetch(req);
  if(res && res.ok)runtime.put(req,res.clone()).catch(()=>{});
  return res;
}
async function networkFirst(req){
  const runtime=await caches.open(CACHE);
  try{
    const res=await fetch(req,{cache:'no-cache'});
    if(res && res.ok)runtime.put(req,res.clone()).catch(()=>{});
    return res;
  }catch(err){
    const hit=await runtime.match(req,{ignoreSearch:true});
    if(hit)return hit;
    throw err;
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return; // Supabase/CDNs externos nunca se cachean acá.
  if(req.mode==='navigate'){
    event.respondWith(networkFirst(req));
    return;
  }
  const versioned=url.search.includes(VERSION_TOKEN);
  if(versioned && ['script','style'].includes(req.destination)){
    event.respondWith(cacheFirst(req));
    return;
  }
  if(['image','font'].includes(req.destination))event.respondWith(cacheFirst(req));
});

self.addEventListener('message',event=>{
  const type=event.data?.type;
  if(type==='SKIP_WAITING')self.skipWaiting();
  if(type==='CLEAR_CACHES')event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('lutmin-')).map(k=>caches.delete(k)));
  })());
  if(type==='GET_VERSION')event.source?.postMessage?.({type:'LUTMIN_VERSION',version:VERSION});
});
