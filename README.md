# Upload Lab

Jeu incrémental inspiré d'Upload Labs : construis un réseau de nœuds qui transforme des fichiers, puis uploade-les pour gagner des crédits. Ouvre `index.html` dans un navigateur.

- Relie les nœuds en glissant d'un port de sortie (rond) vers une entrée. Double-clic / clic droit sur un lien pour le supprimer.
- 11 types de nœuds débloqués progressivement, améliorations par nœud (×1 / ×10 / Max) et globales.
- Reboot quantique (prestige) : points quantiques, bonus permanents, ingénieur automatique.
- 19 schémas préconstruits (crédits ou recherche, triés par prix) (bouton Schémas ou touche B), posés et reliés en un clic.
- 17 succès, fichiers dorés aléatoires, upload critique, gains hors-ligne, sons, zoom/pincement tactile.
- Sauvegarde automatique (localStorage) + export/import de code.

## Équilibrage

Objectif de conception : la progression est très rapide au début, puis ralentit de plus en plus, sans jamais se bloquer.

`tools/bot.js` et `tools/balance.js` simulent un joueur qui choisit chaque achat au meilleur retour sur investissement (il construit des lignes, les prolonge avec les paliers débloqués, achète les bonus, fait des Reboots). `tools/table.js` résume la sortie en une ligne par Reboot :

    NODE_PATH=$(npm root -g) node tools/balance.js 5 '{"rebootRatio":1.0,"minRun":120}' | node tools/table.js

Mécanismes qui donnent cette courbe :

- Premier Reboot dès 30 000 crédits gagnés (7 à 10 min de jeu).
- Les points quantiques deviennent de plus en plus durs à gagner (`qpNeed`) : chaque doublement demande plus de crédits que le précédent.
- Inflation : au-delà de 2 points, les prix des nœuds suivent presque entièrement le bonus quantique (exposant 0,9). Le bonus fait grimper les nombres sans rendre le jeu instantané.
- Les 4 derniers paliers (Singularité, Réseau neuronal, Dimension, Oméga) exigent 3, 5, 8 et 11 Reboots : au plus un nouveau palier par Reboot, au lieu d'une chaîne qui s'effondre d'un coup.
- Objectifs, fichier doré, bonus quotidien et gains hors-ligne sont proportionnels au revenu du moment.

Repères du joueur automatique (idéal, un humain est 2 à 3 fois plus lent) : délai entre Reboots 8, 6, 7, 6, 9, 9, 10, 12, 14, 17, 19, 21, 28, 52 min. Oméga est débloqué après 2 h environ ; ensuite la croissance ralentit nettement (hors règles du bot : un humain construit plus de lignes que lui).
