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

## Phase 1 : modules et build esbuild (terminee, validee, publiee en version 47)

- `src/` : `data/` (4 modules), `core/` (12 modules, sans DOM, chargeable dans Node), `render/` (6), `ui/` (8), `input/` (3), `main.js` (branchements et boucle). Plus gros fichier : `ui/tabs.js`, 196 lignes.
- Le core signale messages, sons, effets et rafraichissements par un bus synchrone ; les achats (globaux, quantiques, recherche, noeuds, specialisation) sont des fonctions du core appelees par l'interface et par le bot.
- Build esbuild (`tools/build.cjs`) : un seul fichier, `dist/artifact.html`. Un pont genere expose sur `window` les 249 noms de premier niveau de la v46 (console, tests, outils).
- `npm test` construit, verifie l'architecture (`tools/check-deps.mjs`) puis teste le fichier builde.
- Equivalence avec la v46 : instantanes regeneres sur le fichier de la v46 puis identiques a chaque commit ; empreintes de rendu identiques ; sauvegarde reelle v46 rechargee sans perte ; 17 clics d'achat identiques ; anciennes batteries identiques.
- Bot d'equilibrage (`tools/bot.mjs`) : dans Node, avec les vraies formules ; 7 h simulees en 9 s.
- Performance : pas de regression mesurable (deux series croisees v46 / phase 1, ecarts dans le bruit d'environ 1 ms). Fichier publie : 129,6 Ko -> 164,8 Ko (pont et exports).

## Phase 3 : registre de noeuds et statistiques par modificateurs (terminee, sauf retrait du pont)

But : ajouter un noeud ou une source de bonus = ajouter une entree de donnees. Refonte sans changement de gameplay ni d'equilibrage.

- Conception : `docs/PHASE3-CONCEPTION.md` ; guide : `docs/AJOUTER-UN-NOEUD.md`.
- Statistiques (`core/stats.js`, ordre dans `data/stats.js`) : pli de gauche a droite sur une liste ordonnee ; groupes `@node`, `@upgrade`, `@temporary` pour les futures sources ; une courbe de cout (`price`) avec `BASE` et `GROWTH` a leur place historique.
- Registre (`data/nodes.js`, `core/kinds.js`, `core/registry.js`) : genres `producer`, `transform` (sorties `next`, `copy`, `threshold`), `combine`, `sink` (`credits`, `research`) ; reglages par noeud (`params`).
- Succes et objectifs declaratifs (`data/progression.js`, mesures nommees) ; textes d'effet derives des modificateurs.
- Verification au chargement : genre, champ, statistique, operation, condition, groupe, sortie, recompense ou mesure inconnus = erreur explicite (test `validation`).
- Exactitude : nouveau scenario `exact` (environ 7 000 valeurs et 15 simulations a pleine precision, instantane genere sur la version 47) ; sauvegarde reelle v47 (`save47`). Aucun instantane, aucune empreinte de rendu ni sortie du bot n'a change.
- Preuve : test `fictif`, un noeud Filtre et une technologie declares uniquement dans le test.
- Performance : `step` a 600 noeuds, mobile 4x : 0,2-0,4 ms -> 0,4-0,5 ms (chaines simples) ; 0,6-0,85 ms -> 1,05-1,45 ms (reseau mixte, pire cas, mesure ajoutee a `npm run perf`). Limite fixee : 2 ms. Valeur des facteurs globaux mise en cache pendant un pas (exact : ils ne changent qu'entre deux pas). Rendu : pas d'ecart mesurable.

### Pont de compatibilite : retire de la version publiee (fin de phase 3)

- `dist/artifact.html` et `dist/index.html` : version publiee, sans pont (seul `window.__game` reste expose). `dist/test.html` : version de test avec le pont, utilisee par `tests/run.cjs` et `tools/perf.cjs`.
- Serie « boite noire » (`tests/blackbox.cjs`, dans `npm test`) : partie neuve (achats par la boutique, ameliorations, quantique, recherche, selection au clic droit, specialisations, liaisons tracees a la souris, 10 s de jeu), sauvegardes reelles v46 et v47 rechargees par localStorage puis 30 s de jeu. Horloge et images pilotees, hasard seede. La version publiee doit donner exactement le meme etat, les memes textes et les memes pixels que la version de test, et ne doit exposer aucun nom interne.
- Controles : version publiee de la phase 3 comparee a la vraie version 47 : identique sur les 3 cas ; temoin altere (Compresseur x2,0000001) : detecte sur les 3 cas.
- Taille du fichier publie : 165,2 Ko (version 47, avec pont) -> 168,4 Ko (phase 3, sans pont) ; le pont pesait environ 21 Ko, le code de la phase 3 en ajoute environ 24. Pas de minification (decision).

## Phase 4 : performance du rendu

Cache de sprites des corps de noeuds et des largeurs de texte, couches statique/dynamique, mini-carte limitee, `layoutUI` seulement sur changement. Peut commencer des la fin de la phase 1. A prioriser avec la phase 3 apres la phase 0.

## Phase 5 : contenu

Nouveaux noeuds et evenements en donnees, separation des textes (i18n).

## Questions ouvertes

- Equilibrage des contrats en fin de partie (a simuler avant de toucher aux chiffres).

## Tests (`npm test`)

`tests/run.cjs` lance le vrai jeu (fichier builde `dist/index.html`) dans Chromium avec un generateur aleatoire seede et une horloge figee, et compare 7 scenarios a `tests/snapshots.json` : formules (formats, couts, vitesses, modificateurs), une chaine par type de noeud (60 s de jeu), une partie complete avec evenements, contrats, succes et reboot, ameliorations, sauvegarde (aller-retour et sauvegarde ancienne `tests/fixtures/legacy-v0.json`), rendu et panneaux. `npm run test:update` regenere les instantanes : uniquement pour un changement de comportement voulu.

`npm run test:render` compare des empreintes de pixels du canvas (`tests/render.json`) sur 12 vues : utile pour toute optimisation de rendu, mais propre a la machine (polices, anticrenelage), donc hors de `npm test`. `node tests/run.js --render --root=<dossier>` permet de l'executer sur une autre copie du depot pour comparer avant/apres.
