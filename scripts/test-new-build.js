const http = require('http');
const { execSync } = require('child_process');

// Test the currently running server
function testUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d.substring(0, 200) }));
    }).on('error', e => reject(e));
  });
}

async function main() {
  // Check current server
  console.log('Testing current server at :3000...');
  const res = await testUrl('http://localhost:3000/api/admin/avatar-frames');
  console.log('Status:', res.status);
  console.log('Body:', res.body);
  
  if (res.status === 404) {
    console.log('\n==> Server needs restart to pick up new build!');
    console.log('Run: pm2 restart fangame (on server)');
    console.log('Or restart the Next.js dev/prod process on port 3000');
  }
}

main().catch(console.error);