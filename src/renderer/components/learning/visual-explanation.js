/**
 * Visual Explanation component ("Imagine It" / "Show me") — § bounded visual
 * explanations.
 *
 * Renders a VALIDATED declarative visual spec using ONLY trusted,
 * application-defined SVG primitives (the renderer never evals, never
 * injects markup from the spec: every shape token maps to a fixed builder
 * function, every text node is set via textContent). Interactions are
 * large (≥44px), animation is CSS-class driven with a `prefers-reduced-motion`
 * + user-toggle escape hatch, and a text alternative is always rendered so
 * the visual is never the only way to understand the concept.
 *
 * Emits semantic learning signals (visual_opened, visual_step_viewed,
 * visual_replayed, visual_element_selected, visual_completed,
 * visual_help_requested) via `onSignal` — record-only, never an ALE input.
 */

const SHAPE_BUILDERS = Object.freeze({
  rect: (el) => rectNode(el),
  circle: (el) => ellipseNode(el),
  ellipse: (el) => ellipseNode(el),
  arrow: (el) => arrowNode(el),
  sun: (el) => sunNode(el),
  droplet: (el) => dropletNode(el, false),
  vapor: (el) => dropletNode(el, true),
  puddle: (el) => puddleNode(el),
  plant_root: (el) => plantPartNode(el, 'root'),
  plant_stem: (el) => plantPartNode(el, 'stem'),
  plant_leaf: (el) => plantPartNode(el, 'leaf'),
  plant_flower: (el) => plantPartNode(el, 'flower'),
  container: (el) => rectNode(el),
  heat_waves: (el) => heatWavesNode(el),
  letter_tile: (el) => letterTileNode(el)
});

const STAGE_W = 320;
const STAGE_H = 300;

/**
 * Mount the visual explanation inside `host`.
 * @param {HTMLElement} host element to render into
 * @param {object} visual validated visual spec (specVersion 1)
 * @param {object} options
 * @param {Function} [options.onSignal] ({ event, detail }) — semantic signal
 * @returns {{ dispose: () => void, replay: () => void }}
 */
