# Upload Lab : contexte du projet

Ce fichier se suffit a lui-meme : il est relu au debut de chaque session et copie a un assistant qui n'a pas acces au depot.

## Le projet

- Upload Lab : jeu incremental (gestion, chaine de production) ou l'on relie des noeuds (Source -> Compresseur -> ... -> Upload) sur un canvas pour gagner des credits. Interface en francais, sans emoji.
- Publie comme Artifact claude.ai (page privee, URL fixe) : un seul fichier HTML qui contient CSS et JS (version 49) ; version en plusieurs fichiers prete (`dist/multi/`), publication en attente de « ok publie ».
- Depot GitHub `aftra1/jeux_projet_1`, branche de travail : celle indiquee par la session (phase 5 lot 1 : `ccr-3d0f0ff4-dye37q`, partie de `claude/phase3-publish-phase5-proposals-cc7rpd`). Pas de pull request sans demande explicite.
- Jeu publie : https://claude.ai/artifact/V5QUMQCPDnLTjdGnSA6c5X (version 49, phase 5 lot 1, fichier unique, sans pont ; publiee le 2026-10-14).
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
- Cache par pas : pendant `step`, niveaux d'ameliorations, succes, points quantiques, Overclock et evenement ne changent pas (valeurs globales calculees une fois par pas). Verifie dans la version de test (`__TEST__`, erreur explicite) ; contournement documente dans `docs/AJOUTER-UN-NOEUD.md`.
- Aucun fichier ne depasse 200 lignes (le plus gros : `ui/tabs.js`, 196).
- Build : `dist/artifact.html` et `dist/index.html` = version publiee, sans pont (seul `window.__game`). `dist/test.html` = version de test avec le pont (chaque nom de premier niveau sur `window`), pour les tests et l'outil de perf. `dist/multi/` = version publiee en plusieurs fichiers : `artifact.html` (page : balisage et CSS, 19 Ko), `game.js` (script, 153 Ko), `index.html` (jeu local).
- Autres fichiers : `index.html` (gabarit), `style.css`, `tests/run.cjs` (tests de caracterisation sur le fichier builde, instantanes `tests/snapshots.json`, empreintes `tests/render.json`, sauvegardes `tests/fixtures/`), `tools/` (build, verification d'architecture, perf, bot), `tests/blackbox.cjs` (version publiee contre version de test), `docs/AUDIT.md`, `docs/ROADMAP.md`, `docs/PHASE3-CONCEPTION.md`, `docs/AJOUTER-UN-NOEUD.md`, `docs/PHASE5-PROPOSITIONS.md`.

Systemes de jeu : 20 types de noeuds (dont Concentrateur, Serveur cloud et Recycleur, phase 5), ameliorations par noeud (paliers, specialisations Turbo / Rendement / Econome), ameliorations globales, Reboot quantique (prestige), recherche (Laboratoire), maitrise, contrats, 7 evenements reseau (tirage pondere, champ `weight` ; condition de tirage `need`, ex. Conference scientifique seulement avec un Laboratoire), objectifs, succes, schemas, Overclock, fichier dore.

Sauvegarde : localStorage, cle `uploadlab2`, format versionne (`ver`, migrations), copie de secours `uploadlab2.bak`, sauvegarde illisible conservee, validation a l'import.

## Commandes

- `npm install` puis `npm run build` : produit `dist/artifact.html` (publie), `dist/index.html` (jouer en local) et `dist/test.html` (tests).
- `npm test` : build, verification d'architecture, 17 scenarios de caracterisation (dont `exact` a pleine precision, `save46`, `save47`, `validation`, `fictif`, `lot2`), puis serie boite noire (3 cas, sur la version en un seul fichier et sur la version en plusieurs fichiers ; horloge et date figees, independante du jour reel). Doit afficher « tous les tests passent » puis « versions publiees (un seul fichier, plusieurs fichiers) identiques a la version de test ».
- `npm run test:render` : empreintes de pixels du rendu (propres a la machine). `--root=<dossier>` teste une autre copie.
- `npm run test:update` : regenere les instantanes, uniquement pour un changement de comportement voulu.
- `npm run perf` : tableau de performance (bureau et mobile simule, CPU ralenti 4x), dont le pire cas `mixte` (600 noeuds, tous genres et bonus actifs).
- `node tools/balance.mjs <heures> '<options JSON>' | node tools/table.cjs` : bot d'equilibrage dans Node (option `seed` pour une execution reproductible). Option `strat` : `lignes` (par defaut, `tools/bot.mjs`, lignes independantes) ou `reseau` (`tools/bot-net.mjs` : fusions Fusion / Concentrateur, puits partages Upload / Serveur cloud, Recycleur ; option `exclude` : types non achetes). Sortie `reseau` par Reboot : achats par type, minute du premier achat, part des revenus (`share`), minute ou le Reboot devient possible (`ready`).
- `node tools/doc-page.cjs CLAUDE.md <sortie.html>` : page de ce document, republiee au lien ci-dessus.
- Playwright : `/opt/pw-browsers/chromium` (ou `PW_CHROMIUM`), module trouve via `npm root -g`.

## Decisions prises

- Pas de mode competitif, sous aucune forme (ni classement, ni defi entre amis), pas de serveur. Simulation deterministe abandonnee.
- Objectifs : ajouter progressivement des noeuds et des evenements ; bonne tenue sur mobile.
- Fichier final produit par esbuild. Version 49 publiee en un seul fichier ; prochaine publication prevue en plusieurs fichiers (page + `game.js`, meme lien), apres « ok publie ».
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
- Negociation : texte corrige (phase 5 lot 1) : « -5 % sur le prix des noeuds par niveau », effet « -10 % ».
- Phase 3 validee et publiee (version 48). Phase 4 (rendu) reportee : « plus tard, si besoin ».
- Serie boite noire : `Date` entierement remplace (pas seulement `Date.now`), le test ne depend plus du jour reel ; verifie sur la version 48 et le lot 1, et par regressions volontaires (credits -0,1 %, niveaux de technologie perdus au chargement : detectes).
- Bot d'equilibrage : il utilise les nouveaux noeuds (strategie `reseau`) pour mesurer leur equilibrage. Poids des evenements : 1 (decide).
- Phase 5 lot 2 (choix de l'utilisateur) : N2 Recycleur et E2 Conference scientifique, valeurs de la proposition (Recycleur : prix 1 500, 2 s, x4 sous le seuil, seuil 1 a 10 ; Conference : 45 s, recherche x3, poids 1, seulement avec un Laboratoire).
- Publication du jeu : chaque publication coute environ 95 000 tokens (lecture obligatoire de la version en ligne). On publie rarement : une seule fois en fin de lot de contenu, jamais pour un changement invisible. Ne rien publier pour tester. Piste moins couteuse (plusieurs fichiers : test concluant, pas encore adoptee) : voir « Questions ouvertes », question 2.
- Git : avant une regression volontaire ou toute manipulation risquee, commiter ou faire un `git stash`. Jamais de `git checkout` sur un fichier modifie non commite (restaurer par une modification inverse ou `git stash pop`).
- Phase 5 lot 1 (choix de l'utilisateur) : N1 Concentrateur, N3 Serveur cloud, E1 Maintenance programmee, E3 Serveurs chanceux, poids des evenements (frequence par heure des 4 existants inchangee), texte de Negociation. Reportes : N2 Recycleur (prochain lot probable), N4, N5, E2. Changements d'equilibrage voulus ; seuil d'arret : premiers Reboots plus de 30 % plus rapides au bot.
- Economie de tokens (budget limite) : sorties de commandes courtes (echecs et resume seulement) ; lire seulement les parties de fichiers necessaires ; tests cibles pendant le travail, batteries completes en fin de phase ; une seule serie de mesures de perf, sauf ecart au-dela du bruit ; une nouvelle session par phase (CLAUDE.md suffit a reprendre). La rigueur reste prioritaire : economiser sur le bruit, jamais sur les verifications.
- Format des reponses : pendant le travail, aucune narration. En fin de phase ou a un arret, un rapport dans ce format exact :
  ETAT : termine / arret d'urgence (raison) ; COMMITS : liste courte ; TESTS : npm test vert ? ecarts ? sauvegardes OK ? ; PERF : avant/apres, lignes utiles seulement ; INCIDENTS : problemes, cause, correction (phrases completes, non compressees) ; DECISIONS ATTENDUES : questions numerotees, avec recommandation ; CONSOMMATION : chiffre /usage de la phase ; CLAUDE.MD : a jour et republie (oui/non). Bref partout, sauf INCIDENTS et DECISIONS ATTENDUES.

## Etat de la feuille de route

- Phase 0, filet de securite : terminee.
- Phase 1, modules + build esbuild : terminee, publiee (version 47).
- Phase 2 : n'existe plus.
- Phase 3, registre de noeuds et statistiques par modificateurs : terminee, validee, publiee (version 48, sans pont).
- Phase 4, performance du rendu : plus tard, si besoin (budget mobile tenu).
- Phase 5, contenu : propositions (`docs/PHASE5-PROPOSITIONS.md`) ; lot 1 publie (version 49, fichier unique, 2026-10-14) ; lot 2 implemente, en attente de « ok publie » (publication prevue en plusieurs fichiers). Reportes : N4, N5.

Performance (rendu logiciel, mobile simule CPU 4x) : draw 1,7 a 6,6 ms selon la vue (budget 16 ms). `step` a 600 noeuds : 0,37 ms (chaines simples), 0,8 ms (pire cas mixte ; inchange par le lot 2) ; limite 2 ms. Fichier publie : 172,2 Ko (un seul fichier) ou page 19,1 Ko + `game.js` 153,1 Ko.

## Questions ouvertes

1. Lot 2 et premiere publication en plusieurs fichiers : « ok publie » attendu (liste des changements visibles dans le rapport de fin de lot 2). Cout attendu : lecture de la page en ligne (une fois, 165 Ko pour passer du fichier unique a la page) puis, aux publications suivantes, lecture de la petite page (19 Ko) et liste des fichiers seulement.
2. Concentrateur : au bot (strategie `reseau`), plus de 98 % des revenus des le 2e run, et la Fusion n'est plus qu'une etape avant lui (achetee puis vendue a chaque run). Proposition d'ajustement dans le rapport du lot 2 ; aucune valeur changee.
3. Serveur cloud : jamais achete par le bot (les puits ne sont jamais le goulot : les troncs de paliers lents limitent le debit). Proposition dans le rapport du lot 2.
4. Trieur : avec des fichiers de valeur identique dans une branche (cas general du jeu), il n'a pas d'usage avec le Recycleur ; le bot ne l'achete pas. A decider (ex. N5 Pari quantique, qui cree des valeurs differentes).
5. Plus tard : equilibrage des contrats en fin de partie (le seuil +25 % de debit en 90 s devient difficile quand les ameliorations sont rares) ; a simuler avant toute decision.

## Journal (5 dernieres modifications)

Avant : visuels, mobile, commandes souris, sauvegarde robuste, phase 0 (perf), phase 1 (modules, esbuild, bot dans Node), version 47, phase 3 (statistiques par modificateurs, registre de noeuds, preuve par noeud fictif, version 48 sans pont, invariant du cache par pas), phase 5 etape 1 (propositions), lot 1 (Concentrateur, Serveur cloud, Maintenance programmee, Serveurs chanceux, poids des evenements, Negociation ; version 49).

1. Serie boite noire independante du jour reel (`Date` remplace) ; regressions volontaires detectees.
2. Bot : strategie `reseau` (fusions, puits partages, Recycleur), mesures d'achats, de parts de revenus et de minute de Reboot possible ; ancienne strategie inchangee.
3. Lot 2 : Recycleur (`transform` avec `multOf`, reglage `max`) et Conference scientifique (condition `need`) ; scenario `lot2`.
4. Build en plusieurs fichiers (`dist/multi/`) ; serie boite noire sur les deux versions publiables.
5. Documentation (`AJOUTER-UN-NOEUD`, `PHASE5-PROPOSITIONS`, ce fichier).
