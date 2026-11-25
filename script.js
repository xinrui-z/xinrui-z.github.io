/* Xinrui Zhou — a personal index, drawn as a 1-bit timeline.
 * No build step, no dependencies. */
(() => {
  'use strict';

  const SITE = window.SITE || {};
  const USER = SITE.github || 'xinrui-z';
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ───────── helpers ───────── */

  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const utc = iso => new Date(String(iso).slice(0, 10) + 'T00:00:00Z');
  const fmtDate = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };
  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };
  const svgEl = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };
  // Draw a tiny bitmap ("#" = ink) as a crisp SVG icon.
  function pixelIcon(rows) {
    let rects = '';
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }));
    return `<svg class="px" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  // Pages, in menu order. The key is the hash route.
  const PAGES = [
    ['about', 'About'],
    ['reading', 'Reading'],
    ['kitchen', 'Kitchen'],
    ['work', 'Chapters'],
  ];
  const PAGE_NAME = Object.fromEntries(PAGES.map(([k, v]) => [`#/${k}`, v]));


  /* ───────── The timeline (home) ───────── */

  // 1-bit fills: [id, tile size, ink rects]. Mirrors .pat-0 … .pat-5 in styles.css.
  const PATTERNS = [
    ['tl-p0', 4, [[0, 0, 4, 4]]],
    ['tl-p1', 4, [[0, 0, 2, 2], [2, 2, 2, 2]]],
    ['tl-p2', 4, [[0, 0, 4, 2]]],
    ['tl-p3', 8, [[0, 0, 2, 2], [2, 2, 2, 2], [4, 4, 2, 2], [6, 6, 2, 2]]],
    ['tl-p4', 4, [[0, 0, 2, 2]]],
    ['tl-p5', 4, [[0, 0, 2, 4]]],
  ];
  // Past chapters in time order: checker, stripes, diagonal, sparse dots (the pause), then around again.
  // The open-ended chapter (now) is always solid.
  const CHAPTER_FILL = ['tl-p1', 'tl-p2', 'tl-p3', 'tl-p4', 'tl-p5'];
  const HABIT_DASH = ['6 2', '2 2', '8 2 2 2', '4 4'];
  const FADE_MS = 450;

  // Drawn at the SVG's real width, so text is always its CSS size (no scaling).
  function geometry(width) {
    const W = Math.max(280, width);
    return W < 600
      ? { compact: true, W, X0: 14, X1: W - 14, TOP: 64, LANE: 52, AXIS_GAP: 46, V_GAP: 54, V_STEP: 30 }
      : { compact: false, W, X0: 204, X1: W - 34, TOP: 52, LANE: 46, AXIS_GAP: 34, V_GAP: 42, V_STEP: 26 };
  }

  function createTimeline(svg, lens) {
    let items = [];          // animated nodes: { node, key, delay }
    let started = null;      // when the first reveal began (performance.now())
    let wantShow = false;    // the home view is visible, so reveal as soon as there is something to show
    let life = null;
    let lastW = 0;
    let stripTimer = 0;
    const seen = new Set();  // keys already revealed once

    const lensK = lens.querySelector('.lens-kicker');
    const lensT = lens.querySelector('.lens-title');
    const lensM = lens.querySelector('.lens-meta');
    const lensMore = lens.querySelector('.lens-more');
    function setLens(kicker, title, meta, more, on = true) {
      lensK.textContent = kicker; lensT.textContent = title; lensM.textContent = meta;
      lensMore.hidden = !more;
      if (more) { lensMore.href = more; lensMore.textContent = `More on ${PAGE_NAME[more] || 'this'} →`; }
      lens.classList.toggle('on', on);
    }
    function resetLens() {
      setLens('Up close', 'Hover over or tap the timeline.',
        'Each bar is a chapter. The dashed lines are habits I’ve kept since before 2020.', null, false);
    }
    function clear() {
      svg.classList.remove('dim');
      svg.querySelectorAll('.on, .lit').forEach(n => n.classList.remove('on', 'lit'));
      resetLens();
    }
    function highlight(lit, on, kicker, title, meta, more) {
      clear();
      svg.classList.add('dim');
      for (const n of lit) n.classList.add('lit');
      on.classList.add('on');
      setLens(kicker, title, meta, more);
    }
    function examine(node, show, label) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      if (label) node.setAttribute('aria-label', label);
      node.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(); });
      node.addEventListener('focus', show);
      node.addEventListener('blur', e => { if (!lens.contains(e.relatedTarget)) clear(); });
      node.addEventListener('click', show);
    }

    /* Reveal */
    function prep(list) {
      for (const { node } of list) { node.classList.remove('tl-in'); node.classList.add('tl-pre'); }
    }
    function run(list) {
      if (!list.length) return;
      if (reduceMotion.matches) { for (const { node } of list) node.classList.remove('tl-pre'); return; }
      void svg.getBoundingClientRect(); // commit the hidden state so the fade has a start
      let longest = 0;
      for (const { node, delay } of list) {
        node.style.setProperty('--d', `${Math.round(delay)}ms`);
        node.classList.add('tl-in');
        node.classList.remove('tl-pre');
        longest = Math.max(longest, delay);
      }
      clearTimeout(stripTimer);
      stripTimer = setTimeout(() => svg.querySelectorAll('.tl-in').forEach(n => n.classList.remove('tl-in')), longest + FADE_MS + 60);
    }
    function start() {
      started = performance.now();
      for (const it of items) seen.add(it.key);
      run(items);
    }

    function build(data) {
      life = data;
      const width = Math.round(svg.getBoundingClientRect().width);
      if (!width) return; // hidden; the resize observer builds it once it shows
      lastW = width;
      const G = geometry(width);
      const { X0, X1, TOP, LANE, W } = G;
      svg.replaceChildren();
      clear();
      items = [];
      const r = seeded(20200101);
      const tStart = utc(life.start || '2020-01-01').getTime();
      const tEnd = Date.now();
      const xOf = d => Math.round(X0 + clamp((d.getTime() - tStart) / (tEnd - tStart), 0, 1) * (X1 - X0));
      const track = (node, key, delay) => items.push({ node, key, delay });

      const chapters = (life.limbs || [])
        .map(l => ({ ...l, start: utc(l.start), end: l.end === 'now' ? null : utc(l.end) }))
        .sort((a, b) => a.start - b.start);
      const vines = life.vines || [];
      const marks = life.marks || [];
      const axisY = TOP + (chapters.length - 1) * LANE + 16 + G.AXIS_GAP;
      const vTop = axisY + G.V_GAP;
      const height = vTop + Math.max(0, vines.length - 1) * G.V_STEP + 22;
      svg.setAttribute('viewBox', `0 0 ${W} ${height}`);

      // Pattern tiles
      const defs = svgEl('defs');
      for (const [id, size, rects] of PATTERNS) {
        const p = svgEl('pattern', { id, width: size, height: size, patternUnits: 'userSpaceOnUse' });
        p.append(svgEl('rect', { class: 'pp', width: size, height: size }));
        for (const [x, y, w, h] of rects) p.append(svgEl('rect', { class: 'pk', x, y, width: w, height: h }));
        defs.append(p);
      }
      svg.append(defs);

      const layers = {};
      for (const name of ['grid', 'rows', 'leaves', 'vines', 'marks', 'now']) {
        layers[name] = svgEl('g', { class: `layer-${name}` });
        svg.append(layers[name]);
      }

      /* Year gridlines and labels. On narrow screens, every other year. */
      const lastYear = new Date(tEnd).getUTCFullYear();
      for (let yr = new Date(tStart).getUTCFullYear(); yr <= lastYear; yr++) {
        const d = new Date(Date.UTC(yr, 0, 1));
        if (d.getTime() < tStart) continue;
        const x = xOf(d);
        layers.grid.append(svgEl('line', { class: 'tl-grid', x1: x, y1: TOP - 26, x2: x, y2: axisY }));
        if (!G.compact || yr % 2 === 0) {
          layers.grid.append(svgEl('text', { class: 'tl-year', x, y: axisY + 22, 'text-anchor': 'middle' }, String(yr)));
        }
      }
      layers.grid.append(svgEl('line', { class: 'tl-axis', x1: X0, y1: axisY, x2: X1, y2: axisY }));

      /* Chapter rows */
      chapters.forEach((ch, i) => {
        const cy = TOP + i * LANE + 16;
        const xs = xOf(ch.start);
        const xe = ch.end ? xOf(ch.end) : X1;
        const leaves = ch.leaves || [];
        const span = ch.span || '';
        const g = svgEl('g', { class: 'ch' });
        const [nameAt, spanAt] = G.compact
          ? [{ x: X0, y: cy + 21 }, { x: X1, y: cy + 21, 'text-anchor': 'end' }]
          : [{ x: X0 - 26, y: cy - 1, 'text-anchor': 'end' }, { x: X0 - 26, y: cy + 15, 'text-anchor': 'end' }];
        const fill = ch.end ? CHAPTER_FILL[i % CHAPTER_FILL.length] : 'tl-p0';
        g.append(
          svgEl('rect', { class: 'tl-hit', x: 0, y: cy - 20, width: W, height: G.compact ? 46 : 42 }),
          svgEl('text', { class: 'ch-name', ...nameAt }, ch.name),
          svgEl('text', { class: 'ch-span', ...spanAt }, span),
          svgEl('rect', { class: 'ch-bar', x: xs, y: cy - 4, width: Math.max(8, xe - xs), height: 8, fill: `url(#${fill})` }));
        layers.rows.append(g);
        track(g, `ch:${ch.key}`, 60 + i * 80);

        const lit = [g];
        const count = leaves.length > 1 ? ' The ticks above the bar have more.' : '';
        examine(g, () => highlight(lit, g, `Chapter · ${span}`, ch.name, `${ch.blurb || ''}${count}`.trim(), ch.more),
          `${ch.name}, ${span}. ${ch.blurb || ''}${leaves.length > 1 ? ` Includes ${leaves.map(l => l.title).join(', ')}.` : ''}`);

        // Details are small ticks above the bar. Pointer users can poke them; keyboard and
        // screen-reader users get the same list from the chapter itself, so they are not tab stops.
        const gap = leaves.length ? (xe - xs) / leaves.length : 0;
        leaves.forEach((leaf, j) => {
          const lx = Math.round(xs + gap * (j + 0.5));
          const len = 8 + Math.round(r() * 2) * 2;
          const top = cy - 4 - len;
          const hitW = Math.max(8, Math.min(16, gap));
          const node = svgEl('g', { class: 'ch-leaf' });
          node.append(
            svgEl('rect', { class: 'tl-hit', x: Math.round(lx - hitW / 2), y: top - 6, width: Math.round(hitW), height: len + 8 }),
            svgEl('rect', { class: 'leaf-stem', x: lx - 1, y: top, width: 2, height: len }),
            svgEl('rect', { class: 'leaf-tip', x: lx - 2, y: top - 4, width: 4, height: 4 }));
          layers.leaves.append(node);
          lit.push(node);
          track(node, `leaf:${ch.key}:${leaf.title}`, 220 + i * 80 + j * 30);
          const show = () => highlight(lit, node, leaf.year || span, leaf.title, leaf.text || '', ch.more);
          node.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(); });
          node.addEventListener('click', e => { e.stopPropagation(); show(); });
        });
      });

      /* Habits: dashed threads that started before the timeline does */
      const vineAt = {};
      vines.forEach((vine, i) => {
        const y = vTop + i * G.V_STEP;
        const g = svgEl('g', { class: 'tl-vine-g' });
        g.append(
          svgEl('rect', { class: 'tl-hit', x: 0, y: y - (G.compact ? 22 : 12), width: W, height: G.compact ? 28 : 24 }),
          svgEl('line', { class: 'tl-vine-line', x1: X0, y1: y, x2: X1, y2: y, 'stroke-dasharray': HABIT_DASH[i % HABIT_DASH.length] }),
          // A small arrowhead at the left: the habit runs back past 2020.
          svgEl('path', { class: 'tl-vine-tail', d: `M${X0 - 6} ${y}l5 -4v8z` }),
          svgEl('text', G.compact ? { class: 'tl-vine-label', x: X0, y: y - 8 }
            : { class: 'tl-vine-label', x: X0 - 26, y: y + 4, 'text-anchor': 'end' }, vine.label));
        layers.vines.append(g);
        vineAt[vine.label] = { y, g };
        track(g, `vine:${vine.label}`, 300 + i * 60);
        examine(g, () => highlight([g, ...(g._marks || [])], g, 'Habit · since before 2020', vine.title, vine.text, vine.more),
          `Habit: ${vine.title}. ${vine.text}`);
      });

      /* Personal bests, pinned to their habit on the day */
      marks.forEach((mark, i) => {
        const vine = vineAt[mark.vine];
        if (!vine) return;
        const date = utc(mark.date);
        const x = xOf(date), y = vine.y;
        const g = svgEl('g', { class: 'tl-mark-g' });
        g.append(
          svgEl('rect', { class: 'tl-hit', x: x - 12, y: y - 12, width: 24, height: 24 }),
          svgEl('rect', { class: 'tl-mark', x: x - 5, y: y - 5, width: 10, height: 10 }),
          svgEl('rect', { class: 'tl-mark-dot', x: x - 1, y: y - 1, width: 2, height: 2 }));
        layers.marks.append(g);
        (vine.g._marks ||= []).push(g);
        track(g, `mark:${mark.vine}:${mark.date}`, 520 + i * 60);
        const when = fmtDate.format(date);
        examine(g, () => highlight([vine.g, g], g, `Personal best · ${when}`, mark.title, mark.text || ''),
          `Personal best, ${when}: ${mark.title}. ${mark.text || ''}`);
      });

      /* "Now" at the end of the axis: a blinking cursor */
      const nowG = svgEl('g', { class: 'tl-now', 'aria-hidden': 'true' });
      nowG.append(
        svgEl('line', { class: 'tl-today-line', x1: X1, y1: TOP - 26, x2: X1, y2: axisY }),
        svgEl('rect', { class: 'tl-now-cur', x: X1 - 3, y: axisY - 12, width: 6, height: 11 }),
        svgEl('text', { class: 'tl-now-label', x: X1, y: TOP - 32, 'text-anchor': 'end' }, 'now'));
      layers.now.append(nowG);
      track(nowG, 'now', 600);

      // Before the first reveal everything waits hidden. After it, only what is new
      // (or still mid-fade) animates; a rebuild never replays what is already on screen.
      if (started === null) { prep(items); if (wantShow) start(); return; }
      const t = performance.now();
      const fresh = items
        .filter(it => !seen.has(it.key) || started + it.delay + FADE_MS > t)
        .map(it => ({ ...it, delay: Math.max(0, started + it.delay - t) }));
      for (const it of items) seen.add(it.key);
      prep(fresh);
      run(fresh);
    }

    /* Wiring that survives rebuilds */
    const offTimeline = n => !svg.contains(n) && !lens.contains(n);
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && offTimeline(e.relatedTarget)) clear(); });
    lens.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && offTimeline(e.relatedTarget)) clear(); });
    lensMore.addEventListener('blur', e => { if (offTimeline(e.relatedTarget)) clear(); });
    svg.addEventListener('keydown', e => {
      if (e.key === 'Escape') { clear(); document.activeElement?.blur?.(); }
    });
    lens.querySelector('.lens-close')?.addEventListener('click', clear);
    document.addEventListener('pointerdown', e => {
      if (lens.classList.contains('on') && offTimeline(e.target)) clear();
    });
    let pending = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const w = Math.round(svg.getBoundingClientRect().width);
        if (life && w && Math.abs(w - lastW) >= 2) build(life);
      });
    }).observe(svg);

    return {
      build,
      reset: clear,
      show() {
        wantShow = true;
        if (started === null && items.length) start();
      },
      replay() {
        if (!items.length) return;
        clear();
        started = performance.now();
        prep(items);
        run(items);
      },
    };
  }


  /* ───────── Masthead, Now, reading, kitchen ───────── */

  function buildMastheads() {
    for (const head of document.querySelectorAll('[data-masthead]')) {
      const nav = el('nav', { class: 'site-nav', 'aria-label': 'Site' });
      for (const [key, label] of PAGES) nav.append(el('a', { href: `#/${key}`, 'data-page': key }, label));
      head.replaceChildren(
        el('span', { class: 'seal pat-1', 'aria-hidden': 'true' }),
        el('a', { class: 'wordmark', href: '#/' }, SITE.name || 'Home'),
        nav);
    }
  }

  function renderNow() {
    const list = document.querySelector('[data-now]');
    if (list) {
      list.replaceChildren(...(SITE.now || []).map(([label, text]) => {
        const row = el('div');
        row.append(el('dt', {}, label), el('dd', {}, text));
        return row;
      }));
    }
    const stamp = SITE.updated ? `Updated ${SITE.updated}` : '';
    for (const n of document.querySelectorAll('[data-updated]')) n.textContent = stamp;
  }

  function renderPersonalIndexes() {
    const reading = document.querySelector('[data-reading-list]');
    const kitchen = document.querySelector('[data-kitchen-list]');
    if (reading) {
      reading.replaceChildren(...(SITE.reading || []).map(book => {
        const item = el('article', { class: 'reading-entry' });
        item.append(el('h3', {}, book.title));
        if (book.original) item.append(el('p', { class: 'reading-original', lang: 'zh' }, book.original));
        item.append(el('p', { class: 'reading-author' }, book.author));
        if (book.note) item.append(el('p', { class: 'reading-note' }, book.note));
        return item;
      }));
    }
    if (kitchen) {
      const data = SITE.kitchen || {};
      const groups = [
        ['Dishes', data.dishes],
        ['Buns and bread', data.pastries],
        ['Dumplings and wontons', data.filled],
      ].filter(([, list]) => (list || []).length);
      const nodes = groups.map(([title, list]) => {
        const section = el('section', { class: 'kitchen-group' });
        const ul = el('ul');
        for (const item of list) ul.append(el('li', {}, item));
        section.append(el('h3', {}, title), ul);
        return section;
      });
      if (data.favoriteFilling) {
        const favorite = el('p', { class: 'kitchen-favorite' });
        favorite.append(el('span', { class: 'mono' }, 'Favorite filling'), document.createTextNode(data.favoriteFilling));
        nodes.push(favorite);
      }
      kitchen.replaceChildren(...nodes);
    }
  }


  /* ───────── footer, theme ───────── */

  const ICONS = {
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    x: '<span aria-hidden="true">𝕏</span>',
    email: pixelIcon([
      '##########',
      '##......##',
      '#.#....#.#',
      '#..#..#..#',
      '#...##...#',
      '#........#',
      '##########',
    ]),
    moon: pixelIcon([
      '..####..',
      '.##.....',
      '##......',
      '##......',
      '##......',
      '##.....#',
      '.##..##.',
      '..####..',
    ]),
    sun: pixelIcon([
      '....#....',
      '.#.....#.',
      '...###...',
      '..#####..',
      '#.#####.#',
      '..#####..',
      '...###...',
      '.#.....#.',
      '....#....',
    ]),
  };

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const forced = document.documentElement.dataset.theme;
    return forced ? forced === 'dark' : darkQuery.matches;
  };
  const savedTheme = store.get('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') document.documentElement.dataset.theme = savedTheme;

  function buildFooters() {
    const links = SITE.links || {};
    const items = [
      links.email && ['Email', `mailto:${links.email}`, ICONS.email],
      ['GitHub', `https://github.com/${USER}`, ICONS.github],
      links.linkedin && ['LinkedIn', links.linkedin, ICONS.linkedin],
      links.x && ['X', links.x, ICONS.x],
    ].filter(Boolean);
    const toggles = [];
    const paint = () => {
      const dark = isDark();
      for (const t of toggles) {
        t.innerHTML = `${dark ? ICONS.sun : ICONS.moon}<span>${dark ? 'light' : 'dark'}</span>`;
        t.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      }
    };
    for (const footer of document.querySelectorAll('[data-social]')) {
      const nav = el('nav', { class: 'social', 'aria-label': 'Contact and profiles' });
      for (const [label, href, icon] of items) {
        const a = el('a', { href, 'aria-label': label, title: label });
        if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.innerHTML = icon;
        nav.append(a);
      }
      const stamp = el('span', { class: 'mono footer-stamp' }, SITE.updated ? `Updated ${SITE.updated}` : '');
      const toggle = el('button', { class: 'theme-toggle', type: 'button' });
      toggle.addEventListener('click', () => {
        const next = isDark() ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        store.set('theme', next);
        paint();
      });
      toggles.push(toggle);
      footer.replaceChildren(nav, stamp, toggle);
    }
    darkQuery.addEventListener('change', paint);
    paint();
  }


  /* ───────── wiring ───────── */

  buildMastheads();
  renderNow();
  renderPersonalIndexes();
  buildFooters();

  const timeline = createTimeline(document.getElementById('timeline'), document.getElementById('lens'));
  document.getElementById('replay')?.addEventListener('click', () => timeline.replay());

  const TITLES = { '': SITE.name || 'Home' };
  for (const [key, label] of PAGES) TITLES[key] = `${label} · ${SITE.name}`;
  const views = [...document.querySelectorAll('[data-route]')];
  let first = true;
  function route() {
    const hash = location.hash;
    if (hash && hash !== '#' && !hash.startsWith('#/')) return; // in-page anchors such as the skip link
    let name = hash.replace(/^#\/?/, '').replace(/\/$/, '');
    if (!(name in TITLES)) name = '';
    for (const v of views) v.hidden = v.dataset.route !== name;
    for (const a of document.querySelectorAll('.site-nav a')) {
      if (a.dataset.page === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    document.title = TITLES[name];
    if (name === '') timeline.show(); else timeline.reset();
    if (!first) {
      window.scrollTo(0, 0);
      document.getElementById('content').focus({ preventScroll: true });
    }
    first = false;
  }
  window.addEventListener('hashchange', route);
  route();
  timeline.build(window.LIFE || {});
})();
