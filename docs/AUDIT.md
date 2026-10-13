# Audit technique d'Upload Lab

Etat mesure sur le depot (commit `9dc87f1`). Les chiffres sont reproductibles avec les scripts de `tools/`.

## Inventaire reel

- 3 fichiers : `index.html` (39 lignes), `style.css` (254), `game.js` (1586).
- 17 types de noeuds (`DEFS`).
- 88 fonctions, 104 variables ou constantes globales de premier niveau, 506 references a `G.`, 22 `innerHTML`, 0 bloc JSDoc, 6 `catch(e){}` vides.
- Fonctions les plus longues : `renderTab` (145 lignes), `draw` (~90), `endPointer` (~80), `freeSpot` (~70).

## P0 : risques de perte ou de corruption

1. **Une sauvegarde illisible fait perdre la partie sans prevenir.** `load()` avale toute erreur et renvoie `false`, le jeu lance `newGame()` puis `setInterval(save, 5000)` ecrase l'ancienne sauvegarde. Pas de version de schema, pas de migration, pas de copie de secours.
2. **L'import n'est pas valide.** `hydrate(JSON.parse(...))` accepte des `NaN`, des `Infinity`, des types inattendus. Le nom d'un schema (`G.mine[].name`) est insere dans un `innerHTML` : auto-XSS aujourd'hui, XSS stocke si des sauvegardes ou schemas sont un jour partages.
3. **Economie entierement cote client** (`G.money` modifiable, `Date.now()` dans l'absence et le bonus quotidien, `Math.random()` dans la simulation). Ce ne serait un probleme que pour un mode competitif, retire du plan (voir ROADMAP) : aucune action prevue.

## P1 : architecture

4. **Logique et interface melees.** `contractTick` ecrit dans le DOM, `updateNode` appelle `floatText`, `loop` melange simulation, DOM et rendu. `tools/bot.js` recopie les formules d'economie (`spdM`, `revM`, `critM`) : l'outil d'equilibrage mesure une copie qui peut deriver du jeu.
5. **Etat global mutable.** `G` est reassigne a l'import ; l'etat de jeu (`G`) et l'etat d'interface (`sel`, `drag`, `msel`, `tab`, `floats`, `zoomT`) cohabitent. `fmt()` lit `G.sci`, `serialize()` modifie `G.savedAt`.
6. **Un nouveau noeud oblige a modifier plusieurs fonctions.** `updateNode` est une chaine de `if(n.type===...)` ; les cas speciaux (`sorter`, `clone`, `merge`) sont repartis entre `updateNode`, `trySend` et le rendu.
7. **Multiplicateurs composes a la main** (`revMult`, `vmult`, `speedOf`, `upCost`, `critChance`) : globaux, prestiges, recherche, succes, specialisations, maitrise, evenements. Chaque nouvelle source de bonus modifie plusieurs formules, et le joueur ne peut pas voir le detail.
8. **Donnees melees au code.** `DEFS`, `GLOBALS`, `PU`, `TECH`, `ACH` contiennent des lambdas (`eff:l=>...`) : pas de serialisation, pas de traduction, pas d'outil d'equilibrage. Les couts `base * croissance^niveau` sont repetes (`upCost`, `gUpCost`, `puCost`, `techCost`, `bpCost`, `buyCost`).
9. **Code mort et bricolage.** `G.auto.on=false` execute a chaque frame, `autoPlay` (44 lignes) jamais appele utilement, onglet « auto » de `renderTab` inaccessible. `renderTab` reconstruit tout le panneau et un test de signature concatene des chaines toutes les 0,2 s. `pointerdown` gere 8 modes par drapeaux sans machine a etats.
   - Correction a l'audit initial : les trois `dblclick` du canvas (supprimer un lien, selectionner un type, cadrer la vue) ne sont pas des doublons mais trois actions distinctes eparpillees ; a regrouper, pas a supprimer.
10. **Nommage incoherent** : `money`, `qp`, `rp`, `rpTotal`, `qpTotal`, `lastRate`, `bestRate`, `run`, `lifetime`, `files` ; abreviations `n.tr`, `n.rr`, `inb`, `outq`, `BPS`, `PU`.

## Performance

Mesure avant toute optimisation (`tools/perf.js`, navigateur sans interface, rendu logiciel, zoom 0,6, CPU ralenti 4x pour approcher un mobile) :

| Noeuds | `step()` bureau | `draw()` bureau | `step()` mobile 4x | `draw()` mobile 4x |
|---|---|---|---|---|
| 100 | 0,06 ms | 5,8 ms | 0,36 ms | 11,6 ms |
| 300 | 0,20 ms | 10,4 ms | 0,51 ms | 47,6 ms |
| 600 | 0,24 ms | 11,6 ms | 1,11 ms | 60,9 ms |

- La simulation n'est pas le goulot : `step()` reste sous 1,2 ms a 600 noeuds.
- Le rendu l'est, et son cout croit avec le nombre **total** de noeuds, pas avec le nombre de noeuds visibles : aucun test de visibilite.
- Causes : `nodeById` lineaire appele pour chaque lien et chaque frame ; `G.links.some` par port et par noeud ; `fitTxt` (`measureText` en boucle) ; une dizaine de trace `rrect` par noeud ; `layoutUI()` lit/ecrit le DOM a chaque frame ; mini-carte redessinee entierement a chaque frame ; DPR jusqu'a 8 sur ecran large.
- Pas de « dirty rectangles » : la scene s'anime en permanence (paquets, barres), presque tout est sale a chaque frame. Leviers retenus : visibilite, index, cache de sprites, couches statique/dynamique.

Budgets cibles : frame de rendu <= 16 ms a 300 noeuds en mobile 4x ; `step()` <= 2 ms ; sauvegarde <= 5 ms ; ~0 allocation dans la boucle chaude.

## Typage

JSDoc + `// @ts-check` (`checkJs`) sans etape de compilation : d'abord `GameState`, `Node`, `Link`, `Packet`, `NodeDef`, `Modifier`, puis les modules purs. Pas de migration TypeScript complete avant d'avoir un build.

## Equilibrage (donnees du bot ROI, borne haute du rythme humain)

- Debut de partie : mediane de 5 a 15 s entre deux ameliorations de +10 %, p90 15 a 55 s jusqu'a la 3e heure. La cadence n'est pas plate ; si le debut parait plat, c'est probablement un manque de variete d'objectifs. Seule la telemetrie de vrais joueurs peut trancher.
- Intervalles entre reboots simules : 10, 7, 5, 7, 8, 9, 10, 13, 12, 15, 17, 22, 22, 28, 43, 75 min. Le premier est le plus long ; l'apres-reboot est d'abord plus facile.
- Fin de partie : p90 de 95 a 310 s apres la 3e heure, en partie un artefact du bot qui economise ; risque reel a surveiller.
- Contrats : seuil `1,25 x debit x 90 s`, recompense de 50 % a 94 % du seuil selon la serie, delai de 60 a 100 s. Le seuil depend du debit a l'emission : facile quand le debit croit vite, difficile en fin de partie quand les ameliorations sont rares, avec remise a zero de la serie a l'echec. Hypothese tiree du code, non verifiee par simulation (le bot ne modelise ni contrats, ni evenements, ni maitrise).
