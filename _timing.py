import urllib.request, time, urllib.error

url = "http://localhost:3000/galvelica"
for i in range(3):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            code = r.status
            body = r.read()
        dt = time.time() - t0
        print(f"try{i}: status={code} time={dt:.1f}s bytes={len(body)}")
    except Exception as e:
        dt = time.time() - t0
        print(f"try{i}: ERROR after {dt:.1f}s: {e}")
