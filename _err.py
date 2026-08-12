import re
html = open(r"d:\Circleica\_galerr.html", encoding="utf-8", errors="ignore").read()
# Next dev error overlay embeds the message in a script/stack
for pat in [r'"message":"([^"]{10,300})"', r'Error:\s*([^\n<]{10,200})', r'TypeError:\s*([^\n<]{10,200})', r'is not a function', r'Cannot read', r'(rateLimit\w*)', r'(RateLimit\w*)']:
    m = re.search(pat, html)
    if m:
        print("MATCH", pat[:30], "=>", m.group(0)[:240])
# also print any visible text fragment
text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"\s+", " ", text)
for kw in ["rateLimit", "RateLimit", "TypeError", "undefined", "Cannot read", "is not a function", "PrismaClient", "Unknown"]:
    i = text.find(kw)
    if i >= 0:
        print("TXT", kw, "::", text[max(0,i-60):i+120])
