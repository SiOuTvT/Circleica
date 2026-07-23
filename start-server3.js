const { spawn } = require('child_process');
const server = spawn('cmd', ['/c', 'npx next dev --port 3099'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});
server.stdout.on('data', d => process.stdout.write(d.toString()));
server.stderr.on('data', d => process.stderr.write(d.toString()));
setTimeout(async () => {
  try {
    const r = await fetch('http://localhost:3099/api/health', { signal: AbortSignal.timeout(5000) });
    console.log('\n=== SERVER READY ===');
    process.exit(0);
  } catch(e) {
    console.log('\nNot ready yet');
    process.exit(1);
  }
}, 30000);
