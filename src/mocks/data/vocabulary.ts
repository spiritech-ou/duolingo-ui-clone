// REVIEW NEEDED: these Estonian words were authored by the team as a fixed list.
// They are UNREVIEWED and must be checked by an Estonian speaker before anyone relies on them.
// See the "Review" section of docs/product/vocabulary-dataset.md; record the outcome there
// and by changing this comment.
import type { CourseUnit } from '@/api/schemas/course';
import type { Picture } from '@/api/schemas/lesson';

export interface VocabularyItem {
  id: string;
  english: string;
  estonian: string;
  picture: Picture;
  lessonId: string;
}

/** An item as authored inside a lesson; `lessonId` is added when the dataset is flattened. */
type AuthoredItem = Omit<VocabularyItem, 'lessonId'>;

export interface LessonDefinition {
  id: string;
  title: string;
  description: string;
  /** Exactly 5 items per lesson (dataset rule). */
  items: readonly AuthoredItem[];
}

export interface UnitDefinition {
  id: string;
  title: string;
  description: string;
  /** 4 lessons per unit. */
  lessons: readonly LessonDefinition[];
}

export const COURSE_ID = 'et';
export const COURSE_TITLE = 'Estonian';
export const COURSE_FROM_LANGUAGE = 'English';

function word(
  english: string,
  estonian: string,
  emoji: string,
  alt: string,
  id: string = english.toLowerCase().replaceAll(' ', '-'),
): AuthoredItem {
  return { id, english, estonian, picture: { emoji, alt } };
}

/*
 * Themes chosen for the units authored so far:
 *   Unit 1 "Food and drink": lessons 1 to 4 all Food and drink (spec sample).
 *   Unit 2 "Animals and nature": lessons 1 and 2 Animals, lessons 3 and 4 Nature
 *     (lesson 4 weather and landscape, chosen here).
 *   Unit 3 "Around the house": lesson 1 Home, lesson 2 Clothes, lesson 3 School and
 *     office, lesson 4 Transport (all chosen here).
 *
 *   Unit 4 "People and places": lesson 1 People, lesson 2 Body, lesson 3 Town,
 *     lesson 4 Fun things (all chosen here).
 *   Unit 5 "Fruit, things and outdoors": lesson 1 More fruit, lesson 2 More food,
 *     lesson 3 Everyday objects, lesson 4 Outdoors (all chosen here).
 *   Unit 6 "Wildlife and sky": lesson 1 Sea and pond animals, lesson 2 Forest and farm
 *     animals, lesson 3 Sky and space, lesson 4 Insects and birds (all chosen here).
 *
 * All 6 units are present: 24 lessons of 5 items, 120 items in total.
 */
