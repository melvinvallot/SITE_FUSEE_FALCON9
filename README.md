# Fusées en 3D : Falcon 9 et Starship

Deux pages en React + TypeScript, reliées par un menu commun :

- **Falcon 9, pièce par pièce** (`index.html`) : la fusée se démonte au fil du défilement.
- **Starship, de la pointe aux moteurs** (`starship.html`) : 25 écrans en 5 chapitres. Vue éclatée,
  coupe des réservoirs, bouclier thermique et plasma de rentrée, 39 moteurs Raptor dont un en gros plan,
  tour de lancement, décollage, séparation à chaud dans la mésosphère (échelle des couches de
  l'atmosphère), retour du propulseur en quatre étapes jusqu'à sa capture par la tour,
  ravitaillement en orbite au-dessus de la Terre, puis arrivée sur Mars.

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
yarn dev       # http://localhost:5173 (Falcon 9) et http://localhost:5173/starship.html
yarn test      # lance les tests (Vitest)
yarn build     # build de production des deux pages dans dist/
```

Si `yarn` n'est pas installé : `npm install -g yarn`.

## Crédits

Cartes de la Terre (`src/starship/assets/earth/`) : [Solar System Scope](https://www.solarsystemscope.com/textures/),
licence CC BY 4.0, d'après les données de la NASA.

## Organisation

- `src/` : page Falcon 9 et code partagé (`lib/`, `hooks/`, `components/ui/` dont `SiteNav`)
- `src/starship/` : page Starship
  - `data/` : contenu des sections, chapitres, images clés, jauge, télémétrie, cotes du modèle
  - `lib/` : logique pure testée (timeline, séquence de vol, télémétrie, progression par section)
  - `components/three/` : scène 3D (pièces, tour, Terre, Mars, effets)
  - `components/ui/` : interface (chapitres, jauge, compteurs, comparaisons, télémétrie)

Pour ajouter un écran à Starship : une entrée dans `src/starship/data/sections.ts` et une image clé au
même index dans `src/starship/data/keyframes.ts`.
