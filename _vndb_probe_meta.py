import json, urllib.request

URL = "https://api.vndb.org/kana/vn"

def call(vnid, fields):
    body = json.dumps({"filters": ["id", "=", vnid], "fields": fields, "results": 1}).encode("utf-8")
    req = urllib.request.Request(URL, data=body, headers={
        "Content-Type": "application/json", "User-Agent": "Circleica/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode("utf-8"))
            vn = d.get("results", [{}])[0]
            return {k: vn.get(k) for k in ["title","languages","orig_lang","rating","platforms","length"]}
    except urllib.error.HTTPError as e:
        return {"ERR": e.code, "BODY": e.read().decode("utf-8")[:300]}

print("== working fields ==")
print(json.dumps(call("v12345", "id,title,platforms,length"), ensure_ascii=False))
print("== +languages ==")
print(json.dumps(call("v12345", "id,title,languages"), ensure_ascii=False))
print("== +orig_lang ==")
print(json.dumps(call("v12345", "id,title,orig_lang"), ensure_ascii=False))
print("== +rating ==")
print(json.dumps(call("v12345", "id,title,rating"), ensure_ascii=False))
