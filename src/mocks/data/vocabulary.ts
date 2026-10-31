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
 * Units 4 to 6 are appended to the end of UNIT_DEFINITIONS (same shapes, 4 lessons of
 * 5 items each, ids `unit-N` / `uN-lM`); nothing else in this module needs to change.
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
