// Transforme CLAUDE.md en page HTML autonome (publiee comme Artifact separe du jeu).
//   node tools/doc-page.cjs CLAUDE.md sortie.html
// La page affiche le document mis en forme et un bouton qui copie le Markdown brut.
const fs = require('fs');
const [,, src = 'CLAUDE.md', out = 'claude-md.html'] = process.argv;
const md = fs.readFileSync(src, 'utf8');

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function inline(t){
  const parts = t.split(/(`[^`]+`)/g);
  return parts.map(p => {
    if(p.startsWith('`') && p.endsWith('`') && p.length>1) return '<code>'+esc(p.slice(1,-1))+'</code>';
    let h = esc(p);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>');
    return h;
  }).join('');
}
function render(src){
  const L = src.replace(/\r/g,'').split('\n'), out = [];
  let i = 0;
  const isTable = k => /^\|.*\|\s*$/.test(L[k]||'') && /^\|[\s:|-]+\|\s*$/.test(L[k+1]||'');
  while(i < L.length){
    const l = L[i];
    if(!l.trim()){ i++; continue; }
    if(l.startsWith('```')){ const buf = []; i++; while(i<L.length && !L[i].startsWith('```')) buf.push(L[i++]); i++; out.push('<div class="scroll"><pre><code>'+esc(buf.join('\n'))+'</code></pre></div>'); continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if(h){ const n = h[1].length; const id = h[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); out.push(`<h${n} id="${id}">${inline(h[2])}</h${n}>`); i++; continue; }
    if(isTable(i)){
      const row = r => r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      const head = row(L[i]); i += 2; const body = [];
      while(i<L.length && /^\|/.test(L[i])) body.push(row(L[i++]));
      out.push('<div class="scroll"><table><thead><tr>'+head.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+body.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
      continue;
    }
    if(/^\s*(-|\d+\.)\s+/.test(l)){
      // listes (deux niveaux : indentation de 2 espaces ou plus)
      const ordered = /^\s*\d+\./.test(l); const items = [];
      while(i<L.length && /^\s*(-|\d+\.)\s+/.test(L[i])){
        const m = L[i].match(/^(\s*)(-|\d+\.)\s+(.*)$/), lvl = m[1].length>=2 ? 1 : 0;
        if(lvl===1 && items.length) (items[items.length-1].sub ||= []).push(m[3]); else items.push({t:m[3]});
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>`+items.map(it=>'<li>'+inline(it.t)+(it.sub?'<ul>'+it.sub.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>':'')+'</li>').join('')+`</${tag}>`);
      continue;
    }
    const buf = [];
    while(i<L.length && L[i].trim() && !/^(#{1,4}\s|```|\s*(-|\d+\.)\s+)/.test(L[i]) && !isTable(i)) buf.push(L[i++]);
    out.push('<p>'+inline(buf.join(' '))+'</p>');
  }
  return out.join('\n');
}

const title = (md.match(/^#\s+(.*)$/m)||[,'Contexte'])[1];
const lines = md.split('\n').length;
const page = `<title>Contexte Upload Lab</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Mise en page : colonne de lecture unique, barre d'action collante en haut ; reprend la palette du jeu (ardoise, turquoise, or) */
:root{
  --bg:#f3f5f9; --surface:#ffffff; --fg:#1b2333; --muted:#5b6784; --line:#d9dfea; --accent:#0e7f76; --gold:#9a6b00; --code:#eef2f8;
  --body:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono:"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#1a2131; --surface:#141a2a; --fg:#e6ecf8; --muted:#8f9bbb; --line:#2c3650; --accent:#4fd1c5; --gold:#f6c453; --code:#202a40; color-scheme:dark } }
:root[data-theme="dark"]{ --bg:#1a2131; --surface:#141a2a; --fg:#e6ecf8; --muted:#8f9bbb; --line:#2c3650; --accent:#4fd1c5; --gold:#f6c453; --code:#202a40; color-scheme:dark }
body{ background:var(--bg); color:var(--fg); font:16px/1.6 var(--body); }
.wrap{ max-width:46rem; margin:0 auto; padding-inline:16px; padding-block:0 3rem; }
.bar{ position:sticky; top:env(safe-area-inset-top,0px); z-index:2; background:var(--bg); border-bottom:1px solid var(--line); }
.bar .wrap{ display:flex; flex-wrap:wrap; align-items:center; gap:.5rem 1rem; padding-block:.7rem; }
.bar .meta{ flex:1 1 14rem; min-width:0; color:var(--muted); font-size:.85rem; }
.bar .meta b{ color:var(--fg); font-weight:600; }
button{ font:600 .9rem var(--body); border-radius:6px; padding:.5rem .9rem; cursor:pointer; border:1px solid var(--line); background:var(--surface); color:var(--fg); }
button.primary{ background:var(--accent); border-color:var(--accent); color:var(--bg); }
button:focus-visible, a:focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }
.status{ font-size:.85rem; color:var(--accent); min-height:1.2em; }
article{ padding-top:1.5rem; }
h1{ font-size:1.7rem; line-height:1.25; margin:.2rem 0 .6rem; text-wrap:balance; }
h2{ font-size:1.15rem; margin:2.2rem 0 .6rem; padding-top:.2rem; text-wrap:balance; color:var(--fg); border-top:1px solid var(--line); padding-top:1.2rem; }
h3{ font-size:1rem; margin:1.4rem 0 .4rem; }
p, li{ max-width:68ch; }
ul, ol{ padding-left:1.3rem; margin:.4rem 0 .8rem; }
li{ margin:.25rem 0; }
li ul{ margin:.2rem 0; }
a{ color:var(--accent); overflow-wrap:anywhere; }
code{ font:500 .86em var(--mono); background:var(--code); padding:.08em .35em; border-radius:4px; overflow-wrap:anywhere; }
pre{ margin:0; padding:.8rem 1rem; background:var(--code); border-radius:6px; }
pre code{ background:none; padding:0; }
.scroll{ overflow-x:auto; margin:.6rem 0 1rem; }
table{ border-collapse:collapse; font-size:.9rem; min-width:28rem; }
th, td{ text-align:left; vertical-align:top; padding:.45rem .7rem; border-bottom:1px solid var(--line); }
th{ font-size:.75rem; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
td code{ white-space:nowrap; }
#raw{ width:100%; min-height:22rem; box-sizing:border-box; font:.85rem/1.5 var(--mono); color:var(--fg); background:var(--surface); border:1px solid var(--line); border-radius:6px; padding:.8rem; margin-top:1rem; }
@media (prefers-reduced-motion: reduce){ *{ transition:none!important; } }
</style>
<div class="bar"><div class="wrap">
  <div class="meta"><b>CLAUDE.md</b> · ${lines} lignes · à copier tel quel à l'assistant qui n'a pas accès au dépôt</div>
  <button class="primary" id="copy" type="button">Copier le Markdown</button>
  <button id="toggle" type="button" aria-expanded="false">Texte brut</button>
  <div class="status" id="status" role="status" aria-live="polite"></div>
</div></div>
<div class="wrap">
  <textarea id="raw" readonly hidden aria-label="Texte brut de CLAUDE.md"></textarea>
  <article>${render(md)}</article>
</div>
<script>
const RAW = ${JSON.stringify(md).replace(/</g,'\\u003c')};
const raw = document.getElementById('raw'), st = document.getElementById('status'), tg = document.getElementById('toggle');
raw.value = RAW;
function showRaw(on){ raw.hidden = !on; tg.setAttribute('aria-expanded', on); tg.textContent = on ? 'Masquer le texte brut' : 'Texte brut'; }
tg.onclick = () => showRaw(raw.hidden);
document.getElementById('copy').onclick = () => {
  const done = () => { st.textContent = 'Copié dans le presse-papiers'; };
  const fallback = () => { showRaw(true); raw.focus(); raw.select(); st.textContent = 'Texte sélectionné : copie-le avec Ctrl+C (ou Cmd+C)'; };
  try{ navigator.clipboard.writeText(RAW).then(done, fallback); }catch(e){ fallback(); }
};
</script>
`;
fs.writeFileSync(out, page);
console.log('page ecrite :', out, '(' + page.length + ' octets)');
