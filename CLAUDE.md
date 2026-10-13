# Upload Lab : contexte du projet

Ce fichier se suffit a lui-meme : il est relu au debut de chaque session et copie a un assistant qui n'a pas acces au depot.

## Le projet

- Upload Lab : jeu incremental (gestion, chaine de production) ou l'on relie des noeuds (Source -> Compresseur -> ... -> Upload) sur un canvas pour gagner des credits. Interface en francais, sans emoji.
- Publie comme Artifact claude.ai (page privee, URL fixe) : un seul fichier HTML qui contient CSS et JS.
- Depot GitHub `aftra1/jeux_projet_1`, branche de travail `claude/jeu-upload-lab-dnrod3`. Pas de pull request sans demande explicite.
- Jeu publie : https://claude.ai/artifact/V5QUMQCPDnLTjdGnSA6c5X (version 46).
- Ce document publie : https://claude.ai/artifact/PXGHM5TAQ9JeCsNnTpSCpE (page privee, republiee au meme lien a chaque mise a jour).

## Architecture (depuis la phase 1)

Modules ES dans `src/`, regroupes par esbuild en un seul fichier.

| Dossier | Contenu |
|---|---|
| `src/data/` | Donnees : noeuds (types, couleurs, paliers, specialisations), ameliorations (globales, quantiques, recherche), schemas, evenements |
| `src/core/` | Logique sans DOM, executable dans Node : `bus` (evenements synchrones), `state` (etat G, noeuds, liens), `economy` (couts, vitesses, revenus), `geometry`, `sim` (simulation), `events` (evenements reseau), `contracts`, `progression` (succes, objectifs), `prestige` (Overclock, Reboot), `actions` (achats, vente, annulation, schemas), `save`, `format` |
| `src/render/` | Canvas : `canvas`, `view` (zoom), `icons`, `effects`, `draw`, `minimap` |
| `src/ui/` | DOM : `state` (selection, onglet, pause), `dom`, `audio`, `hud`, `shop`, `selection`, `tabs`, `gold` |
| `src/input/` | `pointer` (souris, tactile), `keyboard`, `hit` |
| `src/main.js` | Abonnements de l'interface au bus, chargement, sauvegarde automatique, boucle de jeu |

- Regle verifiee par `npm test` : `core` n'importe ni `ui`, ni `render`, ni `input`, n'utilise aucune API de la page et se charge dans Node. Le core signale messages et effets par `emit(...)` ; l'interface s'abonne dans `main.js`.
- Aucun fichier ne depasse 200 lignes (le plus gros : `ui/tabs.js`, 196).
- Pont de compatibilite : le build expose sur `window` chaque nom de premier niveau (comme le script unique de la v46) pour la console, les tests et les outils.
- Autres fichiers : `index.html` (gabarit), `style.css`, `tests/run.cjs` (tests de caracterisation sur le fichier builde, instantanes `tests/snapshots.json`, empreintes `tests/render.json`, sauvegardes `tests/fixtures/`), `tools/` (build, verification d'architecture, perf, bot), `docs/AUDIT.md`, `docs/ROADMAP.md`.

Systemes de jeu : 17 types de noeuds, ameliorations par noeud (paliers, specialisations Turbo / Rendement / Econome), ameliorations globales, Reboot quantique (prestige), recherche (Laboratoire), maitrise, contrats, evenements reseau, objectifs, succes, schemas, Overclock, fichier dore.

Sauvegarde : localStorage, cle `uploadlab2`, format versionne (`ver`, migrations), copie de secours `uploadlab2.bak`, sauvegarde illisible conservee, validation a l'import.

## Commandes

- `npm install` puis `npm run build` : produit `dist/artifact.html` (publie) et `dist/index.html` (jouer en local).
- `npm test` : build, verification d'architecture, 10 scenarios de caracterisation. Doit afficher « tous les tests passent ».
- `npm run test:render` : empreintes de pixels du rendu (propres a la machine). `--root=<dossier>` teste une autre copie.
- `npm run test:update` : regenere les instantanes, uniquement pour un changement de comportement voulu.
- `npm run perf` : tableau de performance (bureau et mobile simule, CPU ralenti 4x).
- `node tools/balance.mjs <heures> '<options JSON>' | node tools/table.cjs` : bot d'equilibrage dans Node (option `seed` pour une execution reproductible).
- `node tools/doc-page.cjs CLAUDE.md <sortie.html>` : page de ce document, republiee au lien ci-dessus.
- Playwright : `/opt/pw-browsers/chromium` (ou `PW_CHROMIUM`), module trouve via `npm root -g`.

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
- Point d'arret obligatoire apres la phase 1 : attendre la validation avant la phase 3.

## Etat de la feuille de route

- Phase 0, filet de securite : terminee.
- Phase 1, modules + build esbuild : terminee, en attente de validation (point d'arret). Aucun changement visible pour les joueurs.
- Phase 2 : n'existe plus.
- Phase 3, registre de noeuds et statistiques par modificateurs (ajouter un noeud = ajouter une entree de donnees) : prochaine, apres validation.
- Phase 4, performance du rendu (cache de sprites, couches) : plus tard ; le budget mobile est deja tenu.
- Phase 5, contenu : nouveaux noeuds et evenements en donnees, separation des textes.

Performance (rendu logiciel, mobile simule CPU 4x, 300 noeuds) : draw 2,6 a 9 ms selon la vue (budget 16 ms), step < 0,3 ms. Phase 1 sans regression mesurable.

## Questions ouvertes

1. Validation de la phase 1 avant de lancer la phase 3.
2. Plus tard : equilibrage des contrats en fin de partie (le seuil +25 % de debit en 90 s devient difficile quand les ameliorations sont rares) ; a simuler avant toute decision.
3. Ecart du bot apres correction (informatif) : 16 Reboots en 7 h au lieu de 17, premiers Reboots ~1 min plus tard. A garder en tete pour de futurs reglages, aucune action demandee.

## Journal (5 dernieres modifications)

Avant : visuels, mobile, commandes souris, sauvegarde robuste, gains de performance (phase 0), CLAUDE.md et decisions (publication option A, decoupage valide).

1. Build esbuild en fichier unique (identique octet pour octet a l'ancien build) ; tests executes sur le fichier builde ; sauvegarde v46 rechargee sans perte (test).
2. Harnais de test stabilise (instabilite latente : la boucle du jeu tournait entre deux scenarios) ; instantanes regeneres sur le fichier de la v46.
3. Decoupage en modules : data, core (bus d'evenements, le coeur ne touche plus a l'interface), render, ui, input ; comportement identique.
4. Achats communs au jeu et au bot ; bot d'equilibrage dans Node avec les vraies formules (corrige : capital de depart applique a tort au run en cours).
5. Verification automatique de l'architecture dans npm test ; documentation a jour.
