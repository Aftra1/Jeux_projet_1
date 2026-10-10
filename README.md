# Upload Lab

Jeu incrémental inspiré d'Upload Labs : construis un réseau de nœuds qui transforme des fichiers, puis uploade-les pour gagner des crédits. Ouvre `index.html` dans un navigateur.

- Relie les nœuds en glissant d'un port de sortie (rond) vers une entrée. Double-clic / clic droit sur un lien pour le supprimer.
- 11 types de nœuds débloqués progressivement, améliorations par nœud (×1 / ×10 / Max) et globales.
- Reboot quantique (prestige) : points quantiques, bonus permanents, ingénieur automatique.
- 17 succès, fichiers dorés aléatoires, upload critique, gains hors-ligne, sons, zoom/pincement tactile.
- Sauvegarde automatique (localStorage) + export/import de code.

## Équilibrage

`tools/bot.js` et `tools/balance.js` simulent un joueur qui choisit chaque achat au meilleur retour sur investissement :

    NODE_PATH=$(npm root -g) node tools/balance.js 6 '{"rebootRatio":0.5}'

Repères du joueur automatique (idéal, un humain est 2 à 3 fois plus lent) : premier Reboot vers 30 min, 5 Reboots en 2 h, toute la chaîne de nœuds (jusqu'à Oméga) en 4 h environ, puis croissance lente.
Principe : chaque palier de nœud rembourse son prix en 4 min à 3 jours (à revenus x1), un délai qui s'allonge avec le palier. Les bonus permanents le raccourcissent, donc chaque Reboot rend les paliers suivants accessibles.
