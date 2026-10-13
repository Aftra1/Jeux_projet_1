// Build : produit le jeu en un seul fichier.
//   dist/artifact.html : fragment publie comme Artifact (la plateforme ajoute doctype, charset et viewport)
//   dist/index.html    : le meme fragment dans une page complete, pour jouer en local et pour les tests
// Usage : node tools/build.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');

async function bundleJs(){
  return fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
}

(async()=>{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace('<script src="game.js"></script>', '');
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const js = await bundleJs();
  const fragment = '<title>Upload Lab</title>\n<style>\n:root{color-scheme:dark}\n' + css + '\n</style>\n' + body + '\n<script>\n' + js + '\n</script>\n';
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<link rel="stylesheet"[^>]*>\n?/, '').replace(/<title>[^<]*<\/title>\n?/, '');
  const page = '<!doctype html>\n<html lang="fr">\n<head>' + head + '</head>\n<body>\n' + fragment + '</body>\n</html>\n';
  fs.mkdirSync(DIST, {recursive: true});
  fs.writeFileSync(path.join(DIST, 'artifact.html'), fragment);
  fs.writeFileSync(path.join(DIST, 'index.html'), page);
  console.log('build : dist/artifact.html (' + fragment.length + ' octets), dist/index.html');
})().catch(e=>{ console.error(e); process.exit(1); });
