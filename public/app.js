import { simulate, toCSV, DEFAULT_CONFIG, MODEL_VERSION } from '/src/model.js';

const $ = id => document.getElementById(id);
const colors = ['#365e85', '#b87333', '#487768', '#8d668b'];
const linePatterns = ['', '7 3', '2 3', '8 3 2 3'];
const paths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z"/>',
  leaf: '<path d="M20 3C9 2 3 8 6 16c8 3 14-3 14-13Z"/><path d="M4 21 15 10"/>',
  bread: '<path d="M5 9a4 4 0 0 1 1-7h12a4 4 0 0 1 1 7v11H5V9Z"/><path d="m9 7 1-2m4 2 1-2M5 15h14"/>',
  network: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="m7 7 3 3m4 4 3 3m-10 0 3-3m4-4 3-3"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  reset: '<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 4v16m8-16v16"/>',
  flask: '<path d="M9 3h6m-5 0v7L4 20h16l-6-10V3M7 15h10"/>',
  book: '<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2V3Z"/>',
  sliders: '<path d="M5 3v5m0 4v9M12 3v10m0 4v4M19 3v2m0 4v12M2 8h6m1 9h6m1-12h6"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5"/>',
  chart: '<path d="M3 3v18h18M6 16l5-6 4 3 5-8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  wallet: '<path d="M20 7H4V3h14v4M4 7H3v14h18V7h-1M21 12h-6v5h6"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.network}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

let result;
let selected = 0;
let timer;
let toastTimer;
const fmt = (value, digits = 1) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const percent = value => `${fmt(value * 100)}%`;
const meanCoverage = round => round.coverage.reduce((sum, q, i) => sum + q * result.councils[i].members, 0) / 120;

function readControls() {
  return {
    seed: Number($('seed').value), scenario: document.querySelector('input[name=scenario]:checked').value,
    shock: Number($('shock').value), creditsPerMember: Number($('credits').value),
    maxRounds: Number($('rounds').value), adjustmentRate: Number($('rate').value), tolerance: DEFAULT_CONFIG.tolerance,
  };
}
function writeControls(config) {
  document.querySelectorAll('input[name=scenario]').forEach(input => { input.checked = input.value === config.scenario; });
  $('seed').value = config.seed;
  $('shock').value = config.shock;
  $('credits').value = config.creditsPerMember;
  $('rounds').value = config.maxRounds;
  $('rate').value = config.adjustmentRate;
}
function run() {
  stop();
  try {
    const next = simulate(readControls());
    result = next;
    $('error').hidden = true;
    $('shock-value').textContent = `${result.config.shock}%`;
    $('credits-value').textContent = fmt(result.config.creditsPerMember, result.config.creditsPerMember % 1 ? 1 : 0);
    $('rounds-value').textContent = result.config.maxRounds;
    $('rate-value').textContent = fmt(result.config.adjustmentRate);
    const baseline = result.config.scenario === 'baseline';
    $('shock').disabled = baseline;
    $('shock-control').classList.toggle('inactive', baseline);
    $('shock-help').textContent = baseline ? 'Select a disruption to apply a supply reduction.' : result.config.scenario === 'energy' ? 'Reduces the shared electricity available this period.' : 'Reduces farm labor capacity and the grain harvest.';
    $('scenario-label').textContent = { baseline: 'Steady state', energy: 'Energy shortfall', harvest: 'Harvest disruption' }[result.config.scenario];
    $('seed-label').textContent = `SEED ${result.config.seed}`;
    const last = result.rounds.at(-1).round;
    $('run-status').textContent = result.outcome === 'converged' ? `Converged in ${last} rounds · ≤ 0.8% residual` : `Round limit reached · not converged`;
    $('run-status').classList.toggle('status-warning', result.outcome !== 'converged');
    $('timeline').max = last;
    $('timeline-end').textContent = `Round ${last} · ${result.outcome === 'converged' ? 'converged' : 'limit reached'}`;
    $('chart-legend').innerHTML = result.resources.map((r, i) => `<span><svg class="legend-line" viewBox="0 0 24 8" aria-hidden="true"><line x1="0" y1="4" x2="24" y2="4" stroke="${colors[i]}" stroke-width="2" stroke-dasharray="${linePatterns[i]}"/></svg>${r.name}</span>`).join('');
    $('experiment-summary').textContent = `Seed ${result.config.seed} · ${result.config.creditsPerMember} credits/member · adjustment rate ${result.config.adjustmentRate} · maximum ${result.config.maxRounds} updates · tolerance 0.008 · supply reduction ${baseline ? '0' : result.config.shock}%.`;
    selected = last;
    renderRound();
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
  }
}

