# Phase 3 : conception (registre de noeuds, statistiques par modificateurs)

Statut : proposition, en attente d'accord. Aucun code ecrit.

Contrainte directrice : resultat identique au bit pres. Tous les choix ci-dessous en decoulent, en particulier l'ordre des multiplications.

## 1. Registre de noeuds

Une entree par type dans `src/data/nodes.js` (le format actuel de `DEFS`, enrichi). Les comportements sont des **genres** (`kind`) definis une seule fois dans `src/core/kinds.js`.

```js
compress: {
  name:'Compresseur', label:'CMP', color:'#63b3ed', desc:'Double la valeur d\'un fichier.',
  kind:'transform', mult:2,          // genre + parametres du genre
  ins:1, outs:1, t:0.8,              // ports et duree de base (s)
  cost:40, unlock:0, needRs:0,       // prix de base, deblocage (credits du run, Reboots)
  icon:'M-9 -4 L-3 0 ...',           // optionnel : trace SVG ; sinon icone dessinee existante ou pastille texte
}
```

Champs : `name`, `label` (texte court, ex-`icon`), `color` (ex-`COLORS`), `desc`, `kind`, parametres du genre, `ins`, `outs`, `t`, `cost`, `unlock`, `needRs`, `icon`, `params` (reglages par noeud, voir le Trieur).

Un genre fournit des fonctions appelees par la simulation, l'interface et le rendu :

| Fonction | Role | Par defaut |
|---|---|---|
| `init(n)` | etat propre au noeud a la creation | rien |
| `take(n, def)` | prend les entrees et demarre un travail `{v, rem}` | une entree, `v * mult` |
| `finish(n, v, def)` | fin du travail : sorties ou gain | une sortie `{v, o:-1}` |
| `route` | `'alternate'` (alternance sur 2 sorties), `'tagged'` (sortie imposee par le fichier) | `'alternate'` |
| `fallback` | sortie imposee absente : `'other'` (bascule) ou `'drop'` (fichier perdu) | `'drop'` |
| `info(n, api)` | ligne de texte du panneau de selection | « x s par fichier » |
| `specs` | specialisations proposees | `['spd','eco']` |
| `producer` | barre de progression sur le minuteur, pas d'entree | non |

Pas de `draw` par genre : le dessin d'un noeud est deja generique (cadre, couleur, icone, ports, progression). Un crochet `drawExtra` pourra etre ajoute le jour ou un noeud en aura besoin.

### Les cas existants dans les genres

| Noeuds | Genre | Particularites conservees a l'identique |
|---|---|---|
| Source, Super Source | `producer` (`val`) | file de sortie limitee a 2, minuteur, `seedV * vmult` ; specialisation Rendement |
| Compresseur, Chiffreur, Amplificateur, IA, Quantique, Singularite, Reseau neuronal, Dimension, Omega | `transform` (`mult`) | demarre seulement si la file de sortie est vide |
| Diviseur | `transform` (`mult` absent = 1), `outs:2` | alternance `rr` entre les 2 sorties |
| Clonage | `transform`, `finish` = un fichier sur chaque sortie | `route:'tagged'`, `fallback:'drop'` (sortie non branchee : fichier perdu) |
| Trieur | `transform`, `finish` = sortie 0 si `v >= thr`, sinon 1 | `route:'tagged'`, `fallback:'other'`, n'avance pas `rr` ; `params:{thr:{def:10, label:'Seuil', steps:[0.5,2]}}` : boutons « Seuil ÷2 / ×2 » et 4e champ des schemas generes depuis ce parametre (HTML identique) |
| Fusion | `combine` (`f:(a,b)=>(a+b)*1.3`) | attend les 2 entrees, lecture a puis b |
| Upload | `sink` (`reward:'credits'`) | entrees en tourniquet, `revMult * vmult`, tirage du critique au meme moment (meme consommation du hasard) ; specialisation Rendement |
| Laboratoire | `sink` (`reward:'research'`) | entrees en tourniquet, `rpOf(v)` |

Consequence honnete : un noeud qui combine des genres existants est **une entree de donnees**. Un comportement vraiment nouveau demande un genre de plus, c'est-a-dire une fonction dans un seul fichier (`core/kinds.js`), sans toucher a la simulation, au rendu ni a l'interface.

Ce qui devient automatique pour un nouveau type : bouton de boutique et deblocage, prix, ameliorations, paliers, specialisations, maitrise, schemas, sauvegarde (cles par identifiant, types inconnus deja ignores au chargement), succes « types differents », selection par type.

## 2. Statistiques par modificateurs

### Forme d'un modificateur

```js
{ stat:'speed', op:'mul', by: pct(10) }               // facteur 1 + 0.1 * niveau
{ stat:'speed', op:'mul', by: flat(1.5), when:'event:surge' }
{ stat:'crit',  op:'add', by: per(0.03) }             // terme 0.03 * niveau
```