export function mountVisualExplanation(host, visual, { onSignal } = {}) {
  const state = { step: 0, completed: false, reducedMotion: prefersReducedMotion(), disposed: false };

  host.innerHTML = '';
  host.classList.add('visual-explanation');

  const frame = document.createElement('div');
  frame.className = 'visual-frame';
  frame.innerHTML = `
    <div class="visual-stage-wrap">
      <svg class="visual-stage" viewBox="0 0 ${STAGE_W} ${STAGE_H}" role="img" aria-hidden="true"></svg>
      <div class="visual-caption" id="visual-caption" aria-live="polite"></div>
    </div>
    <div class="visual-controls">
      <button type="button" class="visual-btn" data-act="prev" aria-label="Previous step">‹</button>
      <button type="button" class="visual-btn" data-act="replay" aria-label="Replay the visual">↺ Replay</button>
      <button type="button" class="visual-btn" data-act="next" aria-label="Next step">›</button>
      <button type="button" class="visual-btn" data-act="motion" aria-label="Toggle animation">Motion: on</button>
    </div>
    <details class="visual-text-alt">
      <summary>Read it instead</summary>
      <p class="visual-text-alt-body"></p>
    </details>
  `;
  host.appendChild(frame);

  const svg = frame.querySelector('.visual-stage');
  const captionEl = frame.querySelector('.visual-caption');
  const altBody = frame.querySelector('.visual-text-alt-body');
  const motionBtn = frame.querySelector('[data-act="motion"]');

  // Text alternative: ALWAYS present (accessibility contract).
  altBody.textContent = visual.accessibility?.textAlternative || visual.explanation;

  // Trusted primitive rendering: token → builder → textContent labels only.
  const nodeById = new Map();
  for (const el of visual.elements) {
    const builder = SHAPE_BUILDERS[el.shape];
    if (!builder) continue; // validated upstream; belt-and-braces
    const node = builder(el);
    node.classList.add('visual-el');
    node.dataset.elId = el.id;
    // letter_tile renders its label CENTERED inside the tile (the label IS
    // the content); all other shapes get the generic label above.
    if (el.label && el.shape !== 'letter_tile') {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', el.x);
      t.setAttribute('y', el.y - 6);
      t.setAttribute('class', 'visual-label');
      t.textContent = el.label; // textContent — never innerHTML
      node.appendChild(t);
    }
    nodeById.set(el.id, node);
    svg.appendChild(node);
  }

  // Relationships as simple arrows.
  for (const rel of visual.relationships || []) {
    const a = nodeById.get(rel.from);
    const b = nodeById.get(rel.to);
    if (!a || !b) continue;
    const ax = Number(a.dataset.x) + Number(a.dataset.w) / 2;
    const ay = Number(a.dataset.y) + Number(a.dataset.h) / 2;
    const bx = Number(b.dataset.x) + Number(b.dataset.w) / 2;
    const by = Number(b.dataset.y) + Number(b.dataset.h) / 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', ax); line.setAttribute('y1', ay);
    line.setAttribute('x2', bx); line.setAttribute('y2', by);
    line.setAttribute('class', 'visual-rel-line');
    line.dataset.relLabel = rel.label || '';
    svg.insertBefore(line, svg.firstChild);
  }

  // Interaction points (large targets, ≥44px hit area via CSS padding).
  for (const it of visual.interactions || []) {
    const node = nodeById.get(it.elementId);
    if (!node) continue;
    node.classList.add('visual-interactive');
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `${node.dataset.label || it.elementId}: show me more`);
    const reveal = () => {
      captionEl.textContent = it.revealText;
      node.classList.add('is-selected');
      emit('visual_element_selected', it.elementId);
    };
    node.addEventListener('click', reveal);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
    });
  }

  function emit(event, detail) {
    if (onSignal) { try { onSignal({ event, detail }); } catch { /* signal must never break the visual */ } }
  }

  function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── step animation (one clear step visible at a time) ── */
  function applyStep() {
    const steps = visual.steps || [];
    if (steps.length === 0) return;
    const step = steps[Math.min(state.step, steps.length - 1)];
    const active = new Set(step.move || []);
    for (const [id, node] of nodeById) {
      node.classList.toggle('is-active', active.has(id));
      node.classList.toggle('is-dimmed', steps.length > 1 && !active.has(id) && visual.representationType === 'process_animation');
    }
    captionEl.textContent = `${state.step + 1}/${steps.length} · ${step.label}${step.note ? ' — ' + step.note : ''}`;
    emit('visual_step_viewed', step.id);
    if (state.step === steps.length - 1 && !state.completed) {
      state.completed = true;
      emit('visual_completed', null);
    }
  }

  function showStatic() {
    for (const [, node] of nodeById) {
      node.classList.remove('is-dimmed');
      node.classList.add('is-active');
    }
    captionEl.textContent = visual.title;
  }

  function goTo(stepIndex) {
    const steps = visual.steps || [];
    if (steps.length === 0) { showStatic(); return; }
    state.step = Math.max(0, Math.min(steps.length - 1, stepIndex));
    applyStep();
  }

  function replay() {
    state.completed = false;
    emit('visual_replayed', null);
    if (state.reducedMotion) { goTo(0); return; }
    goTo(0);
    const steps = visual.steps || [];
    for (let i = 1; i < steps.length; i++) {
      setTimeout(() => { if (!state.disposed) goTo(i); }, 1400 * i);
    }
  }

  frame.querySelectorAll('.visual-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-act');
      if (act === 'prev') goTo(state.step - 1);
      else if (act === 'next') goTo(state.step + 1);
      else if (act === 'replay') replay();
      else if (act === 'motion') {
        state.reducedMotion = !state.reducedMotion;
        motionBtn.textContent = state.reducedMotion ? 'Motion: off' : 'Motion: on';
        // Ambient scene motion obeys the same switch (and OS-level
        // prefers-reduced-motion) — everything stays reduced-motion safe.
        frame.classList.toggle('motion-off', state.reducedMotion);
        if (state.reducedMotion) goTo(state.step);
      }
    });
  });

  // Initial render: animated types play once; static types show all.
  if (visual.steps.length > 1 && !state.reducedMotion) {
    replay();
  } else {
    goTo(0);
  }
  emit('visual_opened', visual.representationType);

  return {
    dispose() { state.disposed = true; host.innerHTML = ''; host.classList.remove('visual-explanation'); },
    replay
  };
}

