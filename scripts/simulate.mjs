import { simulate, toCSV } from '../src/model.js';

const args = process.argv.slice(2);
const options = {};
let csv = false;
try {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv') { csv = true; continue; }
    const keys = { '--seed': 'seed', '--scenario': 'scenario', '--shock': 'shock', '--rounds': 'maxRounds', '--credits': 'creditsPerMember', '--rate': 'adjustmentRate' };
    const key = keys[args[i]];
    if (!key || args[i + 1] === undefined) throw new Error(`Unknown or incomplete argument: ${args[i]}`);
    const value = args[++i];
    options[key] = key === 'scenario' ? value : Number(value);
  }
  const result = simulate(options);
  process.stdout.write(csv ? toCSV(result) : JSON.stringify(result, null, 2) + '\n');
} catch (error) { console.error(error.message); process.exitCode = 1; }
