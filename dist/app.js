const ROWS = 6, COLS = 8;
const svg = document.getElementById('lattice');
const NS = 'http://www.w3.org/2000/svg';
let errors = new Set(), correction = new Set(), history = [];
let mode = 'challenge', submitted = false, puzzleNumber = 0, hintsUsed = 0;

fetch('/api/me').then(r => r.ok ? r.json() : null).then(user => {
  if (!user) return;
  document.getElementById('userName').textContent = user.name || user.email || 'Google user';
  document.getElementById('userInitial').textContent = (user.name || user.email || 'G')[0].toUpperCase();
  document.getElementById('userPill').hidden = false;
}).catch(() => {});

const mod = (n, m) => ((n % m) + m) % m;
const h = (r, c) => `h:${mod(r, ROWS)}:${mod(c, COLS)}`;
const v = (r, c) => `v:${mod(r, ROWS)}:${mod(c, COLS)}`;
const parse = id => { const [o, r, c] = id.split(':'); return { o, r: +r, c: +c }; };
const incident = (r, c) => [h(r, c), h(r, c - 1), v(r, c), v(r - 1, c)];

function syndromeFor(edgeSet) {
  const active = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (incident(r, c).reduce((sum, id) => sum + Number(edgeSet.has(id)), 0) % 2) active.push(`${r}:${c}`);
  }
  return active;
}

function xorSets(a, b) {
  const out = new Set(a);
  for (const edge of b) out.has(edge) ? out.delete(edge) : out.add(edge);
  return out;
}

function shortestPath(a, b) {
  let [r, c] = a; const [tr, tc] = b; const path = [];
  const down = mod(tr - r, ROWS), up = mod(r - tr, ROWS);
  if (down <= up) for (let i = 0; i < down; i++) { path.push(v(r, c)); r = mod(r + 1, ROWS); }
  else for (let i = 0; i < up; i++) { r = mod(r - 1, ROWS); path.push(v(r, c)); }
  const right = mod(tc - c, COLS), left = mod(c - tc, COLS);
  if (right <= left) for (let i = 0; i < right; i++) { path.push(h(r, c)); c = mod(c + 1, COLS); }
  else for (let i = 0; i < left; i++) { c = mod(c - 1, COLS); path.push(h(r, c)); }
  return path;
}

function toricDistance(a, b) {
  return Math.min(mod(a[0] - b[0], ROWS), mod(b[0] - a[0], ROWS)) + Math.min(mod(a[1] - b[1], COLS), mod(b[1] - a[1], COLS));
}

function greedyDecode(active) {
  const points = active.map(value => value.split(':').map(Number)), chosen = [];
  while (points.length > 1) {
    const a = points.shift(); let best = 0, distance = Infinity;
    points.forEach((point, index) => { const d = toricDistance(a, point); if (d < distance) { distance = d; best = index; } });
    chosen.push(...shortestPath(a, points.splice(best, 1)[0]));
  }
  return new Set(chosen);
}

function winding(edgeSet) {
  let horizontal = 0, vertical = 0;
  for (let r = 0; r < ROWS; r++) if (edgeSet.has(h(r, COLS - 1))) horizontal ^= 1;
  for (let c = 0; c < COLS; c++) if (edgeSet.has(v(ROWS - 1, c))) vertical ^= 1;
  return { horizontal, vertical };
}

function randomWalk(length, used = new Set()) {
  let r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
  for (let i = 0; i < length; i++) {
    const direction = Math.floor(Math.random() * 4); let edge;
    if (direction === 0) { edge = h(r, c); c = mod(c + 1, COLS); }
    if (direction === 1) { c = mod(c - 1, COLS); edge = h(r, c); }
    if (direction === 2) { edge = v(r, c); r = mod(r + 1, ROWS); }
    if (direction === 3) { r = mod(r - 1, ROWS); edge = v(r, c); }
    used.has(edge) ? used.delete(edge) : used.add(edge);
  }
  return used;
}

