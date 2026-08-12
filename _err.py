import urllib.request, urllib.error

for attempt in range(10):
    try:
        req = urllib.request.Request("http://localhost:3000/galvelica")
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read().decode("utf-8", "ignore")
            print(f"attempt {attempt}: 200 (len={len(data)})")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        print(f"attempt {attempt}: 500")
        for kw in ["⨯", "Error:", "TypeError", "at async", "PrismaClient",
                   "getEditorPicks", "getDailyPick", "getFeaturedThemes",
                   "getGalvelicaTagColor", "GalvelicaHome", "redis",
                   "ECONNREFUSED", "fetch failed", "getNsfwMode", "isExpired"]:
            idx = body.find(kw)
            if idx != -1:
                snippet = body[idx:idx+200].replace("\n", " ")
                print("  @@", snippet[:180])
        break
    except Exception as e:
        print(f"attempt {attempt}: other {e}")
print("DONE")
