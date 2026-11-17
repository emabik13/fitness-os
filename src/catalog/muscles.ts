import type { CatalogMuscle } from './types';

/** Anatomical summaries (standard functional anatomy). */
export const CATALOG_MUSCLES: CatalogMuscle[] = [
  {
    id: 'pectorals',
    description:
      'Pectoral mayor (porciones clavicular y esternocostal) y pectoral menor, en la cara anterior del tórax. El pectoral mayor se inserta en el húmero.',
    function:
      'Aducción horizontal y rotación interna del hombro; la porción clavicular colabora en la flexión del hombro. Principal motor de los empujes horizontales.',
  },
  {
    id: 'lats',
    description:
      'Dorsal ancho: músculo amplio de la espalda que se origina en la columna dorsal baja, lumbar (fascia toracolumbar) y cresta ilíaca, y se inserta en el húmero.',
    function:
      'Extensión, aducción y rotación interna del hombro. Protagonista en dominadas, jalones y remos con el codo pegado al cuerpo.',
  },
  {
    id: 'traps',
    description:
      'Trapecio (fibras superiores, medias e inferiores) y, por función, romboides. Une la base del cráneo y la columna con la escápula y la clavícula.',
    function:
      'Elevación (superiores), retracción (medias) y depresión (inferiores) de la escápula, además de su rotación ascendente al elevar el brazo.',
  },
  {
    id: 'deltoids',
    description: 'Deltoides con tres porciones —anterior, lateral y posterior— que cubren la articulación del hombro.',
    function:
      'Anterior: flexión del hombro; lateral: abducción; posterior: extensión y abducción horizontal. Participa en casi todos los empujes y tracciones del tren superior.',
  },
  {
    id: 'biceps',
    description: 'Bíceps braquial (cabezas larga y corta) junto con el braquial y el braquiorradial, en la cara anterior del brazo.',
    function: 'Flexión del codo y supinación del antebrazo (bíceps). Sinergista en todas las tracciones.',
  },
  {
    id: 'triceps',
    description: 'Tríceps braquial con tres cabezas (larga, lateral y medial) en la cara posterior del brazo. La cabeza larga cruza el hombro.',
    function: 'Extensión del codo; la cabeza larga también extiende el hombro. Sinergista en todos los empujes.',
  },
  {
    id: 'forearms',
    description: 'Flexores y extensores de muñeca y dedos, y braquiorradial, en el antebrazo.',
    function: 'Agarre, flexión y extensión de muñeca; el braquiorradial flexiona el codo en posición neutra.',
  },
  {
    id: 'abdominals',
    description: 'Recto abdominal, oblicuos externo e interno y transverso del abdomen.',
    function:
      'Flexión y rotación del tronco y, sobre todo en el gimnasio, estabilización del tronco frente a la extensión y la rotación al levantar cargas.',
  },
  {
    id: 'quadriceps',
    description: 'Cuádriceps: recto femoral, vasto lateral, vasto medial y vasto intermedio, en la cara anterior del muslo.',
    function: 'Extensión de la rodilla; el recto femoral además flexiona la cadera. Principal motor de sentadillas, prensa y zancadas.',
  },
  {
    id: 'hamstrings',
    description: 'Isquiotibiales: bíceps femoral, semitendinoso y semimembranoso, en la cara posterior del muslo.',
    function: 'Flexión de la rodilla y extensión de la cadera. Muy implicados en el peso muerto rumano y el curl femoral.',
  },
  {
    id: 'glutes',
    description: 'Glúteo mayor, medio y menor, en la región de la cadera.',
    function:
      'Glúteo mayor: extensión y rotación externa de la cadera. Glúteo medio y menor: abducción y estabilización de la pelvis en apoyo unilateral.',
  },
  {
    id: 'calves',
    description: 'Tríceps sural: gastrocnemio (gemelos, cruza la rodilla) y sóleo (bajo el gastrocnemio).',
    function:
      'Flexión plantar del tobillo. El gastrocnemio trabaja más con la rodilla extendida; el sóleo, con la rodilla flexionada.',
  },
];
