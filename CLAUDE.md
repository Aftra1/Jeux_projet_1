# Upload Lab : contexte du projet

Ce fichier se suffit a lui-meme : il est relu au debut de chaque session et copie a un assistant qui n'a pas acces au depot.

## Le projet

- Upload Lab : jeu incremental (gestion, chaine de production) ou l'on relie des noeuds (Source -> Compresseur -> ... -> Upload) sur un canvas pour gagner des credits. Interface en francais, sans emoji.
- Publie comme Artifact claude.ai (page privee, URL fixe) : un seul fichier HTML qui contient CSS et JS.
- Depot GitHub `aftra1/jeux_projet_1`, branche de travail `claude/jeu-upload-lab-dnrod3`. Pas de pull request sans demande explicite.
- Jeu publie : https://claude.ai/artifact/V5QUMQCPDnLTjdGnSA6c5X (version 46).
- Ce document publie : https://claude.ai/artifact/PXGHM5TAQ9JeCsNnTpSCpE (page privee, republiee au meme lien a chaque mise a jour).

## Architecture actuelle (avant la phase 1)

| Fichier | Role |
|---|---|
| `index.html` | Squelette DOM (barre du haut, panneaux, boutique, dialogue), charge `style.css` et `game.js` |
| `style.css` | Style plat sombre ; bloc mobile `@media(max-width:700px)` |
| `game.js` | Tout le jeu (~1670 lignes, script classique, etat global `G`) : donnees, economie, simulation, sauvegarde, rendu canvas, interface DOM, entrees souris/tactile |
| `tests/run.js` | Tests de caracterisation : lance le vrai jeu dans Chromium (Playwright), aleatoire seede, horloge figee, compare a `tests/snapshots.json` |
| `tests/render.json` | Empreintes de pixels du canvas sur 12 vues (propres a la machine) |
| `tests/fixtures/legacy-v0.json` | Sauvegarde au format d'avant le versionnage |
| `tools/perf.js` | Mesure step / draw / sauvegarde (bureau et mobile simule, CPU ralenti 4x) |
| `tools/bot.js`, `balance.js`, `table.js` | Bot d'equilibrage (joue au meilleur retour sur investissement). Defaut connu : recopie des formules d'economie au lieu d'utiliser celles du jeu (corrige en phase 1) |
| `docs/AUDIT.md`, `docs/ROADMAP.md` | Audit technique et feuille de route detaillee |

Systemes de jeu : 17 types de noeuds, ameliorations par noeud (paliers Brut a Legende, specialisations Turbo / Rendement / Econome), ameliorations globales, Reboot quantique (prestige, points quantiques), recherche (Laboratoire, points de recherche), maitrise par type, contrats, evenements reseau, objectifs, succes, schemas (groupes de noeuds), Overclock, fichier dore.

Sauvegarde : localStorage, cle `uploadlab2`, format versionne (`ver`, migrations), copie de secours `uploadlab2.bak` (toutes les 5 min, avant reboot et import), sauvegarde illisible conservee (`uploadlab2.unreadable`), validation a l'import.

## Commandes

- `npm test` : tests de caracterisation (8 scenarios). Doit afficher « tous les tests passent ».
- `npm run test:update` : regenere les instantanes. Uniquement pour un changement de comportement voulu et accepte.
- `npm run test:render` : compare les empreintes de pixels du rendu ; a lancer apres toute modification du rendu. `--root=<dossier>` pour tester une autre copie.
- `npm run perf` : tableau de performance.
- `node tools/doc-page.cjs CLAUDE.md <sortie.html>` : page HTML de ce document (rendu + bouton de copie du Markdown), republiee au lien ci-dessus (passer ce lien comme `url` depuis une nouvelle session).
- Playwright : `/opt/pw-browsers/chromium` (ou variable `PW_CHROMIUM`), module trouve via `npm root -g`.
- Build actuel de l'Artifact : script Python local hors depot qui concatene `index.html` + `style.css` + `game.js` en un fichier. Remplace par un build esbuild dans le depot en phase 1.

## Decisions prises

