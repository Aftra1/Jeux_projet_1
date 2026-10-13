# Upload Lab

Jeu incrémental inspiré d'Upload Labs : construis un réseau de nœuds qui transforme des fichiers, puis uploade-les pour gagner des crédits. `npm install` puis `npm run build`, et ouvre `dist/index.html` dans un navigateur.

- Relie les nœuds en glissant d'un port de sortie (rond) vers une entrée. Double-clic / clic droit sur un lien pour le supprimer.
- 11 types de nœuds débloqués progressivement, améliorations par nœud (×1 / ×10 / Max) et globales.
- Reboot quantique (prestige) : points quantiques, bonus permanents, ingénieur automatique.
- 19 schémas préconstruits (crédits ou recherche, triés par prix) (bouton Schémas ou touche B), posés et reliés en un clic.
- Pilote automatique : desactive (bouton retire). Remplace par le bouton Tout ameliorer (onglet Ameliorations).
- Maîtrise des nœuds (rangs permanents, +4 % de vitesse par rang) et contrats chronométrés avec série de réussites.
- 17 succès, fichiers dorés aléatoires, upload critique, gains hors-ligne, sons, zoom/pincement tactile.
- Sauvegarde automatique (localStorage) + export/import de code.

## Équilibrage

Objectif de conception : la progression est très rapide au début, puis ralentit de plus en plus, sans jamais se bloquer.

`tools/bot.mjs` et `tools/balance.mjs` simulent un joueur qui choisit chaque achat au meilleur retour sur investissement (il construit des lignes, les prolonge avec les paliers débloqués, achète les bonus, fait des Reboots). `tools/table.cjs` résume la sortie en une ligne par Reboot :

    node tools/balance.mjs 5 '{"rebootRatio":1.0,"minRun":120}' | node tools/table.cjs

Le bot tourne dans Node avec le vrai coeur du jeu (`src/core`) : aucune formule recopiee. Option `"seed"` pour une execution reproductible.

Mécanismes qui donnent cette courbe :

- Premier Reboot dès 30 000 crédits gagnés (7 à 10 min de jeu).
- Les points quantiques deviennent de plus en plus durs à gagner (`qpNeed`) : chaque doublement demande plus de crédits que le précédent.
- Inflation : au-delà de 2 points, les prix des nœuds suivent presque entièrement le bonus quantique (exposant 0,9). Le bonus fait grimper les nombres sans rendre le jeu instantané.
- Les 4 derniers paliers (Singularité, Réseau neuronal, Dimension, Oméga) exigent 3, 5, 8 et 11 Reboots : au plus un nouveau palier par Reboot, au lieu d'une chaîne qui s'effondre d'un coup.
- Objectifs, fichier doré, bonus quotidien et gains hors-ligne sont proportionnels au revenu du moment.

Repères du joueur automatique (idéal, un humain est 2 à 3 fois plus lent) : délai entre Reboots 8, 6, 7, 6, 9, 9, 10, 12, 14, 17, 19, 21, 28, 52 min. Oméga est débloqué après 2 h environ ; ensuite la croissance ralentit nettement (hors règles du bot : un humain construit plus de lignes que lui).

## Equilibrage global (v26)
- Plafonds repousses (Marketing 60, Fibre 45, Capteurs 30, Chanceux 20, techs de revenu/vitesse/format 24, Surcadencage et Amplificateur quantique 16) pour eviter le mur de fin de partie.
- Cout en credits d'un point quantique : 1e5 x g^2,8 (au lieu de g^3), courbe d'intervalles de reboot reguliere (environ 10, 7, 5, 6, 9, 9, 10, 12, 15 ... min en simulation).
- Mobile : barre du haut compacte sur une ligne, bouton de fermeture du panneau, libelles courts.
- 6 nouveaux succes (contrats, maitrise).

## Evenements reseau (v28)
Apres l'objectif 3, un evenement aleatoire survient toutes les 4 a 6 minutes : Pic de trafic (revenus x2, 30 s), Surtension (vitesse x1,5, 30 s), Soldes (prix -30 %, 45 s) ou Don de donnees (credits offerts). Ajouts : meilleur debit et compteurs dans les stats, format des nombres scientifique en option, 5 nouveaux succes.

## Confort (v29)
Touche A : tout ameliorer. Onglet Quantique : duree du run et rendement en PQ/min pour choisir le bon moment de reboot. Stats : historique des 6 derniers reboots.

