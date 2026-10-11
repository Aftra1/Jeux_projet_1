# Upload Lab

Jeu incrémental inspiré d'Upload Labs : construis un réseau de nœuds qui transforme des fichiers, puis uploade-les pour gagner des crédits. Ouvre `index.html` dans un navigateur.

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

`tools/bot.js` et `tools/balance.js` simulent un joueur qui choisit chaque achat au meilleur retour sur investissement (il construit des lignes, les prolonge avec les paliers débloqués, achète les bonus, fait des Reboots). `tools/table.js` résume la sortie en une ligne par Reboot :

    NODE_PATH=$(npm root -g) node tools/balance.js 5 '{"rebootRatio":1.0,"minRun":120}' | node tools/table.js

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
- Souris : clic gauche ou droit glisse sur le vide = selection en zone ; seule la molette (maintenue) deplace la camera. Au doigt, un glissement deplace toujours la vue.

## Visuels (v33)
- Icones vectorielles par type de noeud (noeuds, vue lointaine, boutique), ciel etoile en parallaxe, nebuleuses, vignette.
- Liaisons avec flux anime, paquets avec traine, interface vitree avec degrades.

- Style plat (v34) : fond uni, noeuds sombres a fine bordure, liaisons orthogonales fines, aucune lueur.
