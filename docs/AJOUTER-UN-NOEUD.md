# Ajouter un noeud ou une source de bonus

Depuis la phase 3, un type de noeud ou une source de bonus est une **entree de donnees**. Aucune autre modification de code n'est necessaire tant que le comportement existe deja (voir « Limites »).

## Ajouter un type de noeud

1. Ouvrir `src/data/nodes.js` et ajouter une entree dans `DEFS`. L'ordre des entrees est l'ordre de la boutique.

   ```js
   filter: {
     name:'Filtre', label:'FLT', color:'#7dd3fc', desc:'Valeur x1,4, très rapide.',
     kind:'transform', mult:1.4,         // genre et parametres du genre
     ins:1, outs:1, t:0.3,               // entrees, sorties, duree de base en secondes
     cost:3000, unlock:2500,             // prix de base, credits du run pour le debloquer
     icon:'M-9 -7 L9 -7 L2 1 L2 8 L-2 8 L-2 1 Z',   // facultatif : trace SVG dans un carre de -10 a 10
   },
   ```

2. Choisir le genre (`kind`) et ses parametres :

   | Genre | Parametres | Ports | Exemples |
   |---|---|---|---|
   | `producer` | `val` (valeur des fichiers produits) | 0 entree | Source, Super Source |
   | `transform` | `mult` (x valeur, 1 par defaut), `out` | 1 entree | Compresseur, Diviseur, Clonage, Trieur |
   | `combine` | `f` (fonction pure des valeurs d'entree) | 2 entrees ou plus | Fusion : `f:(a,b)=>(a+b)*1.3` |
   | `sink` | `reward` : `'credits'` ou `'research'` | 0 sortie | Upload, Laboratoire |

   Sorties (`out`) : `'next'` (par defaut, alternance entre 2 sorties), `'copy'` (une copie sur chaque sortie), `'threshold'` (seuil reglable : `params:{thr:{def:10, min:1, label:'Seuil'}}`).

3. Champs facultatifs : `needRs` (Reboots necessaires), `icon` (sans trace, le texte `label` sert d'icone), `params` (reglages du noeud : boutons ÷2 / ×2 dans le panneau, valeur gardee dans les schemas).

4. Lancer `npm test`. Une faute de frappe (genre, champ, sortie, recompense) arrete le chargement avec un message explicite, par exemple :
   `Donnees invalides : noeud "filter" : champ inconnu "mutl" (genre transform)`.

Deviennent automatiques : bouton de boutique et deblocage, prix (courbe `cost.node`), ameliorations et paliers, specialisations (Turbo et Econome ; Rendement pour `producer` et l'Upload), maitrise, schemas, sauvegarde, selection par type, succes « types differents ».

Pour un succes ou un objectif sur ce noeud : `src/data/progression.js`, mesure `'count:filter'` ou `'bought:filter'`.

## Ajouter une source de bonus

Une source de bonus est un modificateur declare dans l'entree qui le donne : amelioration globale (`GLOBALS`), quantique (`PU`) ou recherche (`TECH`) dans `src/data/upgrades.js`, evenement (`EVT`, `src/data/events.js`), specialisation (`SPECS`).

```js
// dans TECH : +5 % de vitesse des Filtres par niveau
{id:'tflt', name:'Filtres fins', desc:'+5 % de vitesse des Filtres par niveau', base:45, grow:1.9, max:10,
 mods:[{stat:'speed', by:pct(5), when:'type:filter'}]},
```

- `stat` : `speed`, `value`, `revenue`, `seed`, `crit`, `buffer`, `research`, `ocEnd`, `ocCooldown`, `offline`, `cost.node`, `cost.upgrade`, `cost.global`, `cost.quantum`, `cost.tech`.
- `by` : un assistant de `src/data/mods.js` ; il donne aussi le texte affiche (« +5 % ») :
  `pct(k)` facteur 1 + k % par niveau ; `less(k)` facteur 1 - k % ; `addPct(k)` terme k % (chances) ; `plus(k)` terme k ; `flat(x)` facteur fixe ; `flatAdd(x)` terme fixe.
- `when` (facultatif) : `'type:<noeud>'`, `'spec:<specialisation>'`, `'event:<evenement>'`, `'overclock'`. Les conditions `type:` et `spec:` ne sont permises que sur une statistique de noeud (`speed`, `value`, `cost.node`, `cost.upgrade`).
- Le niveau vient de la source : niveau de l'amelioration, 1 pendant un evenement ou pour une specialisation choisie.
- Texte d'effet different de celui de l'assistant : `eff:(niveau, {fmt, startCash})=>'...'`.

## Ou se place un nouveau modificateur : la regle des groupes

Chaque statistique applique ses modificateurs de gauche a droite, dans l'ordre fige de `src/data/stats.js`. Cet ordre historique reproduit au bit pres les formules d'avant la phase 3 : **on ne le modifie pas**.

Un nouveau modificateur se place dans un **groupe**, un emplacement nomme a position fixe dans chaque statistique :

| Groupe | Pour | Par defaut pour |
|---|---|---|
| `node` | bonus propres a un noeud | specialisations |
| `upgrade` | bonus permanents | ameliorations globales, quantiques, recherche |
| `temporary` | bonus temporaires | evenements |

Le groupe par defaut suffit presque toujours ; `group:'node'` dans le modificateur le change. Dans un groupe, les modificateurs s'appliquent dans l'ordre d'enregistrement (ordre des fichiers de donnees). Groupe inconnu, ou absent de la statistique visee : erreur explicite.

## Limites

- Un **comportement nouveau** (ni produire, ni transformer, ni combiner, ni consommer) demande un genre de plus dans `src/core/kinds.js`, et lui seul.
- Une **statistique nouvelle** (ex. une duree de contrat) demande une ligne dans `src/data/stats.js` et l'appel `stat('nom')` la ou elle sert.
- Une **mesure nouvelle** pour les succes s'ajoute a `MEASURES` dans `src/core/progression.js`.
- Une fonction dans `src/data/` ne lit que ses arguments (verifie par `npm test`).

## Preuve

Le test `fictif` (`tests/run.cjs`) declare ce Filtre et la technologie « Filtres fins » uniquement dans le test, avec `registerNode` et `registerUpgrade`. Il verifie le deblocage, l'achat, la valeur x1,4, la maitrise, les ameliorations, la specialisation, le bonus limite aux Filtres, l'onglet Recherche, le panneau, l'icone, le schema, la sauvegarde puis le rechargement. Le test `validation` verifie qu'une faute de frappe (`when:'type:filtre'`, statistique, operation, groupe, genre, champ, sortie, recompense, mesure) donne une erreur explicite sans laisser de trace.