- `stat` : nom de la statistique.
- `op` : `mul` (facteur) ou `add` (terme).
- `by` : valeur en fonction du niveau de la source. Assistants : `pct(k)` = `1 + (k/100)*l`, `less(k)` = `1 - (k/100)*l`, `per(k)` = `k*l`, `flat(x)` = `x`, `pow(b, f)` = `b ** f(l)`. Chacun fournit aussi le texte affiche (« +10 % »).
- `when` (optionnel) : condition nommee (`'event:surge'`, `'overclock'`, `'spec:spd'`, `'type:compress'`).
- Le **niveau** vient de la source : `G.glob[id]`, `G.pu[id]`, `G.tech[id]`, nombre de succes, rang de maitrise, niveau du noeud, 0/1 pour un evenement actif.

Verifie : `k/100` donne exactement le meme nombre que le litteral actuel pour tous les pourcentages du jeu (25, 10, 20, 5, 8, 4, 3, 2, 30).

### Ordre d'application

Une statistique = un **pli de gauche a droite** sur une liste ordonnee de modificateurs, a partir d'une valeur initiale : `acc = initial ; pour chaque modificateur : acc = acc * f` ou `acc = acc + t`. Additions et multiplications sont donc appliquees **dans l'ordre de la liste**, sans regroupement. C'est la seule facon de reproduire exactement l'expression actuelle (ex. `speedOf` entremele facteurs du noeud et facteurs globaux : aucun produit global ne peut etre mis en cache).

L'ordre est declare a un seul endroit, `src/data/stats.js`, par identifiants de modificateurs ; il reprend l'ordre actuel. Un modificateur ajoute plus tard et absent de la liste s'applique a la fin.

