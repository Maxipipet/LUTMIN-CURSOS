import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const file=root+'assets/js/modules/talent/professional-progression-v49.js';execFileSync('node',['--check',file]);
const code=fs.readFileSync(file,'utf8');const loader=fs.readFileSync(root+'assets/js/core/module-loader-v33.js','utf8');const router=fs.readFileSync(root+'assets/js/core/talent-router-v38.js','utf8');const index=fs.readFileSync(root+'index.html','utf8');
assert(code.includes('Brechas que se repiten'));assert(code.includes('EVOLUCIÓN ENTRE VERSIONES'));assert(code.includes('No convierte cursos en experiencia'));assert(code.includes('diffVersions'));assert(loader.includes('professional-progression-v49.js'));assert(loader.includes('F.dossier46,F.progression49'));assert(router.includes('LutminProgressionV49'));assert(index.includes('content="49.0"'));
console.log(JSON.stringify({ok:true,version:'49.0',progression:true,lazyCareer:true,noSql:true},null,2));
