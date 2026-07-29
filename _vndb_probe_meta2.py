import json, urllib.request

URL = "https://api.vndb.org/kana/vn"

def call(vnid, fields):
    body = json.dumps({"filters": ["id", "=", vnid], "fields": fields, "results": 1}).encode("utf-8")
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "User-Agent": "Circleica/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode("utf-8"))
            vn = d.get("results", [{}])[0]
            return {k: vn.get(k) for k in ["title","olang","orig_lang","original_language","origin_lang","rating","languages"]}
    except urllib.error.HTTPError as e:
        return {"ERR": e.code, "BODY": e.read().decode("utf-8")[:200]}

for cand in ["olang", "original_language", "origin_lang", "origlang"]:
    print(f"== {cand} ==")
    print(json.dumps(call("v4", f"id,title,{cand}"), ensure_ascii=False))

print("== rating on v4 ==")
print(json.dumps(call("v4", "id,title,rating"), ensure_ascii=False))
print("== rating on v17 ==")
print(json.dumps(call("v17", "id,title,rating"), ensure_ascii=False))
