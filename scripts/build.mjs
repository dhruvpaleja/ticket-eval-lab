// Regenerate deterministic downloadable examples before packaging.
await import('./generate-examples.mjs');
import { mkdir, cp, rm } from 'node:fs/promises';
const files=['index.html','styles.css','src/app.js','src/engine.js','src/fixtures.js','src/contracts.js','src/canonical.js','src/runner.js','src/probes.js','src/snapshot.js','public/favicon.svg','examples/suite.json','examples/valid-candidate.json','examples/mixed-candidate.json','examples/valid-snapshot.json'];
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of files){await mkdir(`dist/${file.split('/').slice(0,-1).join('/')}`,{recursive:true});await cp(file,`dist/${file}`);}
console.log(`Built ${files.length} static files in dist/. No server functions or runtime dependencies.`);
