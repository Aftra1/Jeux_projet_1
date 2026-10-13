# Upload Lab : contexte du projet

Ce fichier se suffit a lui-meme : il est relu au debut de chaque session et copie a un assistant qui n'a pas acces au depot.

## Le projet

- Upload Lab : jeu incremental (gestion, chaine de production) ou l'on relie des noeuds (Source -> Compresseur -> ... -> Upload) sur un canvas pour gagner des credits. Interface en francais, sans emoji.
- Publie comme Artifact claude.ai (page privee, URL fixe) : un seul fichier HTML qui contient CSS et JS.
- Depot GitHub `aftra1/jeux_projet_1`, branche de travail `claude/jeu-upload-lab-dnrod3`. Pas de pull request sans demande explicite.

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
- Playwright : `/opt/pw-browsers/chromium` (ou variable `PW_CHROMIUM`), module trouve via `npm root -g`.
- Build actuel de l'Artifact : script Python local hors depot qui concatene `index.html` + `style.css` + `game.js` en un fichier. Remplace par un build esbuild dans le depot en phase 1.

## Decisions prises

- Pas de mode competitif, sous aucune forme (ni classement, ni defi entre amis), pas de serveur. Simulation deterministe abandonnee.
- Objectifs : ajouter progressivement des noeuds et des evenements ; bonne tenue sur mobile.
- Un seul fichier final pour l'Artifact, produit par esbuild.
- Aucun changement de gameplay ou d'equilibrage sans accord explicite.
- Un commit par etape, message clair. Chiffres avant/apres pour chaque optimisation de performance.
- Tests d'abord : figer le comportement avant de modifier, verifier les tests par des regressions volontaires.
- Phase 1 puis phase 3, point d'arret obligatoire apres la phase 1 (attendre la validation).
- Phase 1 : decoupage presente et valide avant de commencer.
- Publication de l'Artifact : regle a choisir (voir questions ouvertes). En attendant : aucune publication sans accord.
- Mettre ce fichier a jour a la fin de chaque etape.

## Etat de la feuille de route

- Phase 0, filet de securite : terminee (tests, sauvegarde robuste, gains de performance, code mort retire).
- Phase 1, modules + build esbuild : decoupage propose, en attente d'accord.
- Phase 2 : n'existe plus (retiree avec le mode competitif).
- Phase 3, registre de noeuds et statistiques par modificateurs (ajouter un noeud = ajouter une entree de donnees) : apres validation de la phase 1.
- Phase 4, performance du rendu (cache de sprites, couches) : plus tard ; le budget mobile est deja tenu.
- Phase 5, contenu : nouveaux noeuds et evenements en donnees, separation des textes.

Performance actuelle (rendu logiciel, mobile simule CPU 4x, 300 noeuds) : draw 2,6 a 8,6 ms selon la vue (budget 16 ms), step 0,06 ms.

## Questions ouvertes

1. Regle de publication de l'Artifact : A) jamais sans « ok publie » (liste des changements visibles fournie avant) ; B) republication a la fin de chaque phase validee par les tests, jamais en cours de phase.
2. Retour de test de la version 46 (rien a signaler, ou problemes constates).
3. Validation du decoupage en modules de la phase 1.
4. Plus tard : equilibrage des contrats en fin de partie (le seuil +25 % de debit en 90 s devient difficile quand les ameliorations sont rares) ; a simuler avant toute decision.

## Journal (5 dernieres modifications)

Avant : visuels, style plat, ameliorations de noeuds, equilibrage, mobile, commandes souris (gauche : relier, droit : selectionner, molette : deplacer la vue), format des nombres ; audit et feuille de route ; tests de caracterisation.

1. Sauvegarde robuste : version + migrations, copie de secours, sauvegarde illisible conservee, validation et echappement a l'import.
2. Rendu : seuls les noeuds et liens visibles sont dessines (draw mobile 4x a 300 noeuds : 27,3 -> 2,6 ms, image identique).
3. Index id -> noeud et noeud -> lien (step mobile 4x a 600 noeuds : 1,03 -> 0,21 ms).
4. Densite de pixels plafonnee a 3 et code mort retire (game.js 1728 -> 1670 lignes). Artifact publie en version 46.
5. Mode competitif retire definitivement de la feuille de route ; creation de ce fichier.
