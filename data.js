/*
 * Everything personal lives here. Edit freely; the page redraws itself from this file.
 */
window.SITE = {
  name: 'Xinrui Zhou',
  github: 'xinrui-z',
  updated: 'Nov 2026', // shown on the Now box and in the footer

  // Footer and contact. Leave a value empty to hide it.
  links: {
    email: 'xinruizhou2002@gmail.com',
    linkedin: '',
    x: '',
  },

  // The Now box on the front page: [label, text]. Refresh it every month or two.
  now: [
    ['Reading', 'Meditations, by Marcus Aurelius'],
    ['Baking', 'Working on a low-fat, high-protein sandwich loaf'],
    ['Riding', 'Aiming for 20.27 km (12.6 mi) on New Year’s Eve to ring in 2027'],
    ['Thinking', 'Figuring out who I am and what I really want'],
  ],

  // `original` is the Chinese title, shown under the English one.
  reading: [
    { title: 'Red Star Over China', original: '红星照耀中国', author: 'Edgar Snow', note: 'Even in the dead of a northern winter, the heart can bloom like a plum blossom.' },
    { title: 'The Ming Dynasty, As It Was', original: '明朝那些事儿', author: 'Dangnian Mingyue', note: 'Live life on your own terms.' },
    { title: 'The Last Quarter of the Moon', original: '额尔古纳河右岸', author: 'Chi Zijian', note: 'Hardship is just part of life, and letting go is something you have to learn.' },
    { title: 'Me and the Temple of Earth', original: '我与地坛', author: 'Shi Tiesheng', note: 'No need to fear the end, or to fight every hard thing that comes your way.' },
    { title: 'The Lychee Road', original: '长安的荔枝', author: 'Ma Boyong', note: 'The first time through, I missed the point. Later, I saw myself in the story.' },
  ],

  kitchen: {
    dishes: ['Wensi tofu soup', 'Pork ribs with Longjing tea', 'White-cut chicken', 'Braised prawns'],
    pastries: ['Steamed buns', 'Rose buns', 'Pumpkin buns', 'Rustic loaves'],
    filled: ['Dumplings', 'Wontons'],
    favoriteFilling: 'Shrimp',
  },
};

/*
 * The timeline on the front page.
 * - Time runs left to right, from `start` to today.
 * - Each chapter (`limbs`) is a bar from `start` to `end` ('now' keeps it open).
 *   Its leaves are the small ticks above the bar. `more` links the chapter to a page.
 * - Vines are long-running habits, drawn as dashed lines under the axis. They began before
 *   `start`, so they run off the left edge.
 * - Marks are personal bests, pinned to a habit line on the day they happened.
 */
window.LIFE = {
  start: '2020-07-01',

  // `span` is the label shown beside the bar and under the lens.
  limbs: [
    {
      key: 'university', name: 'College', start: '2020-09-01', end: '2024-06-30', span: '2020–2024', more: '#/work',
      blurb: 'Four years of college, with research, competitions, and engineering projects along the way.',
      leaves: [
        { title: 'Research and competitions', year: '2021–2023', text: 'My first research projects and a few academic competitions, on top of classes.' },
        { title: 'Engineering projects', year: '2021–2024', text: 'Everything from algorithms to full-stack apps.' },
        { title: 'AI lab internship', year: 'Nov 2023 – Jun 2024', text: 'More research senior year, plus an internship at an AI lab.' },
      ],
    },
    {
      key: 'founding', name: 'AI startup', start: '2024-07-01', end: '2024-12-31', span: 'Jul – Dec 2024', more: '#/work',
      blurb: 'I co-founded a startup building consumer apps on top of large language models.',
      leaves: [
        { title: 'Co-founder', year: 'Jul – Dec 2024', text: 'Consumer AI apps, and everything that comes with putting them in front of real people.' },
        { title: 'Product, people, and growth', year: 'Jul – Dec 2024', text: 'Early-stage work: a bit of everything, all at once.' },
      ],
    },
    {
      key: 'pause', name: 'Time off', start: '2025-01-01', end: '2025-06-30', span: 'Jan – Jun 2025', more: '#/work',
      blurb: 'Six months off to rest, reflect, and reset.',
      leaves: [
        { title: 'Six months off', year: 'Jan – Jun 2025', text: 'After the startup, I took six months off to rest and rethink what I wanted. I came back with a clearer sense of direction.' },
      ],
    },
    {
      // Kept deliberately vague: no company names, no projects.
      key: 'now', name: 'Product & operations', start: '2025-07-01', end: 'now', span: 'Jul 2025 – now', more: '#/work',
      blurb: 'Operations, product, and developer relations at AI startups.',
      leaves: [
        { title: 'Operations, product, and DevRel', year: 'Jul 2025 – now', text: 'A mix of operations, product, and developer relations at AI startups.' },
      ],
    },
  ],

  vines: [
    { label: 'fitness', title: 'Fitness', text: 'I’ve been working out for years, since well before this timeline starts.' },
    { label: 'cooking', title: 'Cooking', text: 'Mostly Chinese food, plus a lot of baking.', more: '#/kitchen' },
    { label: 'cycling', title: 'Cycling', text: 'I’ve been riding a bike for as long as I can remember.' },
    { label: 'walks', title: 'Walking', text: 'Long, unhurried walks. An old habit that stuck.' },
  ],

  // Personal bests. `vine` is the label of the habit line the mark sits on.
  marks: [
    { vine: 'fitness', date: '2021-01-03', title: 'Longest run: 8 km', text: 'About 5 miles.' },
    { vine: 'fitness', date: '2022-11-27', title: 'Fastest run: 3:40 per km', text: 'That’s about 5:54 per mile.' },
    { vine: 'cycling', date: '2026-10-06', title: 'Longest ride: 18.04 km', text: 'About 11.2 miles. Next up: 20.27 km on New Year’s Eve to ring in 2027.' },
  ],
};
