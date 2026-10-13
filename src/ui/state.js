// Etat de l'interface partage entre modules : selection, glisser en cours, onglet ouvert, pause, mode tactile.
export let touchMode = false;

export let sel = null, drag = null, hoverPort = null;
export const msel = new Set(); export let selMode = false;
export let paused = false;

// onglet ouvert du panneau lateral, signature de son contenu, vitesse du temps (menu developpeur)
export let tab = null, tabSig = '', devSpeed = 1;
export function setSel(v){ return sel = v; }
export function setTabSig(v){ return tabSig = v; }
export function setTab(v){ return tab = v; }
export function setDevSpeed(v){ return devSpeed = v; }
export function setPaused(v){ return paused = v; }
export function setSelMode(v){ return selMode = v; }
export function setDrag(v){ return drag = v; }
export function setTouchMode(v){ return touchMode = v; }
export function setHoverPort(v){ return hoverPort = v; }
