import json, urllib.request

URL = "https://api.vndb.org/kana/vn"

def call(vnid, fields):
    body = json.dumps({"filters": ["id", "=", vnid], "fields": fields, "results": 1}).encode("utf-8")
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "User-Agent": "Circleica/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode("utf-8"))
            vn = d.get("results", [{}])[0]
            return {k: vn.get(k) for k in fields.split(",") if k not in ("id","title")}
    except urllib.error.HTTPError as e:
        return {"ERR": e.code, "BODY": e.read().decode("utf-8")[:200]}

for cand in ["rating", "minage", "age", "age_rating", "agerating", "ages", "rating_age"]:
    print(f"== {cand} ==")
    print(json.dumps(call("v4", f"id,title,{cand}"), ensure_ascii=False))

# also confirm olang array vs string on multi-lang VN
print("== olang v11 ==")
print(json.dumps(call("v11", "id,title,olang,languages"), ensure_ascii=False))
