const { spawn } = require('child_process');
const server = spawn(process.execPath, ['node_modules/.bin/next', 'dev', '--port', '3099'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', d => process.stdout.write(d.toString()));
server.stderr.on('data', d => process.stderr.write(d.toString()));
setTimeout(async () => {
  try {
    const r = await fetch('http://localhost:3099/api/health', { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    console.log('\n=== SERVER READY ===');
    process.exit(0);
  } catch(e) {
    console.log('Not ready, retrying...');
    setTimeout(async () => {
      try {
        const r = await fetch('http://localhost:3099/api/health', { signal: AbortSignal.timeout(10000) });
        console.log('\n=== SERVER READY (retry) ===');
        process.exit(0);
      } catch(e2) {
        console.log('Still not ready');
        process.exit(1);
      }
    }, 15000);
  }
}, 20000);
