import type { PageSection } from '../types';

export const SECTIONS: readonly PageSection[] = [
  {
    id: 'accueil',
    title: 'FALCON 9',
    lead: "Un lanceur de 70 mètres dont le premier étage revient se poser après chaque mission. Faites défiler la page pour le démonter pièce par pièce.",
    align: 'start',
  },
  {
    id: 'anatomie',
    title: 'Six sous-ensembles empilés',
    lead: "De la coiffe aux moteurs, chaque élément a une fonction précise pendant les huit minutes qui séparent le décollage de l'orbite. Voici le lanceur en vue éclatée.",
    align: 'end',
  },
  { id: 'coiffe', title: 'Coiffe', lead: '', align: 'start', partId: 'fairing' },
  { id: 'deuxieme-etage', title: 'Deuxième étage', lead: '', align: 'end', partId: 'secondStage' },
  { id: 'interetage', title: 'Interétage et ailerons', lead: '', align: 'start', partId: 'interstage' },
  { id: 'premier-etage', title: 'Premier étage', lead: '', align: 'end', partId: 'firstStage' },
  { id: 'moteurs', title: 'Octaweb et neuf Merlin', lead: '', align: 'start', partId: 'engines' },
  { id: 'jambes', title: "Jambes d'atterrissage", lead: '', align: 'end', partId: 'legs' },
  {
    id: 'decollage',
    title: 'Allumage',
    lead: "Le lanceur est réassemblé. Les neuf Merlin s'allument, l'ordinateur de bord vérifie leur poussée, puis les bras de maintien libèrent la fusée.",
    align: 'start',
  },
  {
    id: 'en-vol',
    title: 'En route vers l’orbite',
    lead: "Le premier étage se sépare vers 2 min 40, le deuxième étage prend le relais et la coiffe s'ouvre quelques instants plus tard. Vous pouvez remonter pour revoir chaque pièce.",
    align: 'end',
  },
];
