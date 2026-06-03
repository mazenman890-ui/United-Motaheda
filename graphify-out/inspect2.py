import json
from pathlib import Path
analysis = json.loads(Path("graphify-out/.graphify_analysis.json").read_text(encoding="utf-8"))
communities = {int(k): v for k, v in analysis["communities"].items()}
community_sizes = sorted(communities.items(), key=lambda x: len(x[1]), reverse=True)[:12]
for cid, members in community_sizes:
    cohesion = analysis["cohesion"].get(str(cid), 0)
    sample = [m for m in members[:3]]
    print(f"C{cid} ({len(members)} members, coh={cohesion:.2f}): {sample}")
print()
for g in analysis["gods"][:10]:
    print(f"GOD: {g[\"id\"]} deg={g.get(\"degree\",0)}")
print()
for s in analysis["surprises"][:5]:
    print(f"SURPRISE: {s}")