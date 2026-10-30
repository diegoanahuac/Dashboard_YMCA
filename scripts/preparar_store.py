"""Prepara los documentos del Dashboard (plantilla Dashboard de Claude Artifacts) en dashboard/store/.

Cada archivo es un documento: dash/meta, dash/params, datasets/<id>, files/<nombre>.
Las URL /_blob/... son las de los archivos JSON subidos al artifact; si se vuelven a subir,
actualiza BLOBS.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "dashboard" / "store"
BLOBS = {
    "indicadores": "/_blob/09599f2f473df8b87103996938ff3bdb",
    "edad_genero": "/_blob/2e5d305a3a8cc98cf39cccaa15ba9075",
    "categorias": "/_blob/abef65dd8ae7bd2745bca2b6a462201c",
    "implementaciones": "/_blob/1d2544941ffaf40316827e927c4a50ed",
    "ymca": "/_blob/2cfa62f6ed26c42bb87e8fc38cec0375",
    "cronogramas": "/_blob/3c559e909422f76f6ea22a3350f829a6",
    "alianzas": "/_blob/7a252493873dda99d5eb049da992b962",
    "narrativas": "/_blob/8a4064a76aa2caeb1e8bccb25a883f8c",
    "donantes": "/_blob/6c49541f8ccd74132f330e279502bfe0",
    "delta_eventos": "/_blob/b925bfb42fbcfad6472079ff33301dea",
    "bluedrop_dispositivos": "/_blob/c39986b4dd00d5a8a7a0aeeec8f1490c",
}
DESC = {
    "indicadores": ("Sample: indicadores principales", "Valor por programa, ciclo, YMCA e indicador, con su estado (dato, sin_dato, no_recopilado, en_definicion) y filas precalculadas para Histórico y Todas las YMCA."),
    "edad_genero": ("Sample: edad por género", "Conteos por los 11 rangos de edad y 4 géneros de participantes, equipo de Eleva y líderes de Tejiendo Paz, con Histórico y Todas precalculados."),
    "categorias": ("Sample: perfiles por programa", "Áreas, días, modalidad y uso de fondos de After School; dispositivos de Bluedrop; acompañamiento y alcance de Eleva; grupos prioritarios (solo número de YMCA) y tipo de violencia de Tejiendo Paz."),
    "implementaciones": ("Sample: implementaciones", "Qué YMCA implementa cada programa en cada ciclo, con país, ciudad sede y coordenadas."),
    "ymca": ("Sample: catálogo de YMCA", "YMCA ficticias de demostración con país y ciudad sede."),
    "cronogramas": ("Sample: cronogramas", "Fases, terms y eventos con fecha de inicio y fin por programa y YMCA."),
    "alianzas": ("Sample: alianzas", "Organizaciones aliadas ficticias y el objetivo de cada alianza."),
    "narrativas": ("Sample: fichas narrativas", "Descripción de la comunidad y actividades: textos de ejemplo."),
    "donantes": ("Sample: donantes", "Donantes por programa, ciclo y YMCA. Delta Air Lines es el donante de Patrocinios Delta; los demás son ficticios."),
    "delta_eventos": ("Sample: eventos Delta", "Eventos de Patrocinios Delta con participantes, fondos USD y voluntariado corporativo."),
    "bluedrop_dispositivos": ("Sample: dispositivos Bluedrop", "Dispositivos entregados por tipo y modelo."),
}
NOTA = " Datos de demostración generados por scripts/generar_datos_demo.py (cifras ficticias)."

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
docs = {
    ("dash", "meta"): {"title": "Dashboard MEAL YMCA LAC"},
    ("dash", "params"): {"programa": "resumen", "vista": "ciclo", "ciclo": "2026", "ymca": "Todas", "astab": "programa"},
}
for k, url in BLOBS.items():
    t, d = DESC[k]
    docs[("datasets", k)] = {"title": t, "description": d + NOTA, "fixed": True,
                             "source": {"kind": "file", "url": url, "name": f"{k}.json"},
                             "updated": {"at": now, "by": "Claude (datos de demostración)"}}
for f in ("index.html", "meal-core.js", "meal-draw.js", "meal-app.js"):
    docs[("files", f)] = {"text": (ROOT / "dashboard" / "dist" / f).read_text(encoding="utf-8")}

writes = []
for (col, doc), data in docs.items():
    p = STORE / col / f"{doc}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    writes.append({"op": "set", "collection": col, "doc_id": doc, "file_path": str(p)})
print(json.dumps(writes, ensure_ascii=False))
