
(function(){
  'use strict';
  const flights=new Map();
  const cache=new Map();
  window.LutminCoreV24={
    version:'24.0',
    singleFlight(key,fn){
      if(flights.has(key)) return flights.get(key);
      const p=Promise.resolve().then(fn).finally(()=>flights.delete(key));
      flights.set(key,p); return p;
    },
    cacheGet(key,maxAgeMs){const x=cache.get(key); if(!x)return null; if(Date.now()-x.at>maxAgeMs){cache.delete(key);return null;} return x.value;},
    cacheSet(key,value){cache.set(key,{value,at:Date.now()});return value;},
    clearCache(prefix=''){for(const k of cache.keys())if(!prefix||k.startsWith(prefix))cache.delete(k);},
    emit(name,detail={}){window.dispatchEvent(new CustomEvent(`lutmin:${name}`,{detail}));},
    on(name,fn){window.addEventListener(`lutmin:${name}`,fn);return()=>window.removeEventListener(`lutmin:${name}`,fn);}
  };
})();
