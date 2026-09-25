// LUTMIN V27.0 · runtime cache seguro para GitHub Pages / hosting estático.
const CACHE='lutmin-runtime-v27-0';
const VERSION_TOKEN='v=27.0';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('lutmin-runtime-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

async function cacheFirst(req){
  const cache=await caches.open(CACHE);
  const hit=await cache.match(req);
  if(hit)return hit;
  const res=await fetch(req);
  if(res && res.ok)cache.put(req,res.clone()).catch(()=>{});
  return res;
}
async function networkFirst(req){
  const cache=await caches.open(CACHE);
  try{
    const res=await fetch(req);
    if(res && res.ok)cache.put(req,res.clone()).catch(()=>{});
    return res;
  }catch(err){
    const hit=await cache.match(req);
    if(hit)return hit;
    throw err;
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return; // nunca cachear Supabase/CDNs externos aquí
  if(req.mode==='navigate'){
    event.respondWith(networkFirst(req));
    return;
  }
  const versioned=url.search.includes(VERSION_TOKEN);
  if(versioned && ['script','style'].includes(req.destination)){
    event.respondWith(cacheFirst(req));
    return;
  }
  if(['image','font'].includes(req.destination)){
    event.respondWith(cacheFirst(req));
  }
});
