# Upload Lab : contexte du projet

Ce fichier se suffit a lui-meme : il est relu au debut de chaque session et copie a un assistant qui n'a pas acces au depot.

## Le projet

- Upload Lab : jeu incremental (gestion, chaine de production) ou l'on relie des noeuds (Source -> Compresseur -> ... -> Upload) sur un canvas pour gagner des credits. Interface en francais, sans emoji.
- Publie comme Artifact claude.ai (page privee, URL fixe) : un seul fichier HTML qui contient CSS et JS.
- Depot GitHub `aftra1/jeux_projet_1`, branche de travail `claude/jeu-upload-lab-dnrod3`. Pas de pull request sans demande explicite.
- Jeu publie : https://claude.ai/artifact/V5QUMQCPDnLTjdGnSA6c5X (version 47, phase 1).
- Ce document publie : https://claude.ai/artifact/PXGHM5TAQ9JeCsNnTpSCpE (page privee, republiee au meme lien a chaque mise a jour).

## Architecture (phases 1 et 3)

Modules ES dans `src/`, regroupes par esbuild en un seul fichier.

| Dossier | Contenu |
|---|---|
| `src/data/` | Donnees pures : registre des noeuds (`nodes`), ameliorations (`upgrades`), evenements, succes et objectifs (`progression`), ordre des statistiques (`stats`), assistants de modificateurs (`mods`), schemas |
| `src/core/` | Logique sans DOM, executable dans Node : `bus`, `state` (etat G), `stats` (moteur de statistiques), `kinds` (genres de noeuds), `registry` (verification des donnees, ajout a l'execution), `economy`, `geometry`, `sim`, `events`, `contracts`, `progression` (mesures), `prestige`, `actions`, `save`, `format` |
| `src/render/` | Canvas : `canvas`, `view` (zoom), `icons`, `effects`, `draw`, `minimap` |
| `src/ui/` | DOM : `state` (selection, onglet, pause), `dom`, `audio`, `hud`, `shop`, `selection`, `tabs`, `gold` |
| `src/input/` | `pointer` (souris, tactile), `keyboard`, `hit` |
| `src/main.js` | Abonnements de l'interface au bus, chargement, sauvegarde automatique, boucle de jeu |

- Regles verifiees par `npm test` : `core` n'importe ni `ui`, ni `render`, ni `input`, n'utilise aucune API de la page et se charge dans Node ; `data` n'importe que `data` et ses fonctions ne lisent que leurs arguments. Le core signale messages et effets par `emit(...)` ; l'interface s'abonne dans `main.js`.
- Statistiques : pli de gauche a droite sur une liste ordonnee de modificateurs (`{stat, by:pct(10), when:'type:x'}`), ordre historique fige dans `data/stats.js`, groupes `@node`, `@upgrade`, `@temporary` pour les nouvelles sources. Couts : une courbe `price` (BASE, GROWTH).
- Noeuds : un type = une entree de `data/nodes.js` ; genres `producer`, `transform` (sorties next / copy / threshold), `combine`, `sink` (credits / research). Comportement nouveau = un genre de plus dans `core/kinds.js`. Guide : `docs/AJOUTER-UN-NOEUD.md`.
- Toute donnee inconnue (genre, champ, statistique, operation, condition, groupe, mesure...) = erreur explicite au chargement.
- Aucun fichier ne depasse 200 lignes (le plus gros : `ui/tabs.js`, 196).
- Build : `dist/artifact.html` et `dist/index.html` = version publiee, sans pont (seul `window.__game`). `dist/test.html` = version de test avec le pont (chaque nom de premier niveau sur `window`), pour les tests et l'outil de perf.
- Autres fichiers : `index.html` (gabarit), `style.css`, `tests/run.cjs` (tests de caracterisation sur le fichier builde, instantanes `tests/snapshots.json`, empreintes `tests/render.json`, sauvegardes `tests/fixtures/`), `tools/` (build, verification d'architecture, perf, bot), `tests/blackbox.cjs` (version publiee contre version de test), `docs/AUDIT.md`, `docs/ROADMAP.md`, `docs/PHASE3-CONCEPTION.md`, `docs/AJOUTER-UN-NOEUD.md`.

Systemes de jeu : 17 types de noeuds, ameliorations par noeud (paliers, specialisations Turbo / Rendement / Econome), ameliorations globales, Reboot quantique (prestige), recherche (Laboratoire), maitrise, contrats, evenements reseau, objectifs, succes, schemas, Overclock, fichier dore.

Sauvegarde : localStorage, cle `uploadlab2`, format versionne (`ver`, migrations), copie de secours `uploadlab2.bak`, sauvegarde illisible conservee, validation a l'import.

## Commandes

- `npm install` puis `npm run build` : produit `dist/artifact.html` (publie), `dist/index.html` (jouer en local) et `dist/test.html` (tests).
- `npm test` : build, verification d'architecture, 16 scenarios de caracterisation (dont `exact` a pleine precision, `save46`, `save47`, `validation`, `fictif`), puis serie boite noire (3 cas). Doit afficher « tous les tests passent » puis « version publiee identique a la version de test ».
- `npm run test:render` : empreintes de pixels du rendu (propres a la machine). `--root=<dossier>` teste une autre copie.
- `npm run test:update` : regenere les instantanes, uniquement pour un changement de comportement voulu.
- `npm run perf` : tableau de performance (bureau et mobile simule, CPU ralenti 4x), dont le pire cas `mixte` (600 noeuds, tous genres et bonus actifs).
- `node tools/balance.mjs <heures> '<options JSON>' | node tools/table.cjs` : bot d'equilibrage dans Node (option `seed` pour une execution reproductible).
- `node tools/doc-page.cjs CLAUDE.md <sortie.html>` : page de ce document, republiee au lien ci-dessus.
- Playwright : `/opt/pw-browsers/chromium` (ou `PW_CHROMIUM`), module trouve via `npm root -g`.
- Visual Studio Code : ouvrir le dossier (ou `upload-lab.code-workspace`) ; `.vscode/` fournit les taches (installer, construire, tester, perf, bot) et `F5` pour jouer (Chrome ou Edge). Instructions dans `README.md`.

## Decisions prises

- Pas de mode competitif, sous aucune forme (ni classement, ni defi entre amis), pas de serveur. Simulation deterministe abandonnee.
- Objectifs : ajouter progressivement des noeuds et des evenements ; bonne tenue sur mobile.
- Un seul fichier final pour l'Artifact, produit par esbuild.
- Aucun changement de gameplay ou d'equilibrage sans accord explicite.
- Un commit par etape, message clair, tests verts a chaque commit. Chiffres avant/apres pour la performance.
- Tests d'abord : figer le comportement avant de modifier ; verifier les tests par des regressions volontaires.
- Publication du jeu (option A) : jamais sans « ok publie » de l'utilisateur, avec la liste des changements visibles pour les joueurs fournie avant.
- Exception : ce document est republie sans accord, toujours au meme lien, a chaque mise a jour.
- Mettre ce fichier a jour a la fin de chaque etape et le republier ; rappeler a l'utilisateur de le copier a l'autre assistant.
- Bot d'equilibrage : vraies formules du core ; ses chiffres sont informatifs, aucun changement d'equilibrage sans accord.
- Un fichier qui depasse ~400 lignes est signale avec une proposition de decoupage.
- Phase 1 validee et publiee (version 47).
- Refontes : si un instantane ou une empreinte change, meme d'une fraction infime (virgule flottante), ne PAS regenerer : s'arreter, expliquer l'ecart (valeur, ampleur, cause), proposer une solution. Conserver l'ordre des calculs.
- Limite de performance : `step` sous 2 ms a 600 noeuds en mobile simule 4x ; sinon s'arreter et proposer une solution.
- Statistiques : ordre historique fige ; nouvelles sources dans les groupes. Limite des genres acceptee (comportement nouveau = une fonction dans `core/kinds.js`).
- Pont retire de la version publiee (fin de phase 3), garde dans la version de test ; pas de minification pour l'instant.
- Negociation affiche « 10 % » sans signe : garde tel quel, a corriger plus tard.

## Etat de la feuille de route

- Phase 0, filet de securite : terminee.
- Phase 1, modules + build esbuild : terminee, validee, publiee (version 47).
- Phase 2 : n'existe plus.
- Phase 3, registre de noeuds et statistiques par modificateurs : terminee (6 commits), en attente de validation et de « ok publie » (aucun changement visible pour les joueurs).
- Phase 4, performance du rendu (cache de sprites, couches) : plus tard ; le budget mobile est deja tenu.
- Phase 5, contenu : nouveaux noeuds et evenements en donnees, separation des textes.

Performance (rendu logiciel, mobile simule CPU 4x) : draw 2,4 a 10 ms selon la vue (budget 16 ms), inchange par la phase 3. `step` a 600 noeuds : 0,2-0,4 -> 0,4-0,5 ms (chaines simples), 0,5-0,85 -> 1,05-1,45 ms (pire cas mixte). Fichier publie : 168,4 Ko.

## Questions ouvertes

1. Validation de la phase 3 et « ok publie » (version publiee sans pont ; aucun changement visible pour les joueurs).
2. Plus tard : texte de Negociation (« 10 % » sans signe) a corriger.
3. Plus tard : equilibrage des contrats en fin de partie (le seuil +25 % de debit en 90 s devient difficile quand les ameliorations sont rares) ; a simuler avant toute decision.
4. Ecart du bot apres la phase 1 (informatif) : 16 Reboots en 7 h au lieu de 17. Aucune action demandee.

## Journal (5 dernieres modifications)

Avant : visuels, mobile, commandes souris, sauvegarde robuste, phase 0 (perf), CLAUDE.md, phase 1 (modules, build esbuild, bot dans Node), version 47 publiee, conception de la phase 3.

1. Statistiques par modificateurs : moteur (pli ordonne), courbe de cout unique ; scenario de test `exact` a pleine precision (genere sur la version 47).
2. Succes et objectifs declaratifs, textes d'effet derives, `data/` independant du coeur.
3. Registre de noeuds par genres, verification des donnees au chargement ; test `save47` (vraie sauvegarde v47).
4. Preuve : noeud fictif et technologie ajoutes uniquement dans les tests ; guide `docs/AJOUTER-UN-NOEUD.md`.
5. Performance (facteurs globaux calcules une fois par pas, pire cas dans `npm run perf`) ; puis version publiee sans pont, serie boite noire dans `npm test`.