const generators = {
  tutorial: () => randomWalk(1), easy: () => randomWalk(2 + Math.floor(Math.random() * 2)),
  medium: () => randomWalk(3, randomWalk(2)), hard: () => randomWalk(5, randomWalk(4))
};

function edgeLine(id, x, y, gapX, gapY) {
  const { o, r, c } = parse(id), line = document.createElementNS(NS, 'line');
  line.dataset.edge = id; line.classList.add('edge');
  if (o === 'h') {
    line.setAttribute('x1', x(c)); line.setAttribute('y1', y(r)); line.setAttribute('y2', y(r));
    line.setAttribute('x2', c === COLS - 1 ? x(c) + gapX * .63 : x(c + 1));
    if (c === COLS - 1) line.classList.add('wrap');
  } else {
    line.setAttribute('x1', x(c)); line.setAttribute('y1', y(r)); line.setAttribute('x2', x(c));
    line.setAttribute('y2', r === ROWS - 1 ? y(r) + gapY * .63 : y(r + 1));
    if (r === ROWS - 1) line.classList.add('wrap');
  }
  line.addEventListener('click', () => toggleEdge(id)); return line;
}

function toggleEdge(id) {
  if (submitted) return;
  const target = mode === 'sandbox' ? errors : correction;
  history.push({ mode, edge: id }); target.has(id) ? target.delete(id) : target.add(id); render();
}

function render() {
  const active = syndromeFor(errors), activeSet = new Set(active), residual = submitted ? xorSets(errors, correction) : new Set();
  svg.innerHTML = ''; const marginX = 82, marginY = 62, gapX = 92, gapY = 78;
  const x = c => marginX + c * gapX, y = r => marginY + r * gapY;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) svg.appendChild(edgeLine(h(r, c), x, y, gapX, gapY));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) svg.appendChild(edgeLine(v(r, c), x, y, gapX, gapY));
  const overlays = [];
  svg.querySelectorAll('.edge').forEach(edge => {
    const id = edge.dataset.edge;
    if ((mode === 'sandbox' || submitted) && errors.has(id)) edge.classList.add('error');
    else if (correction.has(id)) edge.classList.add('correction');
    if (submitted && errors.has(id) && correction.has(id)) overlays.push([edge, 'correction-layer']);
    if (submitted && residual.has(id)) overlays.push([edge, 'residual-layer']);
  });
  overlays.forEach(([source, layer]) => {
    const overlay = source.cloneNode(false);
    overlay.removeAttribute('data-edge');
    overlay.className.baseVal = `edge-overlay ${layer}`;
    svg.appendChild(overlay);
  });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const circle = document.createElementNS(NS, 'circle'); circle.setAttribute('cx', x(c)); circle.setAttribute('cy', y(r));
    circle.setAttribute('r', activeSet.has(`${r}:${c}`) ? 11 : 7); circle.classList.add('vertex');
    if (activeSet.has(`${r}:${c}`)) circle.classList.add('active'); svg.appendChild(circle);
    const label = document.createElementNS(NS, 'text'); label.setAttribute('x', x(c)); label.setAttribute('y', y(r) - 16);
    label.classList.add('vertex-label'); label.textContent = `S${r * COLS + c}`; svg.appendChild(label);
  }
  updateVector(activeSet); updateStatus(active, residual);
}

function updateVector(activeSet) {
  const box = document.getElementById('syndromeVector'); box.innerHTML = '';
  for (let i = 0; i < ROWS * COLS; i++) { const bit = document.createElement('i'), on = activeSet.has(`${Math.floor(i / COLS)}:${i % COLS}`); bit.textContent = on ? '1' : '0'; if (on) bit.classList.add('active'); box.appendChild(bit); }
  document.getElementById('vectorSummary').textContent = `${activeSet.size} active / 48 checks`;
}

