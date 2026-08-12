import urllib.request

d = urllib.request.urlopen("http://localhost:3000/galvelica", timeout=45).read().decode("utf-8", "ignore")
checks = {
    "hero": "同人视觉小说资料库",
    "editor": "编辑精选",
    "browse_all": "浏览全部作品",
    "random": "随机翻开",
}
for k, v in checks.items():
    print(k, v in d)
print("len", len(d))
