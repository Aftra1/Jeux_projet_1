// Assistants pour declarer un modificateur : valeur en fonction du niveau de la source, et texte affiche.
// Fonctions pures (elles ne lisent que leur argument). k/100 donne exactement le meme nombre que le litteral (0.1, 0.25...).
export const pct = k => { const K = k/100; return {op:'mul', f:l=>1 + K*l, text:l=>'+'+l*k+' %'}; };     // facteur 1 + k % par niveau
export const less = k => { const K = k/100; return {op:'mul', f:l=>1 - K*l, text:l=>'-'+l*k+' %'}; };    // facteur 1 - k % par niveau
export const addPct = k => { const K = k/100; return {op:'add', f:l=>K*l, text:l=>'+'+l*k+' %'}; };    // terme k % par niveau (chances, parts)
export const plus = k => ({op:'add', f:l=>k*l, text:l=>(k*l<0?'':'+')+k*l});                          // terme k par niveau
export const flat = x => ({op:'mul', f:()=>x, text:()=>'x'+x});                                      // facteur fixe
export const flatAdd = x => ({op:'add', f:()=>x, text:()=>'+'+x});                                   // terme fixe
