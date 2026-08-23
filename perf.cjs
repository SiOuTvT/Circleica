;(async () => {
  const urls = [
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3000/games',
    'http://127.0.0.1:3000/tags',
    'http://127.0.0.1:3000/about',
    'http://127.0.0.1:3000/admin/tags/all',
    'http://127.0.0.1:3000/admin/dashboard',
  ]
  for (const u of urls) {
    for (let i = 0; i < 2; i++) {
      const t0 = Date.now()
      try {
        const res = await fetch(u, { redirect: 'manual' })
        await res.text()
        console.log(u.padEnd(34), 'try' + i, res.status, (Date.now() - t0) + 'ms')
      } catch (e) { console.log(u.padEnd(34), 'try' + i, 'ERR', String(e)) }
    }
  }
})()