function renderRound() {
  const round = result.rounds[selected];
  $('timeline').value = selected;
  $('round-badge').textContent = `ROUND ${round.round}`;
  const unused = result.councils.reduce((sum, c) => sum + c.budget * (1 - round.allocationFactor), 0);
  const excess = Math.max(0, ...round.utilization.map(x => x - 1));
  const metrics = [
    ['Excess resource demand', percent(excess), 'Highest proposal excess over capacity', 'chart'],
    ['Initial-basket index', percent(meanCoverage(round)), 'Quantity index · not basic needs met', 'people'],
    ['Proposals allocated', percent(round.allocationFactor), 'Common proportional allocation factor', 'check'],
    ['Unused credits', fmt(unused, 0), 'Unspent this round · no carryover modeled', 'wallet'],
  ];
  $('metrics').innerHTML = metrics.map(([label, value, caption]) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><p class="metric-caption">${caption}</p></div>`).join('');
  renderChart(round);
  $('resource-list').innerHTML = result.resources.map((resource, i) => {
    const over = round.utilization[i] > 1 + 1e-9;
    return `<div class="resource-row"><div class="resource-label"><strong><i class="legend-dot" style="background:${colors[i]}"></i>${resource.name}</strong><span class="${over ? 'over' : ''}">${percent(round.utilization[i])}</span></div><div class="resource-track"><div class="resource-fill" style="width:${Math.min(100, round.utilization[i] * 100)}%;background:${colors[i]}"></div>${over ? '<div class="resource-overflow"></div>' : ''}</div><div class="resource-detail"><span>${fmt(round.requested[i])} proposed / ${fmt(resource.capacity, 0)} ${resource.unit}</span><span>${fmt(round.allocatedResources[i])} allocated</span></div></div>`;
  }).join('');
  const rationed = round.allocationFactor < 1 - 1e-9;
  $('allocation-note').classList.toggle('rationing', rationed);
  $('allocation-note').innerHTML = rationed
    ? `<strong>${percent(1 - round.allocationFactor)} of proposals withheld.</strong><br>Proportional rationing keeps allocations inside every physical limit.${round.converged ? ' A small residual remains within the convergence tolerance.' : ' The planning process has not converged at this round.'}`
    : `<strong>Every proposal fits available capacity.</strong><br>${round.converged ? 'The scarcity-premium residual also meets the convergence tolerance.' : 'Capacity is feasible; scarcity-premium adjustments are still unsettled.'}`;
  $('council-rows').innerHTML = result.councils.map((council, i) => `<tr><td><div class="council-name"><strong>${council.name}</strong><small>${council.members} members · ${fmt(council.budget, 0)} credits</small></div></td>${round.allocations[i].map(q => `<td>${fmt(q)}</td>`).join('')}<td>${percent(round.coverage[i])}</td></tr>`).join('');
  $('credit-note').textContent = `${fmt(unused, 1)} credits remain unused across the federation at this round.`;
  $('price-list').innerHTML = result.goods.map((good, j) => `<div class="price-item"><span>${['Vegetables', 'Bread', 'Energy'][j]}</span><strong>${fmt(round.prices[j], 2)}</strong><small>base ${fmt(good.basePrice, 2)}</small></div>`).join('');
}

function renderChart(current) {
  const w = 620, h = 215;
  const left = 40, right = 16, top = 17, bottom = 31;
  const plotW = w - left - right, plotH = h - top - bottom;
  const maxY = Math.max(1.5, Math.ceil(Math.max(...result.rounds.flatMap(r => r.utilization)) * 2) / 2);
  const last = result.rounds.length - 1;
  const x = i => left + i / Math.max(1, last) * plotW;
  const y = v => top + plotH * (1 - v / maxY);
  const tickStep = maxY > 3 ? 1 : 0.5;
  let grid = '';
  for (let v = 0; v <= maxY + 1e-9; v += tickStep) {
    grid += `<line x1="${left}" y1="${y(v)}" x2="${w - right}" y2="${y(v)}" stroke="${v === 1 ? '#929ba4' : '#e8eaeb'}" ${v === 1 ? 'stroke-dasharray="4 5"' : ''}/><text class="chart-label" x="${left - 9}" y="${y(v) + 3}" text-anchor="end">${Math.round(v * 100)}%</text>`;
  }
  if (tickStep !== 0.5) grid += `<line x1="${left}" y1="${y(1)}" x2="${w - right}" y2="${y(1)}" stroke="#929ba4" stroke-dasharray="4 5"/>`;
  const ticks = [...new Set([0, Math.round(last / 4), Math.round(last / 2), Math.round(last * 3 / 4), last])];
  const labels = ticks.map(i => `<text class="chart-label" x="${x(i)}" y="${h - 10}" text-anchor="middle">${i}</text>`).join('');
  const lines = result.resources.map((resource, j) => {
    const points = result.rounds.map((round, i) => `${x(i)},${y(round.utilization[j])}`);
    return `<polyline fill="none" stroke="${colors[j]}" stroke-opacity=".18" stroke-width="2" stroke-dasharray="${linePatterns[j]}" points="${points.join(' ')}"/><polyline fill="none" stroke="${colors[j]}" stroke-width="2" stroke-dasharray="${linePatterns[j]}" stroke-linecap="round" stroke-linejoin="round" points="${points.slice(0, selected + 1).join(' ')}"/><circle cx="${x(selected)}" cy="${y(current.utilization[j])}" r="3.3" fill="${colors[j]}" stroke="#fffefa" stroke-width="1.5"/>`;
  }).join('');
  $('trajectory-chart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Resource proposal trajectories. Selected round ${selected}. Highest excess ${percent(Math.max(0, ...current.utilization.map(v => v - 1)))}. Exact quantities are in the resource balance panel.">${grid}<text x="${w - right}" y="${y(1) - 6}" text-anchor="end" class="chart-label" style="font-size:8px;letter-spacing:1px">CAPACITY</text><line x1="${x(selected)}" y1="${top}" x2="${x(selected)}" y2="${h - bottom}" stroke="#cfd5da" stroke-dasharray="2 4"/>${lines}${labels}</svg>`;
}

function stop() {
  clearInterval(timer);
  timer = undefined;
  $('play').innerHTML = icon('play');
  $('play').setAttribute('aria-label', 'Play planning rounds');
}
function play() {
  if (timer) { stop(); return; }
  if (selected === result.rounds.length - 1) selected = 0;
  renderRound();
  $('play').innerHTML = icon('pause');
  $('play').setAttribute('aria-label', 'Pause planning rounds');
  const increment = Math.max(1, Math.ceil((result.rounds.length - 1) / 60));
  timer = setInterval(() => {
    selected = Math.min(selected + increment, result.rounds.length - 1);
    renderRound();
    if (selected === result.rounds.length - 1) stop();
  }, 250);
}
function download(contents, extension, mime) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `federation-${result.config.scenario}-seed-${result.config.seed}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${extension.toUpperCase()} · ${result.rounds.length} round snapshots`);
}
function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}