/* ───────────────────────── trusted shape builders ───────────────────────── */

function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function baseAttrs(el) {
  return { 'data-x': el.x, 'data-y': el.y, 'data-w': el.w, 'data-h': el.h, 'data-label': el.label || '' };
}

function rectNode(el) {
  return svgEl('rect', { x: el.x, y: el.y, width: el.w, height: el.h, rx: 8, class: `visual-shape visual-${el.shape}`, ...baseAttrs(el) });
}

function ellipseNode(el) {
  return svgEl('ellipse', { cx: el.x + el.w / 2, cy: el.y + el.h / 2, rx: el.w / 2, ry: el.h / 2, class: `visual-shape visual-${el.shape}`, ...baseAttrs(el) });
}

function arrowNode(el) {
  const g = svgEl('g', { class: `visual-shape visual-${el.shape}`, ...baseAttrs(el) });
  g.appendChild(svgEl('line', { x1: el.x, y1: el.y + el.h / 2, x2: el.x + el.w - 10, y2: el.y + el.h / 2, class: 'visual-arrow-line' }));
  g.appendChild(svgEl('polygon', { points: `${el.x + el.w - 10},${el.y + el.h / 2 - 6} ${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w - 10},${el.y + el.h / 2 + 6}`, class: 'visual-arrow-head' }));
  return g;
}

function sunNode(el) {
  const g = svgEl('g', { class: `visual-shape visual-sun`, ...baseAttrs(el) });
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2, r = Math.min(el.w, el.h) / 2 - 2;
  g.appendChild(svgEl('circle', { cx, cy, r, class: 'visual-sun-core' }));
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    g.appendChild(svgEl('line', {
      x1: cx + Math.cos(a) * (r + 3), y1: cy + Math.sin(a) * (r + 3),
      x2: cx + Math.cos(a) * (r + 10), y2: cy + Math.sin(a) * (r + 10),
      class: 'visual-sun-ray'
    }));
  }
  return g;
}

function dropletNode(el, isVapor) {
  const g = svgEl('g', { class: `visual-shape visual-${isVapor ? 'vapor' : 'droplet'}`, ...baseAttrs(el) });
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2, r = Math.min(el.w, el.h) / 2;
  if (isVapor) {
    g.appendChild(svgEl('circle', { cx, cy, r: r * 0.55, class: 'visual-vapor-core' }));
    g.appendChild(svgEl('circle', { cx: cx - r * 0.5, cy: cy + r * 0.3, r: r * 0.32, class: 'visual-vapor-core' }));
    g.appendChild(svgEl('circle', { cx: cx + r * 0.5, cy: cy + r * 0.3, r: r * 0.32, class: 'visual-vapor-core' }));
  } else {
    g.appendChild(svgEl('path', {
      d: `M ${cx} ${el.y} C ${cx + r} ${el.y + el.h * 0.6}, ${cx + r * 0.7} ${el.y + el.h}, ${cx} ${el.y + el.h} C ${cx - r * 0.7} ${el.y + el.h}, ${cx - r} ${el.y + el.h * 0.6}, ${cx} ${el.y} Z`,
      class: 'visual-droplet-body'
    }));
  }
  return g;
}

