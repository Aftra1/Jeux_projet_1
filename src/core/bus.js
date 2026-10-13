// Bus d'evenements synchrone : le coeur du jeu signale messages, sons, effets et rafraichissements ; l'interface s'abonne.
// Bus d'evenements synchrone : le coeur du jeu signale (messages, sons, effets, rafraichissements) sans connaitre l'interface
const handlers = {};
export function on(ev, fn){ (handlers[ev] = handlers[ev] || []).push(fn); }
export function emit(ev, ...args){ const h = handlers[ev]; if(h) for(const f of h) f(...args); }