- Pas de mode competitif, sous aucune forme (ni classement, ni defi entre amis), pas de serveur. Simulation deterministe abandonnee.
- Objectifs : ajouter progressivement des noeuds et des evenements ; bonne tenue sur mobile.
- Un seul fichier final pour l'Artifact, produit par esbuild.
- Aucun changement de gameplay ou d'equilibrage sans accord explicite.
- Un commit par etape, message clair. Chiffres avant/apres pour chaque optimisation de performance.
- Tests d'abord : figer le comportement avant de modifier, verifier les tests par des regressions volontaires.
- Phase 1 puis phase 3, point d'arret obligatoire apres la phase 1 (resume, chiffres de perf avant/apres, ecart du bot, puis attendre la validation).
- Publication du jeu (option A) : jamais sans « ok publie » de l'utilisateur, avec la liste des changements visibles pour les joueurs fournie avant.
- Exception : ce document (CLAUDE.md) est republie sans accord, toujours au meme lien, a chaque mise a jour.
- Mettre ce fichier a jour a la fin de chaque etape et le republier ; rappeler a l'utilisateur de le copier a l'autre assistant.
- Bot d'equilibrage : passe sur les vraies formules du core ; ses nouveaux chiffres sont informatifs, aucun changement d'equilibrage sans accord.
- Phase 1 validee : esbuild en dependance de dev, `"type": "module"`, scripts Node existants en `.cjs`. Un fichier qui depasse ~400 lignes pendant le decoupage est signale avec une proposition.

## Etat de la feuille de route

- Phase 0, filet de securite : terminee (tests, sauvegarde robuste, gains de performance, code mort retire).
- Phase 1, modules + build esbuild : en cours. Decoupage valide :
  - `src/data/` : nodes, upgrades, blueprints, events (donnees pures).
  - `src/core/` (sans DOM, executable dans Node) : bus, state, economy, geometry, sim, events (evenements reseau), contracts, progression (succes et objectifs), prestige (Overclock et Reboot), actions, save, format. Regle : core n'importe ni ui, ni render, ni input.
  - `src/render/` : canvas, view, icons, draw, effects, minimap.
  - `src/ui/` : state, dom, audio, hud, shop, selection, tabs, gold. `src/input/` : pointer, keyboard, hit. `src/main.js` : branchements et boucle.
  - Build esbuild vers un fichier unique ; tests executes sur le fichier builde ; sauvegardes v46 chargees sans perte.
- Phase 2 : n'existe plus (retiree avec le mode competitif).
- Phase 3, registre de noeuds et statistiques par modificateurs (ajouter un noeud = ajouter une entree de donnees) : apres validation de la phase 1.
- Phase 4, performance du rendu (cache de sprites, couches) : plus tard ; le budget mobile est deja tenu.
- Phase 5, contenu : nouveaux noeuds et evenements en donnees, separation des textes.

Performance actuelle (rendu logiciel, mobile simule CPU 4x, 300 noeuds) : draw 2,6 a 8,6 ms selon la vue (budget 16 ms), step 0,06 ms.

## Questions ouvertes

1. Plus tard : equilibrage des contrats en fin de partie (le seuil +25 % de debit en 90 s devient difficile quand les ameliorations sont rares) ; a simuler avant toute decision.

## Journal (5 dernieres modifications)

Avant : visuels, style plat, ameliorations de noeuds, equilibrage, mobile, commandes souris (gauche : relier, droit : selectionner, molette : deplacer la vue), format des nombres ; audit et feuille de route ; tests de caracterisation ; sauvegarde robuste (version, migrations, copie de secours, validation).

1. Rendu : seuls les noeuds et liens visibles sont dessines (draw mobile 4x a 300 noeuds : 27,3 -> 2,6 ms, image identique).
2. Index id -> noeud et noeud -> lien (step mobile 4x a 600 noeuds : 1,03 -> 0,21 ms).
3. Densite de pixels plafonnee a 3 et code mort retire (game.js 1728 -> 1670 lignes). Jeu publie en version 46.
4. Mode competitif retire definitivement de la feuille de route ; creation de ce fichier.
5. Decisions : publication option A, decoupage de la phase 1 valide (meta separe en events, contracts, progression, prestige), regle du bot ; ce document publie comme page separee.
