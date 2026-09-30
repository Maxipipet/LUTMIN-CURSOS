import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const mem=new Map();const ctx={console,Date,JSON,Set,Map,localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)},window:null};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../assets/js/modules/talent/application-dossier-v46.js',import.meta.url),'utf8'),ctx);
const api=ctx.LutminDossierV46;const job=api.upsertExternal({title:'Supervisor técnico',description:'Mantenimiento preventivo',external:true});
assert(api.setExternalStatus(job.id,'followup'));assert.equal(api.allProcesses([],[]).find(x=>x.id===job.id).status,'followup');
let p=api.allProcesses([],[]).find(x=>x.id===job.id);assert.equal(p.next_action.key,'schedule_follow_up');
api.updateProcessMeta(job.id,{follow_up_at:new Date(Date.now()-60000).toISOString()});p=api.allProcesses([],[]).find(x=>x.id===job.id);assert.equal(p.next_action.key,'follow_up');assert(p.next_action.priority>=90);
console.log(JSON.stringify({ok:true,status:p.status,next:p.next_action.key},null,2));