// A schematic of the fixed recipes, not a second allocation algorithm.
$('federation-diagram').innerHTML = `<svg viewBox="0 0 300 170" role="img" aria-label="The energy cooperative supplies the farm, bakery and consumer councils. The farm supplies vegetables and grain; the bakery uses grain to supply bread. All final goods reach the six consumer councils."><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#b3c3a0"/></marker><marker id="power-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#b0a5c9"/></marker></defs><g fill="none" stroke="#c1cdb0" stroke-width="1.2" marker-end="url(#flow-arrow)"><path d="M98 26h101"/><path d="M56 44v59h48"/><path d="M239 44v59h-43"/></g><g fill="none" stroke="#c0b7d2" stroke-dasharray="3 3" stroke-width="1.1" marker-end="url(#power-arrow)"><path d="M152 130v-8"/><path d="M109 148H22V44h27"/><path d="M195 148h85V44h-34"/></g><rect x="14" y="7" width="85" height="37" rx="9" fill="#f0f4e8" stroke="#e0e8d3"/><rect x="200" y="7" width="85" height="37" rx="9" fill="#f8f1e8" stroke="#eee5d7"/><rect x="104" y="85" width="92" height="37" rx="9" fill="#edf2e2" stroke="#dce6c9"/><rect x="108" y="132" width="88" height="35" rx="9" fill="#f2eef8" stroke="#e5deef"/><text x="56" y="23" text-anchor="middle" class="diagram-title">Farm</text><text x="56" y="35" text-anchor="middle" class="diagram-detail">vegetables + grain</text><text x="242" y="23" text-anchor="middle" class="diagram-title">Bakery</text><text x="242" y="35" text-anchor="middle" class="diagram-detail">bread production</text><text x="150" y="101" text-anchor="middle" class="diagram-title">6 councils</text><text x="150" y="113" text-anchor="middle" class="diagram-detail">120 members</text><text x="152" y="147" text-anchor="middle" class="diagram-title">Energy co-op</text><text x="152" y="159" text-anchor="middle" class="diagram-detail">shared electricity</text><text x="149" y="20" text-anchor="middle" class="diagram-detail">grain →</text><text x="75" y="75" class="diagram-detail">veg.</text><text x="218" y="75" class="diagram-detail">bread</text></svg>`;
$('model-version').textContent = MODEL_VERSION;
$('controls').addEventListener('submit', event => { event.preventDefault(); run(); });
$('controls').addEventListener('input', event => { if (event.target.type === 'range' || event.target.type === 'radio') run(); });
$('seed').addEventListener('change', run);
$('reset').addEventListener('click', () => { writeControls(DEFAULT_CONFIG); run(); });
$('timeline').addEventListener('input', () => { stop(); selected = Number($('timeline').value); renderRound(); });
$('play').addEventListener('click', play);
$('final-round').addEventListener('click', () => { stop(); selected = result.rounds.length - 1; renderRound(); });
$('export').addEventListener('click', () => download(JSON.stringify(result, null, 2) + '\n', 'json', 'application/json'));
$('csv').addEventListener('click', () => download(toCSV(result), 'csv', 'text/csv'));
$('import').addEventListener('click', () => $('import-file').click());
$('print').addEventListener('click', () => window.print());
let appendixWasOpen;
window.addEventListener('beforeprint', () => {
  stop();
  const appendix = document.querySelector('.model-notes');
  appendixWasOpen = appendix.open;
  appendix.open = true;
});
window.addEventListener('afterprint', () => {
  document.querySelector('.model-notes').open = appendixWasOpen;
});
$('import-file').addEventListener('change', async () => {
  const file = $('import-file').files[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error('Run files must be smaller than 10 MB.');
    const saved = JSON.parse(await file.text());
    if (saved.modelVersion !== MODEL_VERSION || !saved.config) throw new Error(`Import requires a model ${MODEL_VERSION} run export.`);
    const verified = simulate(saved.config);
    // Controls must exactly represent the imported configuration; do not silently clamp it.
    if (verified.config.shock % 5 || verified.config.creditsPerMember < 3 || verified.config.creditsPerMember > 18 || verified.config.creditsPerMember * 2 % 1 || verified.config.maxRounds < 20 || verified.config.maxRounds > 320 || verified.config.maxRounds % 20 || verified.config.adjustmentRate < 0.2 || verified.config.adjustmentRate > 3 || Math.abs(verified.config.adjustmentRate * 10 - Math.round(verified.config.adjustmentRate * 10)) > 1e-8 || verified.config.tolerance !== DEFAULT_CONFIG.tolerance)
      throw new Error('This configuration is outside dashboard control ranges. Reproduce it with the command-line simulator.');
    writeControls(verified.config);
    run();
    toast(`Reproduced ${file.name} from its configuration`);
  } catch (error) { toast(`Import failed: ${error.message}`); }
  $('import-file').value = '';
});
run();
