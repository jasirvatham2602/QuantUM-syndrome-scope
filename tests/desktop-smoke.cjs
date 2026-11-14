const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { runQiskitExperiment } = require('../electron/qiskit-runner.cjs');

async function run() {
  ipcMain.handle('qiskit:run', (_event, input) => runQiskitExperiment(input, path.join(__dirname, '..')));
  const window = new BrowserWindow({ width: 1440, height: 960, show: false, webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  const results = await window.webContents.executeJavaScript(`(async () => {
    const click = id => document.getElementById(id).click();
    document.getElementById('presetSelect').value = 'tutorial';
    click('loadPreset');
    const hiddenBeforeSubmit = document.querySelectorAll('.edge.error').length === 0;
    const checks = Number(document.getElementById('checkCount').textContent);
    click('hintButton');
    const hintedMoves = Number(document.getElementById('correctionCount').textContent);
    click('decodeButton');
    const outcome = document.getElementById('outcomeText').textContent;
    const revealedAfterSubmit = document.querySelectorAll('.edge.error').length === 1;
    const correctionLayerVisible = document.querySelectorAll('.correction-layer').length === 1;

    document.querySelector('[data-mode="sandbox"]').click();
    document.querySelector('.edge').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const sandboxShowsError = document.querySelectorAll('.edge.error').length === 1;
    const wrap = document.getElementById('latticeView').getBoundingClientRect();
    const svgBox = document.getElementById('lattice').getBoundingClientRect();
    const metrics = document.querySelector('.metrics').getBoundingClientRect();
    const layoutContained = svgBox.top >= wrap.top && svgBox.bottom <= wrap.bottom && metrics.top >= wrap.bottom - 1;

    document.getElementById('logicalState').value = 'plus';
    document.getElementById('errorQubit').value = '1';
    document.getElementById('qiskitShots').value = '512';
    click('runQiskit');
    for (let i = 0; i < 100 && document.getElementById('syndromeA').textContent === '–'; i++) await new Promise(resolve => setTimeout(resolve, 100));
    const qiskitSyndrome = document.getElementById('syndromeA').textContent + document.getElementById('syndromeB').textContent;
    const qiskitPrediction = document.getElementById('qiskitPrediction').textContent;
    const qiskitHistogramBars = document.querySelectorAll('.bar-row').length;

    return { hiddenBeforeSubmit, checks, hintedMoves, outcome, revealedAfterSubmit, correctionLayerVisible, sandboxShowsError, layoutContained, qiskitSyndrome, qiskitPrediction, qiskitHistogramBars };
  })()`);

  const passed = results.hiddenBeforeSubmit && results.checks === 2 && results.hintedMoves === 1 && results.outcome === 'CORRECTED' && results.revealedAfterSubmit && results.correctionLayerVisible && results.sandboxShowsError && results.layoutContained && results.qiskitSyndrome === '11' && results.qiskitPrediction.includes('q1') && results.qiskitHistogramBars === 4;
  console.log(JSON.stringify({ passed, ...results }, null, 2));
  await window.close();
  app.quit();
  if (!passed) process.exitCode = 1;
}

app.whenReady().then(run).catch(error => { console.error(error); app.quit(); process.exitCode = 1; });
