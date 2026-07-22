const { spawn } = require('child_process');
const server = spawn(process.execPath, ['node_modules/.bin/next', 'dev', '--port', '3099'], {
  cwd: __dirname,
  stdio: 'ignore',
  detached: true
});
server.unref();
console.log('Server started with PID:', server.pid);
