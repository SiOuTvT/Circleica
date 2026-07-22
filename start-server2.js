const { spawn } = require('child_process');
const server = spawn('npx', ['next', 'dev', '--port', '3099'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

server.stdout.on('data', d => process.stdout.write(d.toString()));
server.stderr.on('data', d => process.stderr.write(d.toString()));

setTimeout(async () => {
  try {
    const r = await fetch('http://localhost:3099/api/health');
    const d = await r.json();
    console.log('\n=== SERVER READY:', d.status, '===');
  } catch(e) {
    console.log('\n=== NOT READY ===');
  }
  process.exit(0);
}, 40000);