function setResult(kind, outcome, icon, kicker, title, body) {
  document.getElementById('outcomeMetric').className = `outcome ${kind}`; document.getElementById('outcomeText').textContent = outcome;
  const resultIcon = document.getElementById('resultIcon'); resultIcon.className = `result-icon ${kind}`; resultIcon.textContent = icon;
  document.getElementById('resultKicker').textContent = kicker; document.getElementById('resultTitle').textContent = title; document.getElementById('resultBody').textContent = body;
}

function updateStatus(active, residual) {
  document.getElementById('puzzleCount').textContent = puzzleNumber || '—'; document.getElementById('checkCount').textContent = active.length; document.getElementById('correctionCount').textContent = correction.size;
  if (!errors.size) return setResult('neutral', 'READY', '◎', 'READY FOR A PUZZLE', 'Can you decode what you cannot see?', 'Start a puzzle, connect the syndrome defects, and submit.');
  if (!submitted) return setResult('detected', 'YOUR TURN', '!', 'SYNDROME GENERATED', `${active.length} detection events are visible.`, mode === 'challenge' ? 'Draw a correction whose endpoints match the yellow checks.' : 'Place errors and watch their syndrome update.');
  const residualSyndrome = syndromeFor(residual), wind = winding(residual), logical = wind.horizontal || wind.vertical, referenceWeight = greedyDecode(active).size;
  if (residualSyndrome.length) return setResult('detected', 'RETRY', '!', 'RESIDUAL SYNDROME', `${residualSyndrome.length} checks are still active.`, 'Your correction does not have the same endpoints as the hidden error.');
  if (logical) return setResult('fail', 'LOGICAL FAIL', '×', 'SYNDROME CLEAR · INFORMATION LOST', `The residual winds ${wind.horizontal ? 'horizontally' : 'vertically'}.`, 'Error ⊕ correction formed an undetectable logical loop.');
  const score = Math.max(100, 1000 - correction.size * 45 - hintsUsed * 150 + Math.round(100 * referenceWeight / Math.max(1, correction.size)));
  setResult('success', 'CORRECTED', '✓', `LOGICAL STATE PRESERVED · ${score} POINTS`, 'Your correction is logically equivalent to the hidden error.', `You used ${correction.size} moves; the greedy reference used ${referenceWeight}.`);
}

function newPuzzle() {
  const difficulty = document.getElementById('presetSelect').value;
  errors = generators[difficulty](); while (!errors.size || !syndromeFor(errors).length) errors = generators[difficulty]();
  correction.clear(); history = []; submitted = false; hintsUsed = 0; puzzleNumber++; render();
}
function undo() { if (submitted || !history.length) return; const last = history.pop(), target = last.mode === 'sandbox' ? errors : correction; target.has(last.edge) ? target.delete(last.edge) : target.add(last.edge); render(); }
function hint() { if (submitted || !errors.size || mode === 'sandbox') return; const edge = [...greedyDecode(syndromeFor(errors))].find(item => !correction.has(item)); if (edge) { correction.add(edge); history.push({ mode: 'challenge', edge }); hintsUsed++; render(); } }
function clearCurrent() { submitted = false; if (mode === 'sandbox') errors.clear(); correction.clear(); history = []; hintsUsed = 0; render(); }