function puddleNode(el) {
  const g = svgEl('g', { class: `visual-shape visual-puddle`, ...baseAttrs(el) });
  g.appendChild(svgEl('ellipse', { cx: el.x + el.w / 2, cy: el.y + el.h / 2, rx: el.w / 2, ry: el.h / 2, class: 'visual-puddle-body' }));
  g.appendChild(svgEl('ellipse', { cx: el.x + el.w / 2, cy: el.y + el.h / 2.4, rx: el.w / 2.6, ry: el.h / 4, class: 'visual-puddle-surface' }));
  return g;
}

function plantPartNode(el, kind) {
  const g = svgEl('g', { class: `visual-shape visual-plant-${kind}`, ...baseAttrs(el) });
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  if (kind === 'stem') {
    g.appendChild(svgEl('path', { d: `M ${cx} ${el.y} L ${cx} ${el.y + el.h}`, class: 'visual-stem-line', 'stroke-width': String(Math.max(4, el.w * 0.6)) }));
  } else if (kind === 'root') {
    g.appendChild(svgEl('path', { d: `M ${cx} ${el.y} L ${cx} ${el.y + el.h * 0.6} M ${cx} ${el.y + el.h * 0.6} L ${el.x + el.w * 0.2} ${el.y + el.h} M ${cx} ${el.y + el.h * 0.6} L ${el.x + el.w * 0.8} ${el.y + el.h} M ${cx} ${el.y + el.h * 0.35} L ${el.x + el.w * 0.32} ${el.y + el.h * 0.8} M ${cx} ${el.y + el.h * 0.35} L ${el.x + el.w * 0.68} ${el.y + el.h * 0.8}`, class: 'visual-root-line' }));
  } else if (kind === 'leaf') {
    g.appendChild(svgEl('ellipse', { cx, cy, rx: el.w / 2, ry: el.h / 2.6, class: 'visual-leaf-body' }));
    g.appendChild(svgEl('line', { x1: el.x, y1: cy, x2: el.x + el.w, y2: cy, class: 'visual-leaf-vein' }));
  } else {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      g.appendChild(svgEl('ellipse', { cx: cx + Math.cos(a) * el.w * 0.26, cy: cy + Math.sin(a) * el.h * 0.26, rx: el.w * 0.2, ry: el.h * 0.2, class: 'visual-petal' }));
    }
    g.appendChild(svgEl('circle', { cx, cy, r: Math.min(el.w, el.h) * 0.16, class: 'visual-flower-core' }));
  }
  return g;
}

function heatWavesNode(el) {
  const g = svgEl('g', { class: `visual-shape visual-heat-waves`, ...baseAttrs(el) });
  for (let i = 0; i < 3; i++) {
    g.appendChild(svgEl('path', {
      d: `M ${el.x + (el.w / 3) * i + 4} ${el.y + el.h} q ${el.w / 6} ${-el.h / 3} 0 ${-el.h / 1.6} q ${-el.w / 6} ${-el.h / 3} 4 ${-el.h / 1.6}`,
      class: 'visual-heat-line'
    }));
  }
  return g;
}

/**
 * Letter/syllable/word tile: rounded box with the label CENTERED inside.
 * Trusted primitive for the reading templates — text comes from the
 * validated spec via textContent only.
 */
function letterTileNode(el) {
  const g = svgEl('g', { class: `visual-shape visual-letter-tile`, ...baseAttrs(el) });
  g.appendChild(svgEl('rect', { x: el.x, y: el.y, width: el.w, height: el.h, rx: 10, class: 'visual-tile-box' }));
  const t = svgEl('text', {
    x: el.x + el.w / 2, y: el.y + el.h / 2,
    class: 'visual-tile-text', 'text-anchor': 'middle', 'dominant-baseline': 'central'
  });
  t.textContent = el.label || '';
  g.appendChild(t);
  return g;
}