| Statistique | Initiale | Ordre (identique a aujourd'hui) |
|---|---|---|
| `speed` (noeud) | 1 | spec Turbo x1,25, niveau `1+0,3l`, palier `1,5^floor(l/10)`, maitrise `1+0,04r`, glob.spd, pu.spd, Overclock x2, tech.tspd, Surtension x1,5 |
| `revenue` | 1 | glob.rev, points quantiques `(1+q)^0,6`, succes `1+0,02n`, pu.rev, tech.trev, Pic de trafic x2 |
| `seed` (valeur des sources) | `def.val` | glob.seed, tech.tseed |
| `value` (noeud) | 1 | spec Rendement x1,25 (sources, Upload) |
| `crit` | 0 | +0,03 glob.crit, +0,02 tech.tcrit |
| `buffer` | 3 | +glob.buf |
| `research` | `0,5 v^0,3` | tech.tlab |
| `ocEnd` | `G.playtime` | +15, +tech.toc |
| `ocCooldown` | 0 | +90, -6 tech.toc, puis plancher 30 |
| `offline` | 0,4 | +0,08 pu.off |

Sources actuelles : globales (rev, spd, seed, buf, crit), quantiques (start, spd, disc, off, rev ; `auto` reste un comportement), recherche (trev, tspd, tseed, tcost, tup, tcrit, toc, tlab), succes, specialisations (Turbo, Rendement, Econome), maitrise, niveau et palier, evenements (Pic de trafic, Surtension, Soldes ; Don de donnees reste une action), Overclock, points quantiques, inflation.

Chaque source declare ses modificateurs **dans sa propre entree** (`mods:[...]` dans `GLOBALS`, `PU`, `TECH`, `EVT`, `SPECS`), les sources systeme (niveau, palier, maitrise, succes, quantique, inflation, Overclock) dans `data/stats.js`.

API : `stat(nom, ctx)` renvoie la valeur ; `statDetail(nom, ctx)` renvoie la liste `[source, valeur]` (pour un futur detail visible par le joueur, non affiche dans cette phase). Les fonctions actuelles (`speedOf`, `revMult`, `critChance`...) restent comme fines enveloppes, pour ne rien changer aux appelants.

Performance : un pli sur 9 modificateurs par appel au lieu d'un produit en ligne ; `speedOf` est appele par noeud a chaque pas et au rendu. Estimation : `step` passe de ~0,1-0,3 ms a moins de 1 ms a 300 noeuds ; sera mesure avant/apres.

## 3. Couts : une courbe parametree

Une seule fonction : `price(courbe, base, grow, n, ctx) = ceil(pli)` ou la courbe est une statistique comme les autres, avec deux emplacements reserves `BASE` et `GROWTH` (`grow^n`) places a leur position actuelle :

| Courbe | Ordre |
|---|---|
| `cost.node` | Soldes x0,7, inflation, echelle 1,5, BASE, `1,28^achetes`, pu.disc `1-0,05l`, tech.tcost `1-0,02l` |
| `cost.upgrade` | Soldes, inflation, echelle 1,5, BASE, x0,8, `1,6^niveau`, tech.tup `1-0,03l`, Econome x0,7, +10 |
| `cost.global` | Soldes, inflation, echelle 1,5, BASE, GROWTH |
| `cost.quantum`, `cost.tech` | BASE, GROWTH |

`Soldes` et `Econome` deviennent des modificateurs ordinaires. Capital de depart : `floor((100 + 150 l^2) * inflation)`, declare dans l'entree `start`.

## 4. Fonctions dans les donnees

- **Conditions** (succes `t`, objectifs `p`) : deviennent declaratives. `{measure:'files', gte:100}` et `{measure:'types', gte:8}` ; objectifs `{measure:'rate', target:200}`. Une quinzaine de mesures nommees dans `core/progression.js` (fichiers, gains totaux, debit, noeuds poses, types differents, niveau max, rangs de maitrise, Reboots, points quantiques, contrats, serie, evenements, fichiers dores, recherche, temps de jeu, noeuds d'un type). Ordre d'evaluation conserve.
- **Textes d'effet** (`eff`) : generes depuis l'assistant du modificateur (`pct(8)` -> « +8 % »). Quatre exceptions gardent un texte explicite, fonction pure du niveau sans acces a l'etat : Capital de depart, Serveurs de nuit, Refroidissement liquide, Ingenieur automatique, plus Negociation dont le texte actuel n'a pas de signe (« 10 % ») : conserve tel quel, a corriger plus tard avec ton accord.
- **Combinaisons** (`f` de la Fusion) : fonction pure de ses arguments, acceptee dans les donnees.
- Regle : une fonction dans `data/` ne lit que ses arguments. `data/` n'importe plus rien de `core/` (aujourd'hui `upgrades.js` importe `fmt` et `startCash` ; les textes recoivent `fmt` en argument).

## 5. Exemple complet : un noeud fictif « Filtre »

```js
// src/data/nodes.js : la seule modification
filter: {
  name:'Filtre', label:'FLT', color:'#7dd3fc', desc:'Valeur x1,4, tres rapide.',
  kind:'transform', mult:1.4,
  ins:1, outs:1, t:0.3,
  cost:3000, unlock:2500,
  icon:'M-9 -7 L9 -7 L2 1 L2 8 L-2 8 L-2 1 Z',
},
```

Et une source de bonus qui ne vise que lui :

```js
// src/data/upgrades.js, dans TECH
{id:'tflt', name:'Filtres fins', desc:'+5 % de vitesse des Filtres par niveau', base:45, grow:1.9, max:10,
 mods:[{stat:'speed', op:'mul', by:pct(5), when:'type:filter'}]},
```

Resultat sans autre modification : bouton dans la boutique apres 2 500 credits, prix et ameliorations, paliers, Turbo / Econome au niveau 10, maitrise, schemas, sauvegarde et rechargement, onglet Recherche avec texte « +5 % ».

Preuve en fin de phase : ce Filtre est declare **uniquement dans les tests** (enregistre a l'execution par le harnais, absent du jeu publie). Le test l'achete, le relie entre une Source et un Upload, verifie la valeur (`x1,4`), l'amelioration, la specialisation, la sauvegarde puis le rechargement, et le bonus de recherche.

## 6. Risques identifies et parades

| Risque | Parade |
|---|---|
| Ordre des facteurs (virgule flottante) | pli de gauche a droite, ordre recopie de l'expression actuelle ; pas de cache de produit partiel |
| `G.playtime + 15 + toc` (association) | pli initialise a `G.playtime` |
| Ordre des cles de `G.pu` dans la sauvegarde (`start, spd, disc, off, auto, rev`, different de l'ordre de `PU`) : les instantanes comparent du JSON | l'objet initial garde son ordre historique, les nouvelles cles s'ajoutent a la fin |
| Consommation du hasard (critique, evenements) | les tirages restent aux memes endroits dans le meme ordre |
| Un instantane change, meme d'un ulp | arret, explication (valeur, ecart, cause), proposition ; pas de regeneration |

## 7. Ordre des commits proposes

1. Moteur de statistiques + `data/stats.js` ; `economy.js` reecrit par-dessus (vitesse, revenus, valeurs, critique, tampon, recherche, couts).
2. Modificateurs declares dans leurs sources (globales, quantiques, recherche, evenements, specialisations) ; succes et objectifs declaratifs ; `data/` n'importe plus `core/`.
3. Registre et genres de noeuds ; `sim.js`, panneau de selection, boutique, rendu, schemas, sauvegarde passent par le registre.
4. Preuve : noeud fictif et bonus fictif dans les tests ; `docs/AJOUTER-UN-NOEUD.md`.
5. Mesures de performance, documentation, CLAUDE.md.
