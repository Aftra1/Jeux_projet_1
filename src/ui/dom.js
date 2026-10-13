// Acces au DOM : raccourci $, dialogue de confirmation, message bref (toast).
export const $ = id => document.getElementById(id);
export function ask(msg, yes){
  const d=$('dlg'); $('dlgMsg').textContent=msg; d.style.display='flex';
  $('dlgYes').onclick=()=>{ d.style.display='none'; yes(); };
  $('dlgNo').onclick=()=>{ d.style.display='none'; };
}
export function toast(msg,ms=2600){ const t=$('toast'); t.textContent=msg; t.style.opacity=1; clearTimeout(toast.h); toast.h=setTimeout(()=>t.style.opacity=0,ms); }