export const UNIT_DEFINITIONS: readonly UnitDefinition[] = [
  {
    id: 'unit-1',
    title: 'Food and drink',
    description: 'Name what you eat and drink every day.',
    lessons: [
      {
        id: 'u1-l1',
        title: 'Drinks and bread',
        description: 'Tea, coffee, bread, milk and water.',
        items: [
          word('tea', 'tee', '🍵', 'A cup of green tea'),
          word('coffee', 'kohv', '☕', 'A hot cup of coffee'),
          word('bread', 'leib', '🍞', 'A loaf of bread'),
          word('milk', 'piim', '🥛', 'A glass of milk'),
          word('water', 'vesi', '💧', 'A drop of water'),
        ],
      },
      {
        id: 'u1-l2',
        title: 'Everyday foods',
        description: 'Apple, cheese, egg, fish and cake.',
        items: [
          word('apple', 'õun', '🍎', 'A red apple'),
          word('cheese', 'juust', '🧀', 'A wedge of cheese'),
          word('egg', 'muna', '🥚', 'A white egg'),
          word('fish', 'kala', '🐟', 'A fish'),
          word('cake', 'kook', '🍰', 'A slice of cake'),
        ],
      },
      {
        id: 'u1-l3',
        title: 'Fruit and vegetables',
        description: 'Banana, carrot, potato, tomato and cucumber.',
        items: [
          word('banana', 'banaan', '🍌', 'A banana'),
          word('carrot', 'porgand', '🥕', 'A carrot'),
          word('potato', 'kartul', '🥔', 'A potato'),
          word('tomato', 'tomat', '🍅', 'A red tomato'),
          word('cucumber', 'kurk', '🥒', 'A cucumber'),
        ],
      },
      {
        id: 'u1-l4',
        title: 'Treats',
        description: 'Chocolate, ice cream, strawberry, mushroom and pineapple.',
        items: [
          word('chocolate', 'šokolaad', '🍫', 'A bar of chocolate'),
          word('ice cream', 'jäätis', '🍦', 'An ice cream cone'),
          word('strawberry', 'maasikas', '🍓', 'A strawberry'),
          word('mushroom', 'seen', '🍄', 'A mushroom'),
          word('pineapple', 'ananass', '🍍', 'A pineapple'),
        ],
      },
    ],
  },
  {
    id: 'unit-2',
    title: 'Animals and nature',
    description: 'Meet animals and look up at the world around you.',
    lessons: [
      {
        id: 'u2-l1',
        title: 'Pets and farm animals',
        description: 'Cat, dog, horse, cow and pig.',
        items: [
          word('cat', 'kass', '🐱', 'A cat'),
          word('dog', 'koer', '🐶', 'A dog'),
          word('horse', 'hobune', '🐴', 'A horse'),
          word('cow', 'lehm', '🐄', 'A cow'),
          word('pig', 'siga', '🐷', 'A pig'),
        ],
      },
      {
        id: 'u2-l2',
        title: 'Wild animals',
        description: 'Bird, bear, rabbit, bee and giraffe.',
        items: [
          word('bird', 'lind', '🐦', 'A bird'),
          word('bear', 'karu', '🐻', 'A bear'),
          word('rabbit', 'küülik', '🐰', 'A rabbit'),
          word('bee', 'mesilane', '🐝', 'A honey bee'),
          word('giraffe', 'žiraff', '🦒', 'A giraffe'),
        ],
      },
      {
        id: 'u2-l3',
        title: 'Nature',
        description: 'Tree, flower, night, sun and moon.',
        items: [
          word('tree', 'puu', '🌳', 'A tree'),
          word('flower', 'lill', '🌸', 'A pink flower'),
          word('night', 'öö', '🌃', 'A city under the night sky'),
          word('sun', 'päike', '☀️', 'The shining sun'),
          word('moon', 'kuu', '🌙', 'A crescent moon'),
        ],
      },
      {
        id: 'u2-l4',
        title: 'Weather and landscape',
        description: 'Cloud, rain, snow, mountain and rainbow.',
        items: [
          word('cloud', 'pilv', '☁️', 'A cloud'),
          word('rain', 'vihm', '🌧️', 'A cloud with falling rain'),
          word('snow', 'lumi', '❄️', 'A snowflake'),
          word('mountain', 'mägi', '⛰️', 'A mountain'),
          word('rainbow', 'vikerkaar', '🌈', 'A rainbow'),
        ],
      },
    ],
  },
  {
    id: 'unit-3',
    title: 'Around the house',
    description: 'Talk about your home, clothes, school things and getting around.',
    lessons: [
      {
        id: 'u3-l1',
        title: 'Home',
        description: 'House, door, bed, key and phone.',
        items: [
          word('house', 'maja', '🏠', 'A house'),
          word('door', 'uks', '🚪', 'A door'),
          word('bed', 'voodi', '🛏️', 'A bed'),
          word('key', 'võti', '🔑', 'A key'),
          word('phone', 'telefon', '📱', 'A mobile phone'),
        ],
      },
      {
        id: 'u3-l2',
        title: 'Clothes',
        description: 'Shirt, dress, shoe, sock and hat.',
        items: [
          word('shirt', 'särk', '👕', 'A T-shirt'),
          word('dress', 'kleit', '👗', 'A dress'),
          word('shoe', 'king', '👟', 'A running shoe'),
          word('sock', 'sokk', '🧦', 'A pair of socks'),
          word('hat', 'müts', '🎩', 'A top hat'),
        ],
      },
      {
        id: 'u3-l3',
        title: 'School things',
        description: 'Book, pencil, clock, bag and computer.',
        items: [
          word('book', 'raamat', '📖', 'An open book'),
          word('pencil', 'pliiats', '✏️', 'A pencil'),
          word('clock', 'kell', '🕐', 'A clock face'),
          word('bag', 'kott', '🎒', 'A school bag'),
          word('computer', 'arvuti', '💻', 'A laptop computer'),
        ],
      },
      {
        id: 'u3-l4',
        title: 'Transport',
        description: 'Car, bus, train, ship and bicycle.',
        items: [
          word('car', 'auto', '🚗', 'A car'),
          word('bus', 'buss', '🚌', 'A bus'),
          word('train', 'rong', '🚆', 'A train'),
          word('ship', 'laev', '🚢', 'A ship'),
          word('bicycle', 'jalgratas', '🚲', 'A bicycle'),
        ],
      },
    ],
  },
  {
    id: 'unit-4',
    title: 'People and places',
    description: 'Describe people, your body, the town and things for fun.',
    lessons: [
      {
        id: 'u4-l1',
        title: 'People',
        description: 'Man, woman, boy, girl and baby.',
        items: [
          word('man', 'mees', '👨', 'A man'),
          word('woman', 'naine', '👩', 'A woman'),
          word('boy', 'poiss', '👦', 'A boy'),
          word('girl', 'tüdruk', '👧', 'A girl'),
          word('baby', 'beebi', '👶', 'A baby'),
        ],
      },
      {
        id: 'u4-l2',
        title: 'Body',
        description: 'Hand, eye, ear, nose and mouth.',
        items: [
          word('hand', 'käsi', '✋', 'An open hand'),
          word('eye', 'silm', '👁️', 'An eye'),
          word('ear', 'kõrv', '👂', 'An ear'),
          word('nose', 'nina', '👃', 'A nose'),
          word('mouth', 'suu', '👄', 'A mouth'),
        ],
      },
      {
        id: 'u4-l3',
        title: 'Town',
        description: 'School, hospital, church, shop and bridge.',
        items: [
          word('school', 'kool', '🏫', 'A school building'),
          word('hospital', 'haigla', '🏥', 'A hospital building'),
          word('church', 'kirik', '⛪', 'A church'),
          word('shop', 'pood', '🏪', 'A small shop'),
          word('bridge', 'sild', '🌉', 'A bridge at night'),
        ],
      },
      {
        id: 'u4-l4',
        title: 'Fun things',
        description: 'Guitar, drum, ball, gift and camera.',
        items: [
          word('guitar', 'kitarr', '🎸', 'A guitar'),
          word('drum', 'trumm', '🥁', 'A drum'),
          word('ball', 'pall', '⚽', 'A football'),
          word('gift', 'kingitus', '🎁', 'A wrapped gift'),
          word('camera', 'kaamera', '📷', 'A camera'),
        ],
      },
    ],
  },
  {
    id: 'unit-5',
    title: 'Fruit, things and outdoors',
    description: 'More fruit and food, everyday objects and the great outdoors.',
    lessons: [
      {
        id: 'u5-l1',
        title: 'More fruit',
        description: 'Pear, lemon, grape, cherry and orange.',
        items: [
          word('pear', 'pirn', '🍐', 'A pear'),
          word('lemon', 'sidrun', '🍋', 'A lemon'),
          word('grape', 'viinamari', '🍇', 'A bunch of grapes'),
          word('cherry', 'kirss', '🍒', 'A pair of cherries'),
          word('orange', 'apelsin', '🍊', 'An orange'),
        ],
      },
      {
        id: 'u5-l2',
        title: 'More food',
        description: 'Pizza, soup, sandwich, honey and salt.',
        items: [
          word('pizza', 'pitsa', '🍕', 'A slice of pizza'),
          word('soup', 'supp', '🍲', 'A pot of soup'),
          word('sandwich', 'võileib', '🥪', 'A sandwich'),
          word('honey', 'mesi', '🍯', 'A pot of honey'),
          word('salt', 'sool', '🧂', 'A salt shaker'),
        ],
      },
      {
        id: 'u5-l3',
        title: 'Everyday objects',
        description: 'Umbrella, ring, candle, hammer and crown.',
        items: [
          word('umbrella', 'vihmavari', '☔', 'An umbrella with raindrops'),
          word('ring', 'sõrmus', '💍', 'A ring'),
          word('candle', 'küünal', '🕯️', 'A lit candle'),
          word('hammer', 'haamer', '🔨', 'A hammer'),
          word('crown', 'kroon', '👑', 'A crown'),
        ],
      },
      {
        id: 'u5-l4',
        title: 'Outdoors',
        description: 'Tent, fire, island, boat and volcano.',
        items: [
          word('tent', 'telk', '⛺', 'A tent'),
          word('fire', 'tuli', '🔥', 'A fire'),
          word('island', 'saar', '🏝️', 'A small island with a palm tree'),
          word('boat', 'paat', '⛵', 'A sailing boat'),
          word('volcano', 'vulkaan', '🌋', 'An erupting volcano'),
        ],
      },
    ],
  },
  {
    id: 'unit-6',
    title: 'Wildlife and sky',
    description: 'Animals of the sea, forest and air, and the sky above.',
    lessons: [
      {
        id: 'u6-l1',
        title: 'Sea and pond animals',
        description: 'Whale, octopus, crab, turtle and frog.',
        items: [
          word('whale', 'vaal', '🐳', 'A whale'),
          word('octopus', 'kaheksajalg', '🐙', 'An octopus'),
          word('crab', 'krabi', '🦀', 'A crab'),
          word('turtle', 'kilpkonn', '🐢', 'A turtle'),
          word('frog', 'konn', '🐸', 'A frog'),
        ],
      },
      {
        id: 'u6-l2',
        title: 'Forest and farm animals',
        description: 'Sheep, fox, wolf, mouse and elephant.',
        items: [
          word('sheep', 'lammas', '🐑', 'A sheep'),
          word('fox', 'rebane', '🦊', 'A fox'),
          word('wolf', 'hunt', '🐺', 'A wolf'),
          word('mouse', 'hiir', '🐭', 'A mouse'),
          word('elephant', 'elevant', '🐘', 'An elephant'),
        ],
      },
      {
        id: 'u6-l3',
        title: 'Sky and space',
        description: 'Star, earth, rocket, lightning and wave.',
        items: [
          word('star', 'täht', '⭐', 'A yellow star'),
          word('earth', 'maa', '🌍', 'The planet Earth'),
          word('rocket', 'rakett', '🚀', 'A rocket'),
          word('lightning', 'välk', '⚡', 'A lightning bolt'),
          word('wave', 'laine', '🌊', 'A sea wave'),
        ],
      },
      {
        id: 'u6-l4',
        title: 'Insects and birds',
        description: 'Butterfly, spider, snail, owl and duck.',
        items: [
          word('butterfly', 'liblikas', '🦋', 'A butterfly'),
          word('spider', 'ämblik', '🕷️', 'A spider'),
          word('snail', 'tigu', '🐌', 'A snail'),
          word('owl', 'öökull', '🦉', 'An owl'),
          word('duck', 'part', '🦆', 'A duck'),
        ],
      },
    ],
  },
];

/** Every item with its lesson id, in course order. */
export const VOCABULARY_ITEMS: readonly VocabularyItem[] = UNIT_DEFINITIONS.flatMap((unit) =>
  unit.lessons.flatMap((lesson) => lesson.items.map((item) => ({ ...item, lessonId: lesson.id }))),
);

/** Course tree as served by `GET /api/course` (`units` part). */
export const COURSE_UNITS: readonly CourseUnit[] = UNIT_DEFINITIONS.map((unit) => ({
  id: unit.id,
  title: unit.title,
  description: unit.description,
  lessons: unit.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
}));