## Schemas personnels (v30)
Selectionne au moins 2 noeuds puis "Enregistrer schema" : le groupe (noeuds et liens) est ajoute a l'onglet Schemas (jusqu'a 20), posable en un clic et supprimable. Sauvegarde incluse.

## Edition (v31)
- Dupliquer une selection (bouton ou touche D) : copie le groupe et ses liens, paye le prix des noeuds.
- Ctrl+Z annule aussi les deplacements (noeud seul ou groupe).
- Les schemas personnels conservent le seuil des Trieurs.

## Confort (v32)
- Espace : pause du jeu (le temps, la production et les evenements sont geles).
- Double-clic sur un noeud : selectionne tous les noeuds du meme type.
- Bouton "Ameliorer la sélection" : depense les credits sur les noeuds selectionnes, les moins chers d'abord.

- Clic molette (bouton du milieu) maintenu : deplace la camera.
- Souris : clic droit = selectionner / deplacer un noeud / selection en zone sur le vide ; clic gauche glisse (depuis un noeud ou un port) = relier ; clic molette maintenu = deplacer la camera. Clic droit sans glisser sur un lien = le supprimer. Au doigt, un glissement deplace toujours la vue et les liens se font depuis les ports.

## Visuels (v33)
- Icones vectorielles par type de noeud (noeuds, vue lointaine, boutique), ciel etoile en parallaxe, nebuleuses, vignette.
- Liaisons avec flux anime, paquets avec traine, interface vitree avec degrades.

- Style plat (v34) : fond uni, noeuds sombres a fine bordure, liaisons orthogonales fines, aucune lueur.

