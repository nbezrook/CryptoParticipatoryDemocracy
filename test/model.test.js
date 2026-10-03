import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, toCSV, DEFAULT_CONFIG } from '../src/model.js';

test('the same configuration reproduces every council, proposal, price and allocation', () => {
  assert.deepEqual(simulate(), simulate());
  assert.deepEqual(simulate({ seed: 193, scenario: 'harvest' }), simulate({ seed: 193, scenario: 'harvest' }));
  assert.notDeepEqual(simulate({ seed: 42 }).councils, simulate({ seed: 43 }).councils);
});

test('allocations obey physical constraints and council budgets across seeds and severe shocks', () => {
  for (const seed of [0, 1, 42, 12345, 4294967295]) {
    for (const scenario of ['baseline', 'energy', 'harvest']) {
      const result = simulate({ seed, scenario, shock: 80 });
      for (const round of result.rounds) {
        assert.ok(round.prices.every(p => Number.isFinite(p) && p > 0));
        for (const [i, council] of result.councils.entries()) {
          assert.ok(round.allocations[i].every(q => Number.isFinite(q) && q >= 0));
          const spend = round.allocations[i].reduce((sum, q, j) => sum + q * round.prices[j], 0);
          assert.ok(spend <= council.budget + 1e-8);
          const proposalSpend = round.proposals[i].reduce((sum, q, j) => sum + q * round.prices[j], 0);
          assert.ok(Math.abs(proposalSpend - council.budget) < 1e-8);
        }
        for (const [i, resource] of result.resources.entries()) {
          const quantity = round.allocations.reduce((sum, q) => sum + resource.recipe.reduce((s, a, j) => s + a * q[j], 0), 0);
          assert.ok(quantity <= resource.capacity + 1e-8);
          assert.ok(Math.abs(quantity - round.allocatedResources[i]) < 1e-8);
        }
      }
    }
  }
});

test('baseline and documented shocks converge by the default limit', () => {
  for (const scenario of ['baseline', 'energy', 'harvest']) {
    const result = simulate({ scenario });
    assert.equal(result.outcome, 'converged', scenario);
    assert.ok(result.rounds.at(-1).residual <= DEFAULT_CONFIG.tolerance);
  }
});

test('a stopped run reports the round limit rather than claiming rationing is convergence', () => {
  const result = simulate({ maxRounds: 1 });
  assert.equal(result.outcome, 'round-limit');
  assert.equal(result.rounds.length, 2);
  assert.ok(result.rounds.at(-1).allocationFactor < 1);
});

test('shocks alter supply without changing members, entitlements or preferences', () => {
  const baseline = simulate();
  const energy = simulate({ scenario: 'energy', shock: 50 });
  const harvest = simulate({ scenario: 'harvest', shock: 50 });
  assert.deepEqual(baseline.councils, energy.councils);
  assert.deepEqual(baseline.councils, harvest.councils);
  assert.equal(energy.resources[2].capacity, baseline.resources[2].capacity / 2);
  assert.equal(harvest.resources[0].capacity, baseline.resources[0].capacity / 2);
  assert.equal(harvest.resources[3].capacity, baseline.resources[3].capacity / 2);
  assert.ok(energy.rounds.at(-1).prices[2] > baseline.rounds.at(-1).prices[2]);
});

test('CSV preserves the complete round series and can be reproduced from exported config', () => {
  const result = simulate({ seed: 72, scenario: 'energy' });
  const exported = JSON.parse(JSON.stringify(result));
  assert.deepEqual(simulate(exported.config), result);
  const csv = toCSV(result).trim().split('\n');
  assert.equal(csv.length, result.rounds.length + 1);
  assert.ok(csv.every(line => line.split(',').length === csv[0].split(',').length));
});

test('invalid scenarios and numerical parameters are rejected', () => {
  for (const options of [{ seed: -1 }, { seed: 0.5 }, { scenario: 'unknown' }, { shock: 100 },
    { creditsPerMember: 0 }, { maxRounds: Infinity }, { adjustmentRate: NaN }, { tolerance: 0 }]) {
    assert.throws(() => simulate(options), RangeError);
  }
});
