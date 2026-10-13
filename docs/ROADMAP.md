# Feuille de route

La numerotation des phases est conservee ; il n'y a plus de phase 2 (simulation deterministe, retiree avec le mode competitif).

## Objectifs retenus

- Ajouter progressivement de nouveaux noeuds et de nouveaux evenements.
- Que le jeu tourne bien sur mobile.
- Un seul fichier final pour l'Artifact, produit par un build esbuild.

## Decisions

- **Pas de mode competitif**, sous aucune forme (ni classement, ni defi entre amis), et pas de serveur. Rien dans le plan n'en depend.
- Les « 20+ noeuds, 5 univers » etaient des hypotheses de depart, pas des engagements. La structure doit seulement permettre d'ajouter noeuds et evenements un par un sans toucher au reste.
- Aucun changement de gameplay ou d'equilibrage sans accord explicite.
- Ordre : phase 1 puis phase 3, avec un point d'arret obligatoire apres la phase 1 (validation avant de continuer).
- Publication du jeu : jamais sans « ok publie » de l'utilisateur, liste des changements visibles fournie avant (CLAUDE.md, lui, est republie librement).

## Phase 0 : filet de securite (terminee)

1. Tests de caracterisation (`tests/`) : formules, simulation scriptee, sauvegarde. Figent le comportement avant toute modification.
2. Sauvegarde versionnee, migrations, copie de secours avant ecrasement, validation de l'import, echappement des chaines dans le DOM.
3. Gains rapides avec mesure avant/apres (`tools/perf.js`) : visibilite dans `draw`, table id vers noeud, DPR plafonne a 3, suppression du code mort.

### Resultats de la phase 0

Mesures de `tools/perf.js` (ms, meilleur de 3, rendu logiciel). « mobile 4x » = 390x844, DPR 2, CPU ralenti 4 fois. « Local » = quelques noeuds a l'ecran sur une grande carte, « centre » = vue partielle au milieu de la carte.

| Config | Noeuds | `draw` local avant -> apres | `draw` centre avant -> apres | `step` avant -> apres |
|---|---|---|---|---|
| bureau | 100 | 2,3 -> 1,2 | 2,2 -> 2,4 | 0,05 -> 0,03 |
| bureau | 300 | 5,9 -> 1,2 | 5,5 -> 3,8 | 0,10 -> 0,06 |
| bureau | 600 | 11,4 -> 1,1 | 11,8 -> 4,0 | 0,32 -> 0,06 |
| mobile 4x | 100 | 10,9 -> 2,5 | 10,9 -> 5,0 | 0,47 -> 0,13 |
| mobile 4x | 300 | 27,3 -> 2,6 | 28,0 -> 6,6 | 0,35 -> 0,06 |
| mobile 4x | 600 | 49,3 -> 2,8 | 51,8 -> 7,3 | 1,22 -> 0,27 |

- Budget « frame <= 16 ms a 300 noeuds en mobile 4x » : atteint sur les trois vues mesurees (2,6 / 6,6 / 8,6 ms ; la vue lointaine, tout visible, n'a pas progresse : 10,0 -> 8,6 ms).
- Densite de pixels plafonnee a 3 : a DPR 6, dessin + rasterisation 47,9 -> 12,5 ms et surface du canvas 36,9 -> 9,2 Mpx.
- Serialisation de la sauvegarde : 1,15 -> 0,59 ms a 600 noeuds (un seul `JSON.stringify`).
- `game.js` : 1728 -> 1670 lignes (code mort retire).
- Limites : charge synthetique (chaines de noeuds), rasterisation logicielle, pas de test sur appareil reel. Les empreintes de rendu garantissent que l'image est identique a celle d'avant.

## Phase 1 : modules et build esbuild (terminee, en attente de validation)

- `src/` : `data/` (4 modules), `core/` (12 modules, sans DOM, chargeable dans Node), `render/` (6), `ui/` (8), `input/` (3), `main.js` (branchements et boucle). Plus gros fichier : `ui/tabs.js`, 196 lignes.
- Le core signale messages, sons, effets et rafraichissements par un bus synchrone ; les achats (globaux, quantiques, recherche, noeuds, specialisation) sont des fonctions du core appelees par l'interface et par le bot.
- Build esbuild (`tools/build.cjs`) : un seul fichier, `dist/artifact.html`. Un pont genere expose sur `window` les 249 noms de premier niveau de la v46 (console, tests, outils).
- `npm test` construit, verifie l'architecture (`tools/check-deps.mjs`) puis teste le fichier builde.
- Equivalence avec la v46 : instantanes regeneres sur le fichier de la v46 puis identiques a chaque commit ; empreintes de rendu identiques ; sauvegarde reelle v46 rechargee sans perte ; 17 clics d'achat identiques ; anciennes batteries identiques.
- Bot d'equilibrage (`tools/bot.mjs`) : dans Node, avec les vraies formules ; 7 h simulees en 9 s.
- Performance : pas de regression mesurable (deux series croisees v46 / phase 1, ecarts dans le bruit d'environ 1 ms). Fichier publie : 129,6 Ko -> 164,8 Ko (pont et exports).

## Phase 3 : registre de noeuds et statistiques par modificateurs

- Registre `NodeType` (`init`, `tick`, `send`, `draw`, ports) : ajouter un noeud = ajouter une entree.
- `stat('revenue', contexte)` agrege des modificateurs `{source, add, mul}` declares par chaque systeme (evenements, specialisations, maitrise, succes...) ; detail visible par le joueur.
- Courbe de cout unique parametree ; donnees en JSON pur, formules nommees.
- Evenements decrits en donnees.

## Phase 4 : performance du rendu

Cache de sprites des corps de noeuds et des largeurs de texte, couches statique/dynamique, mini-carte limitee, `layoutUI` seulement sur changement. Peut commencer des la fin de la phase 1. A prioriser avec la phase 3 apres la phase 0.

## Phase 5 : contenu

Nouveaux noeuds et evenements en donnees, separation des textes (i18n).

## Questions ouvertes

- Ordre phase 3 / phase 4.
- Equilibrage des contrats en fin de partie (a simuler avant de toucher aux chiffres).

## Tests (`npm test`)

`tests/run.cjs` lance le vrai jeu (fichier builde `dist/index.html`) dans Chromium avec un generateur aleatoire seede et une horloge figee, et compare 7 scenarios a `tests/snapshots.json` : formules (formats, couts, vitesses, modificateurs), une chaine par type de noeud (60 s de jeu), une partie complete avec evenements, contrats, succes et reboot, ameliorations, sauvegarde (aller-retour et sauvegarde ancienne `tests/fixtures/legacy-v0.json`), rendu et panneaux. `npm run test:update` regenere les instantanes : uniquement pour un changement de comportement voulu.

`npm run test:render` compare des empreintes de pixels du canvas (`tests/render.json`) sur 12 vues : utile pour toute optimisation de rendu, mais propre a la machine (polices, anticrenelage), donc hors de `npm test`. `node tests/run.js --render --root=<dossier>` permet de l'executer sur une autre copie du depot pour comparer avant/apres.
