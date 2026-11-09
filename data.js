/*
 * Everything personal lives here. Edit freely; the page redraws itself from this file.
 *
 * GitHub data (open-source leaves, contribution calendar) is fetched live. The SNAPSHOT
 * further down is only used when a request fails. Snapshot taken 2026-11-09.
 */
window.SITE = {
  name: 'Xinrui Zhou',
  github: 'xinrui-z',

  // Footer and contact. Leave a value empty to hide it.
  links: {
    email: 'xinruizhou2002@gmail.com',
    linkedin: '',
    x: '',
  },

  // Short notes shown next to repositories on the Open source page.
  repoNotes: {
    'xinrui-z/free-llm': 'A curated list of free LLM APIs, tools, and guides. I maintain it.',
    'langgenius/dify-official-plugins': 'AIHubMix model and image plugins for Dify.',
    'anomalyco/models.dev': 'An open database of AI models, with metadata and pricing.',
    'BerriAI/litellm': 'A Python SDK and AI gateway for 100+ LLM APIs.',
    'camel-ai/camel': 'A multi-agent framework.',
  },
};

/*
 * The tree of life on the front page.
 * - The trunk is time, from `start` to today.
 * - Each limb sprouts at its `start` date; its leaves are the things made along it.
 * - `now` sits at the top of the trunk.
 * - Flowers are what I do for fun; roots are what keeps me grounded.
 * Leaves with an `href` open it on click.
 */
window.LIFE = {
  start: '2020-01-01',

  now: {
    title: 'Technical product manager',
    label: 'technical PM', // short label drawn next to the top bud
    text: 'I used to be on the engineering side. Now I point engineering at the product, mostly by building tools that help product and ops teams get their work done.',
    leaves: [
      { title: 'Tools for product ops', text: 'Internal tools that take repetitive work off product and ops teams.' },
      { title: 'Engineering for product', text: 'Prototypes, integrations, and automations that make product ideas cheaper to test.' },
    ],
  },

  // Long stretches drawn as a bracket beside the time scale.
  phases: [
    { title: 'University', start: '2020-09-01', end: '2024-06-30', span: '2020 – 2024',
      text: 'Four years of study, with research, competitions, and engineering projects along the way.' },
  ],

  // `span` is the label shown under the lens; `start` places the limb on the trunk.
  limbs: [
    {
      key: 'engineering', name: 'Engineering projects', start: '2021-01-01', span: '2021 – 2024',
      blurb: 'Hands-on engineering through university, from algorithms to full-stack builds.',
      leaves: [
        { title: 'Algorithms', year: '2021 – 2024', text: 'Building and tuning models: where I started.' },
        { title: 'Full-stack development', year: '2021 – 2024', text: 'Front ends, back ends, databases, and everything in between.' },
      ],
    },
    {
      key: 'research', name: 'Research & competitions', start: '2021-03-01', span: '2021 – 2023',
      blurb: 'Research alongside my studies, plus academic competitions.',
      leaves: [
        { title: 'Research', year: '2021 – 2023', text: 'My first research projects, done alongside my coursework.' },
        { title: 'Academic competitions', year: '2021 – 2023', text: 'Competing in academic competitions during university.' },
      ],
    },
    {
      key: 'internship', name: 'Research & internship', start: '2023-11-01', span: 'Nov 2023 – Jun 2024',
      blurb: 'My last year of university: more research, and an internship at an AI lab.',
      leaves: [
        { title: 'Research', year: 'Nov 2023 – Jun 2024', text: 'Research during my final year.' },
        { title: 'AI lab internship', year: 'Nov 2023 – Jun 2024', text: 'An internship at an AI lab.' },
      ],
    },
    {
      key: 'founding', name: 'AI startup', start: '2024-07-01', span: 'Jul 2024 – Jan 2025',
      blurb: 'Co-founded an AI startup that built consumer apps on top of large language models.',
      leaves: [
        { title: 'Co-founded an AI startup', year: 'Jul 2024 – Jan 2025', text: 'Consumer apps powered by large language models, and all the challenges of putting AI in front of real users.' },
        { title: 'From product strategy to coordinating the team', year: 'Jul 2024 – Jan 2025', text: 'Early-stage work across product, people, and growth.' },
      ],
    },
    {
      key: 'pause', name: 'Time off', start: '2025-02-01', span: '2025',
      blurb: 'Six months off to reflect, recharge, and reset.',
      leaves: [
        { title: 'Six months off', year: 'Break', text: 'After the startup, I stepped away for six months to reflect, recharge, and rethink my goals. I came back with fresh perspective and a clearer direction.' },
      ],
    },
    {
      // Leaves for this limb come from GitHub: one per repository with merged pull requests.
      key: 'oss', name: 'Open source', start: '2025-11-01', fromGitHub: true,
      blurb: 'Merged contributions to LLM tooling on GitHub.',
      leaves: [],
    },
  ],

  // Long-running habits, drawn as vines that wind up the whole trunk.
  // (`blossoms` below can hold one-off joys; each one flowers at a limb tip.)
  vines: [
    { label: 'fitness', title: 'Fitness', text: 'I’ve been working out for years. It has run through every chapter so far.' },
    { label: 'cooking', title: 'Cooking', text: 'Chinese food above all, plus a lot of baking. A constant through every chapter.' },
    { label: 'cycling', title: 'Cycling', text: 'Getting out on my bike, for as long as I can remember.' },
    { label: 'walks', title: 'Walking', text: 'Long, unhurried walks. An old habit that has stuck with me.' },
  ],

  blossoms: [
  ],

  roots: [
    { label: 'history', title: 'History', text: 'One of my two favorite things to read about.' },
    { label: 'psychology', title: 'Psychology', text: 'The other one: why people think and act the way they do.' },
    { label: 'solitude', title: 'Solitude', text: 'I like my own company. Quiet time alone is how I recharge.' },
  ],
};

