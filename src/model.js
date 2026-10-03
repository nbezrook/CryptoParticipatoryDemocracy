/**
 * A deliberately small planning model, not a complete implementation of Parecon.
 * Fixed production recipes connect final goods to four capacity constraints.
 * Credit budgets express entitlements; they confer no governance rights.
 */
export const MODEL_VERSION = '1.0.0';
export const GOODS = [
  { id: 'vegetables', name: 'Vegetables', unit: 'baskets', basePrice: 1 },
  { id: 'bread', name: 'Bread', unit: 'loaves', basePrice: 1.5 },
  { id: 'electricity', name: 'Household energy', unit: 'kWh', basePrice: 0.7 },
];
export const RESOURCES = [
  { id: 'farm', name: 'Farm labor', unit: 'hours', capacity: 210, recipe: [0.6, 0.4, 0] },
  { id: 'bakery', name: 'Bakery labor', unit: 'hours', capacity: 150, recipe: [0, 0.5, 0] },
  { id: 'grid', name: 'Shared electricity', unit: 'kWh', capacity: 360, recipe: [0.2, 0.3, 1] },
  { id: 'grain', name: 'Grain harvest', unit: 'kg', capacity: 240, recipe: [0, 0.8, 0] },
];
const COUNCILS = [
  ['harbor', 'Harbor', 20], ['orchard', 'Orchard', 24], ['riverside', 'Riverside', 18],
  ['hilltop', 'Hilltop', 22], ['meadow', 'Meadow', 16], ['commons', 'Commons', 20],
];
export const DEFAULT_CONFIG = Object.freeze({
  seed: 42, scenario: 'baseline', shock: 30, creditsPerMember: 9,
  maxRounds: 160, adjustmentRate: 1.2, tolerance: 0.008,
});

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function validate(config) {
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 4294967295)
    throw new RangeError('Seed must be an integer from 0 to 4294967295.');
  if (!['baseline', 'energy', 'harvest'].includes(config.scenario))
    throw new RangeError('Unknown scenario.');
  if (!Number.isFinite(config.shock) || config.shock < 0 || config.shock > 80)
    throw new RangeError('Shock must be between 0 and 80 percent.');
  if (!Number.isFinite(config.creditsPerMember) || config.creditsPerMember <= 0 || config.creditsPerMember > 100)
    throw new RangeError('Credits per member must be positive and at most 100.');
  if (!Number.isInteger(config.maxRounds) || config.maxRounds < 1 || config.maxRounds > 2000)
    throw new RangeError('Round limit must be an integer between 1 and 2000.');
  if (!Number.isFinite(config.adjustmentRate) || config.adjustmentRate <= 0 || config.adjustmentRate > 10)
    throw new RangeError('Adjustment rate must be positive and at most 10.');
  if (!Number.isFinite(config.tolerance) || config.tolerance <= 0 || config.tolerance >= 0.1)
    throw new RangeError('Tolerance must be positive and below 0.1.');
}

export function simulate(overrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  validate(config);
  const random = randomGenerator(config.seed);
  const councils = COUNCILS.map(([id, name, members]) => {
    const raw = [0.35 + random() * 0.15, 0.3 + random() * 0.15, 0.15 + random() * 0.1];
    const sum = raw.reduce((a, b) => a + b, 0);
    return { id, name, members, budget: members * config.creditsPerMember, weights: raw.map(x => x / sum) };
  });
  const resources = RESOURCES.map(resource => ({ ...resource, recipe: [...resource.recipe] }));
  if (config.scenario === 'energy') resources[2].capacity *= 1 - config.shock / 100;
  if (config.scenario === 'harvest') {
    resources[0].capacity *= 1 - config.shock / 100;
    resources[3].capacity *= 1 - config.shock / 100;
  }
  const initialBaskets = councils.map(c => GOODS.map((g, i) => c.budget * c.weights[i] / g.basePrice));
  let premiums = resources.map(() => 0);
  const rounds = [];
  for (let round = 0; round <= config.maxRounds; round++) {
    const prices = GOODS.map((good, j) => good.basePrice + resources.reduce((sum, r, i) => sum + r.recipe[j] * premiums[i], 0));
    // Cobb–Douglas budget demand. Preferences are fixed; proposals respond to indicative prices.
    const proposals = councils.map(c => prices.map((p, j) => c.budget * c.weights[j] / p));
    const totalProposed = GOODS.map((_, j) => proposals.reduce((sum, q) => sum + q[j], 0));
    const requested = resources.map(r => r.recipe.reduce((sum, coefficient, j) => sum + coefficient * totalProposed[j], 0));
    const utilization = requested.map((quantity, i) => quantity / resources[i].capacity);
    // Proportional rationing is a separate fallback, not evidence of convergence.
    const allocationFactor = Math.min(1, ...utilization.map(ratio => 1 / ratio));
    const allocations = proposals.map(q => q.map(x => x * allocationFactor));
    const allocatedResources = requested.map(q => q * allocationFactor);
    const residual = Math.max(...utilization.map((ratio, i) => premiums[i] > 1e-10 ? Math.abs(ratio - 1) : Math.max(0, ratio - 1)));
    // Canonical reporting precision removes insignificant libm differences
    // between browser and Node runtimes; this index never feeds back into planning.
    const coverage = allocations.map((q, i) => Number(Math.exp(councils[i].weights.reduce((sum, w, j) => sum + w * Math.log(q[j] / initialBaskets[i][j]), 0)).toFixed(12)));
    rounds.push({ round, prices, premiums: [...premiums], proposals, totalProposed, requested,
      utilization, allocationFactor, allocations, allocatedResources, residual, coverage,
      converged: residual <= config.tolerance });
    if (residual <= config.tolerance) break;
    premiums = premiums.map((premium, i) => Math.max(0, premium + config.adjustmentRate * (utilization[i] - 1)));
  }
  const final = rounds.at(-1);
  return {
    modelVersion: MODEL_VERSION, config, goods: GOODS.map(g => ({ ...g })), resources, councils,
    initialBaskets, rounds, outcome: final.converged ? 'converged' : 'round-limit',
  };
}

export function toCSV(result) {
  const header = ['round', 'converged', 'residual', 'allocation_factor',
    ...result.goods.map(g => `price_${g.id}`), ...result.resources.map(r => `requested_${r.id}`),
    ...result.resources.map(r => `allocated_${r.id}`), 'mean_initial_basket_coverage'];
  const rows = result.rounds.map(r => [r.round, r.converged, r.residual, r.allocationFactor,
    ...r.prices, ...r.requested, ...r.allocatedResources,
    r.coverage.reduce((sum, x, i) => sum + x * result.councils[i].members, 0) / result.councils.reduce((sum, c) => sum + c.members, 0)]);
  return [header, ...rows].map(row => row.join(',')).join('\n') + '\n';
}
