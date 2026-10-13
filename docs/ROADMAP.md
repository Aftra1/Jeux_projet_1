# Feuille de route

## Objectifs retenus

- Ajouter progressivement de nouveaux noeuds et de nouveaux evenements.
- Que le jeu tourne bien sur mobile.
- Un seul fichier final pour l'Artifact, produit par un build esbuild.

## Decisions

- **Pas de serveur** : la phase « simulation deterministe » est abandonnee. Si un mode defi arrive, ce sera un « defi entre amis » non verifie.
- Les « 20+ noeuds, 5 univers, mode competitif » etaient des hypotheses de depart, pas des engagements. La structure doit seulement permettre d'ajouter noeuds et evenements un par un sans toucher au reste.
- Aucun changement de gameplay ou d'equilibrage sans accord explicite.

## Phase 0 : filet de securite (en cours)

1. Tests de caracterisation (`tests/`) : formules, simulation scriptee, sauvegarde. Figent le comportement avant toute modification.
2. Sauvegarde versionnee, migrations, copie de secours avant ecrasement, validation de l'import, echappement des chaines dans le DOM.
3. Gains rapides avec mesure avant/apres (`tools/perf.js`) : visibilite dans `draw`, table id vers noeud, DPR plafonne a 3, suppression du code mort.

## Phase 1 : modules et build esbuild

- Decouper `game.js` en `data/`, `core/` (etat, simulation, economie, sauvegarde), `render/`, `ui/`, `input/`. `core` n'importe ni `ui` ni `render` ; il emet des evenements (`toast`, `float`, `sound`).
- Build esbuild vers un fichier unique pour l'Artifact (remplace `build.py`). Les imports ES natifs ne fonctionnent pas depuis `file://`.
- `tools/bot.js` utilise les vraies formules du jeu au lieu d'une copie.
- JSDoc `@ts-check` sur l'etat et les modules purs.

## Phase 2 : retiree

Simulation deterministe : abandonnee faute de serveur.

## Phase 3 : registre de noeuds et statistiques par modificateurs

- Registre `NodeType` (`init`, `tick`, `send`, `draw`, ports) : ajouter un noeud = ajouter une entree.
- `stat('revenue', contexte)` agrege des modificateurs `{source, add, mul}` declares par chaque systeme (evenements, specialisations, maitrise, succes...) ; detail visible par le joueur.
- Courbe de cout unique parametree ; donnees en JSON pur, formules nommees.
- Evenements decrits en donnees.

## Phase 4 : performance du rendu

Cache de sprites des corps de noeuds et des largeurs de texte, couches statique/dynamique, mini-carte limitee, `layoutUI` seulement sur changement. Peut commencer des la fin de la phase 1. A prioriser avec la phase 3 apres la phase 0.

## Phase 5 : contenu

Nouveaux noeuds et evenements en donnees, separation des textes (i18n), mode defi entre amis non verifie si souhaite.

## Questions ouvertes

- Ordre phase 3 / phase 4.
- Equilibrage des contrats en fin de partie (a simuler avant de toucher aux chiffres).
