// Verifie les regles d'architecture (lance par npm test) :
// 1. src/core n'importe que src/core et src/data ; src/data n'importe que src/data.
// 2. src/core n'utilise aucune API du navigateur liee a la page (document, window, canvas, evenements...).
// 3. chaque module de src/core et src/data se charge dans Node (aucun acces au DOM au chargement).
// 4. src/data ne lit aucune variable globale hors des objets standard (Math...) : ses fonctions ne lisent que leurs arguments.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const listJs = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? listJs(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const layer = f => path.relative(SRC, f).split(path.sep)[0];
const ALLOWED = {core: ['core', 'data'], data: ['data']};
const STANDARD = new Set(['Math', 'Number', 'String', 'Object', 'Array', 'Set', 'Map', 'JSON', 'Infinity', 'NaN', 'undefined', 'isFinite']);
const BROWSER = new Set(['document', 'window', 'navigator', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight', 'addEventListener', 'removeEventListener', 'devicePixelRatio', 'HTMLElement', 'Image', 'AudioContext', 'location', 'history', 'alert', 'confirm', 'prompt']);
const errors = [];

for(const f of listJs(SRC)){
  const l = layer(f); if(!ALLOWED[l]) continue;
  const code = fs.readFileSync(f, 'utf8'), rel = path.relative(ROOT, f);
  const ast = acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true});
  for(const n of ast.body) if(n.type === 'ImportDeclaration'){
    const target = path.resolve(path.dirname(f), n.source.value);
    const tl = target.startsWith(SRC) ? layer(target) : '(hors src)';
    if(!ALLOWED[l].includes(tl)) errors.push(`${rel}:${n.loc.start.line} : ${l} importe ${n.source.value} (couche ${tl})`);
  }
  const g = escope.analyze(ast, {ecmaVersion: 2022, sourceType: 'module', fallback: 'iteration'}).globalScope;
  if(l === 'core') for(const r of g.through) if(BROWSER.has(r.identifier.name)) errors.push(`${rel}:${r.identifier.loc.start.line} : API du navigateur '${r.identifier.name}' dans le coeur du jeu`);
  if(l === 'data') for(const r of g.through) if(!STANDARD.has(r.identifier.name)) errors.push(`${rel}:${r.identifier.loc.start.line} : la donnee lit la variable globale '${r.identifier.name}' (une fonction de donnees ne lit que ses arguments)`);
}
for(const f of [...listJs(path.join(SRC, 'core')), ...listJs(path.join(SRC, 'data'))]){
  try{ await import(pathToFileURL(f).href); }
  catch(e){ errors.push(`${path.relative(ROOT, f)} : ne se charge pas dans Node (${e.message})`); }
}
if(errors.length){ console.error('Regles d\'architecture non respectees :\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log('architecture : ok (core et data independants de l\'interface, data independant de core ; chargeables dans Node)');
