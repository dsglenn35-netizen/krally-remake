import re, os, sys
root = r"E:\Code\krally_remake"
assets = os.path.join(root, "android", "assets")
html = open(os.path.join(assets, "index.html"), encoding="utf-8").read()

def repl(m):
    src = m.group(1)
    path = os.path.join(assets, src.replace("/", os.sep))
    if not os.path.exists(path):
        print("missing", src); return m.group(0)
    code = open(path, encoding="utf-8").read()
    return "<script>\n" + code + "\n</script>"

out = re.sub(r'<script src="([^"]+)"></script>', repl, html)
open(os.path.join(assets, "index.html"), "w", encoding="utf-8").write(out)
print("inlined ->", os.path.join(assets, "index.html"), len(out), "bytes")