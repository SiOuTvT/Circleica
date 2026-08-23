import fs from 'fs'
try {
  fs.rmSync('.next', { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  console.log('DELETED .next OK')
} catch (e) {
  console.log('DEL ERR', e.message)
}
