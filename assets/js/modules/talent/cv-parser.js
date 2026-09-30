
// =============================================================
// LUTMIN V45.0 · CV PARSER 2 · LAYOUT AWARE · API $0
// Corrige PDFs multicolumna y evita inferencias basura.
// =============================================================
(function(){
  // V43: el parser puede funcionar de forma autónoma dentro del Agente.
  // Si Intelligence V14 está cargado reutiliza su estado/librerías; si no,
  // conserva el CV localmente y carga sólo las dependencias necesarias.
  const localStateV42={cv:null,education:[]};
  function stateV42(){try{if(typeof v140State!=='undefined'&&v140State)return v140State;}catch(_){ }return localStateV42;}
  function competencyRowsV42(){try{return typeof competencyDataV33!=='undefined'&&Array.isArray(competencyDataV33)?competencyDataV33:[]}catch(_){return[]}}
  function excerptV42(text,needle){try{return typeof findExcerptV140==='function'?findExcerptV140(text,needle):String(text||'').slice(0,220)}catch(_){return String(text||'').slice(0,220)}}
  async function loadLibV42(id,src){if(window[id])return true;const found=document.querySelector?.(`script[data-v42-lib="${id}"]`);if(found)return new Promise((res,rej)=>{if(window[id])return res(true);found.addEventListener('load',()=>res(true),{once:true});found.addEventListener('error',rej,{once:true});});return new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=src;sc.async=true;sc.dataset.v42Lib=id;sc.onload=()=>res(true);sc.onerror=()=>rej(new Error('No pude cargar '+id));document.head.appendChild(sc);});}
  async function ensurePdfV42(){try{if(typeof ensurePdfV140==='function')return await ensurePdfV140();}catch(_){ }if(window.pdfjsLib)return true;await loadLibV42('pdfjsLib','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return true;}
  async function ensureMammothV42(){try{if(typeof ensureMammothV140==='function')return await ensureMammothV140();}catch(_){ }if(window.mammoth)return true;await loadLibV42('mammoth','https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');return true;}
  async function ensureTesseractV42(){try{if(typeof ensureTesseractV140==='function')return await ensureTesseractV140();}catch(_){ }if(window.Tesseract)return true;await loadLibV42('Tesseract','https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');return true;}
  async function hashFileV42(file){try{if(typeof hashFileV140==='function')return await hashFileV140(file);}catch(_){ }try{const b=await file.arrayBuffer(),h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}catch(_){return ''}}
  async function ocrImageV42(source,status){try{if(typeof ocrImageV140==='function')return await ocrImageV140(source,status);}catch(_){ }await ensureTesseractV42();const result=await window.Tesseract.recognize(source,'spa+eng',{logger:m=>{if(status&&m.status==='recognizing text')status.textContent=`OCR local: ${Math.round((m.progress||0)*100)}%`;}});return result?.data?.text||'';}
  async function ocrPdfV42(file,status){try{if(typeof ocrPdfV140==='function')return await ocrPdfV140(file,status);}catch(_){ }await ensurePdfV42();await ensureTesseractV42();const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';const max=Math.min(pdf.numPages,8);for(let i=1;i<=max;i++){if(status)status.textContent=`OCR local · página ${i}/${max}...`;const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.45}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=vp.width;canvas.height=vp.height;await pg.render({canvasContext:ctx,viewport:vp}).promise;out+='\n'+await ocrImageV42(canvas,status);}return out;}
  const MONTHS_V141={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  function esc141(v){return typeof v140Esc==='function'?v140Esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function norm141(v){return typeof v140Norm==='function'?v140Norm(v):String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function collapseSpacedLettersV141(s){const parts=String(s||'').trim().split(/\s+/);if(parts.length>=6&&parts.filter(x=>x.length===1).length/parts.length>.55)return parts.join('').replace(/EN(?=[A-Z])/,' EN ');return String(s||'').replace(/\s+/g,' ').trim();}
  function lineTextV141(x){return collapseSpacedLettersV141(typeof x==='string'?x:(x?.text||''));}
  function isHeadingV141(s){const n=norm141(s);return ['perfil','contacto','competencias','experiencia profesional','experiencia laboral','formacion academica','formación académica','formacion','formación','educacion','educación','cursos','certificaciones','habilidades','skills'].includes(n);}
  function mostlyUpperV141(s){const a=String(s||'').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g,'');if(a.length<4)return false;const upper=(a.match(/[A-ZÁÉÍÓÚÜÑ]/g)||[]).length;return upper/a.length>.75;}
  function isYearOnlyV141(s){return /^(19|20)\d{2}$/.test(String(s||'').trim());}
  function endOfMonthV141(y,m){return new Date(Number(y),Number(m),0).getDate();}
  function dateRangeV141(line){
    let raw=norm141(line).replace(/\s+/g,' ').trim();
    let m=raw.match(new RegExp(`(${Object.keys(MONTHS_V141).join('|')})\\s+(19|20)\\d{2}\\s*(?:-|–|—|a|hasta)\\s*(${Object.keys(MONTHS_V141).join('|')})\\s+((?:19|20)\\d{2})`));
    if(m){const y1=(raw.match(/(19|20)\d{2}/)||[])[0], mo1=MONTHS_V141[m[1]], mo2=MONTHS_V141[m[3]], y2=m[4];return{start:`${y1}-${String(mo1).padStart(2,'0')}-01`,end:`${y2}-${String(mo2).padStart(2,'0')}-${String(endOfMonthV141(y2,mo2)).padStart(2,'0')}`,current:false,label:line};}
    m=raw.match(new RegExp(`(${Object.keys(MONTHS_V141).join('|')})\\s+((?:19|20)\\d{2})\\s*(?:-|–|—|a|hasta)\\s*(actualidad|actual|presente)`));
    if(m){const mo=MONTHS_V141[m[1]],y=m[2];return{start:`${y}-${String(mo).padStart(2,'0')}-01`,end:null,current:true,label:line};}
    m=raw.match(/((?:19|20)\d{2})\s*(?:-|–|—|a|hasta)\s*((?:19|20)\d{2}|actualidad|actual|presente)/);
    if(m)return{start:`${m[1]}-01-01`,end:/actual|presente/.test(m[2])?null:`${m[2]}-12-31`,current:/actual|presente/.test(m[2]),label:line};
    m=raw.match(/^((?:19|20)\d{2})$/);
    if(m)return{start:`${m[1]}-01-01`,end:`${m[1]}-12-31`,current:false,label:line};
    return null;
  }
  function groupPdfSegmentsV141(content,width){
    const items=(content.items||[]).filter(i=>String(i.str||'').trim()).map(i=>({text:String(i.str).trim(),x:Number(i.transform?.[4]||0),y:Number(i.transform?.[5]||0),w:Number(i.width||0)}));
    items.sort((a,b)=>b.y-a.y||a.x-b.x);
    const rows=[];
    for(const it of items){let row=null;for(let k=rows.length-1;k>=Math.max(0,rows.length-5);k--){if(Math.abs(rows[k].y-it.y)<=3.2){row=rows[k];break;}}if(!row){row={y:it.y,items:[]};rows.push(row);}row.items.push(it);row.y=row.items.reduce((s,z)=>s+z.y,0)/row.items.length;}
    const segs=[];
    for(const row of rows){const arr=row.items.sort((a,b)=>a.x-b.x);let cur=[],prevEnd=null;for(const it of arr){const end=it.x+it.w;const gap=prevEnd==null?0:it.x-prevEnd;if(cur.length&&gap>Math.max(28,width*.05)){segs.push({y:row.y,items:cur});cur=[];}cur.push(it);prevEnd=Math.max(prevEnd??end,end);}if(cur.length)segs.push({y:row.y,items:cur});}
    return segs.map(s=>{const x=Math.min(...s.items.map(i=>i.x)),x2=Math.max(...s.items.map(i=>i.x+i.w));return{y:s.y,x,x2,text:collapseSpacedLettersV141(s.items.map(i=>i.text).join(' '))};}).sort((a,b)=>b.y-a.y||a.x-b.x);
  }
  function detectColumnsV141(segs,width){
    const left=segs.filter(s=>(s.x+s.x2)/2<width*.49),right=segs.filter(s=>(s.x+s.x2)/2>=width*.49);
    const two=left.length>=5&&right.length>=5;
    return{two,left:two?left:segs,right:two?right:[],all:segs};
  }
  async function pdfTextLayoutV141(file){
    await ensurePdfV42();const ab=await file.arrayBuffer(),pdf=await window.pdfjsLib.getDocument({data:ab}).promise;let text='';const pages=[];
    for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1}),content=await pg.getTextContent(),segments=groupPdfSegmentsV141(content,vp.width),cols=detectColumnsV141(segments,vp.width);pages.push({page:i,width:vp.width,height:vp.height,...cols});text+=`\n[PAGE ${i} LEFT]\n${cols.left.map(lineTextV141).join('\n')}`+(cols.right.length?`\n[PAGE ${i} RIGHT]\n${cols.right.map(lineTextV141).join('\n')}`:'');}
    return{text,pages:pdf.numPages,layout:{pages}};
  }
  pdfTextV140=async function(file){return pdfTextLayoutV141(file);};
  readCvV140=async function(file,status){const name=file.name.toLowerCase();if(name.endsWith('.txt')||file.type==='text/plain')return{text:await file.text(),method:'txt',layout:null};if(name.endsWith('.docx')){await ensureMammothV42();const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return{text:r.value||'',method:'docx',layout:null};}if(name.endsWith('.pdf')||file.type==='application/pdf'){const r=await pdfTextLayoutV141(file);if((r.text||'').replace(/\s/g,'').length<120){if(status)status.textContent='El PDF parece escaneado. Iniciando OCR local (puede tardar)...';return{text:await ocrPdfV42(file,status),method:'pdf-ocr',layout:null};}return{text:r.text,method:'pdf-layout',layout:r.layout};}if(file.type.startsWith('image/')||/\.(png|jpe?g)$/i.test(name)){if(status)status.textContent='Imagen detectada. Iniciando OCR local...';return{text:await ocrImageV42(file,status),method:'image-ocr',layout:null};}throw new Error('Formato no compatible. Usá PDF, DOCX, TXT, JPG o PNG.');};

  function textsV141(lines){return(lines||[]).map(lineTextV141).filter(Boolean);}
  function sectionV141(lines,headingRegex,nextRegexes=[]){const arr=textsV141(lines);const start=arr.findIndex(x=>headingRegex.test(norm141(x)));if(start<0)return[];let end=arr.length;for(let i=start+1;i<arr.length;i++){if(nextRegexes.some(r=>r.test(norm141(arr[i])))){end=i;break;}}return arr.slice(start+1,end);}
  function cleanTitleV141(s){return String(s||'').replace(/^[-•◆▪●\s]+/,'').replace(/\.$/,'').trim();}
  function detectHeadlineLayoutV141(layout,fallbackLines){const p=layout?.pages?.[0];if(p){const prof=sectionV141(p.left,/^perfil$/,[/^contacto$/,/^competencias$/]).join(' ').replace(/\s+/g,' ').trim();const m=prof.match(/^(.{4,90}?)\s+con\s+experiencia\b/i);if(m)return m[1].trim();}const src=p?textsV141(p.right):fallbackLines;const candidates=src.slice(0,12).map(cleanTitleV141).filter(x=>x.length>=6&&x.length<=100&&!isHeadingV141(x)&&!/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(x));const preferred=candidates.find(x=>/(analista|t[eé]cnic|ingenier|licenciad|contador|abogad|supervisor|coordinador|diseñ|desarrollador|administrativ|operador|especialista)/i.test(norm141(x)));return preferred||'';}
  function contactDataV141(layout,text){const p=layout?.pages?.[0],left=p?textsV141(p.left):[];const contact=sectionV141(left,/^contacto$/,[/^competencias$/,/^habilidades$/,/^experiencia/]);const flat=(contact.length?contact.join('\n'):String(text||''));const email=(flat.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';const phone=(flat.match(/(?:\+?54\s?9?\s?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g)||[]).find(x=>x.replace(/\D/g,'').length>=8)||'';const linkedin=(flat.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)||[])[0]||'';let city='',province='';const provinces=['Buenos Aires','CABA','Ciudad Autónoma de Buenos Aires','Córdoba','Chaco','Corrientes','Santa Fe','Mendoza','Tucumán','Neuquén','Entre Ríos','Misiones','Salta','Jujuy','Río Negro','Chubut','San Juan','San Luis','La Pampa','Formosa','Santiago del Estero','Catamarca','La Rioja','Santa Cruz','Tierra del Fuego'];for(const l of contact){const pr=provinces.find(p=>norm141(l).includes(norm141(p)));if(pr){province=pr;const m=l.match(/(?:^|,\s*)([^,]+),\s*([^,(]+)(?:\s*\(|$)/);if(m&&norm141(m[2]).includes(norm141(pr)))city=m[1].replace(/^.*\d+\s*/,'').trim();else{const before=l.split(',')[0].trim();if(before&&!/\d/.test(before))city=before;}break;}}return{email,phone,linkedin,city,province};}
  function profileBioV141(layout,fallback){const p=layout?.pages?.[0];if(p){const sec=sectionV141(p.left,/^perfil$/,[/^contacto$/,/^competencias$/]);if(sec.length)return sec.join(' ').replace(/\s+/g,' ').trim().slice(0,1200);}return typeof detectBioV140==='function'?detectBioV140(fallback):'';}
  function expFromLayoutV141(layout){const p=layout?.pages?.[0];if(!p)return[];const sec=sectionV141(p.right,/^experiencia (profesional|laboral)$/,[/^formacion academica$/,/^formación académica$/,/^educacion$/]);if(!sec.length)return[];const dates=[];for(let i=0;i<sec.length;i++){const dr=dateRangeV141(sec[i]);if(dr)dates.push({i,dr});}const out=[];for(let d=0;d<dates.length;d++){const {i,dr}=dates[d],next=dates[d+1]?.i??sec.length;const label=cleanTitleV141(sec[i-1]||'');if(!label||isHeadingV141(label))continue;let desc=sec.slice(i+1,Math.max(i+1,next-1)).map(cleanTitleV141).filter(x=>x&&!dateRangeV141(x)&&!isHeadingV141(x));let company='',position='',confidence=.8,needsCompany=false;
      if(/^tareas? de\b/i.test(label)){position=label.replace(/^tareas? de\s*/i,'').trim()||label;company='';needsCompany=true;confidence=.86;}
      else{company=label;position=desc[0]&&desc[0].length<=110?desc.shift():'';if(!position){position='Puesto a completar';confidence=.62;}}
      out.push({position,company,...dr,description:desc.join(' ').slice(0,1200),confidence,needs_company:needsCompany,source_label:label});}
    return out.slice(0,16);
  }
  function eduFromLayoutV141(layout){const p=layout?.pages?.[0];if(!p)return[];const sec=sectionV141(p.right,/^formacion academica$|^formación académica$|^educacion$|^educación$/,[/^cursos$/,/^certificaciones$/]);if(!sec.length)return[];const out=[];for(let i=0;i<sec.length;i++){const dr=dateRangeV141(sec[i]);if(!dr)continue;const inst=cleanTitleV141(sec[i-1]||''),title=cleanTitleV141(sec[i+1]||'');if(inst&&title&&!isHeadingV141(inst)&&!isHeadingV141(title))out.push({institution:inst,title,...dr,level:'Formación académica',confidence:.9});}return out.slice(0,10);}
  function courseColumnV141(lines){const arr=textsV141(lines).filter(x=>norm141(x)!=='cursos'),out=[];for(let i=0;i<arr.length;i++){if(!isYearOnlyV141(arr[i]))continue;const year=arr[i];let inst=[];for(let j=i-1;j>=0&&inst.length<4;j--){const s=arr[j];if(isYearOnlyV141(s))break;if(mostlyUpperV141(s))inst.unshift(s);else break;}let title=[];for(let j=i+1;j<arr.length;j++){const s=arr[j];if(isYearOnlyV141(s)||mostlyUpperV141(s))break;title.push(s);}const institution=inst.join(' ').replace(/\s+/g,' ').trim(),course=title.join(' ').replace(/\s+/g,' ').trim();if(institution&&course)out.push({institution,title:course,year:Number(year),start:`${year}-01-01`,end:`${year}-12-31`,current:false,level:'Curso / capacitación',confidence:.94});}return out;}
  function coursesFromLayoutV141(layout){const pages=layout?.pages||[],out=[];for(const p of pages){const has=textsV141(p.all).some(x=>norm141(x)==='cursos');if(!has)continue;out.push(...courseColumnV141(p.left),...courseColumnV141(p.right));}const seen=new Set();return out.filter(x=>{const k=norm141(`${x.institution}|${x.title}|${x.year}`);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,30);}
  function competencySentencesV141(layout){const p=layout?.pages?.[0];if(!p)return[];const sec=sectionV141(p.left,/^competencias$|^habilidades$|^skills$/,[/^formacion academica$/,/^formación académica$/]);const out=[];let buf='';for(const raw of sec){const s=cleanTitleV141(raw);if(!s)continue;buf=(buf+' '+s).trim();if(/[.!?]$/.test(s)){out.push(buf.replace(/[.!?]+$/,'').trim());buf='';}}if(buf)out.push(buf);return out;}
  function canonicalExplicitSkillV141(s){const n=norm141(s);const rules=[[/liderazgo.*equip/,'Liderazgo de equipos'],[/toma de decisiones.*presion/,'Toma de decisiones bajo presión'],[/coordinacion interinstitucional/,'Coordinación interinstitucional'],[/resolucion de conflictos/,'Resolución de conflictos'],[/comunicacion.*motivacion.*equip/,'Comunicación y motivación de equipos'],[/planificacion estrategica/,'Planificación estratégica']];for(const [r,label] of rules)if(r.test(n))return label;return cleanTitleV141(s).slice(0,100);}
  function skillsV141(text,layout){const out=[];const add=(skill,confidence,excerpt,kind='cv')=>{if(!skill)return;const k=norm141(skill);if(out.some(x=>norm141(x.skill)===k))return;out.push({skill,competency_id:null,confidence,excerpt:excerpt||skill,kind});};for(const s of competencySentencesV141(layout))add(canonicalExplicitSkillV141(s),.96,s,'explicit');
    const n=norm141(text);const tech=[['Electricidad',['tareas de electricidad','instalacion de tomas','iluminacion']],['Diseño gráfico',['diseno grafico','diseño grafico','identidad visual','logotipos']],['Adobe Photoshop',['adobe photoshop','photoshop']],['Atención al cliente',['atencion al publico','atención al público']],['Gestión de stock',['stock','reposicion','reposición']],['Carpintería',['carpinteria','carpintería','marcos y puertas','muebles']],['Seguridad marítima',['seguridad maritima','seguridad marítima']],['Prevención de riesgos',['prevencion de riesgos','prevención de riesgos']],['Gestión de operaciones',['gestion de operaciones','gestión de operaciones']]];for(const [label,kws] of tech){const hits=kws.filter(k=>n.includes(norm141(k)));if(hits.length)add(label,Math.min(.92,.68+hits.length*.07),excerptV42(text,hits),'inferred');}
    if(out.some(x=>norm141(x.skill)==='liderazgo de equipos')){for(let i=out.length-1;i>=0;i--)if(norm141(out[i].skill)==='liderazgo')out.splice(i,1);}return out.slice(0,24);
  }
  function fallbackAnalyzeV141(text,file,method){const lines=String(text||'').split(/\r?\n| {3,}/).map(x=>x.trim()).filter(Boolean);const flat=lines.join('\n');const email=(flat.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';const phone=(flat.match(/(?:\+?54\s?9?\s?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g)||[]).find(x=>x.replace(/\D/g,'').length>=8)||'';const loc=typeof detectLocationV140==='function'?detectLocationV140(lines):{city:'',province:''};return{file,method,text,lines,layout:null,fields:{email,phone,linkedin:(flat.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)||[])[0]||'',headline:typeof detectHeadlineV140==='function'?detectHeadlineV140(lines):'',bio:typeof detectBioV140==='function'?detectBioV140(lines):'',city:loc.city,province:loc.province},experiences:typeof extractExperiencesV140==='function'?extractExperiencesV140(lines):[],education:typeof extractEducationV140==='function'?extractEducationV140(lines):[],courses:[],skills:skillsV141(text,null),parser:'fallback'};}
  analyzeCvTextV140=function(text,file,method,layout){if(!layout)return fallbackAnalyzeV141(text,file,method);const all=[];for(const p of layout.pages||[])all.push(...textsV141(p.left),...textsV141(p.right));const c=contactDataV141(layout,text),fields={email:c.email,phone:c.phone,linkedin:c.linkedin,headline:detectHeadlineLayoutV141(layout,all),bio:profileBioV141(layout,all),city:c.city,province:c.province};return{file,method,text,lines:all,layout,fields,experiences:expFromLayoutV141(layout),education:eduFromLayoutV141(layout),courses:coursesFromLayoutV141(layout),skills:skillsV141(text,layout),parser:'layout-v2'};};
  handleCvFileV140=async function(file){if(!file)return;const status=document.getElementById('talentCvStatusV140');try{status.textContent='Leyendo CV localmente...';const r=await readCvV140(file,status);if((r.text||'').replace(/\s/g,'').length<80)throw new Error('No pude obtener suficiente texto del CV. Probá otra versión del archivo.');status.textContent='Reconstruyendo diseño y secciones del CV...';const analysis=analyzeCvTextV140(r.text,file,r.method,r.layout||null);analysis.hash=await hashFileV42(file);stateV42().cv=analysis;openCvReviewV140(analysis);status.textContent=`Listo: ${analysis.experiences.length} experiencia(s), ${analysis.skills.length} competencia(s), ${analysis.education.length} formación(es) y ${(analysis.courses||[]).length} curso(s) detectados.`;}catch(e){console.error(e);status.textContent=e.message||'No pude leer el CV.';showToast(e.message||'No pude analizar el CV.');}};

  function fieldRow141(id,label,value,target,checked){return `<label class="rounded-2xl border border-slate-100 p-3 flex gap-3 items-start"><input data-v140-field="${id}" data-target="${target}" type="checkbox" ${checked?'checked':''} class="mt-1"><div class="min-w-0 flex-1"><p class="text-[10px] uppercase font-black text-slate-400">${esc141(label)}</p><input data-v140-value="${id}" value="${esc141(value||'')}" class="mt-1 w-full bg-transparent text-sm font-bold text-lutmin-dark outline-none border-b border-transparent focus:border-blue-200"></div></label>`;}
  function confidenceBadge141(c){const v=Math.round(Number(c||0)*100);const cls=v>=90?'bg-emerald-50 text-emerald-700':v>=75?'bg-blue-50 text-blue-700':'bg-amber-50 text-amber-700';return `<span class="px-2 py-1 rounded-full ${cls} text-[9px] font-black">${v}% lectura</span>`;}
  openCvReviewV140=function(a){const m=ensureV100Modal('cvReviewModalV140','max-w-6xl'),b=m.querySelector('[data-v100-body]'),p=talentData?.profile||{},f=a.fields||{},missingCompany=(a.experiences||[]).filter(x=>x.needs_company).length;b.innerHTML=`<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><p class="text-[10px] uppercase tracking-widest font-black text-blue-600">Agente de CV · Parser 3</p><h2 class="mt-2 text-2xl sm:text-3xl font-black text-lutmin-dark">Confirmá lo que Lutmin encontró.</h2><p class="mt-2 text-sm text-slate-500">Archivo: ${esc141(a.file.name)} · método ${esc141(a.method)}. El archivo se procesa en este navegador.</p></div><div class="flex gap-2"><span class="px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-black">${a.parser==='semantic-v38'?'LECTURA SEMÁNTICA MULTIPÁGINA':a.parser==='layout-v2'?'DISEÑO MULTICOLUMNA LEÍDO':'LECTURA ESTÁNDAR'}</span><span class="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">API $0</span></div></div>
      <div class="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4"><div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center"><div><p class="text-2xl font-black text-lutmin-dark">${(a.experiences||[]).length}</p><p class="text-[10px] text-slate-500">experiencias</p></div><div><p class="text-2xl font-black text-lutmin-dark">${(a.education||[]).length}</p><p class="text-[10px] text-slate-500">formación</p></div><div><p class="text-2xl font-black text-lutmin-dark">${(a.courses||[]).length}</p><p class="text-[10px] text-slate-500">cursos</p></div><div><p class="text-2xl font-black text-lutmin-dark">${(a.skills||[]).length}</p><p class="text-[10px] text-slate-500">competencias</p></div><div><p class="text-2xl font-black ${missingCompany?'text-amber-600':'text-emerald-600'}">${missingCompany}</p><p class="text-[10px] text-slate-500">datos a confirmar</p></div></div></div>
      <div class="mt-6 grid lg:grid-cols-2 gap-5"><div><h3 class="font-extrabold text-lutmin-dark">Datos personales / profesionales</h3><div class="mt-3 grid sm:grid-cols-2 gap-2">${fieldRow141('phone','Teléfono',f.phone,'phone',!p.phone&&!!f.phone)}${fieldRow141('linkedin','LinkedIn',f.linkedin,'linkedin_url',!p.linkedin_url&&!!f.linkedin)}${fieldRow141('city','Ciudad',f.city,'city',!p.city&&!!f.city)}${fieldRow141('province','Provincia',f.province,'province',!p.province&&!!f.province)}${fieldRow141('headline','Título profesional',f.headline,'headline',!p.headline&&!!f.headline)}${fieldRow141('bio','Resumen profesional',f.bio,'bio',!p.bio&&!!f.bio)}</div><p class="mt-3 text-[10px] text-slate-400">Correo detectado: ${esc141(f.email||'no encontrado')}. No se cambia el usuario de acceso.</p></div>
      <div><h3 class="font-extrabold text-lutmin-dark">Competencias sugeridas</h3><div class="mt-3 flex flex-wrap gap-2">${a.skills.length?a.skills.map((s,i)=>`<label class="inline-flex items-center gap-2 px-3 py-2 rounded-xl ${s.kind==='explicit'?'bg-emerald-50 text-emerald-800':'bg-violet-50 text-violet-800'} text-xs font-bold"><input data-v140-skill="${i}" type="checkbox" checked> ${esc141(s.skill)} <span class="opacity-50">${s.kind==='explicit'?'CV explícita':'detectada'}</span></label>`).join(''):'<span class="text-xs text-slate-400">No encontré competencias con evidencia suficiente.</span>'}</div><div class="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800"><strong>Importante:</strong> una competencia leída del CV queda como declarada + evidencia CV. Nunca se vuelve “validada” sin evaluación.</div></div></div>
      <div class="mt-6"><div class="flex items-end justify-between gap-3"><div><h3 class="font-extrabold text-lutmin-dark">Experiencia laboral detectada</h3><p class="mt-1 text-[10px] text-slate-500">Si el CV no dice la empresa, Lutmin no la inventa: queda pendiente para que la completes.</p></div></div><div class="mt-3 grid lg:grid-cols-2 gap-3">${a.experiences.length?a.experiences.map((x,i)=>`<div data-v140-exp-row="${i}" class="rounded-2xl border ${x.needs_company?'border-amber-200 bg-amber-50/30':'border-slate-100'} p-4"><div class="flex items-center justify-between gap-2"><label class="flex items-center gap-2 text-xs font-black text-blue-700"><input data-v140-exp="${i}" type="checkbox" ${x.needs_company?'':'checked'}> Incorporar experiencia</label>${confidenceBadge141(x.confidence)}</div>${x.needs_company?'<p class="mt-2 text-[10px] font-bold text-amber-700">El CV no indica empresa. Completá empresa o escribí “Independiente” si corresponde.</p>':''}<div class="mt-3 grid gap-2"><input data-k="position" value="${esc141(x.position)}" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs" placeholder="Puesto"><input data-k="company" value="${esc141(x.company)}" class="px-3 py-2 rounded-xl bg-white border ${x.needs_company?'border-amber-300':'border-slate-200'} text-xs" placeholder="Empresa / Independiente"><div class="grid grid-cols-2 gap-2"><input data-k="start" type="date" value="${x.start||''}" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"><input data-k="end" type="date" value="${x.end||''}" ${x.current?'disabled':''} class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"></div><label class="text-[10px] flex items-center gap-2"><input data-k="current" type="checkbox" ${x.current?'checked':''}> Trabajo actual</label><textarea data-k="description" rows="3" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">${esc141(x.description||'')}</textarea></div></div>`).join(''):'<div class="lg:col-span-2 text-xs text-slate-400">No pude estructurar experiencias automáticamente.</div>'}</div></div>
      <div class="mt-6"><h3 class="font-extrabold text-lutmin-dark">Formación académica detectada</h3><div class="mt-3 grid lg:grid-cols-2 gap-3">${a.education.length?a.education.map((x,i)=>`<div data-v140-edu-row="${i}" class="rounded-2xl bg-slate-50 p-4"><div class="flex items-center justify-between"><label class="flex items-center gap-2 text-xs font-black text-blue-700"><input data-v140-edu="${i}" type="checkbox" checked> Incorporar formación</label>${confidenceBadge141(x.confidence)}</div><input data-k="institution" value="${esc141(x.institution)}" class="mt-3 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"><input data-k="title" value="${esc141(x.title)}" class="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"><div class="mt-2 grid grid-cols-2 gap-2"><input data-k="start" type="date" value="${x.start||''}" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"><input data-k="end" type="date" value="${x.end||''}" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"></div></div>`).join(''):'<div class="lg:col-span-2 text-xs text-slate-400">No encontré formación académica estructurable.</div>'}</div></div>
      <div class="mt-6"><h3 class="font-extrabold text-lutmin-dark">Cursos y capacitaciones detectados</h3><p class="mt-1 text-[10px] text-slate-500">Se guardan como formación externa; no se transforman en certificados Lutmin.</p><div class="mt-3 grid lg:grid-cols-2 gap-3">${(a.courses||[]).length?a.courses.map((x,i)=>`<div data-v141-course-row="${i}" class="rounded-2xl bg-cyan-50/60 border border-cyan-100 p-4"><label class="flex items-center gap-2 text-xs font-black text-cyan-800"><input data-v141-course="${i}" type="checkbox" checked> Incorporar curso</label><input data-k="institution" value="${esc141(x.institution)}" class="mt-3 w-full px-3 py-2 rounded-xl bg-white border border-cyan-100 text-xs"><input data-k="title" value="${esc141(x.title)}" class="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-cyan-100 text-xs"><input data-k="year" type="number" min="1950" max="2100" value="${x.year||''}" class="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-cyan-100 text-xs"></div>`).join(''):'<div class="lg:col-span-2 text-xs text-slate-400">No detecté cursos estructurados.</div>'}</div></div>
      <div class="mt-7 grid sm:grid-cols-3 gap-2"><button onclick="hideV100Modal('cvReviewModalV140')" class="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">Cancelar</button><button onclick="selectOnlyMissingCvFieldsV140()" class="py-3 rounded-xl bg-blue-50 text-blue-700 font-bold">Sólo completar faltantes</button><button onclick="applyCvAnalysisV140()" class="py-3 rounded-xl bg-lutmin-dark text-white font-extrabold"><i class="fa-solid fa-circle-check mr-2"></i>Aplicar lo seleccionado</button></div>`;showV100Modal('cvReviewModalV140');};

  function rowData141(attr,index){const row=document.querySelector(`[${attr}="${index}"]`);if(!row)return null;const v=k=>row.querySelector(`[data-k="${k}"]`)?.value?.trim()||null;return{row,v,current:!!row.querySelector('[data-k="current"]')?.checked};}
  applyCvAnalysisV140=async function(){const a=stateV42().cv;if(!a)return;const profile={};document.querySelectorAll('[data-v140-field]:checked').forEach(ch=>{const val=document.querySelector(`[data-v140-value="${ch.dataset.v140Field}"]`)?.value?.trim();if(val)profile[ch.dataset.target]=val;});const evidence=[];const applied={fields:Object.keys(profile),experiences:0,skills:0,education:0,courses:0,skipped:0};try{
      if(Object.keys(profile).length){profile.updated_at=new Date().toISOString();const {error}=await supabaseClient.from('talent_profiles').update(profile).eq('user_id',currentLutminUser.id);if(error)throw error;}
      const existing=talentData?.experiences||[];for(const ch of document.querySelectorAll('[data-v140-exp]:checked')){const i=Number(ch.dataset.v140Exp),r=rowData141('data-v140-exp-row',i);if(!r)continue;const position=r.v('position'),company=r.v('company'),start=r.v('start'),end=r.current?null:r.v('end'),description=r.v('description');if(!position||!company){applied.skipped++;continue;}const duplicate=existing.some(x=>norm141(x.position_title)===norm141(position)&&norm141(x.company_name)===norm141(company)&&String(x.start_date||'')===String(start||''));if(!duplicate){const {error}=await supabaseClient.from('talent_experiences').insert({user_id:currentLutminUser.id,company_name:company,position_title:position,start_date:start,end_date:end,current_job:r.current,description});if(error)throw error;applied.experiences++;}evidence.push({entity_type:'experience',entity_key:norm141(`${company}|${position}`),source_label:a.file.name,excerpt:`${position} · ${company}${description?' · '+description:''}`.slice(0,900),confidence:a.experiences[i]?.confidence||.75,metadata:{start_date:start,end_date:end}});}
      for(const ch of document.querySelectorAll('[data-v140-skill]:checked')){const s=a.skills[Number(ch.dataset.v140Skill)];if(!s)continue;const existingSkill=(talentData?.skills||[]).find(x=>norm141(x.skill)===norm141(s.skill));if(!existingSkill){const {error}=await supabaseClient.from('talent_skills').upsert({user_id:currentLutminUser.id,skill:s.skill,level:3,competency_id:s.competency_id||null},{onConflict:'user_id,skill'});if(error)throw error;applied.skills++;}evidence.push({entity_type:'competency',entity_key:norm141(s.skill),source_label:a.file.name,excerpt:s.excerpt,confidence:s.confidence,metadata:{competency_id:s.competency_id||null,detected_as:s.kind||'cv'}});}
      for(const ch of document.querySelectorAll('[data-v140-edu]:checked')){const i=Number(ch.dataset.v140Edu),r=rowData141('data-v140-edu-row',i);if(!r)continue;const institution=r.v('institution'),title=r.v('title');if(!institution||!title)continue;const dupe=(stateV42().education||[]).some(x=>norm141(x.institution)===norm141(institution)&&norm141(x.title)===norm141(title));if(!dupe){const {error}=await supabaseClient.from('talent_education_v140').insert({user_id:currentLutminUser.id,institution,title,level:'Formación académica',start_date:r.v('start'),end_date:r.v('end'),current:false,source_type:'cv'});if(error)throw error;applied.education++;}evidence.push({entity_type:'education',entity_key:norm141(`${institution}|${title}`),source_label:a.file.name,excerpt:`${title} · ${institution}`,confidence:a.education[i]?.confidence||.8,metadata:{kind:'academic'}});}
      for(const ch of document.querySelectorAll('[data-v141-course]:checked')){const i=Number(ch.dataset.v141Course),r=rowData141('data-v141-course-row',i);if(!r)continue;const institution=r.v('institution'),title=r.v('title'),year=Number(r.v('year')||0);if(!institution||!title)continue;const dupe=(stateV42().education||[]).some(x=>norm141(x.institution)===norm141(institution)&&norm141(x.title)===norm141(title));if(!dupe){const {error}=await supabaseClient.from('talent_education_v140').insert({user_id:currentLutminUser.id,institution,title,level:'Curso / capacitación',start_date:year?`${year}-01-01`:null,end_date:year?`${year}-12-31`:null,current:false,source_type:'cv'});if(error)throw error;applied.courses++;}evidence.push({entity_type:'education',entity_key:norm141(`${institution}|${title}`),source_label:a.file.name,excerpt:`${title} · ${institution}${year?' · '+year:''}`,confidence:a.courses[i]?.confidence||.9,metadata:{kind:'course',year:year||null}});}
      const summary={fields_detected:Object.values(a.fields||{}).filter(Boolean).length,experiences_detected:a.experiences.length,skills_detected:a.skills.length,education_detected:a.education.length,courses_detected:(a.courses||[]).length,method:a.method,parser:a.parser};const {error:logError}=await supabaseClient.rpc('record_cv_import_v140',{p_file_name:a.file.name,p_file_hash:a.hash||'',p_file_type:a.file.type||a.method,p_extracted_summary:summary,p_applied_summary:applied,p_evidence:evidence});if(logError)throw logError;hideV100Modal('cvReviewModalV140');showToast(`CV incorporado: ${applied.experiences} experiencia(s), ${applied.skills} competencia(s), ${applied.education} formación(es) y ${applied.courses} curso(s).${applied.skipped?` ${applied.skipped} experiencia(s) quedaron pendientes por falta de empresa.`:''}`);await loadTalentCenter();await loadV140ProfileData();
    }catch(e){console.error(e);showToast(e.message||'No pude aplicar los datos del CV.');}};

  // Ajuste visual mínimo del bloque V14 para identificar el parser corregido.
  setTimeout(()=>{const st=document.getElementById('talentCvStatusV140');if(st&&!st.dataset.v141){st.dataset.v141='1';st.insertAdjacentHTML('beforebegin','<div class="relative mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 text-cyan-100 text-[10px] font-black"><i class="fa-solid fa-table-columns"></i> Parser 3 · CV semántico multipágina</div>');}},600);
})();

// =============================================================
// LUTMIN V38.0 · CV INTELLIGENCE 3 · API $0
// Parser estructural multipágina + fechas flexibles + evidencia explicable.
// Trabaja localmente. No inventa empresa, puesto, formación ni competencias.
// =============================================================
(function(){
  'use strict';
  const VERSION='45.0';
  const MONTH={
    ene:1,enero:1,jan:1,january:1,
    feb:2,febrero:2,february:2,
    mar:3,marzo:3,march:3,
    abr:4,abril:4,apr:4,april:4,
    may:5,mayo:5,
    jun:6,junio:6,june:6,
    jul:7,julio:7,july:7,
    ago:8,agosto:8,aug:8,august:8,
    sep:9,sept:9,septiembre:9,setiembre:9,september:9,
    oct:10,octubre:10,october:10,
    nov:11,noviembre:11,november:11,
    dic:12,diciembre:12,dec:12,december:12
  };
  const PRESENT=/^(actualidad|actual|presente|hoy|present|current)$/i;
  const SECTIONS={
    profile:['perfil','perfil profesional','resumen','resumen profesional','sobre mi','sobre mí','acerca de mi','acerca de mí','objetivo profesional','professional summary','summary','profile','about me'],
    contact:['contacto','datos de contacto','datos personales','informacion personal','información personal','contact','personal details'],
    experience:['experiencia','experiencia laboral','experiencia profesional','trayectoria laboral','historial laboral','antecedentes laborales','work experience','professional experience','employment history','career history'],
    education:['formacion','formación','formacion academica','formación académica','educacion','educación','estudios','academic background','education'],
    courses:['cursos','capacitaciones','cursos y capacitaciones','certificaciones','certificados','formacion complementaria','formación complementaria','courses','training','certifications'],
    skills:['competencias','habilidades','aptitudes','conocimientos','skills','technical skills','competencias tecnicas','competencias técnicas','herramientas'],
    languages:['idiomas','languages'],
    projects:['proyectos','proyectos destacados','projects'],
    achievements:['logros','logros destacados','achievements']
  };
  const ROLE_WORDS=['tecnico','técnico','tecnica','técnica','analista','supervisor','supervisora','coordinador','coordinadora','jefe','jefa','gerente','manager','director','directora','responsable','encargado','encargada','operador','operadora','administrativo','administrativa','asistente','auxiliar','vendedor','vendedora','cajero','cajera','ingeniero','ingeniera','licenciado','licenciada','desarrollador','desarrolladora','programador','programadora','diseñador','diseñadora','consultor','consultora','especialista','oficial','ayudante','mecanico','mecánico','electricista','plomero','fontanero','repositor','repositora','preventista','recepcionista','docente','profesor','profesora','contador','contadora','abogado','abogada','reclutador','reclutadora','selector','rrhh','recursos humanos','soporte','mantenimiento','comprador','compradora','logistica','logística','calidad','auditor','auditora','project manager','product manager','scrum master','full stack','frontend','backend'];
  const COMPANY_WORDS=['s.a.','sa','s.r.l.','srl','s.a.s.','sas','inc','ltda','empresa','compañia','compañía','grupo','consultora','consulting','solutions','servicios','service','supermercado','universidad','instituto','municipalidad','ministerio','gobierno','fundacion','fundación','cooperativa','banco','hospital','clinica','clínica','hotel','restaurant','restaurante','tienda','industria','industrial','constructora','logistica','logística'];
  const INSTITUTION_WORDS=['universidad','facultad','instituto','escuela','colegio','academia','centro de formacion','centro de formación','utn','uba','uade','unl','unne','unc','uai','tecnica','técnica','politecnico','politécnico'];
  const DEGREE_WORDS=['tecnico','técnico','tecnicatura','licenciado','licenciada','licenciatura','ingeniero','ingeniera','ingenieria','ingeniería','bachiller','secundario','secundaria','maestria','maestría','master','posgrado','diplomatura','diplomado','contador','abogado','arquitecto','arquitecta','profesor','profesora','analista de sistemas'];
  const GENERIC_SKILLS=[
    ['Microsoft Excel',['excel','microsoft excel','tablas dinamicas','tablas dinámicas','buscarv','power query']],
    ['Microsoft Word',['microsoft word','word']],['Microsoft PowerPoint',['powerpoint','power point']],['Google Workspace',['google workspace','google sheets','google docs']],
    ['Power BI',['power bi','powerbi']],['SAP',['sap']],['Tango Gestión',['tango gestion','tango gestión']],['AutoCAD',['autocad']],['SolidWorks',['solidworks']],
    ['JavaScript',['javascript','js']],['TypeScript',['typescript']],['React',['react','reactjs']],['Node.js',['node.js','nodejs']],['Python',['python']],['SQL',['sql','postgresql','mysql']],['Git',['git','github','gitlab']],
    ['Electricidad',['electricidad','electrico','eléctrico','tableros electricos','tableros eléctricos','cableado']],['Mantenimiento preventivo',['mantenimiento preventivo']],['Mantenimiento correctivo',['mantenimiento correctivo']],['Refrigeración',['refrigeracion','refrigeración','climatizacion','climatización','hvac','aire acondicionado']],
    ['Plomería',['plomeria','plomería','fontaneria','fontanería']],['Albañilería',['albanileria','albañilería']],['Durlock',['durlock','placa de yeso']],['Pintura',['pintura','pintor']],['Soldadura',['soldadura','soldador']],
    ['Seguridad e higiene',['seguridad e higiene','higiene y seguridad','epp','prevencion de riesgos','prevención de riesgos']],['Atención al cliente',['atencion al cliente','atención al cliente','atencion al publico','atención al público']],['Ventas',['ventas','venta consultiva']],['Caja',['manejo de caja','cajero','cajera','arqueo de caja']],['Gestión de stock',['gestion de stock','gestión de stock','control de stock','inventario']],['Logística',['logistica','logística','despacho','recepcion de mercaderia','recepción de mercadería']],
    ['Liderazgo de equipos',['liderazgo','lider de equipo','líder de equipo','manejo de personal']],['Coordinación de equipos',['coordinacion de equipos','coordinación de equipos','supervision de personal','supervisión de personal']],['Gestión de proyectos',['gestion de proyectos','gestión de proyectos','project management']],['Resolución de problemas',['resolucion de problemas','resolución de problemas']],
    ['Selección de personal',['seleccion de personal','selección de personal','reclutamiento','recruiting']],['Administración de personal',['administracion de personal','administración de personal','legajos','novedades de liquidacion','novedades de liquidación']],['Liquidación de sueldos',['liquidacion de sueldos','liquidación de sueldos','payroll']],['Calidad',['gestion de calidad','gestión de calidad','iso 9001','auditoria interna','auditoría interna']]
  ];

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[•▪●◆►▸]/g,' ').replace(/[^a-z0-9+#./@&()\-–—,;:| ]+/g,' ').replace(/\s+/g,' ').trim();
  const clean=v=>String(v||'').replace(/^\s*[•▪●◆►▸\-*]+\s*/,'').replace(/\s+/g,' ').trim();
  const esc=v=>typeof v140Esc==='function'?v140Esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uniqBy=(arr,keyFn)=>{const s=new Set();return arr.filter(x=>{const k=keyFn(x);if(!k||s.has(k))return false;s.add(k);return true;});};
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  const lastDay=(y,m)=>new Date(Number(y),Number(m),0).getDate();
  const iso=(y,m=1,d=1)=>`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  function canonicalHeading(line){
    const n=norm(line).replace(/[:|\-–—]+$/,'').trim();
    if(!n||n.length>64)return null;
    for(const [key,aliases] of Object.entries(SECTIONS)){
      if(aliases.some(a=>n===norm(a)))return key;
    }
    return null;
  }
  function isHeading(line){return !!canonicalHeading(line);}
  function isBullet(line){return /^\s*[•▪●◆►▸\-*]/.test(String(line||''));}
  function roleScore(s){const n=norm(s);if(!n||n.length<3||n.length>130)return -5;let score=0;for(const w of ROLE_WORDS)if(n.includes(norm(w)))score+=3;if(/\b(sr|sra|dni|tel|telefono|teléfono|mail|correo)\b/.test(n))score-=4;if(/@|https?:|linkedin/.test(n))score-=5;if(COMPANY_WORDS.some(w=>n.includes(norm(w))))score-=1.5;if(INSTITUTION_WORDS.some(w=>n.includes(norm(w))))score-=2;if(isHeading(s))score-=8;return score;}
  function companyScore(s){const n=norm(s);if(!n||n.length<2||n.length>150)return -5;let score=0;if(COMPANY_WORDS.some(w=>n.includes(norm(w))))score+=4;if(/\b(sa|srl|sas|ltda|inc)\b/.test(n))score+=4;if(/[A-ZÁÉÍÓÚÑ]{2,}/.test(String(s||'')))score+=.5;if(roleScore(s)>=4)score-=2;if(/@|https?:|linkedin/.test(n))score-=5;if(isHeading(s))score-=8;return score;}
  function institutionScore(s){const n=norm(s);let score=INSTITUTION_WORDS.some(w=>n.includes(norm(w)))?5:0;if(DEGREE_WORDS.some(w=>n.includes(norm(w))))score-=1;if(isHeading(s))score-=8;return score;}
  function degreeScore(s){const n=norm(s);let score=DEGREE_WORDS.some(w=>n.includes(norm(w)))?5:0;if(INSTITUTION_WORDS.some(w=>n.includes(norm(w))))score-=1;if(isHeading(s))score-=8;return score;}

  function parseMonthToken(token){
    const n=norm(token).replace(/\.$/,'');
    if(MONTH[n])return MONTH[n];
    const num=Number(n);return num>=1&&num<=12?num:null;
  }
  function parseDatePoint(raw,end=false){
    const n=norm(raw).replace(/\bde\b/g,' ').replace(/\s+/g,' ').trim();
    if(PRESENT.test(n))return{present:true};
    let m=n.match(/^([a-z]{3,10})\.?\s+((?:19|20)\d{2})$/i);
    if(m&&parseMonthToken(m[1])){const mo=parseMonthToken(m[1]),y=Number(m[2]);return{year:y,month:mo,date:iso(y,mo,end?lastDay(y,mo):1),precision:'month'};}
    m=n.match(/^(\d{1,2})[/.\-]((?:19|20)\d{2})$/);
    if(m){const mo=Number(m[1]),y=Number(m[2]);if(mo>=1&&mo<=12)return{year:y,month:mo,date:iso(y,mo,end?lastDay(y,mo):1),precision:'month'};}
    m=n.match(/^((?:19|20)\d{2})$/);
    if(m){const y=Number(m[1]);return{year:y,month:end?12:1,date:iso(y,end?12:1,end?31:1),precision:'year'};}
    return null;
  }
  function parseDateRange(line){
    const raw=String(line||'').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
    const n=norm(raw);
    if(!/(19|20)\d{2}/.test(n))return null;
    const monthWord=Object.keys(MONTH).sort((a,b)=>b.length-a.length).join('|');
    const point=`(?:${monthWord})\\.?\\s+(?:19|20)\\d{2}|\\d{1,2}[/.\\-](?:19|20)\\d{2}|(?:19|20)\\d{2}`;
    const sep='(?:\\s*(?:-|–|—|a|al|hasta|to)\\s*)';
    let re=new RegExp(`(${point})${sep}((?:actualidad|actual|presente|hoy|present|current)|${point})`,'i');
    let m=n.match(re);
    if(!m){
      // Fechas a veces vienen separadas por espacios largos o una barra.
      re=new RegExp(`(${point})\\s*[|/]\\s*((?:actualidad|actual|presente|hoy|present|current)|${point})`,'i');
      m=n.match(re);
    }
    if(!m)return null;
    const a=parseDatePoint(m[1],false),b=parseDatePoint(m[2],true);if(!a||!b)return null;
    return{start:a.date,end:b.present?null:b.date,current:!!b.present,precision:a.precision==='month'||b.precision==='month'?'month':'year',label:raw,matched:m[0]};
  }

  function layoutRecords(text,layout){
    const out=[];
    if(layout?.pages?.length){
      for(const p of layout.pages){
        const add=(list,column)=>{(list||[]).forEach((x,i)=>{const t=clean(typeof x==='string'?x:x?.text);if(t)out.push({text:t,page:p.page||1,column,order:i,y:Number(x?.y||0),x:Number(x?.x||0),bullet:isBullet(typeof x==='string'?x:x?.text)});});};
        if(p.two){add(p.left,'left');add(p.right,'right');}else add(p.all||p.left,'main');
      }
      return out;
    }
    String(text||'').split(/\r?\n/).forEach((line,i)=>{const t=clean(line);if(t&&!/^\[PAGE \d+ (LEFT|RIGHT)\]$/i.test(t))out.push({text:t,page:1,column:'main',order:i,y:0,x:0,bullet:isBullet(line)});});
    return out;
  }
  function assignSections(records){
    const byLane=new Map();
    for(const r of records){const key=r.column||'main';if(!byLane.has(key))byLane.set(key,[]);byLane.get(key).push(r);}
    for(const rows of byLane.values())rows.sort((a,b)=>a.page-b.page||a.order-b.order);
    for(const rows of byLane.values()){
      let current=null;
      for(const r of rows){const h=canonicalHeading(r.text);if(h){r.heading=h;current=h;r.section=h;}else r.section=current;}
    }
    return records;
  }
  function sectionRows(records,key){return records.filter(r=>r.section===key&&!r.heading);}
  function sectionCoverage(records){const s=new Set(records.filter(r=>r.heading).map(r=>r.heading));return [...s];}

  function splitCompositeHeader(line){
    const raw=clean(line);if(!raw||parseDateRange(raw))return null;
    const seps=[' | ',' · ',' @ ',' – ',' — ',' en ',' at ',' - '];
    for(const sep of seps){if(!raw.includes(sep))continue;const parts=raw.split(sep).map(clean).filter(Boolean);if(parts.length<2)continue;const a=parts[0],b=parts.slice(1).join(' '),ra=roleScore(a),rb=roleScore(b),ca=companyScore(a),cb=companyScore(b);
      if(ra>=rb&&cb>=ca)return{position:a,company:b,confidence:.9};
      if(rb>ra&&ca>cb)return{position:b,company:a,confidence:.88};
    }
    return null;
  }
  function meaningfulHeaderRows(rows){return rows.filter(r=>{const t=r.text;return t&&t.length<=150&&!parseDateRange(t)&&!isHeading(t)&&!/@|https?:\/\/|linkedin/i.test(t)&&!/^\+?\d[\d\s().-]{7,}$/.test(t);});}
  function chooseRoleCompany(candidates){
    const rows=meaningfulHeaderRows(candidates);for(const r of rows){const c=splitCompositeHeader(r.text);if(c)return{...c,used:new Set([r])};}
    let role=null,company=null;
    for(const r of rows){const s=roleScore(r.text);if(!role||s>role.score)role={r,score:s};}
    for(const r of rows){if(role?.r===r&&rows.length>1)continue;const s=companyScore(r.text);if(!company||s>company.score)company={r,score:s};}
    // Si los scores son ambiguos, preservamos información sin inventar.
    if(role?.score<1){const alt=rows.find(r=>r!==company?.r);if(alt)role={r:alt,score:0};}
    if(company?.score<0.5){const alt=rows.find(r=>r!==role?.r&&r.text.length>=2);if(alt)company={r:alt,score:0};else company=null;}
    return{position:role?.r?.text||'',company:company?.r?.text||'',confidence:clamp(.55+(Math.max(0,role?.score||0)+Math.max(0,company?.score||0))*.035,.52,.94),used:new Set([role?.r,company?.r].filter(Boolean))};
  }

  function experienceCandidates(records){
    let rows=sectionRows(records,'experience');
    if(rows.length<3){rows=records.filter(r=>!['education','courses'].includes(r.section)&&!r.heading);}
    return rows;
  }
  function extractExperiences(records){
    const rows=experienceCandidates(records),dateIdx=[];rows.forEach((r,i)=>{const d=parseDateRange(r.text);if(d)dateIdx.push({i,d});});
    const out=[];
    for(let z=0;z<dateIdx.length;z++){
      const {i,d}=dateIdx[z],prev=dateIdx[z-1]?.i??-1,next=dateIdx[z+1]?.i??rows.length;
      const windowStart=Math.max(prev+1,i-4),windowEnd=Math.min(next,i+9);
      const before=rows.slice(windowStart,i),after=rows.slice(i+1,windowEnd);
      const same=rows[i].text.replace(d.matched||'','').replace(/^[\s|·–—-]+|[\s|·–—-]+$/g,'').trim();
      const candidateRows=[...before.slice(-3),...(same?[{...rows[i],text:same}]:[]),...after.slice(0,3)];
      const rc=chooseRoleCompany(candidateRows);
      if(!rc.position&&!rc.company)continue;
      const descRows=[...before,...after].filter(r=>!rc.used.has(r)&&!parseDateRange(r.text)&&!isHeading(r.text));
      const desc=descRows.filter(r=>r.bullet||r.text.length>28).map(r=>clean(r.text)).filter(Boolean).slice(0,8).join(' ').slice(0,1600);
      const confidence=clamp(rc.confidence+(d.precision==='month'?.04:0)+(desc?.length>30?.03:0)-(rc.company?0:.12),.45,.98);
      out.push({position:rc.position,company:rc.company,start:d.start,end:d.end,current:d.current,description:desc,confidence,needs_company:!rc.company,source_label:[rc.position,rc.company,d.label].filter(Boolean).join(' · '),evidence_excerpt:[rc.position,rc.company,d.label,desc].filter(Boolean).join(' · ').slice(0,900)});
    }
    return uniqBy(out,x=>norm(`${x.company}|${x.position}|${x.start}`)).filter(x=>x.position||x.company).slice(0,20);
  }

  function educationCandidates(records){const sec=sectionRows(records,'education');return sec.length?sec:records.filter(r=>r.section==='education'||INSTITUTION_WORDS.some(w=>norm(r.text).includes(norm(w))));}
  function extractEducation(records){
    const rows=educationCandidates(records),out=[],dates=[];rows.forEach((r,i)=>{const d=parseDateRange(r.text);if(d)dates.push({i,d});});
    if(dates.length){for(let z=0;z<dates.length;z++){const {i,d}=dates[z],prev=dates[z-1]?.i??-1,next=dates[z+1]?.i??rows.length;const block=rows.slice(Math.max(prev+1,i-3),Math.min(next,i+5)).filter((r,j)=>r!==rows[i]&&!r.heading&&!parseDateRange(r.text));let inst=[...block].sort((a,b)=>institutionScore(b.text)-institutionScore(a.text))[0],title=[...block].filter(r=>r!==inst).sort((a,b)=>degreeScore(b.text)-degreeScore(a.text))[0];if(inst&&title&&(institutionScore(inst.text)>0||degreeScore(title.text)>0))out.push({institution:inst.text,title:title.text,start:d.start,end:d.end,current:d.current,level:degreeScore(title.text)>0?'Formación académica':'',confidence:clamp(.7+(institutionScore(inst.text)>0?.1:0)+(degreeScore(title.text)>0?.1:0),.6,.96),excerpt:[title.text,inst.text,d.label].join(' · ')});}}
    // Formación sin fechas.
    for(let i=0;i<rows.length;i++){const r=rows[i];if(institutionScore(r.text)<4)continue;const near=rows.slice(i+1,i+4).find(x=>degreeScore(x.text)>=3&&!parseDateRange(x.text));if(near)out.push({institution:r.text,title:near.text,start:null,end:null,current:false,level:'Formación académica',confidence:.72,excerpt:`${near.text} · ${r.text}`});}
    return uniqBy(out,x=>norm(`${x.institution}|${x.title}`)).slice(0,14);
  }

  function extractCourses(records){
    const rows=sectionRows(records,'courses'),out=[];if(!rows.length)return out;
    for(let i=0;i<rows.length;i++){
      const t=rows[i].text;if(!t||isHeading(t))continue;const d=parseDateRange(t);const year=(norm(t).match(/(?:19|20)\d{2}/)||[])[0]||'';
      if(d){const near=[rows[i-2],rows[i-1],rows[i+1],rows[i+2]].filter(Boolean).filter(r=>!parseDateRange(r.text));const inst=[...near].sort((a,b)=>institutionScore(b.text)-institutionScore(a.text))[0];const title=near.find(r=>r!==inst)||null;if(title)out.push({institution:inst?.text||'',title:title.text,year:Number(year||d.start?.slice(0,4)||0)||null,start:d.start,end:d.end,current:d.current,level:'Curso / capacitación',confidence:inst?.text?.length?.9:.76,excerpt:[title.text,inst?.text,d.label].filter(Boolean).join(' · ')});continue;}
      if((r=>r.bullet||t.length<120)(rows[i])){
        const next=rows[i+1];const prev=rows[i-1];let institution='';if(next&&institutionScore(next.text)>=4)institution=next.text;else if(prev&&institutionScore(prev.text)>=4)institution=prev.text;
        if(t.length>=4&&!INSTITUTION_WORDS.some(w=>norm(t)===norm(w)))out.push({institution,title:t,year:Number(year)||null,start:year?iso(year,1,1):null,end:year?iso(year,12,31):null,current:false,level:'Curso / capacitación',confidence:institution?.86:.68,excerpt:[t,institution].filter(Boolean).join(' · ')});
      }
    }
    return uniqBy(out,x=>norm(`${x.institution}|${x.title}|${x.year||''}`)).slice(0,30);
  }

  function dynamicSkills(){
    const base=[];try{for(const c of competencyRowsV42()){const label=c.name||c.label;if(label)base.push([label,[label,c.code].filter(Boolean)]);}}catch(_){ }
    return [...base,...GENERIC_SKILLS];
  }
  function findExcerpt(text,aliases){
    const raw=String(text||'').replace(/\s+/g,' '),n=norm(raw);for(const a of aliases){const needle=norm(a),idx=n.indexOf(needle);if(idx>=0){const approx=Math.max(0,Math.min(raw.length-1,idx));return raw.slice(Math.max(0,approx-90),Math.min(raw.length,approx+190)).trim();}}return aliases[0]||'';
  }
  function explicitSkillItems(records){
    const rows=sectionRows(records,'skills'),out=[];
    for(const r of rows){let parts=String(r.text).split(/[•▪●◆►▸;|]/).map(clean).filter(Boolean);if(parts.length===1&&r.text.includes(','))parts=r.text.split(',').map(clean).filter(Boolean);for(const p of parts){if(p.length>=2&&p.length<=100&&!isHeading(p)&&!parseDateRange(p))out.push(p);}}
    return uniqBy(out,x=>norm(x)).slice(0,35);
  }
  function extractSkills(text,records){
    const out=[];const add=(skill,confidence,excerpt,kind,competencyId=null)=>{const k=norm(skill);if(!k||out.some(x=>norm(x.skill)===k))return;out.push({skill,confidence:clamp(confidence,.45,.99),excerpt:String(excerpt||skill).slice(0,600),kind,competency_id:competencyId});};
    const explicit=explicitSkillItems(records);
    for(const item of explicit){const match=dynamicSkills().find(([label,aliases])=>aliases.some(a=>norm(item).includes(norm(a)))||norm(label)===norm(item));add(match?.[0]||item,.96,item,'explicit',null);}
    const n=norm(text);for(const [label,aliases] of dynamicSkills()){const hits=aliases.filter(a=>{const k=norm(a);return k.length>=2&&n.includes(k);});if(hits.length)add(label,Math.min(.93,.63+hits.length*.08),findExcerpt(text,hits),'inferred',null);}
    return out.slice(0,30);
  }

  function contactFields(text,records){
    const contact=sectionRows(records,'contact').map(r=>r.text).join('\n'),flat=contact||String(text||'');
    const email=(flat.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
    const linkedin=(flat.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s),;]+/i)||[])[0]||'';
    const phones=(flat.match(/(?:\+?54\s?9?\s?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g)||[]).filter(x=>x.replace(/\D/g,'').length>=8);const phone=phones[0]||'';
    const provinces=['Buenos Aires','CABA','Ciudad Autónoma de Buenos Aires','Córdoba','Chaco','Corrientes','Santa Fe','Mendoza','Tucumán','Neuquén','Entre Ríos','Misiones','Salta','Jujuy','Río Negro','Chubut','San Juan','San Luis','La Pampa','Formosa','Santiago del Estero','Catamarca','La Rioja','Santa Cruz','Tierra del Fuego'];let province='',city='';
    const search=[...sectionRows(records,'contact'),...records.slice(0,18)];for(const r of search){const pr=provinces.find(p=>norm(r.text).includes(norm(p)));if(!pr)continue;province=pr;const parts=r.text.split(',').map(clean).filter(Boolean);if(parts.length>=2){const pi=parts.findIndex(x=>norm(x).includes(norm(pr)));if(pi>0&&!/\d/.test(parts[pi-1]))city=parts[pi-1];}break;}
    return{email,phone,linkedin:linkedin?(/^https?:/i.test(linkedin)?linkedin:`https://${linkedin}`):'',city,province};
  }
  function detectHeadline(records){
    const prof=sectionRows(records,'profile');if(prof.length){const first=prof.map(r=>r.text).find(x=>x.length>=4&&x.length<=110);if(first){const m=first.match(/^(.{4,90}?)\s+con\s+(?:mas de |más de )?\d+\s+años?/i);return clean(m?.[1]||first);}}
    const tops=records.filter(r=>r.page===1).slice(0,24).filter(r=>!r.heading&&!/@|https?:|linkedin|\+?\d[\d\s().-]{7,}/i.test(r.text));return tops.sort((a,b)=>roleScore(b.text)-roleScore(a.text)).find(r=>roleScore(r.text)>1)?.text||'';
  }
  function detectBio(records){const p=sectionRows(records,'profile').map(r=>r.text).filter(x=>x.length>12);return p.join(' ').slice(0,1500);}
  function detectName(records){
    const candidates=records.filter(r=>r.page===1).slice(0,14).map(r=>r.text).filter(x=>x.length>=5&&x.length<=80&&!isHeading(x)&&roleScore(x)<2&&!/@|https?:|linkedin|\d{4}/i.test(x));
    return candidates.find(x=>{const parts=x.split(/\s+/);return parts.length>=2&&parts.length<=5&&parts.every(p=>/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\-]+$/.test(p));})||'';
  }
  function extractLanguages(records){
    const rows=sectionRows(records,'languages'),out=[];
    for(const r of rows){
      const parts=r.text.split(/[;,|•]/).map(clean).filter(Boolean);
      for(const p of parts){const m=p.match(/^(ingles|inglés|english|portugues|portugués|portuguese|frances|francés|french|italiano|italian|aleman|alemán|german)(?:\s*[-:()]?\s*(.*))?$/i);if(m)out.push({language:m[1],level:clean(m[2]||''),confidence:.95,excerpt:p});}
    }
    return uniqBy(out,x=>norm(x.language)).slice(0,10);
  }
  function careerSummary(experiences){
    const now=new Date(),ranges=[];for(const e of experiences||[]){if(!e.start)continue;let a=new Date(e.start),b=e.current?now:(e.end?new Date(e.end):null);if(!b||Number.isNaN(a)||Number.isNaN(b)||b<a)continue;ranges.push([a,b]);}ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const r of ranges){const last=merged[merged.length-1];if(!last||r[0]>new Date(last[1].getFullYear(),last[1].getMonth()+1,1))merged.push([...r]);else if(r[1]>last[1])last[1]=r[1];}let months=0;for(const [a,b] of merged)months+=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())+1;return{months,years:Number((months/12).toFixed(1)),roles:(experiences||[]).length,companies:new Set((experiences||[]).map(x=>norm(x.company)).filter(Boolean)).size};
  }
  function quality(result){
    const exp=result.experiences||[],edu=result.education||[],fields=result.fields||{},sections=result.sections||[];const expConf=exp.length?exp.reduce((s,x)=>s+x.confidence,0)/exp.length:0;let score=20;score+=exp.length?20:0;score+=Math.round(expConf*18);score+=edu.length?10:0;score+=(result.skills||[]).length?10:0;score+=Math.min(12,['email','phone','headline'].filter(k=>fields[k]).length*4);score+=Math.min(10,sections.length*2);const warnings=[];const missCompany=exp.filter(x=>!x.company).length;if(missCompany){warnings.push(`${missCompany} experiencia(s) sin empresa identificada; conviene confirmarlas manualmente.`);score-=Math.min(15,missCompany*5);}if(!exp.length)warnings.push('No pude estructurar experiencia laboral con suficiente confianza.');if(result.method?.includes('ocr')){warnings.push('El CV se leyó mediante OCR; revisá especialmente nombres propios y fechas.');score-=5;}if(!sections.includes('experience'))warnings.push('No encontré un encabezado claro de Experiencia; usé detección por fechas y contexto.');return{score:Math.max(0,Math.min(100,Math.round(score))),warnings,experience_confidence:Math.round(expConf*100)};
  }

  function parseText(text,{file={name:'CV'},method='text',layout=null}={}){
    const records=assignSections(layoutRecords(text,layout));const experiences=extractExperiences(records),education=extractEducation(records),courses=extractCourses(records),skills=extractSkills(text,records),contacts=contactFields(text,records),career=careerSummary(experiences),sections=sectionCoverage(records),languages=extractLanguages(records);
    const fields={...contacts,headline:detectHeadline(records),bio:detectBio(records)};
    const result={file,method,text:String(text||''),lines:records.map(r=>r.text),layout,records,fields,experiences,education,courses,skills,languages,name:detectName(records),career,sections,parser:'semantic-v38'};result.quality=quality(result);return result;
  }

  const legacyOpen=window.openCvReviewV140;
  function enhanceReview(a){
    try{
      const body=document.querySelector('#cvReviewModalV140 [data-v100-body]');if(!body||body.querySelector('[data-v38-cv-summary]'))return;
      const q=a.quality||{},career=a.career||{},warnings=q.warnings||[];const box=document.createElement('div');box.dataset.v38CvSummary='1';box.className='mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4';box.innerHTML=`<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><p class="text-[10px] uppercase tracking-widest font-black text-indigo-700">Interpretación estructural V38 · API $0</p><p class="mt-1 text-sm font-extrabold text-lutmin-dark">${esc(a.name||'CV')} · ${Number(career.years||0)} años de trayectoria fechada interpretada</p><p class="mt-1 text-xs text-slate-600">Secciones reconocidas: ${esc((a.sections||[]).join(' · ')||'sin encabezados claros')}.</p></div><div class="grid grid-cols-2 gap-2 text-center"><div class="rounded-xl bg-white px-3 py-2"><p class="text-xl font-black text-indigo-700">${Number(q.score||0)}%</p><p class="text-[9px] text-slate-400">CALIDAD DE LECTURA</p></div><div class="rounded-xl bg-white px-3 py-2"><p class="text-xl font-black text-indigo-700">${Number(q.experience_confidence||0)}%</p><p class="text-[9px] text-slate-400">EXPERIENCIA</p></div></div></div>${warnings.length?`<div class="mt-3 rounded-xl bg-amber-50 p-3"><p class="text-[10px] font-black text-amber-700">REVISAR</p>${warnings.map(x=>`<p class="mt-1 text-[11px] text-amber-800">• ${esc(x)}</p>`).join('')}</div>`:''}`;
      const first=body.children[1]||body.firstElementChild;first?.insertAdjacentElement('afterend',box);
    }catch(e){console.warn('V38 review',e);}
  }
  if(typeof legacyOpen==='function')window.openCvReviewV140=function(a){const r=legacyOpen(a);setTimeout(()=>enhanceReview(a),0);return r;};

  async function analyzeFile(file,{status=null,openReview=false}={}){
    if(!file)throw new Error('Seleccioná un CV.');
    status=status||document.getElementById('talentCvStatusV140');if(status)status.textContent='Leyendo y reconstruyendo el CV localmente...';
    const read=await window.readCvV140(file,status);if((read.text||'').replace(/\s/g,'').length<80)throw new Error('No pude obtener suficiente texto del CV. Probá otra versión del archivo.');
    if(status)status.textContent='Interpretando experiencia, fechas, formación y competencias...';const result=parseText(read.text,{file,method:read.method,layout:read.layout||null});
    try{result.hash=await hashFileV42(file);}catch(_){result.hash='';}
    try{stateV42().cv=result;}catch(_){ }
    if(openReview&&typeof window.openCvReviewV140==='function')window.openCvReviewV140(result);
    if(status)status.textContent=`Lectura V38: ${result.experiences.length} experiencia(s), ${result.skills.length} competencia(s), ${result.education.length} formación(es), calidad ${result.quality.score}%.`;
    window.dispatchEvent(new CustomEvent('lutmin:cv-analyzed',{detail:{version:VERSION,summary:{experiences:result.experiences.length,skills:result.skills.length,education:result.education.length,quality:result.quality.score}}}));
    return result;
  }
  window.handleCvFileV140=async function(file){try{return await analyzeFile(file,{openReview:true});}catch(e){console.error(e);const st=document.getElementById('talentCvStatusV140');if(st)st.textContent=e.message||'No pude leer el CV.';showToast?.(e.message||'No pude analizar el CV.');return null;}};
  try{handleCvFileV140=window.handleCvFileV140;}catch(_){ }
  window.analyzeCvTextV140=function(text,file,method,layout){return parseText(text,{file:file||{name:'CV'},method:method||'text',layout:layout||null});};
  try{analyzeCvTextV140=window.analyzeCvTextV140;}catch(_){ }

  const apiV42={version:VERSION,parseText,analyzeFile,parseDateRange,careerSummary,snapshot:()=>stateV42()?.cv||null,normalize:norm};
  window.LutminCvV43=apiV42;
  window.LutminCvV42=apiV42;
  window.LutminCvV38=apiV42;
})();
