import fs from 'fs'
const f = 'dev-server.err'
if (!fs.existsSync(f)) { console.log('NO_ERR_FILE'); process.exit(0) }
const lines = fs.readFileSync(f, 'utf8').split('\n')
const tail = lines.slice(-25).filter(Boolean)
console.log('=== TAIL ERR ===')
console.log(tail.join('\n'))
const errs = lines.filter(l => /error|Error|Failed to compile/i.test(l)).length
console.log('=== ERROR_LINES_COUNT:', errs, '===')
