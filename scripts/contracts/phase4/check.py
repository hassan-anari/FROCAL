"""Paired DTO checks from pinned WEDCAL sources; isolated, without DB or HTTP."""
import ast
import hashlib
import json
import runpy
from datetime import datetime
from pathlib import Path
from typing import Literal

from django.conf import settings

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
pin = json.loads((HERE.parent / "phase4-pin.json").read_text())
for relative, expected in pin["files"].items():
    raw = (ROOT / relative).read_bytes()
    actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    assert actual == expected["blob"], f"Phase 4 source drift: {relative}"
if not settings.configured:
    settings.configure(SECRET_KEY="isolated-phase4-schema-only", INSTALLED_APPS=[])
from ninja import Schema

output = runpy.run_path(str(HERE / "backend-bootstrap-schemas.py"))["BootstrapOutput"]
for name in ("registered-2.json", "registered-6.json", "configurable-3.json"):
    payload = json.loads((ROOT / "src/integrations/api/fixtures/phase4" / name).read_text())
    result = output.model_validate(payload)
    assert result.season.timing is not None
    assert result.model_dump(mode="json")["season"]["timing"] == payload["season"]["timing"]
    print(f"Pinned backend BootstrapOutput accepted {name} and preserved all timing fields")
# Load only the exact MissionOutput declaration; no backend app/model initialization.
source = ast.parse((HERE / "backend-mission-schemas.py").read_text())
node = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == "MissionOutput")
namespace = {"Schema": Schema, "datetime": datetime, "Literal": Literal}
exec(compile(ast.Module(body=[node], type_ignores=[]), "pinned-MissionOutput", "exec"), namespace)
missions = json.loads((ROOT / "src/integrations/api/fixtures/phase4/missions.json").read_text())
for mission in missions:
    namespace["MissionOutput"].model_validate(mission)
print(f"Pinned backend MissionOutput accepted all {len(missions)} known/unknown-key fixtures")
print(f"Phase 4 pairing passed at {pin['commit']}; no database, production API or backend mutations")