window.SNAPSHOT = {
  // One count per day, oldest first, starting at `start`.
  calendar: {
    start: '2025-11-09',
    counts: [2,0,0,0,2,0,0,2,3,3,7,1,0,0,3,2,0,0,2,0,0,0,0,0,0,0,0,0,2,0,8,0,2,0,0,2,9,3,2,0,0,0,2,0,0,2,5,0,2,0,0,4,2,0,2,0,4,3,3,3,0,0,0,0,3,1,0,3,0,0,1,1,1,1,5,0,0,2,3,2,11,2,0,9,11,0,3,0,0,0,0,2,3,0,0,0,1,1,0,0,0,2,0,0,0,0,0,0,6,9,0,1,2,3,6,4,1,0,0,1,0,6,4,6,0,0,2,4,1,4,6,0,2,30,13,11,26,14,0,0,20,20,5,1,12,0,10,0,0,12,6,2,1,0,4,17,2,4,0,0,0,5,4,4,2,0,8,0,1,5,7,6,0,0,0,0,0,0,3,8,1,0,0,0,0,2,4,0,0,6,9,18,6,7,0,0,0,2,24,2,2,5,0,0,17,0,2,5,21,0,6,20,4,27,6,0,0,0,13,10,11,2,0,0,0,16,0,20,2,12,0,0,20,26,7,0,9,0,0,8,2,4,0,2,0,0,4,4,4,2,0,0,0,4,0,13,0,0,0,0,4,1,0,3,0,0,0,5,6,6,5,18,0,0,3,1,1,11,2,0,0,4,5,0,0,0,0,0,10,0,10,12,12,0,0,18,2,4,12,14,0,0,0,4,2,6,6,0,0,6,4,6,2,0,0,2,0,0,6,9,0,0,4,5,17,0,0,0,0,0,0,0,0,13,1,6,0,1,0,14,6,1,0,0,1,8,2,0,36,0,18,5,4,11,0,13,0,0,0,1,0,0,0,0,3,0],
  },

  stars: { 'xinrui-z/free-llm': 26 },

  // Merged pull requests: [date merged, repo, number, title]
  pulls: [
    ['2026-06-25', 'langgenius/dify-official-plugins', 3345, 'feat(aihubmix_image): add configurable API base URL'],
    ['2026-05-20', 'xinrui-z/free-llm', 5, 'feat(providers): add NVIDIA NIM, ModelScope, SiliconFlow, Cloudflare Workers AI'],
    ['2026-05-08', 'langgenius/dify-official-plugins', 3023, 'feat(aihubmix_image): add Wan/GLM/Ideogram tools'],
    ['2026-04-29', 'langgenius/dify-official-plugins', 2998, 'fix(aihubmix): update pricing and remove deprecated models'],
    ['2026-04-29', 'anomalyco/models.dev', 1625, 'fix: sync AIHubMix models (2026-04-28)'],
    ['2026-04-29', 'BerriAI/litellm', 24294, 'feat(provider): add AIHubMix as an OpenAI-compatible provider'],
    ['2026-04-01', 'xinrui-z/free-llm', 4, 'feat(providers): add Mistral AI'],
    ['2026-03-31', 'anomalyco/models.dev', 1301, 'fix(aihubmix): zod-validation-error'],
    ['2026-03-30', 'xinrui-z/free-llm', 3, 'feat(providers): add Ollama Cloud'],
    ['2026-03-30', 'xinrui-z/free-llm', 2, 'feat(providers): add Ollama Cloud and NVIDIA NIM'],
    ['2026-03-30', 'xinrui-z/free-llm', 1, 'feat(providers): add Google AI Studio'],
    ['2026-03-24', 'langgenius/dify-official-plugins', 2777, 'feat(aihubmix): sync models and add new LLMs (v0.0.23)'],
    ['2026-03-07', 'anomalyco/models.dev', 1045, 'aihubmix add models'],
    ['2026-03-01', 'langgenius/dify-official-plugins', 2637, 'feat(aihubmix): add new models across all provider types'],
    ['2026-02-18', 'anomalyco/models.dev', 964, 'aihubmix: add models'],
    ['2026-02-03', 'langgenius/dify-official-plugins', 2457, 'fix(aihubmix_image): fix reference image form type from llm to form'],
    ['2026-01-28', 'anomalyco/models.dev', 739, 'feat(models): add kimi-k2.5, coding-glm-4.7, glm-4.6v, and qwen3-max'],
    ['2026-01-26', 'anomalyco/models.dev', 712, 'fix(provider): correct invalid type in provider.toml'],
    ['2026-01-15', 'langgenius/dify-official-plugins', 2429, 'feat(aihubmix): support passing previous node image to edit model'],
    ['2026-01-13', 'langgenius/dify-official-plugins', 2410, 'feat(aihubmix): support returning image URL'],
    ['2026-01-09', 'anomalyco/models.dev', 601, 'aihubmix: add free models'],
    ['2026-01-04', 'anomalyco/models.dev', 597, 'aihubmix: add glm-4.7 and minimax-m2.1'],
    ['2026-01-02', 'anomalyco/models.dev', 486, 'aihubmix: add models'],
    ['2025-12-17', 'langgenius/dify-official-plugins', 2272, 'fix: add thought signature for function calling in AIHubMix plugin'],
    ['2025-12-16', 'langgenius/dify-official-plugins', 2258, 'add gpt-5.2 model and support max_completion_tokens'],
    ['2025-11-24', 'langgenius/dify-official-plugins', 2092, 'feat: add aihubmix-image plugin v0.0.1'],
    ['2025-11-02', 'camel-ai/camel', 3338, 'feat: add AiHubMix as a new model provider'],
  ],
};
