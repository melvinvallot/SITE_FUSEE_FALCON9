# Fusées en 3D : Falcon 9, Starship et les planètes

Trois pages en React + TypeScript, reliées par un menu commun :

- **Falcon 9, pièce par pièce** (`index.html`) : la fusée se démonte au fil du défilement.
- **Starship, de la pointe aux moteurs** (`starship.html`) : 25 écrans en 5 chapitres. Vue éclatée,
  coupe des réservoirs, bouclier thermique et plasma de rentrée, 39 moteurs Raptor dont un en gros plan,
  tour de lancement, décollage, séparation à chaud dans la mésosphère (échelle des couches de
  l'atmosphère), retour du propulseur en quatre étapes jusqu'à sa capture par la tour,
  ravitaillement en orbite au-dessus de la Terre, puis arrivée sur Mars.
- **Starship vers les planètes** (`planetes.html`) : combien de temps pour aller de la Terre à chaque
  planète. On choisit une destination ; la 3D attend la prochaine fenêtre de tir, suit Starship sur son
  ellipse de transfert puis le met en orbite. Durées estimées par un transfert de Hohmann (orbites
  supposées rondes et dans le même plan), dates calculées à partir du jour de la visite.
  `?planete=mars` ouvre directement un voyage.

### Commandes de la page Starship

- **Flèches du clavier** (ou Page préc./suiv.) : étape précédente ou suivante.
- **Mode vidéo** : démarre seul après 10 secondes sans action ; il s'arrête dès qu'on fait défiler,
  qu'on touche l'écran ou qu'on appuie sur une touche.
- **Lancement** : compte à rebours de 10 secondes avec bips, grondement des moteurs et annonces
  vocales en français (synthèse vocale du navigateur), puis tout le vol jusqu'à la capture.
  Le son se coupe avec le bouton « Son ».
- Options d'adresse : `?auto=0` désactive le mode vidéo automatique, `?fx=0` coupe les effets
  lumineux (utile si l'écran devient noir sur une carte graphique ancienne).

## Démarrer

```bash
yarn install   # installe les dépendances
yarn dev       # http://localhost:5173 (Falcon 9), /starship.html et /planetes.html
yarn test      # lance les tests (Vitest)
yarn build     # build de production des deux pages dans dist/
```

## Tests

Deux familles de tests :

```bash
yarn test       # tests unitaires (Vitest) : calculs, données, composants. Quelques secondes.
yarn test:e2e   # tests dans un vrai navigateur (Playwright) : tout le site, page par page.
yarn test:all   # les deux à la suite
yarn test:e2e:ui  # interface de Playwright pour voir les tests se dérouler
```

La première fois, installez le navigateur des tests : `yarn playwright install chromium`.

`yarn test:e2e` construit le site, le sert sur http://localhost:4173 puis vérifie (dossier `e2e/`) :

- le menu commun (lien de la page en cours, passage d'une page à l'autre entre les trois pages) ;
- chaque section de chaque page (présente, avec son titre, et active quand on y défile) ;
- les boutons : « Démonter le lanceur », échelle de hauteur de Falcon 9, jauge et chapitres de
  Starship, « Revenir au début », liens de fin de page ;
- sur Starship : flèches du clavier, bouton du son, mode vidéo (bouton et démarrage seul après 10 s),
  séquence de lancement avec compte à rebours, touche Échap ;
- sur Planètes : la liste des destinations, la fiche de chaque planète (et l'adresse qui suit),
  « Rejouer le voyage », « Aller à l'arrivée », fermeture de la fiche, encadré « Comment on calcule ? » ;
- que la scène 3D n'est pas noire, qu'il n'y a aucune erreur dans la console, et que les pages
  tiennent dans la largeur d'un téléphone.

Les listes de sections et de planètes viennent des dossiers `data/` du code : un nouvel écran est testé
automatiquement. Sans carte graphique (serveur), la 3D est lente : compter un quart d'heure.
Les tests tournent aussi sur GitHub à chaque pull request (`.github/workflows/tests.yml`).

Si `yarn` n'est pas installé : `npm install -g yarn`.

## Crédits

Cartes de la Terre (`src/starship/assets/earth/`) : [Solar System Scope](https://www.solarsystemscope.com/textures/),
licence CC BY 4.0, d'après les données de la NASA.

## Organisation

- `src/` : page Falcon 9 et code partagé (`lib/`, `hooks/`, `components/ui/` dont `SiteNav`)
- `src/planetes/` : page des voyages vers les planètes (`lib/orbits.ts` : calculs testés, `components/three/` : système solaire en 3D, shaders des planètes)
- `src/starship/` : page Starship
  - `data/` : contenu des sections, chapitres, images clés, jauge, télémétrie, cotes du modèle
  - `lib/` : logique pure testée (timeline, séquence de vol, télémétrie, progression par section)
  - `components/three/` : scène 3D (pièces, tour, Terre, Mars, effets)
  - `components/ui/` : interface (chapitres, jauge, compteurs, comparaisons, télémétrie)

Pour ajouter un écran à Starship : une entrée dans `src/starship/data/sections.ts` et une image clé au
même index dans `src/starship/data/keyframes.ts`.
