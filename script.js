/* Xinrui Zhou: a tree of life drawn as a botanical plate. No build step, no dependencies. */
(() => {
  'use strict';

  const SITE = window.SITE || {};
  const SNAP = window.SNAPSHOT || {};
  const USER = SITE.github || 'xinrui-z';
  const NS = 'http://www.w3.org/2000/svg';
  const DAY_MS = 86400000;
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
  const ease = t => t * t * (3 - 2 * t);
  const easeBack = t => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
  const utc = iso => new Date(String(iso).slice(0, 10) + 'T00:00:00Z');
  const fmt = opts => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });
  const fmtDay = fmt({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDate = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
  const fmtMonth = fmt({ month: 'short', year: 'numeric' });
  const fmtMonthOnly = fmt({ month: 'short' });
  const num = n => n.toLocaleString('en-US');
  const plural = (n, one, many = one + 's') => `${num(n)} ${n === 1 ? one : many}`;
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
  async function getJSON(url, timeout = 4000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } finally { clearTimeout(timer); }
  }
  const short = n => Math.round(n * 10) / 10;
  const pt = p => `${short(p[0])},${short(p[1])}`;

  /* ───────── data ───────── */

  function withLevels(entries) {
    const nonzero = entries.map(d => d.count).filter(Boolean).sort((a, b) => a - b);
    const q = p => nonzero.length ? nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] : 1;
    const [q1, q2, q3] = [q(.25), q(.5), q(.75)];
    return entries.map(d => ({ ...d,
      level: d.count === 0 ? 0 : d.count <= q1 ? 1 : d.count <= q2 ? 2 : d.count <= q3 ? 3 : 4 }));
  }

  async function loadCalendar() {
    try {
      const data = await getJSON(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(USER)}?y=last`, 3000);
      const list = (data.contributions || []).map(d => ({ date: utc(d.date), count: d.count | 0 }));
      if (list.length < 300) throw new Error('short calendar');
      return withLevels(list);
    } catch {
      const { start = '2025-11-09', counts = [] } = SNAP.calendar || {};
      const t0 = utc(start).getTime();
      return withLevels(counts.map((count, i) => ({ date: new Date(t0 + i * DAY_MS), count })));
    }
  }

  async function loadPulls() {
    try {
      const q = encodeURIComponent(`author:${USER} is:pr is:merged`);
      const data = await getJSON(`https://api.github.com/search/issues?q=${q}&per_page=100&sort=created&order=desc`, 2600);
      const live = (data.items || []).map(item => ({
        date: utc(item.pull_request?.merged_at || item.closed_at),
        repo: item.repository_url.split('/repos/')[1],
        number: item.number, title: item.title,
      }));
      if (live.length) return live;
    } catch { /* fall back to the snapshot */ }
    return (SNAP.pulls || []).map(([date, repo, number, title]) => ({ date: utc(date), repo, number, title }));
  }

  // One limb per repository, ordered by when I first contributed to it.
  function buildModel(pulls) {
    const sorted = [...pulls].sort((a, b) => a.date - b.date || a.number - b.number);
    sorted.forEach((p, i) => { p.rank = i; });
    const byRepo = new Map();
    for (const p of sorted) {
      if (!byRepo.has(p.repo)) byRepo.set(p.repo, []);
      byRepo.get(p.repo).push(p);
    }
    const limbs = [...byRepo.entries()].map(([repo, list]) => ({
      repo, pulls: list, first: list[0].date, last: list[list.length - 1].date,
      own: repo.split('/')[0].toLowerCase() === USER.toLowerCase(),
      stars: (SNAP.stars || {})[repo],
      note: (SITE.repoNotes || {})[repo],
    })).sort((a, b) => a.first - b.first);
    limbs.forEach((l, i) => { l.index = i; l.letter = String.fromCharCode(97 + i); l.wash = i % 5; });
    for (const l of limbs) for (const p of l.pulls) p.limb = l;
    return { pulls: sorted, limbs };
  }

  /* ───────── Plate I: the tree of life ───────── */

  const bez = (P, t) => {
    const u = 1 - t;
    return [0, 1].map(k => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]);
  };
  const bezD = (P, t) => {
    const u = 1 - t;
    const d = [0, 1].map(k => 3 * u * u * (P[1][k] - P[0][k]) + 6 * u * t * (P[2][k] - P[1][k]) + 3 * t * t * (P[3][k] - P[2][k]));
    const len = Math.hypot(d[0], d[1]) || 1;
    return [d[0] / len, d[1] / len];
  };
  const wrapDeg = a => ((a + 540) % 360) - 180;

  // A tapered limb outline (plus engraving-style shading) along a cubic curve, grown to fraction g.
  function limbShape(P, w0, w1, g, { hatch = false, fibres = false } = {}) {
    if (g <= 0) return { body: '', hatch: '', fibres: '' };
    const steps = 26, left = [], right = [], centre = [];
    for (let i = 0; i <= steps; i++) {
      const t = g * i / steps;
      const c = bez(P, t), d = bezD(P, t), n = [-d[1], d[0]];
      const w = (w0 + (w1 - w0) * t) / 2;
      left.push([c[0] + n[0] * w, c[1] + n[1] * w]);
      right.push([c[0] - n[0] * w, c[1] - n[1] * w]);
      centre.push({ c, d, n, w });
    }
    const tip = centre[steps];
    const cap = [tip.c[0] + tip.d[0] * tip.w * .8, tip.c[1] + tip.d[1] * tip.w * .8];
    const body = `M${left.map(pt).join('L')}Q${pt(cap)} ${pt(right[steps])}L${right.reverse().map(pt).join('L')}Z`;
    let hatchD = '', fibreD = '';
    if (hatch) {
      let acc = 0;
      for (let i = 1; i < centre.length; i++) {
        const a = centre[i - 1].c, b = centre[i].c;
        acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc < 5.5) continue;
        acc = 0;
        const { c, n, w, d } = centre[i];
        if (w < 2.6) continue;
        const s = n[0] >= 0 ? 1 : -1;
        const p1 = [c[0] + n[0] * s * w * .3, c[1] + n[1] * s * w * .3];
        const p2 = [c[0] + n[0] * s * w * .86 + d[0] * 2.2, c[1] + n[1] * s * w * .86 + d[1] * 2.2];
        hatchD += `M${pt(p1)}L${pt(p2)}`;
      }
    }
    if (fibres) {
      for (const off of [-.42, -.12, .2]) {
        fibreD += 'M' + centre.filter((_, i) => i % 2 === 0).map(({ c, n, w }, i) =>
          pt([c[0] + n[0] * w * (off + Math.sin(i * .9 + off * 7) * .05), c[1] + n[1] * w * off])).join('L');
      }
    }
    return { body, hatch: hatchD, fibres: fibreD };
  }

  function leafPath(len) {
    const p = 5, hw = len * .21, L = p + len;
    const blade = `M0,0L${p},0C${short(p + len * .2)},${short(-hw * 1.15)} ${short(p + len * .64)},${short(-hw * 1.05)} ${short(L)},0` +
      `C${short(p + len * .64)},${short(hw * 1.05)} ${short(p + len * .2)},${short(hw * 1.15)} ${p},0Z`;
    let veins = `M${p},0L${short(p + len * .93)},0`;
    for (let v = 1; v <= 5; v++) {
      const x = p + len * v / 6.4;
      const half = hw * Math.sin(Math.PI * v / 6.4) * .95;
      for (const s of [-1, 1]) veins += `M${short(x)},0Q${short(x + len * .07)},${short(s * half * .35)} ${short(x + len * .15)},${short(s * half * .82)}`;
    }
    return { blade, veins };
  }

  function createPlate(svg, lens) {
    const GROUND = 590;
    const TRUNK = [[300, GROUND], [284, 470], [318, 320], [300, 150]];
    const PETALS = [5, 6, 5, 7, 4];
    let parts = null, progress = 0, startedAt = null, raf = 0, grown = false, running = false;
    let lastPointer = 'mouse', yearAt = () => '';

    const lensK = lens.querySelector('.lens-kicker'), lensT = lens.querySelector('.lens-title'), lensM = lens.querySelector('.lens-meta');
    function setLens(kicker, title, meta, on = true) {
      lensK.textContent = kicker; lensT.textContent = title; lensM.textContent = meta;
      lens.classList.toggle('on', on);
    }
    lens.querySelector('.lens-close')?.addEventListener('click', () => clear());
    document.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || !lens.classList.contains('on')) return;
      if (svg.contains(e.target) || lens.contains(e.target) || e.target.closest?.('.limb-key')) return;
      clear();
    });
    function resetLens() {
      setLens('Under the lens', 'Hover over anything on the plate.',
        'Every leaf, vine, and root has a story. Leaves with links open when you click them.', false);
    }
    function clear() {
      svg.classList.remove('dim');
      svg.querySelectorAll('.lit, .on').forEach(n => n.classList.remove('lit', 'on'));
      document.querySelectorAll('.limb-key button.lit').forEach(n => n.classList.remove('lit'));
      resetLens();
    }

    // Make any plate element examinable: hover, focus or tap shows its story under the lens.
    function examinable(node, show, { focusable = true, label = '' } = {}) {
      if (focusable && node.tagName.toLowerCase() !== 'a') {
        node.setAttribute('tabindex', '0');
        node.setAttribute('role', 'button');
      }
      if (label) node.setAttribute('aria-label', label);
      node.addEventListener('pointerenter', show);
      node.addEventListener('focus', show);
      node.addEventListener('blur', clear);
      node.addEventListener('click', e => {
        if (node.tagName.toLowerCase() === 'a' && lastPointer === 'touch' && !node.classList.contains('on')) {
          e.preventDefault(); // on touch, the first tap examines; the second opens
        }
        show();
      });
    }

    // A helix around the trunk, as points; `front` marks the side facing the viewer.
    const VINE_TOP = .93, VINE_TURNS = 5;
    function vinePoints(phi, g) {
      const pts = [], steps = 170, top = .015 + (VINE_TOP - .015) * g;
      for (let i = 0; i <= steps; i++) {
        const u = .015 + (top - .015) * i / steps;
        const c = bez(TRUNK, u);
        const rad = (28 + (6 - 28) * u) / 2 + 3;
        const a = Math.PI * 2 * VINE_TURNS * u + phi;
        pts.push({ x: c[0] + rad * Math.sin(a), y: c[1] + rad * .22 * Math.cos(a), front: Math.cos(a) >= 0, u, cx: c[0] });
      }
      return pts;
    }
    function runs(pts, wantFront) {
      let d = '', open = false;
      pts.forEach((pt, i) => {
        const on = pt.front === wantFront || (i > 0 && pts[i - 1].front === wantFront);
        if (on) { d += `${open ? 'L' : 'M'}${short(pt.x)},${short(pt.y)}`; open = true; } else open = false;
      });
      return d;
    }

    function build(life, oss) {
      svg.replaceChildren();
      const r = seeded(20200101);
      const now = Date.now();
      const tStart = utc(life.start || '2020-01-01').getTime(), tEnd = now;
      const uOf = date => .05 + .85 * clamp((date.getTime() - tStart) / (tEnd - tStart), 0, 1);
      yearAt = f => new Date(tStart + (tEnd - tStart) * clamp(f, 0, 1)).getUTCFullYear();

      // Limbs, with the open-source limb filled from GitHub.
      const limbsData = (life.limbs || []).map(l => {
        if (!l.fromGitHub) return { ...l, start: utc(l.start) };
        const repos = oss?.limbs || [];
        return { ...l, start: repos.length ? repos[0].first : utc(l.start), leaves: repos.map(rp => ({
          title: rp.repo, year: plural(rp.pulls.length, 'merged PR'),
          text: rp.note || 'Merged work on GitHub.', href: `https://github.com/${rp.repo}`,
        })) };
      }).filter(l => l.leaves.length).sort((a, b) => a.start - b.start);

      const layers = {};
      for (const name of ['scale', 'roots', 'limbs', 'vinesBack', 'trunk', 'vinesFront', 'ground', 'leaves', 'tips']) {
        layers[name] = svgEl('g', { class: `layer-${name}` });
        svg.append(layers[name]);
      }

      /* Time scale */
      const scale = { ticks: [] };
      const yOf = d => bez(TRUNK, uOf(d))[1];
      const y0 = yOf(new Date(tStart)), y1 = yOf(new Date(tEnd));
      scale.line = svgEl('path', { class: 'scale', d: `M40,${short(y0)}L40,${short(y1)}` });
      layers.scale.append(scale.line);
      for (let yr = new Date(tStart).getUTCFullYear(); yr <= new Date(tEnd).getUTCFullYear(); yr++) {
        const d = new Date(Date.UTC(yr, 0, 1));
        if (d.getTime() < tStart) continue;
        const y = yOf(d);
        const g = svgEl('g');
        g.append(svgEl('path', { class: 'scale', d: `M40,${short(y)}L34,${short(y)}` }),
          svgEl('text', { class: 'scale-label', x: 31, y: short(y + 3), 'text-anchor': 'end' }, String(yr)));
        for (let q = 1; q < 4; q++) {
          const dq = new Date(Date.UTC(yr, q * 3, 1));
          if (dq.getTime() > tEnd) break;
          g.append(svgEl('path', { class: 'scale', d: `M40,${short(yOf(dq))}L37.5,${short(yOf(dq))}` }));
        }
        layers.scale.append(g);
        scale.ticks.push(g);
      }
      const today = svgEl('text', { class: 'note', x: 46, y: short(y1 + 4) }, 'today');
      layers.scale.append(today);
      scale.ticks.push(today);

      // Phases: a bracket beside the scale, e.g. university years.
      for (const ph of life.phases || []) {
        const ya = yOf(utc(ph.start)), yb = yOf(utc(ph.end));
        const g = svgEl('g', { class: 'phase' });
        const mid = (ya + yb) / 2;
        g.append(
          svgEl('path', { class: 'hit', d: `M52,${short(ya)}L52,${short(yb)}` }),
          svgEl('path', { class: 'phase-line', d: `M49,${short(ya)}L53,${short(ya)}L53,${short(yb)}L49,${short(yb)}` }),
          svgEl('text', { class: 'phase-label', x: 0, y: 0, transform: `translate(64,${short(mid)}) rotate(-90)`, 'text-anchor': 'middle' }, ph.title));
        layers.scale.append(g);
        scale.ticks.push(g);
        examinable(g, () => { clear(); g.classList.add('on'); setLens(`Phase · ${ph.span || ''}`, ph.title, ph.text || ''); },
          { label: `${ph.title}, ${ph.span}. ${ph.text || ''}` });
      }

      /* Roots: what feeds me */
      const roots = (life.roots || []).map((root, i, all) => {
        const f = all.length > 1 ? i / (all.length - 1) : .5;
        const x = 112 + 376 * f, y = GROUND + 62 + 70 * Math.sin(Math.PI * f);
        const sx = 300 + (f - .5) * 16;
        const d = `M${short(sx)},${GROUND - 1}C${short(sx + (x - sx) * .15)},${short(GROUND + (y - GROUND) * .55)} ${short(x - (x - sx) * .25)},${short(y - 18)} ${short(x)},${short(y)}`;
        const spur = `M${short(sx + (x - sx) * .55)},${short(GROUND + (y - GROUND) * .7)}q${short((x - sx) * .08 + (r() - .5) * 10)},${short(10 + r() * 8)} ${short((x - sx) * .1)},${short(18 + r() * 10)}`;
        const g = svgEl('g', { class: 'root-g' });
        const path = svgEl('path', { class: 'root', d, pathLength: 1 });
        const spurP = svgEl('path', { class: 'root fine', d: spur, pathLength: 1 });
        const hit = svgEl('path', { class: 'hit', d });
        const label = svgEl('text', { class: 'root-label', x: short(x), y: short(y + 17), 'text-anchor': 'middle' }, root.label);
        g.append(hit, path, spurP, label);
        layers.roots.append(g);
        examinable(g, () => { clear(); g.classList.add('on'); setLens('Root · what keeps me grounded', root.title, root.text); },
          { label: `${root.title}. ${root.text}` });
        return { g, path, spurP, label };
      });

      let groundD = '';
      for (let x = 130; x < 470; x += 7 + r() * 9) {
        const len = 4 + r() * 9;
        groundD += `M${short(x)},${GROUND}L${short(x + len)},${GROUND}`;
        if (r() < .35) groundD += `M${short(x + 2)},${GROUND}L${short(x + 2 + (r() - .5) * 4)},${short(GROUND - 3 - r() * 5)}`;
      }
      const ground = svgEl('path', { class: 'ground', d: groundD });
      layers.ground.append(ground);

      /* Trunk, crowned by "now" */
      const trunk = { ink: svgEl('path', { class: 'ink' }), fibres: svgEl('path', { class: 'fibre' }), hatch: svgEl('path', { class: 'hatch' }) };
      layers.trunk.append(trunk.ink, trunk.fibres, trunk.hatch);
      const nowData = life.now || {};
      // Vines: habits that run through every chapter, wound around the whole trunk.
      const vines = (life.vines || []).map((vine, vi, all) => {
        const phi = Math.PI * 2 * vi / Math.max(1, all.length);
        const full = vinePoints(phi, 1);
        const g = svgEl('g', { class: 'vine' });
        const back = svgEl('path', { class: 'vine-line back' });
        const front = svgEl('path', { class: 'vine-line' });
        layers.vinesBack.append(back);
        g.append(svgEl('path', { class: 'hit', d: runs(full, true) }), front);
        const deco = [];
        full.forEach((pt, k) => {
          if (!pt.front || k < 6) return;
          const side = pt.x >= pt.cx ? 1 : -1;
          if (k % 34 === 17) {
            const fl = svgEl('g', { transform: `translate(${short(pt.x)},${short(pt.y)})` });
            const inner = svgEl('g', { transform: 'scale(0)' });
            for (let j = 0; j < 5; j++) inner.append(svgEl('ellipse', { class: `petal p${vi % 5}`, cx: 0, cy: -3.2, rx: 1.7, ry: 3, transform: `rotate(${j * 72})` }));
            inner.append(svgEl('circle', { class: 'pistil', r: 1 }));
            fl.append(inner); g.append(fl); deco.push({ inner, u: pt.u });
          } else if (k % 11 === 0) {
            const { blade } = leafPath(9 + r() * 3);
            const lf = svgEl('g', { transform: `translate(${short(pt.x)},${short(pt.y)}) rotate(${side > 0 ? -30 - r() * 20 : -150 + r() * 20})` });
            const inner = svgEl('g', { transform: 'scale(0)' });
            inner.append(svgEl('path', { class: `blade vine-leaf w${[0, 2, 1, 4][vi % 4]}`, d: blade }));
            lf.append(inner); g.append(lf); deco.push({ inner, u: pt.u });
          }
        });
        const side = vi % 2 === 0 ? -1 : 1;
        g.append(svgEl('text', { class: 'vine-label', x: 300 + side * 26, y: GROUND - 8 - 17 * Math.floor(vi / 2), 'text-anchor': side < 0 ? 'end' : 'start' }, vine.label));
        layers.vinesFront.append(g);
        examinable(g, () => { clear(); g.classList.add('on'); setLens('Vine · through every chapter', vine.title, vine.text); },
          { label: `${vine.title}. ${vine.text}` });
        return { g, front, back, phi, deco, label: g.lastChild };
      });

      const budG = svgEl('g', { class: 'now-g', transform: `translate(${TRUNK[3][0]},${TRUNK[3][1] + 2})` });
      budG.append(svgEl('path', { class: 'bud', d: 'M0,0C-6,-7 -5,-16 0,-24C5,-16 6,-7 0,0Z' }),
        svgEl('text', { class: 'now-label', x: 12, y: -10 }, 'now'),
        svgEl('text', { class: 'now-sub', x: 12, y: 6 }, nowData.label || (nowData.title || '').toLowerCase()));
      layers.tips.append(budG);
      examinable(budG, () => { clear(); budG.classList.add('on'); setLens('Top of the trunk · now', nowData.title || 'Now', nowData.text || ''); },
        { label: `Now: ${nowData.title}. ${nowData.text}` });

      const makeLeaf = (leaf, at, ang, len, wash, kicker) => {
        const { blade, veins } = leafPath(len);
        const a = leaf.href
          ? svgEl('a', { class: 'leaf', href: leaf.href, target: '_blank', rel: 'noopener noreferrer' })
          : svgEl('g', { class: 'leaf' });
        const outer = svgEl('g', { transform: `translate(${short(at[0])},${short(at[1])}) rotate(${short(ang)})` });
        const inner = svgEl('g', { transform: 'scale(0)' });
        inner.append(svgEl('path', { class: `blade w${wash}`, d: blade }), svgEl('path', { class: 'vein', d: veins }));
        outer.append(inner);
        a.append(outer);
        return { a, inner, show: () => {
          setLens(kicker, leaf.title, `${leaf.text || ''}${leaf.href ? (lastPointer === 'touch' ? ' Tap again to open.' : ' Click to open.') : ''}`);
        }, label: `${leaf.title}. ${leaf.text || ''}` };
      };

      const allLeaves = [];
      (nowData.leaves || []).forEach((leaf, k) => {
        const u = .9 + .05 * k;
        const at = bez(TRUNK, u);
        const side = k % 2 === 0 ? 1 : -1;
        const made = makeLeaf(leaf, at, -90 + side * 42, 30 + r() * 6, 0, 'Now');
        made.appear = .05 + .42 * u + .02;
        layers.leaves.append(made.a);
        examinable(made.a, () => { clear(); made.a.classList.add('on'); made.show(); }, { label: made.label });
        allLeaves.push(made);
      });

      /* Limbs */
      const limbs = limbsData.map((limb, i) => {
        const letter = String.fromCharCode(97 + i);
        const wash = i % 5;
        const side = i % 2 === 0 ? -1 : 1;
        const u0 = clamp(uOf(limb.start), .1, .8);
        const O = bez(TRUNK, u0);
        const n = limb.leaves.length;
        const theta = (70 - 30 * u0) * Math.PI / 180;
        const L = Math.min(260, 125 + 46 * Math.sqrt(n)) * (1 - .25 * u0);
        const d0 = [side * Math.sin(theta), -Math.cos(theta)];
        let E = [O[0] + d0[0] * L * .82, O[1] + d0[1] * L * .82 - L * .42];
        E = [clamp(E[0], 110, 530), Math.max(E[1], 70)];
        const P = [O, [O[0] + d0[0] * L * .4, O[1] + d0[1] * L * .4],
          [O[0] + d0[0] * L * .8, O[1] + d0[1] * L * .8 - L * .12], E];
        const w0 = 4 + 1.7 * Math.sqrt(n);
        const g = svgEl('g', { class: 'limb', 'data-limb': i });
        const ink = svgEl('path', { class: 'ink' }), hatch = svgEl('path', { class: 'hatch' });
        g.append(ink, hatch);
        layers.limbs.append(g);
        const start = .05 + .42 * u0 + .02, dur = .26;
        const hosts = [{ P, w0, w1: 1, start, dur, ink, hatch, main: true }];
        const addTwig = (at, turn, lenF) => {
          const base = bez(P, at), dir = bezD(P, at);
          const a = Math.atan2(dir[1], dir[0]) + turn;
          const len = L * lenF;
          const end = [clamp(base[0] + Math.cos(a) * len, 100, 540), base[1] + Math.sin(a) * len - len * .12];
          const TP = [base, [base[0] + Math.cos(a) * len * .4, base[1] + Math.sin(a) * len * .4],
            [base[0] + Math.cos(a) * len * .8, base[1] + Math.sin(a) * len * .8 - len * .08], end];
          const tInk = svgEl('path', { class: 'ink' });
          g.append(tInk);
          hosts.push({ P: TP, w0: Math.max(1.8, w0 * .45), w1: .8, start: start + dur * at, dur: .16, ink: tInk, hatch: null });
        };
        if (n > 3) addTwig(.48, -side * .62, .46);
        if (n > 6) addTwig(.72, side * .5, .34);

        const perHost = hosts.map(() => []);
        limb.leaves.forEach((leaf, k) => perHost[k % hosts.length].push(leaf));
        const leaves = [];
        perHost.forEach((list, h) => {
          const host = hosts[h];
          list.forEach((leaf, j) => {
            const s = host.main ? .26 + .58 * (j + .5) / list.length : .26 + .66 * (j + .5) / list.length;
            const at = bez(host.P, s), dir = bezD(host.P, s);
            const phi = Math.atan2(dir[1], dir[0]) * 180 / Math.PI;
            let ang = phi + (j % 2 === 0 ? 1 : -1) * (48 + r() * 14);
            ang = ang + wrapDeg(-90 - ang) * .22;
            const made = makeLeaf(leaf, at, ang, (host.main ? 31 : 26) + r() * 12, wash,
              `${letter}. ${limb.name}${leaf.year ? ' · ' + leaf.year : ''}`);
            made.appear = host.start + host.dur * s + .03;
            made.a.setAttribute('data-limb', i);
            leaves.push(made);
          });
        });

        // Tips (limb first, then twigs) are where flowers can grow.
        const tipSpots = hosts.map(h => ({ pos: h.P[3], P: h.P, side: h.main ? side : -side, t: h.start + h.dur, main: !!h.main }));
        const lp = bez(P, .2);
        const letterEl = svgEl('text', { class: 'letter', x: short(lp[0] + side * 4), y: short(lp[1] + 18), 'text-anchor': side < 0 ? 'end' : 'start' }, `${letter}.`);
        g.append(letterEl);

        const showLimb = () => {
          clear();
          svg.classList.add('dim');
          svg.querySelectorAll(`.limb[data-limb="${i}"], .leaf[data-limb="${i}"]`).forEach(nd => nd.classList.add('lit'));
          document.querySelector(`.limb-key button[data-limb="${i}"]`)?.classList.add('lit');
          setLens(`Limb ${letter} · ${limb.span || 'since ' + limb.start.getUTCFullYear()}`, limb.name,
            `${limb.blurb || ''} ${plural(n, 'leaf', 'leaves')}.`.trim());
        };
        g.addEventListener('pointerenter', showLimb);
        for (const made of leaves) {
          layers.leaves.append(made.a);
          examinable(made.a, () => {
            showLimb();
            made.a.classList.add('on');
            made.show();
          }, { label: made.label });
          allLeaves.push(made);
        }
        return { limb, letter, g, hosts, tipSpots, letterEl, showLimb, end: start + dur };
      });

      if (!svg.dataset.wired) {
        svg.dataset.wired = '1';
        svg.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
        svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') clear(); });
      }

      // Flowers: one per tip, limb tips first, then twig tips. Leftover limb tips get a bud.
      const spots = [...limbs.map(l => l.tipSpots[0]), ...limbs.flatMap(l => l.tipSpots.slice(1))];
      const tips = [];
      spots.forEach((spot, k) => {
        const blossom = (life.blossoms || [])[k];
        if (!blossom && !spot.main) return;
        const tipG = svgEl('g', { transform: `translate(${short(spot.pos[0])},${short(spot.pos[1])})`, opacity: 0 });
        if (blossom) {
          const fl = svgEl('g', { class: 'flower' });
          const petals = PETALS[k % PETALS.length];
          for (let j = 0; j < petals; j++) {
            fl.append(svgEl('ellipse', { class: `petal p${k % 5}`, cx: 0, cy: -6.8, rx: 3.5, ry: 6.4, transform: `rotate(${short(j * 360 / petals + 12)})` }));
          }
          fl.append(svgEl('circle', { class: 'pistil', r: 2 }));
          fl.append(svgEl('text', { class: 'bloom-label', x: spot.side * 12, y: -13, 'text-anchor': spot.side < 0 ? 'end' : 'start' }, blossom.label));
          tipG.append(fl);
          examinable(fl, () => { clear(); fl.classList.add('on'); setLens('Flower · just for fun', blossom.title, blossom.text); },
            { label: `${blossom.title}. ${blossom.text}` });
        } else {
          const tipDir = bezD(spot.P, 1);
          tipG.append(svgEl('path', { class: 'bud', d: 'M0,0C-3,-4 -2.5,-9 0,-13C2.5,-9 3,-4 0,0Z', transform: `rotate(${short(Math.atan2(tipDir[1], tipDir[0]) * 180 / Math.PI + 90)})` }));
        }
        layers.tips.append(tipG);
        tips.push({ g: tipG, t: spot.t });
      });

      // Caption key.
      const key = document.getElementById('limb-key');
      key.replaceChildren();
      limbs.forEach((lb, i) => {
        const b = el('button', { type: 'button', 'data-limb': i });
        b.append(el('i', {}, `${lb.letter}.`), document.createTextNode(` ${lb.limb.name}`));
        b.addEventListener('pointerenter', lb.showLimb);
        b.addEventListener('focus', lb.showLimb);
        b.addEventListener('click', lb.showLimb);
        b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') clear(); });
        b.addEventListener('blur', clear);
        key.append(b, document.createTextNode(i < limbs.length - 1 ? '; ' : '.'));
      });

      parts = { scale, roots, ground, trunk, budG, vines, limbs, tips, allLeaves };
      draw();
    }

    function draw() {
      if (!parts) return;
      const p = progress;
      const fade = (t0, t1) => clamp((p - t0) / (t1 - t0), 0, 1);
      parts.scale.line.setAttribute('opacity', fade(.04, .18));
      const nt = parts.scale.ticks.length;
      parts.scale.ticks.forEach((t, i) => t.setAttribute('opacity', fade(.05 + .42 * i / nt, .1 + .42 * i / nt)));
      const rg = ease(fade(0, .16));
      parts.roots.forEach(rt => {
        rt.path.setAttribute('stroke-dasharray', `${short(rg * 100) / 100} 1`);
        rt.spurP.setAttribute('stroke-dasharray', `${short(fade(.1, .2) * 100) / 100} 1`);
        rt.label.setAttribute('opacity', fade(.14, .22));
      });
      parts.ground.setAttribute('opacity', fade(0, .06));
      const ts = limbShape(TRUNK, 28, 6, ease(clamp((p - .05) / .42, 0, 1)), { hatch: true, fibres: true });
      parts.trunk.ink.setAttribute('d', ts.body);
      parts.trunk.hatch.setAttribute('d', ts.hatch);
      parts.trunk.fibres.setAttribute('d', ts.fibres);
      parts.budG.setAttribute('opacity', fade(.47, .55));
      const vg = ease(clamp((p - .05) / .42, 0, 1));
      for (const v of parts.vines) {
        const pts = vg > 0 ? vinePoints(v.phi, vg) : [];
        v.front.setAttribute('d', runs(pts, true));
        v.back.setAttribute('d', runs(pts, false));
        v.label.setAttribute('opacity', fade(.04, .12));
        for (const d of v.deco) {
          const t = clamp((vg * VINE_TOP - d.u) / .05, 0, 1);
          d.inner.setAttribute('transform', `scale(${t === 0 ? 0 : Math.round(easeBack(t) * 100) / 100})`);
        }
      }
      for (const limb of parts.limbs) {
        for (const host of limb.hosts) {
          const shape = limbShape(host.P, host.w0, host.w1, ease(clamp((p - host.start) / host.dur, 0, 1)), { hatch: !!host.hatch });
          host.ink.setAttribute('d', shape.body);
          host.hatch?.setAttribute('d', shape.hatch);
        }
        limb.letterEl.setAttribute('opacity', fade(limb.hosts[0].start + .05, limb.hosts[0].start + .1));
      }
      for (const tip of parts.tips) tip.g.setAttribute('opacity', fade(tip.t, tip.t + .08));
      for (const leaf of parts.allLeaves) {
        const t = clamp((p - leaf.appear) / .07, 0, 1);
        leaf.inner.setAttribute('transform', `scale(${t === 0 ? 0 : Math.round(easeBack(t) * 100) / 100})`);
      }
      if (!grown && p < 1 && !lens.classList.contains('on')) {
        setLens('Growing', String(yearAt((p - .05) / .42)), 'The trunk is time.', false);
      }
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      if (startedAt === null) startedAt = now;
      progress = clamp((now - startedAt) / 5200, 0, 1);
      draw();
      if (progress < 1) raf = requestAnimationFrame(frame);
      else { grown = true; markGrown(); if (!lens.classList.contains('on')) resetLens(); }
    }
    function finish() { progress = 1; grown = true; markGrown(); draw(); if (!lens.classList.contains('on')) resetLens(); }
    // The tree grows once per visit; after that it is simply there.
    function markGrown() { try { sessionStorage.setItem('tree-grown', '1'); } catch { /* storage unavailable */ } }
    function grownBefore() { try { return sessionStorage.getItem('tree-grown') === '1'; } catch { return false; } }

    return {
      build(life, oss) {
        const wasGrown = grown;
        build(life, oss);
        if (wasGrown) finish();
      },
      show() {
        running = true;
        if (!parts) return;
        if (grown || reduceMotion.matches || grownBefore()) { finish(); return; }
        if (!raf) raf = requestAnimationFrame(frame);
      },
      replay() {
        if (!parts) return;
        clear();
        grown = false; progress = 0; startedAt = null; running = true;
        draw();
        if (reduceMotion.matches) { finish(); return; }
        if (!raf) raf = requestAnimationFrame(frame);
      },
      hide() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (parts && !grown) finish();
      },
    };
  }

  /* ───────── Fig. 2: phenology ───────── */

  const RADII = [1.4, 2.1, 2.9, 3.7, 4.5];
  const ALPHA = [1, .5, .68, .85, 1];
  function dot(level, cx, cy) {
    return level === 0
      ? svgEl('circle', { class: 'ring', cx, cy, r: RADII[0] })
      : svgEl('circle', { class: 'dot', cx, cy, r: RADII[level], 'fill-opacity': ALPHA[level] });
  }

  function createPhenology(svg, readout) {
    const STEP = 12, LEFT = 30, TOP = 16;
    let days = [], active = null, marker = null, cells = [];
    function render(list) {
      days = list;
      svg.replaceChildren();
      const offset = days[0].date.getUTCDay();
      const weeks = Math.ceil((days.length + offset) / 7);
      svg.setAttribute('viewBox', `0 0 ${LEFT + weeks * STEP} ${TOP + 7 * STEP}`);
      [['MON', 1], ['WED', 3], ['FRI', 5]].forEach(([label, dow]) =>
        svg.append(svgEl('text', { class: 'label', x: 0, y: TOP + dow * STEP + STEP / 2 + 3 }, label)));
      let lastLabel = -4;
      cells = days.map((d, i) => {
        const idx = i + offset, week = Math.floor(idx / 7), dow = idx % 7;
        if (dow === 0 && d.date.getUTCDate() <= 7 && week - lastLabel >= 3) {
          svg.append(svgEl('text', { class: 'label', x: LEFT + week * STEP, y: TOP - 6 }, fmtMonthOnly.format(d.date).toUpperCase()));
          lastLabel = week;
        }
        const cx = LEFT + week * STEP + STEP / 2, cy = TOP + dow * STEP + STEP / 2;
        const g = svgEl('g', { 'data-i': i });
        g.append(svgEl('rect', { class: 'cell', x: cx - STEP / 2, y: cy - STEP / 2, width: STEP, height: STEP }), dot(d.level, cx, cy));
        svg.append(g);
        return [cx, cy];
      });
      marker = svgEl('circle', { class: 'marker', r: 6, opacity: 0 });
      svg.append(marker);
      svg.setAttribute('tabindex', '0');
      svg.setAttribute('aria-label', `GitHub contribution calendar, ${fmtDate.format(days[0].date)} to ${fmtDate.format(days[days.length - 1].date)}. Use the arrow keys to step through days.`);
      const wrap = svg.parentElement;
      requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
    }
    function setActive(i) {
      active = i;
      if (i === null || !days[i]) { marker?.setAttribute('opacity', 0); readout.innerHTML = '&nbsp;'; return; }
      marker.setAttribute('cx', cells[i][0]); marker.setAttribute('cy', cells[i][1]); marker.setAttribute('opacity', 1);
      const d = days[i];
      readout.textContent = `${fmtDay.format(d.date)} · ${d.count === 0 ? 'no contributions' : plural(d.count, 'contribution')}`;
    }
    svg.addEventListener('pointerover', e => { const g = e.target.closest?.('[data-i]'); if (g) setActive(+g.dataset.i); });
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setActive(null); });
    svg.addEventListener('keydown', e => {
      const move = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1, Home: -1e9, End: 1e9 }[e.key];
      if (move === undefined || !days.length) return;
      e.preventDefault();
      setActive(clamp((active ?? days.length - 1) + move, 0, days.length - 1));
    });
    svg.addEventListener('blur', () => setActive(null));
    return { render };
  }

  function drawLegend(svg) {
    svg.append(svgEl('text', { x: 0, y: 10 }, 'less'));
    [0, 1, 2, 3, 4].forEach((lvl, i) => svg.append(dot(lvl, 34 + i * 12, 7)));
    svg.append(svgEl('text', { x: 92, y: 10 }, 'more'));
  }

  /* ───────── Plate III: catalogue ───────── */

  function renderCatalogue(model) {
    const groupsEl = document.getElementById('pr-groups');
    const summaryEl = document.getElementById('pr-summary');
    if (!model.pulls.length) { summaryEl.textContent = 'Merged pull requests will appear here.'; return; }
    summaryEl.textContent = `${plural(model.pulls.length, 'merged pull request')} across ${plural(model.limbs.length, 'repository', 'repositories')}, ` +
      `from ${fmtMonth.format(model.pulls[0].date)} to ${fmtMonth.format(model.pulls[model.pulls.length - 1].date)}. ` +
      'Numbered in the order they were merged.';
    groupsEl.replaceChildren(...model.limbs.map(limb => {
      const group = el('section', { class: 'pr-group' });
      const head = el('div', { class: 'pr-group-head' });
      const swatch = el('span', { class: 'pr-swatch', 'aria-hidden': 'true' });
      swatch.style.background = `var(--w${limb.wash})`;
      const h2 = el('h2');
      h2.append(el('a', { href: `https://github.com/${limb.repo}`, target: '_blank', rel: 'noopener noreferrer' }, limb.repo));
      const meta = [plural(limb.pulls.length, 'merged PR'), limb.own ? 'maintainer' : '', limb.own && limb.stars != null ? `★ ${num(limb.stars)}` : '']
        .filter(Boolean).join(' · ');
      head.append(swatch, h2, el('span', { class: 'mono' }, meta));
      group.append(head);
      if (limb.note) group.append(el('p', { class: 'pr-note' }, limb.note));
      const ul = el('ul', { class: 'pr-list' });
      for (const p of [...limb.pulls].reverse()) {
        const li = el('li');
        li.append(el('span', { class: 'no' }, `No.${String(p.rank + 1).padStart(3, '0')}`));
        li.append(el('time', { datetime: p.date.toISOString().slice(0, 10) }, fmtDate.format(p.date)));
        li.append(el('a', { href: `https://github.com/${p.repo}/pull/${p.number}`, target: '_blank', rel: 'noopener noreferrer' }, p.title));
        ul.append(li);
      }
      group.append(ul);
      return group;
    }));
  }

  /* ───────── footer, theme ───────── */

  const ICONS = {
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    x: '<span class="x-mark" aria-hidden="true">𝕏</span>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="stroke"><rect x="2.75" y="5.25" width="18.5" height="13.5" rx="1.4"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></g></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  };

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const forced = document.documentElement.dataset.theme;
    return forced ? forced === 'dark' : darkQuery.matches;
  };
  const saved = store.get('theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;

  function buildFooters() {
    const links = SITE.links || {};
    const items = [
      ['GitHub', `https://github.com/${USER}`, ICONS.github],
      links.linkedin && ['LinkedIn', links.linkedin, ICONS.linkedin],
      links.x && ['X', links.x, ICONS.x],
      links.email && ['Email', `mailto:${links.email}`, ICONS.email],
    ].filter(Boolean);
    const toggles = [];
    const paint = () => {
      const dark = isDark();
      for (const t of toggles) {
        t.innerHTML = `${dark ? ICONS.sun : ICONS.moon}<span>${dark ? 'herbarium' : 'cyanotype'}</span>`;
        t.setAttribute('aria-label', dark ? 'Switch to the light herbarium theme' : 'Switch to the dark cyanotype theme');
      }
    };
    for (const footer of document.querySelectorAll('[data-social]')) {
      const nav = el('nav', { class: 'social', 'aria-label': 'Social profiles' });
      for (const [label, href, icon] of items) {
        const a = el('a', { href, 'aria-label': label, title: label });
        if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.innerHTML = icon;
        nav.append(a);
      }
      const toggle = el('button', { class: 'theme-toggle', type: 'button' });
      toggle.addEventListener('click', () => {
        const next = isDark() ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        store.set('theme', next);
        paint();
      });
      toggles.push(toggle);
      footer.replaceChildren(nav, toggle);
    }
    darkQuery.addEventListener('change', paint);
    paint();
  }

  /* ───────── wiring ───────── */

  buildFooters();
  for (const a of document.querySelectorAll('.gh-link')) a.href = `https://github.com/${USER}`;
  drawLegend(document.querySelector('.phen-legend'));

  const plate = createPlate(document.getElementById('tree'), document.getElementById('lens'));
  const phenology = createPhenology(document.getElementById('phenology'), document.getElementById('phen-readout'));
  const LIFE = window.LIFE || {};
  document.getElementById('replay')?.addEventListener('click', () => plate.replay());
  let currentRoute = '';

  // Draw the plate right away; the open-source limb joins once GitHub answers.
  plate.build(LIFE, null);
  loadPulls().then(async pulls => {
    const model = buildModel(pulls);
    plate.build(LIFE, model);
    if (currentRoute === '') plate.show();
    renderCatalogue(model);
    for (const limb of model.limbs.filter(l => l.own)) {
      try { limb.stars = (await getJSON(`https://api.github.com/repos/${limb.repo}`)).stargazers_count; } catch { /* keep snapshot */ }
    }
    renderCatalogue(model);
  });

  loadCalendar().then(days => {
    const total = days.reduce((s, d) => s + d.count, 0);
    document.getElementById('contrib-total').textContent = plural(total, 'contribution');
    document.getElementById('lc-growth').textContent = `· ${num(total)} contributions in the past year`;
    phenology.render(days);
  });

  const TITLES = { '': 'Xinrui Zhou', about: 'About · Xinrui Zhou', work: 'Work · Xinrui Zhou', 'open-source': 'Open source · Xinrui Zhou' };
  const views = [...document.querySelectorAll('[data-route]')];
  let first = true;
  function route() {
    const hash = location.hash;
    if (hash && hash !== '#' && !hash.startsWith('#/')) return; // in-page anchors such as the skip link
    let name = hash.replace(/^#\/?/, '').replace(/\/$/, '');
    if (!(name in TITLES)) name = '';
    currentRoute = name;
    for (const v of views) v.hidden = v.dataset.route !== name;
    document.title = TITLES[name];
    if (name === '') plate.show(); else plate.hide();
    if (!first) {
      window.scrollTo(0, 0);
      document.getElementById('content').focus({ preventScroll: true });
    }
    first = false;
  }
  window.addEventListener('hashchange', route);
  route();
})();
