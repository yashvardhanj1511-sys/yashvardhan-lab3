const { spawn } = require('child_process');
const path = require('path');

const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (data) => {
  const msg = data.toString();
  process.stdout.write(`[SERVER] ${msg}`);
  if (msg.includes('Server is running at')) {
    console.log('[RUNNER] Server is ready. Running test suite...\n');
    runTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[SERVER ERR] ${data}`);
});

function runTests() {
  const testProcess = spawn('node', ['test-api.js'], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  testProcess.on('close', (code) => {
    console.log(`\n[RUNNER] Test suite completed with exit code: ${code}`);
    serverProcess.kill('SIGTERM');
    process.exit(code);
  });
}