document.getElementById('loadPreset').onclick = newPuzzle;
document.getElementById('decodeButton').onclick = () => { if (errors.size && !submitted) { submitted = true; render(); } };
document.getElementById('undoButton').onclick = undo; document.getElementById('hintButton').onclick = hint; document.getElementById('resetButton').onclick = clearCurrent;
document.addEventListener('keydown', event => { if (event.key === 'Enter') document.getElementById('decodeButton').click(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); } });
document.querySelectorAll('.mode-switch button').forEach(button => button.onclick = () => {
  document.querySelectorAll('.mode-switch button').forEach(item => item.classList.remove('active')); button.classList.add('active'); mode = button.dataset.mode;
  errors.clear(); correction.clear(); submitted = false;
  document.getElementById('tipText').innerHTML = mode === 'challenge' ? 'The red error is hidden. Click lattice edges to draw a <b>blue correction</b> between the yellow syndrome defects.' : 'Click lattice edges to place <b>red physical errors</b> and watch the syndrome update immediately.';
  document.getElementById('boardTitle').textContent = mode === 'challenge' ? 'Draw your correction' : 'Explore physical errors'; render();
});
document.querySelectorAll('.view-tabs button').forEach(button => button.onclick = () => { document.querySelectorAll('.view-tabs button').forEach(item => item.classList.remove('active')); button.classList.add('active'); const matrix = button.dataset.view === 'matrix'; document.getElementById('latticeView').hidden = matrix; document.getElementById('matrixView').hidden = !matrix; });
const dialog = document.getElementById('helpDialog'); document.getElementById('helpButton').onclick = () => dialog.showModal(); document.getElementById('walkthroughButton').onclick = () => dialog.showModal(); document.getElementById('closeHelp').onclick = () => dialog.close();

function renderQiskitResult(result) {
  const syndrome = result.dominantSyndrome;
  document.getElementById('syndromeA').textContent = syndrome[0];
  document.getElementById('syndromeB').textContent = syndrome[1];
  document.getElementById('qiskitPrediction').textContent = result.prediction;
  document.getElementById('shotSummary').textContent = `${result.shots.toLocaleString()} shots`;
  document.getElementById('qiskitCircuit').textContent = result.circuit;
  document.getElementById('qiskitEngine').innerHTML = `<span class="pulse"></span>${result.engine} · Qiskit ${result.qiskitVersion}`;
  document.querySelectorAll('.check-link').forEach((check, index) => check.classList.toggle('active', syndrome[index] === '1'));
  document.querySelectorAll('.data-qubit').forEach(qubit => {
    qubit.classList.remove('error', 'corrected');
    if (result.errorQubit !== 'none' && qubit.dataset.qubit === result.errorQubit) qubit.classList.add('corrected');
  });
  const histogram = document.getElementById('qiskitHistogram'); histogram.innerHTML = '';
  const max = Math.max(...Object.values(result.counts));
  ['00', '10', '11', '01'].forEach(label => {
    const count = result.counts[label] || 0, row = document.createElement('div');
    row.className = `bar-row${label === syndrome ? ' active' : ''}`;
    row.innerHTML = `<b>${label}</b><div class="bar-track"><div class="bar-fill" style="width:${100 * count / max}%"></div></div><em>${count}</em>`;
    histogram.appendChild(row);
  });
  document.getElementById('qiskitStatus').textContent = `Measured ${syndrome}. ${result.prediction}. The encoded logical state was never directly measured.`;
}

document.getElementById('runQiskit').onclick = async () => {
  const button = document.getElementById('runQiskit'), status = document.getElementById('qiskitStatus');
  button.disabled = true; button.innerHTML = 'Running circuit… <span>◌</span>'; status.textContent = 'Qiskit is encoding, injecting the error, and measuring both stabilizers.';
  document.querySelectorAll('.data-qubit').forEach(qubit => { qubit.classList.remove('corrected'); if (qubit.dataset.qubit === document.getElementById('errorQubit').value) qubit.classList.add('error'); });
  try {
    if (!window.syndromeScope?.runQiskit) throw new Error('Open the desktop app to run the local Qiskit simulator.');
    renderQiskitResult(await window.syndromeScope.runQiskit({ logicalState: document.getElementById('logicalState').value, errorQubit: document.getElementById('errorQubit').value, shots: Number(document.getElementById('qiskitShots').value) }));
  } catch (error) { status.textContent = `Could not run Qiskit: ${error.message}`; }
  finally { button.disabled = false; button.innerHTML = 'Run Qiskit circuit <span>▶</span>'; }
};
render();
