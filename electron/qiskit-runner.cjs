const path = require('path');
const { spawn } = require('child_process');

function runQiskitExperiment(input, appPath) {
  const allowedStates = new Set(['zero', 'one', 'plus']);
  const allowedErrors = new Set(['none', '0', '1', '2']);
  const logicalState = allowedStates.has(input?.logicalState) ? input.logicalState : 'zero';
  const errorQubit = allowedErrors.has(input?.errorQubit) ? input.errorQubit : 'none';
  const shots = Math.min(4096, Math.max(128, Number(input?.shots) || 1024));
  const script = path.join(appPath, 'quantum', 'qiskit_lab.py');
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [script, JSON.stringify({ logicalState, errorQubit, shots })], { shell: false, timeout: 30000 });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `Qiskit exited with code ${code}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Qiskit returned an unreadable result.')); }
    });
  });
}

module.exports = { runQiskitExperiment };
