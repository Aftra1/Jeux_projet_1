// Build : produit le jeu en un seul fichier.
//   dist/artifact.html : fragment publie comme Artifact (la plateforme ajoute doctype, charset et viewport)
//   dist/index.html    : le meme fragment dans une page complete, pour jouer en local (version publiee)
//   dist/test.html     : version de test, avec le pont (tests de caracterisation, outil de performance)
// Usage : node tools/build.cjs
//
// Les modules de src/ sont regroupes par esbuild en un script IIFE. La version publiee n'expose que window.__game.
// La version de test ajoute un « pont » genere qui expose chaque nom de premier niveau de chaque module sur window,
// en lecture et, pour les `let`, en ecriture (comme le script unique de la version 46) : les tests lisent et modifient
// l'etat interne. La serie « boite noire » (tests/blackbox.cjs) verifie que les deux versions se comportent pareil.
const fs = require('fs'), path = require('path');
const esbuild = require('esbuild'), acorn = require('acorn');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src'), DIST = path.join(ROOT, 'dist');

const listJs = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? listJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []).sort();

// Noms de premier niveau d'un module : {names, lets, exported}
function topLevel(code){
  const ast = acorn.parse(code, {ecmaVersion: 'latest', sourceType: 'module'});
  const names = [], lets = new Set(), exported = new Set();
  const ids = (p, out) => {
    if(!p) return;
    if(p.type === 'Identifier') out.push(p.name);
    else if(p.type === 'ObjectPattern') p.properties.forEach(q => ids(q.type === 'RestElement' ? q.argument : q.value, out));
    else if(p.type === 'ArrayPattern') p.elements.forEach(q => ids(q && q.type === 'RestElement' ? q.argument : q, out));
    else if(p.type === 'AssignmentPattern') ids(p.left, out);
  };
  for(const node of ast.body){
    const isExp = node.type === 'ExportNamedDeclaration';
    const d = isExp ? node.declaration : node;
    if(isExp && !d && !node.source) node.specifiers.forEach(s => exported.add(s.local.name));
    if(!d) continue;
    const found = [];
    if(d.type === 'VariableDeclaration'){ d.declarations.forEach(x => ids(x.id, found)); if(d.kind === 'let' || d.kind === 'var') found.forEach(n => lets.add(n)); }
    else if((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) found.push(d.id.name);
    found.forEach(n => { names.push(n); if(isExp) exported.add(n); });
  }
  return {names, lets, exported};
}

const bridgePlugin = {
  name: 'pont-global',
  setup(build){
    // chaque module exporte tous ses noms de premier niveau, et un setter pour chaque `let`
    build.onLoad({filter: /[\\/]src[\\/].*\.js$/}, args => {
      const code = fs.readFileSync(args.path, 'utf8');
      const t = topLevel(code);
      const extra = t.names.filter(n => !t.exported.has(n));
      let add = '\n// --- ajoute au build (pont global) ---\n';
      if(extra.length) add += 'export { ' + extra.join(', ') + ' };\n';
      for(const n of t.lets) add += 'export function __set_' + n + '(v){ ' + n + ' = v; }\n';
      return {contents: code + add, loader: 'js'};
    });
    build.onResolve({filter: /^pont:global$/}, () => ({path: 'pont', namespace: 'pont'}));
    build.onLoad({filter: /.*/, namespace: 'pont'}, () => {
      const files = listJs(SRC), seen = new Map();
      let code = 'const def = (n, get, set) => { try{ Object.defineProperty(window, n, {get, set, configurable: true, enumerable: true}); }catch(e){} };\n';
      code += 'const ro = n => () => { throw new TypeError("Assignment to constant variable: " + n); };\n';
      files.forEach((f, i) => {
        const t = topLevel(fs.readFileSync(f, 'utf8'));
        code += 'import * as m' + i + ' from ' + JSON.stringify(f) + ';\n';
        for(const n of t.names){
          if(seen.has(n)) throw new Error('nom de premier niveau en double : ' + n + ' (' + path.relative(ROOT, seen.get(n)) + ' et ' + path.relative(ROOT, f) + ')');
          seen.set(n, f);
          code += 'def(' + JSON.stringify(n) + ', () => m' + i + '.' + n + ', ' + (t.lets.has(n) ? 'v => m' + i + '.__set_' + n + '(v)' : 'ro(' + JSON.stringify(n) + ')') + ');\n';
        }
      });
      return {contents: code, loader: 'js', resolveDir: ROOT};
    });
  },
};

async function bundleJs(bridge){
  const r = await esbuild.build({
    stdin: {contents: 'import "./src/main.js";\n' + (bridge ? 'import "pont:global";\n' : ''), resolveDir: ROOT, sourcefile: 'entree.js', loader: 'js'},
    bundle: true, format: 'iife', write: false, charset: 'utf8', minify: false, target: 'es2022',
    plugins: bridge ? [bridgePlugin] : [], logLevel: 'warning',
  });
  return r.outputFiles[0].text;
}

(async()=>{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<!-- script du jeu[^>]*-->/, '');
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<link rel="stylesheet"[^>]*>\n?/, '').replace(/<title>[^<]*<\/title>\n?/, '');
  const fragmentOf = js => '<title>Upload Lab</title>\n<style>\n:root{color-scheme:dark}\n' + css + '\n</style>\n' + body + '\n<script>\n' + js + '\n</script>\n';
  const pageOf = fragment => '<!doctype html>\n<html lang="fr">\n<head>' + head + '</head>\n<body>\n' + fragment + '</body>\n</html>\n';
  const fragment = fragmentOf(await bundleJs(false)), test = fragmentOf(await bundleJs(true));
  fs.mkdirSync(DIST, {recursive: true});
  fs.writeFileSync(path.join(DIST, 'artifact.html'), fragment);
  fs.writeFileSync(path.join(DIST, 'index.html'), pageOf(fragment));
  fs.writeFileSync(path.join(DIST, 'test.html'), pageOf(test));
  const ko = n => (n/1000).toFixed(1).replace('.', ',') + ' Ko';
  console.log('build : dist/artifact.html (' + ko(Buffer.byteLength(fragment)) + ', publie, sans pont), dist/index.html, dist/test.html (' + ko(Buffer.byteLength(test)) + ', avec pont)');
})().catch(e => { console.error(e.message || e); process.exit(1); });
