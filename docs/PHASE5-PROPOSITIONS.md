# Phase 5, etape 1 : propositions de contenu

Choix de l'utilisateur (lot 1, implemente) : N1, N3, E1, E3, poids des evenements, texte de Negociation. Reportes : N2 (prochain lot probable), N4, N5, E2.
Valeurs non precisees ci-dessous et choisies a l'implementation : Concentrateur prix 4 000 ; Serveur cloud prix 200 000 ; poids 1 pour chaque evenement, intervalle divise par la somme des poids (frequence par heure des 4 anciens inchangee).

Progression actuelle (deblocage par credits gagnes dans le run) : Source, Upload, Compresseur (0), Diviseur (20), Fusion (100), Chiffreur (200), Amplificateur (400), Clonage (600), Trieur (800), Analyseur IA (1 500), Laboratoire (2 000), Super Source (4 000), Quantique (25 000), Singularite (1 M, 3 Reboots), Reseau neuronal (4e7, 5 Reboots), Dimension (2e9, 8 Reboots), Omega (1e11, 11 Reboots).

Constat : apres l'Analyseur IA, presque tous les nouveaux noeuds sont des multiplicateurs plus lents (x10 a x22). Les propositions visent des decisions nouvelles (forme du reseau, placement, risque) plutot qu'un multiplicateur de plus.

## Noeuds

### N1. Concentrateur (deblocage 3 000, entre Laboratoire et Super Source)
- Genre : `combine` existant, 3 entrees, 1 sortie, `f:(a,b,c)=>(a+b+c)*1,4`, duree 1,5 s. Aucun genre nouveau.
- Interet : une Fusion a trois voies ; reseaux plus compacts, utile avec le Clonage et les Super Sources.
- Equilibrage : (a+b+c) x1,4 contre deux Fusions en cascade ((a+b)x1,3 + c)x1,3 = x1,69 sur a et b : moins fort en valeur, mais un seul noeud et une seule attente. Impact faible.
- Cout : faible (une entree de donnees, une icone).

### N2. Recycleur (deblocage 1 000, juste apres le Trieur)
- Genre : `transform` etendu : la valeur depend du fichier. Fichiers sous le seuil x4, au-dessus x1 (seuil reglable comme le Trieur). Demande une petite extension de `core/kinds.js` (un multiplicateur fonction pure de la valeur et du seuil, comme `f` pour `combine`).
- Interet : donne un vrai role au Trieur (petits fichiers vers le Recycleur, gros vers le Chiffreur) ; recompense les reseaux qui melangent des sources de valeurs differentes.
- Equilibrage : x4 seulement sur les petits fichiers ; en debut de run le gain est comparable a un Chiffreur (x3) un peu plus fort. A plafonner par le seuil par defaut (10). Impact moyen en debut de run, nul en fin de partie.
- Cout : moyen (extension du genre, test de caracterisation, panneau du seuil deja existant).

### N3. Serveur cloud (deblocage 150 000 apres 1 Reboot, entre Quantique et Singularite)
- Genre : `sink` existant, recompense `credits`, 5 entrees, duree 0,3 s (Upload : 3 entrees, 0,6 s).
- Interet : l'Upload devient le goulot des grands reseaux ; le Serveur cloud permet de construire plus large. Comble aussi le vide entre Quantique (25 000) et Singularite (1 M, 3 Reboots) au premier run.
- Equilibrage : ne multiplie pas la valeur, retire seulement un goulot. Debit en hausse surtout pour les reseaux de plus de 15 noeuds. Specialisation Rendement : a etendre aux puits de credits (aujourd'hui « sources et Upload »), une ligne. Impact moyen, a mesurer au bot.
- Cout : faible.

### N4. Relais de fibre (deblocage 50 000, 1 Reboot)
- Genre : nouveau genre `support` (aucune entree ni sortie). +15 % de vitesse aux noeuds dont le centre est a moins d'une case (rayon environ 1,5 noeud), non cumulable entre relais.
- Interet : premier noeud ou le placement compte ; decision nouvelle (dense contre etale), sans fil a tracer.
- Equilibrage : +15 % sur les voisins seulement ; non cumulable pour eviter l'empilement. Impact moyen.
- Cout : eleve. Genre nouveau, condition de modificateur nouvelle (`near:relay`), voisinage a recalculer seulement quand un noeud bouge (sinon cout de `step` a 600 noeuds), dessin du rayon. Compatible avec l'invariant du cache par pas (les positions ne changent pas pendant un pas).

### N5. Pari quantique (deblocage 5e6, 3 Reboots)
- Genre : nouveau genre `gamble` (transform aleatoire) : 20 % de chances x8, sinon x0,75 (esperance x2,2), rapide (0,5 s).
- Interet : du risque et de l'excitation (texte flottant « x8 ») ; se combine avec le Trieur (envoyer les gains au Quantique, les pertes a l'Upload).
- Equilibrage : esperance x2,2, inferieure a l'Analyseur IA (x5) mais tres rapide ; variance forte sur les contrats (seuil +25 % en 90 s). Impact moyen ; le bot devra utiliser un hasard seede.
- Cout : moyen (genre de quelques lignes, tests avec hasard seede deja en place).

## Evenements reseau

Remarque d'equilibrage commune : un evenement est tire uniformement parmi la liste. Passer de 4 a 7 evenements reduit la frequence du Pic de trafic (revenus x2) de 25 % a 14 % des tirages. Proposition : un poids par evenement (`weight`, 1 par defaut), pour garder la frequence actuelle des 4 evenements existants. Cout faible.

### E1. Maintenance programmee (30 s)
- Effet : vitesse x0,7 et ameliorations de noeuds -50 % (`speed` flat 0,7, `cost.upgrade` flat 0,5).
- Interet : un choix (acheter maintenant des niveaux a moitie prix pendant que la production ralentit).
- Equilibrage : -30 % de production pendant 30 s, compense par la remise si le joueur agit. Neutre en moyenne pour un joueur actif, legerement negatif pour un joueur absent.
- Cout : faible (donnees seulement).

### E2. Conference scientifique (45 s)
- Effet : points de recherche x3 (`research` flat 3).
- Interet : donne de la valeur au Laboratoire, souvent neglige.
- Equilibrage : faible ; seulement si un Laboratoire existe. Demande un champ de condition de tirage (`need:'count:lab'`, mesure deja existante), sinon l'evenement serait inutile en debut de partie.
- Cout : faible a moyen (donnees + condition de tirage).

### E3. Serveurs chanceux (30 s)
- Effet : +15 % de chance d'upload critique (x5) (`crit` addPct 15).
- Interet : moment fort visible (beaucoup de textes oranges), sans nouvelle regle.
- Equilibrage : +15 % de critiques x5 = +60 % de revenus en moyenne pendant 30 s (moins que le Pic de trafic x2). Faible.
- Cout : faible (donnees seulement).

## Texte de Negociation

- Actuel : description « 5 % sur le prix des noeuds », effet « 10 % » (sans signe).
- Proposition : description « -5 % sur le prix des noeuds par niveau » (meme forme que « Economies d'echelle »), effet derive de l'assistant `less(5)` (suppression de `eff`) : « -10 % ».
- Interet : clarte ; equilibrage : aucun. Cout : faible (une ligne ; instantanes de texte a regenerer, changement voulu).