## Amelioration des noeuds (v35)
- Paliers nommes (Brut, Bronze, Argent, Or, Platine, Diamant, Mythique, Legende) tous les 10 niveaux, avec effet et son.
- Apercu avant/apres de la vitesse, barre de palier, bouton Palier.
- Specialisation au niveau 10 : Turbo (vitesse x1,35), Rendement (valeur x1,3), Econome (ameliorations -35 
## Amelioration des noeuds (v35)
- Paliers nommes (Brut, Bronze, Argent, Or, Platine, Diamant, Mythique, Legende) tous les 10 niveaux, avec effet et son.
- Apercu avant/apres de la vitesse, barre de palier, bouton Palier.
- Specialisation au niveau 10 : Turbo (vitesse x1,35), Rendement (valeur x1,3), Econome (ameliorations -35 %). Changement payant (4x le cout).

## Equilibrage v36 (specialisations et cadence des achats)
- Specialisations ajustees : Turbo vitesse x1,25 ; Rendement valeur x1,25 (sources et Upload seulement, pour ne pas se cumuler le long d'une ligne) ; Econome -30 % sur les ameliorations du noeud.
- `tools/bot.js` mesure maintenant la cadence : ecart entre deux hausses de +10 % du revenu theorique (`gaps` : n, mediane, p90, max en secondes) et modelise le Turbo.
- Resultats (7 h simulees, 16 Reboots) : mediane 5 a 15 s a tous les stades ; p90 15 a 55 s jusqu'a la 3e heure, 95 a 310 s ensuite. Les longues attentes de fin de partie viennent du bot qui epargne pour le meilleur retour (par exemple un bonus global a 2,4 Qi) alors que des niveaux de noeuds a retour de 30 a 700 s restent abordables.
- Variantes testees et rejetees : croissance du cout des niveaux 1,5 ou 1,55 (au lieu de 1,6) et palier de vitesse tous les 5 niveaux : pas de gain de cadence, partie plus courte ou plus longue sans benefice.
- Duree : delais entre Reboots 10, 7, 5, 7, 8, 9, 10, 13, 12, 15, 17, 22, 22, 28, 43, 75 min ; Omega vers 2 h, 16 Reboots en 5 h 30.

## Mise en page sans chevauchement (v37)
- `layoutUI()` place chaque frame les panneaux et messages dans l'espace libre : objectif et astuce empiles sous la barre du haut, contrat, message et indicateur de zoom empiles au-dessus de la boutique, centres entre le panneau gauche et le panneau droit. Sur mobile, un seul panneau a la fois et les messages gardent une ligne libre.
- Un noeud ou un groupe depose sur d'autres noeuds est replace sur l'emplacement libre le plus proche (ou revient en place pour un groupe).

## Mobile (v38)
Reserve aux ecrans etroits ou tactiles, l'interface PC est inchangee.
- La partie demarre cadree sur l'ecran (avant, la Source et l'Upload sortaient du cadre sur 390 px).
- Zones de toucher agrandies au doigt (ports, liaisons, badge d'amelioration).
- Double tape : meme type de noeud (ou tout voir sur le vide). Appui long sur un noeud : mode selection ; sur une liaison : suppression.
- Boutons flottants : zoom +, zoom -, vue d'ensemble, annuler, pause. Boutons et boutique plus gros, marges pour les encoches, vibrations legeres.
- Definition de rendu plafonnee a x2 pour economiser la batterie.
- Au doigt (v39) : glisser sur une case deplace la vue ; un appui prolonge (0,4 s) souleve la case, masque le menu d'amelioration et permet de la deplacer (vibration, contour blanc). Un simple toucher ouvre toujours le menu. L'appui prolonge sur une liaison la supprime ; le mode selection reste accessible par le bouton Selection.

## Finitions visuelles (v40)
Meme direction artistique, details soignes : ombre portee plate sous les noeuds et fin liseré haut, textes de noeuds ajustes a leur largeur (plus de debordement), curseur selon la cible (main, croix sur un port, saisie en deplacement), barre d'onglets qui tient en entier, defilement discret avec fondu en bas des panneaux, apparition douce des panneaux et messages, filet colore sur objectif, contrat et messages, anneaux de focus clavier, anticrenelage et chiffres a chasse fixe.

## Sauvegarde (v41)

- Format versionne : champ `ver` (voir `SAVE_VERSION` dans `game.js`). Pour changer le format : incrementer `SAVE_VERSION` et ajouter `MIGRATIONS[n]`.
- Copie de secours (`uploadlab2.bak`) : la sauvegarde precedente, au plus toutes les 5 minutes, avant chaque reboot et avant chaque import. Restaurable depuis Options.
- Une sauvegarde illisible n'est jamais ecrasee en silence : elle est conservee (`uploadlab2.unreadable`, affichable depuis Options) et la copie de secours est restauree si elle est valide. Une sauvegarde d'une version plus recente du jeu est traitee de la meme facon. Une ancienne version est conservee (`uploadlab2.v0`) avant migration.
- Un etat de jeu invalide (valeur non numerique, negative ou infinie) n'ecrase pas la derniere bonne sauvegarde.
- Import : verification de la structure, cles dangereuses ignorees, schemas personnels mal formes retires, message d'erreur explicite. Les noms de schemas sont echappes a l'affichage.
- Tests : `npm test` (voir docs/ROADMAP.md).

## Architecture (phases 1 et 3)

Le jeu est decoupe en modules ES dans `src/`, regroupes par esbuild en un seul fichier (`dist/artifact.html` pour l'Artifact, `dist/index.html` pour jouer en local).

- `src/data/` : donnees pures (registre des noeuds, ameliorations, schemas, evenements, succes et objectifs, statistiques, assistants de modificateurs). N'importe que `data/` ; ses fonctions ne lisent que leurs arguments.
- `src/core/` : logique du jeu, sans DOM, executable dans Node : etat, economie, moteur de statistiques (`stats.js`), genres de noeuds (`kinds.js`), registre et verification des donnees (`registry.js`), simulation, evenements, contrats, progression, prestige, actions, sauvegarde. Il signale messages, sons et effets par un bus d'evenements synchrone (`core/bus.js`).
- `src/render/` : canvas (dessin, vue, icones, effets, mini-carte).
- `src/ui/` : interface DOM (etat d'interface, panneaux, boutique, sons). `src/input/` : souris, tactile, clavier.
- `src/main.js` : branchements et boucle de jeu.
- Regles verifiees par `npm test` : `core` n'importe ni `ui`, ni `render`, ni `input`, et n'utilise aucune API de la page ; `data` n'importe que `data`.
- Ajouter un noeud ou une source de bonus : `docs/AJOUTER-UN-NOEUD.md`.
- Pour garder le comportement de la version 46, chaque nom de premier niveau reste accessible sur `window` (console, tests).

Commandes : `npm run build`, `npm test`, `npm run test:render`, `npm run perf`, `node tools/balance.mjs <heures> '<options>' | node tools/table.cjs`.
