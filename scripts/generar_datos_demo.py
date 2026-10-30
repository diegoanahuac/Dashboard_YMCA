"""Genera los datasets de DEMOSTRACIÓN del Dashboard MEAL YMCA LAC.

Todas las cifras son ficticias. Sirven para probar el diseño y deben
reemplazarse por los datos del Producto 2 (base de datos centralizada).

Uso:  python3 scripts/generar_datos_demo.py   -> escribe data/*.json
"""
import json
import random
from pathlib import Path

random.seed(2026)
OUT = Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(exist_ok=True)

YMCAS = [
    ("YMCA Demo A", "México", "Ciudad de México", 19.43, -99.13),
    ("YMCA Demo B", "Colombia", "Bogotá", 4.71, -74.07),
    ("YMCA Demo C", "Perú", "Lima", -12.05, -77.04),
    ("YMCA Demo D", "Chile", "Santiago", -33.45, -70.67),
    ("YMCA Demo E", "Brasil", "São Paulo", -23.55, -46.63),
    ("YMCA Demo F", "Uruguay", "Montevideo", -34.90, -56.16),
]
INFO = {y[0]: y for y in YMCAS}
CICLOS = ["2024", "2025", "2026"]
HIST, TODAS = "Histórico", "Todas"

IMPL = {
    "eleva": {"2024": "ABC", "2025": "ABCD", "2026": "ABCDE"},
    "afterschool": {"2024": "ADE", "2025": "ADEF", "2026": "ABDEF"},
    "bluedrop": {"2025": "DE", "2026": "ADEF"},
    "tejiendo": {"2025": "BCF", "2026": "BCEF"},
    "delta": {"2024": "AE", "2025": "ABE", "2026": "ABDE"},
}
impl = {p: {c: ["YMCA Demo " + l for l in s] for c, s in v.items()} for p, v in IMPL.items()}

RANGOS = ["3-5", "6-8", "9-11", "12-14", "15-17", "18-20", "21-25", "26-30", "31-35", "36-59", "60+"]
GENEROS = ["Hombre/niño", "Mujer/niña", "No binario", "No especifica"]
GEN_W = [0.45, 0.48, 0.02, 0.05]
EDAD_W = {
    ("eleva", "participantes"): {"15-17": 3, "18-20": 3, "21-25": 3, "26-30": 2, "31-35": 1.5, "36-59": 3, "60+": 0.6},
    ("afterschool", "participantes"): {"3-5": 0.4, "6-8": 3, "9-11": 3.5, "12-14": 2.5, "15-17": 1},
    ("bluedrop", "participantes"): {"9-11": 2, "12-14": 3, "15-17": 2},
    ("tejiendo", "participantes"): {"12-14": 1.5, "15-17": 3, "18-20": 3, "21-25": 2, "26-30": 1},
    ("tejiendo", "lideres"): {"15-17": 2, "18-20": 3, "21-25": 2, "26-30": 1},
    ("eleva", "equipo"): {"18-20": 2, "21-25": 3, "26-30": 2, "31-35": 1.5, "36-59": 2},
}
JOVEN = {"15-17", "18-20", "21-25", "26-30"}


def reparto(total, pesos):
    """Reparte un entero según pesos sin perder unidades."""
    claves = list(pesos)
    s = sum(pesos.values())
    base = [int(total * pesos[k] / s) for k in claves]
    resto = total - sum(base)
    orden = sorted(range(len(claves)), key=lambda i: -(total * pesos[claves[i]] / s - base[i]))
    for i in orden[:resto]:
        base[i] += 1
    return dict(zip(claves, base))


def ruido(n, f=0.15):
    return max(0, int(round(n * random.uniform(1 - f, 1 + f))))


ind_rows = []      # filas por YMCA (se agregan después)
eg_rows = []       # edad x género por YMCA
cat_rows = []      # categorías por YMCA
SIN_DATO = set()   # (programa, ciclo, ymca, indicador)


def ind(p, c, y, k, v, estado="dato"):
    ind_rows.append({"programa": p, "ciclo": c, "ymca": y, "indicador": k,
                     "valor": v if estado == "dato" else None, "estado": estado})


def eg(p, grupo, c, y, total, estado="dato"):
    if estado != "dato":
        eg_rows.append({"programa": p, "grupo": grupo, "ciclo": c, "ymca": y, "rango": None,
                        "genero": None, "n": None, "estado": estado})
        return
    por_rango = reparto(total, EDAD_W[(p, grupo)])
    for r in RANGOS:
        n_r = por_rango.get(r, 0)
        for g, n in reparto(n_r, dict(zip(GENEROS, GEN_W))).items():
            eg_rows.append({"programa": p, "grupo": grupo, "ciclo": c, "ymca": y, "rango": r,
                            "genero": g, "n": n, "estado": "dato"})
    return por_rango


def cat(p, dim, c, y, categoria, v, unidad, estado="dato"):
    cat_rows.append({"programa": p, "dimension": dim, "ciclo": c, "ymca": y, "categoria": categoria,
                     "valor": v if estado == "dato" else None, "unidad": unidad, "estado": estado})


AREAS = ["21st Century Skills", "Arts", "Academic Enrichment", "College & Career Readiness",
         "Family & Parent Engagement", "Global Learning & Inclusion", "Health & Wellness",
         "Leadership Development", "Service Learning"]
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MODALIDADES = ["Presencial", "Virtual", "Híbrida"]
USOS = ["Personal facilitador (demo)", "Materiales (demo)", "Alimentación (demo)", "Transporte (demo)", "Otros (demo)"]
GRUPOS_PRIORITARIOS = ["Diversidad sexual y de género", "Discapacidad", "Ubicación geográfica", "Movilidad humana",
                       "Identidad étnico-cultural", "Situación socioeconómica",
                       "Situaciones familiares y de cuidado", "Situaciones de violencia y protección"]
VIOLENCIAS = ["Violencia escolar (demo)", "Violencia de género (demo)", "Violencia comunitaria (demo)", "Violencia digital (demo)"]
BD_TIPOS = {"Tablet": ["Tablet modelo demo T1", "Tablet modelo demo T2"], "Laptop": ["Laptop modelo demo L1"],
            "Computadora de escritorio": ["Escritorio modelo demo D1"]}
BD_PROGRAMAS = ["After School", "Eleva", "Tejiendo Paz", "Otro"]
HABILIDADES = ["Alfabetización digital (demo)", "Programación básica (demo)", "Investigación en línea (demo)",
               "Creación de contenido (demo)"]
ACOMP = ["Seguimiento no profesional", "Atención psicológica en la YMCA", "Canalización"]

cron, alianzas, narr, donantes, eventos, bd_disp = [], [], [], [], [], []
idn = {"c": 0, "a": 0, "n": 0, "e": 0, "b": 0}


def nid(k):
    idn[k] += 1
    return f"{k}{idn[k]:04d}"


def fecha(c, m, d):
    return f"{c}-{m:02d}-{d:02d}"


def nota(p, c, y, tipo, texto):
    narr.append({"id": nid("n"), "programa": p, "ciclo": c, "ymca": y, "tipo": tipo,
                 "texto": "Texto de ejemplo. " + texto})


def alianza(p, c, y, k, objetivo):
    alianzas.append({"id": nid("a"), "programa": p, "ciclo": c, "ymca": y,
                     "organizacion": f"Organización aliada demo {k}", "objetivo": objetivo})


def crono(p, c, y, act, ini, fin):
    cron.append({"id": nid("c"), "programa": p, "ciclo": c, "ymca": y, "actividad": act, "inicio": ini, "fin": fin})


for p, por_ciclo in impl.items():
    for c, ys in por_ciclo.items():
        for y in ys:
            donantes.append({"programa": p, "ciclo": c, "ymca": y,
                             "donante": "Delta Air Lines" if p == "delta" else f"Donante demo {random.choice('123')}"})

# ---------- Eleva ----------
for c, ys in impl["eleva"].items():
    for y in ys:
        total = ruido(180 + 40 * CICLOS.index(c))
        sd = (c == "2025" and y == "YMCA Demo D")
        if sd:
            ind("eleva", c, y, "participantes", total)
            ind("eleva", c, y, "participantes_jovenes", None, "sin_dato")
            ind("eleva", c, y, "participantes_adultos", None, "sin_dato")
            eg("eleva", "participantes", c, y, 0, "sin_dato")
            ind("eleva", c, y, "fondos_usd", None, "sin_dato")
        else:
            pr = eg("eleva", "participantes", c, y, total)
            jov = sum(v for k, v in pr.items() if k in JOVEN)
            ind("eleva", c, y, "participantes", total)
            ind("eleva", c, y, "participantes_jovenes", jov)
            ind("eleva", c, y, "participantes_adultos", total - jov)
            ind("eleva", c, y, "fondos_usd", ruido(14000, 0.2) // 100 * 100)
        pares, vol, prof = ruido(8), ruido(12), ruido(4, 0.5) + 1
        ind("eleva", c, y, "equipo_pares", pares)
        ind("eleva", c, y, "equipo_voluntarios", vol)
        ind("eleva", c, y, "equipo_profesionales", prof)
        eg("eleva", "equipo", c, y, pares + vol + prof)
        ind("eleva", c, y, "talleres_jovenes", ruido(10))
        ind("eleva", c, y, "talleres_adultos", ruido(6))
        ind("eleva", c, y, "tasa_fin_jovenes", None, "en_definicion")
        ind("eleva", c, y, "tasa_fin_adultos", None, "en_definicion")
        ind("eleva", c, y, "prepost", None, "en_definicion")
        for k, base in zip(ACOMP, (14, 6, 3)):
            v = ruido(base, 0.6)
            cat("eleva", "acompanamiento", c, y, k, v, "personas")
        ind("eleva", c, y, "act_comunitarias", ruido(6))
        alc = ruido(420)
        ind("eleva", c, y, "personas_alcanzadas", alc)
        for r, n in reparto(alc, {"6-8": 1, "9-11": 1.5, "12-14": 2, "15-17": 2, "18-20": 1.5, "21-25": 1.2,
                                  "26-30": 1, "31-35": 1, "36-59": 2.5, "60+": 1}).items():
            cat("eleva", "alcance_edad", c, y, r, n, "personas")
        crono("eleva", c, y, "Convocatoria", fecha(c, 2, 1), fecha(c, 3, 15))
        crono("eleva", c, y, "Talleres con jóvenes", fecha(c, 3, 20), fecha(c, 7, 10 + random.randint(0, 15)))
        crono("eleva", c, y, "Talleres con adultos", fecha(c, 4, 5), fecha(c, 8, 1 + random.randint(0, 20)))
        crono("eleva", c, y, "Actividades comunitarias", fecha(c, 8, 15), fecha(c, 11, 10 + random.randint(0, 15)))
        alianza("eleva", c, y, random.randint(1, 9), "Canalización a servicios de salud mental")
        if random.random() < 0.6:
            alianza("eleva", c, y, random.randint(10, 19), "Espacios para talleres comunitarios")
        nota("eleva", c, y, "comunidad", f"{INFO[y][2]}: barrio urbano con alta población joven y pocos servicios de salud mental accesibles.")

# ---------- After School ----------
for c, ys in impl["afterschool"].items():
    for y in ys:
        total = ruido(140 + 30 * CICLOS.index(c))
        eg("afterschool", "participantes", c, y, total)
        ind("afterschool", c, y, "participantes", total)
        ind("afterschool", c, y, "fondos_usd", ruido(18000, 0.2) // 100 * 100)
        grupos = ruido(7)
        ind("afterschool", c, y, "grupos", grupos)
        if c == "2026" and y == "YMCA Demo F":
            ind("afterschool", c, y, "locaciones", None, "sin_dato")
            ind("afterschool", c, y, "fondos_otros_donantes", None, "sin_dato")
        else:
            ind("afterschool", c, y, "locaciones", ruido(3, 0.4) + 1)
            ind("afterschool", c, y, "fondos_otros_donantes", ruido(5000, 0.4) // 100 * 100)
        ind("afterschool", c, y, "hello_insight", 1 if random.random() < 0.55 else 0)
        ind("afterschool", c, y, "tasa_finalizacion", None, "no_recopilado")
        for a in AREAS:
            cat("afterschool", "areas", c, y, a, 1 if random.random() < 0.5 else 0, "YMCA")
        for i, d in enumerate(DIAS):
            cat("afterschool", "dias", c, y, d, 1 if (i < 5 and random.random() < 0.8) or (i == 5 and random.random() < 0.3) else 0, "YMCA")
        rep = reparto(grupos, {"Presencial": 6, "Virtual": 1, "Híbrida": 2})
        for m in MODALIDADES:
            cat("afterschool", "modalidad", c, y, m, rep[m], "grupos")
        for u, n in reparto(ruido(18000, 0.2) // 100 * 100, {"Personal facilitador (demo)": 5, "Materiales (demo)": 2,
                                                             "Alimentación (demo)": 2, "Transporte (demo)": 1, "Otros (demo)": 0.5}).items():
            cat("afterschool", "uso_fondos", c, y, u, n, "USD")
        sur = INFO[y][4] < 0 and INFO[y][3] < -20  # calendario escolar del hemisferio sur
        meses = [(3, 6), (7, 9), (10, 12)] if sur else [(1, 4), (5, 7), (9, 12)]
        for i, (m1, m2) in enumerate(meses, 1):
            crono("afterschool", c, y, f"Term {i}", fecha(c, m1, 5 + random.randint(0, 10)), fecha(c, m2, 15 + random.randint(0, 10)))
        nota("afterschool", c, y, "comunidad", f"{INFO[y][2]}: escuelas públicas con jornada reducida; las familias buscan espacios seguros por la tarde.")

# ---------- Bluedrop ----------
for c, ys in impl["bluedrop"].items():
    for y in ys:
        total = ruido(60)
        eg("bluedrop", "participantes", c, y, total)
        ind("bluedrop", c, y, "participantes", total)
        disp = 0
        for t, modelos in BD_TIPOS.items():
            nt = ruido({"Tablet": 25, "Laptop": 12, "Computadora de escritorio": 5}[t], 0.4)
            disp += nt
            cat("bluedrop", "tipo_dispositivo", c, y, t, nt, "dispositivos")
            for m, n in reparto(nt, {m: 1 for m in modelos}).items():
                bd_disp.append({"id": nid("b"), "ciclo": c, "ymca": y, "tipo": t, "modelo": m, "cantidad": n})
        ind("bluedrop", c, y, "dispositivos", disp)
        for pr, n in reparto(disp, {"After School": 6, "Eleva": 1, "Tejiendo Paz": 1, "Otro": 0.5}).items():
            cat("bluedrop", "programa_uso", c, y, pr, n, "dispositivos")
        for h in HABILIDADES:
            cat("bluedrop", "habilidades", c, y, h, ruido(total * 0.5, 0.4), "participantes")
        nota("bluedrop", c, y, "actividades", "Uso de tablets en clubes de lectura y en un taller de programación por bloques.")

# ---------- Tejiendo Paz ----------
for c, ys in impl["tejiendo"].items():
    for y in ys:
        total = ruido(90)
        eg("tejiendo", "participantes", c, y, total)
        ind("tejiendo", c, y, "participantes", total)
        ind("tejiendo", c, y, "fondos_usd", ruido(9000, 0.2) // 100 * 100)
        if c == "2025" and y == "YMCA Demo C":
            ind("tejiendo", c, y, "jovenes_lideres", None, "sin_dato")
            eg("tejiendo", "lideres", c, y, 0, "sin_dato")
        else:
            lid = ruido(12)
            ind("tejiendo", c, y, "jovenes_lideres", lid)
            eg("tejiendo", "lideres", c, y, lid)
        ind("tejiendo", c, y, "actividades", ruido(9))
        ind("tejiendo", c, y, "resultados", None, "en_definicion")
        for g in GRUPOS_PRIORITARIOS:
            cat("tejiendo", "grupos_prioritarios", c, y, g, 1 if random.random() < 0.45 else 0, "YMCA")
        elegida = random.choice(VIOLENCIAS)
        for v in VIOLENCIAS:
            cat("tejiendo", "tipo_violencia", c, y, v, 1 if v == elegida else 0, "YMCA")
        crono("tejiendo", c, y, "Diseño del proyecto", fecha(c, 3, 1), fecha(c, 4, 30))
        crono("tejiendo", c, y, "Implementación comunitaria", fecha(c, 5, 10), fecha(c, 10, 20 + random.randint(0, 8)))
        crono("tejiendo", c, y, "Cierre y aprendizajes", fecha(c, 11, 1), fecha(c, 11, 28))
        alianza("tejiendo", c, y, random.randint(20, 29), "Acompañamiento en prevención de violencia")
        nota("tejiendo", c, y, "comunidad", f"{INFO[y][2]}: colonia periférica donde las juventudes identifican la violencia como principal preocupación.")

# ---------- Patrocinios Delta ----------
for c, ys in impl["delta"].items():
    for y in ys:
        n_ev = random.randint(1, 3)
        tot = fondos = vol = 0
        for k in range(n_ev):
            m = random.randint(3, 11)
            d = random.randint(1, 20)
            dur = random.choice([0, 0, 1, 2])
            part = ruido(80, 0.5)
            fon = ruido(4000, 0.4) // 100 * 100
            v = "Sí" if random.random() < 0.5 else "No"
            tot += part
            fondos += fon
            vol += v == "Sí"
            nombre = f"Evento demo {y[-1]}{c[-2:]}-{k + 1}"
            eventos.append({"id": nid("e"), "ciclo": c, "ymca": y, "evento": nombre, "inicio": fecha(c, m, d),
                            "fin": fecha(c, m, d + dur), "participantes": part, "fondos_usd": fon,
                            "voluntariado": v, "narrativa": "Texto de ejemplo. Jornada comunitaria con familias; voluntariado corporativo apoyó la logística." if v == "Sí" else "Texto de ejemplo. Actividad deportiva abierta a la comunidad."})
            crono("delta", c, y, nombre, fecha(c, m, d), fecha(c, m, d + dur))
        ind("delta", c, y, "participantes", tot)
        ind("delta", c, y, "fondos_usd", fondos)
        ind("delta", c, y, "eventos", n_ev)
        ind("delta", c, y, "voluntariado_eventos", vol)
        eg("delta", "participantes", c, y, 0, "no_recopilado")

# ---------- Cobertura ----------
for p, por_ciclo in impl.items():
    for c, ys in por_ciclo.items():
        for y in ys:
            ind(p, c, y, "ymca_participantes", 1)

# ---------- Agregados precalculados: Todas las YMCA y Histórico ----------
PRIORIDAD = ["dato", "sin_dato", "suprimido", "no_recopilado", "en_definicion"]


def agregar(filas, claves, valor="valor"):
    """Suma filas por YMCA en 'Todas' (por ciclo), 'Histórico' (por YMCA y Todas)."""
    grupos = {}
    for r in filas:
        for c in (r["ciclo"], HIST):
            for y in (r["ymca"], TODAS):
                if c == r["ciclo"] and y == r["ymca"]:
                    continue
                k = tuple(r[x] for x in claves) + (c, y)
                grupos.setdefault(k, []).append(r)
    out = []
    for k, rs in grupos.items():
        datos = [r for r in rs if r["estado"] == "dato"]
        base = {x: v for x, v in zip(claves, k)}
        base.update({"ciclo": k[-2], "ymca": k[-1]})
        faltan = len({(r["ciclo"], r["ymca"]) for r in rs if r["estado"] == "sin_dato"})
        if datos:
            base.update({valor: sum(r[valor] for r in datos), "estado": "dato"})
        else:
            est = sorted({r["estado"] for r in rs}, key=PRIORIDAD.index)[0]
            base.update({valor: None, "estado": est})
        base["faltantes"] = faltan
        out.append(base)
    return out


for r in ind_rows + eg_rows + cat_rows:
    r.setdefault("faltantes", 0)

agg_ind = agregar([r for r in ind_rows if r["indicador"] not in ("ymca_participantes", "hello_insight")],
                  ["programa", "indicador"])
# Cobertura: YMCA y países distintos, no sumas.
for p, por_ciclo in impl.items():
    for c in list(por_ciclo) + [HIST]:
        ys = sorted({y for cc, l in por_ciclo.items() for y in l if c in (cc, HIST)})
        for sel in [TODAS] + (ys if c == HIST else []):
            sub = ys if sel == TODAS else [sel]
            if c != HIST or sel == TODAS:
                agg_ind.append({"programa": p, "ciclo": c, "ymca": sel, "indicador": "ymca_participantes",
                                "valor": len(sub), "estado": "dato", "faltantes": 0})
            elif sel != TODAS:
                agg_ind.append({"programa": p, "ciclo": c, "ymca": sel, "indicador": "ymca_participantes",
                                "valor": 1, "estado": "dato", "faltantes": 0})
        for y in ys + [TODAS]:
            sub = ys if y == TODAS else [y]
            agg_ind.append({"programa": p, "ciclo": c, "ymca": y, "indicador": "paises",
                            "valor": len({INFO[s][1] for s in sub}), "estado": "dato", "faltantes": 0})
# Hello Insight: YMCA que lo usan en el ciclo (no tiene sentido sumarlo en Histórico)
for c in impl["afterschool"]:
    rs = [r for r in ind_rows if r["indicador"] == "hello_insight" and r["ciclo"] == c]
    agg_ind.append({"programa": "afterschool", "ciclo": c, "ymca": TODAS, "indicador": "hello_insight",
                    "valor": sum(r["valor"] for r in rs), "estado": "dato", "faltantes": 0})

agg_eg = agregar([r for r in eg_rows if r["estado"] == "dato"], ["programa", "grupo", "rango", "genero"], "n")
for r in eg_rows:
    if r["estado"] != "dato":
        for c in (r["ciclo"], HIST):
            for y in (r["ymca"], TODAS):
                if (c, y) != (r["ciclo"], r["ymca"]):
                    key = (r["programa"], r["grupo"], c, y)
                    if not any((a["programa"], a["grupo"], a["ciclo"], a["ymca"]) == key for a in agg_eg):
                        agg_eg.append({**r, "ciclo": c, "ymca": y})
                    else:
                        for a in agg_eg:
                            if (a["programa"], a["grupo"], a["ciclo"], a["ymca"]) == key and a["estado"] == "dato":
                                a["faltantes"] = a.get("faltantes", 0)
# faltantes en edad x género: YMCA sin dato incluidas en el agregado
for a in agg_eg:
    if a["estado"] == "dato":
        a["faltantes"] = len({(r["ciclo"], r["ymca"]) for r in eg_rows if r["estado"] == "sin_dato"
                              and r["programa"] == a["programa"] and r["grupo"] == a["grupo"]
                              and (a["ciclo"] in (HIST, r["ciclo"])) and (a["ymca"] in (TODAS, r["ymca"]))})

agg_cat = agregar([r for r in cat_rows if r["dimension"] != "grupos_prioritarios"], ["programa", "dimension", "categoria", "unidad"])
# Grupos prioritarios: solo número de YMCA a nivel regional (privacidad).
gp = [r for r in cat_rows if r["dimension"] == "grupos_prioritarios"]
for c in list(impl["tejiendo"]) + [HIST]:
    for g in GRUPOS_PRIORITARIOS:
        ys = {r["ymca"] for r in gp if r["categoria"] == g and r["valor"] == 1 and c in (r["ciclo"], HIST)}
        agg_cat.append({"programa": "tejiendo", "dimension": "grupos_prioritarios", "ciclo": c, "ymca": TODAS,
                        "categoria": g, "valor": len(ys), "unidad": "YMCA", "estado": "dato", "faltantes": 0})
cat_rows = [r for r in cat_rows if r["dimension"] != "grupos_prioritarios"]
# Áreas, días y tipo de violencia: en agregados cuentan YMCA distintas, no sumas.
for r in agg_cat:
    if r["dimension"] in ("areas", "dias", "tipo_violencia") and r["ciclo"] == HIST and r["ymca"] == TODAS:
        r["valor"] = len({x["ymca"] for x in cat_rows if x["dimension"] == r["dimension"]
                          and x["categoria"] == r["categoria"] and x["valor"] == 1})
    elif r["dimension"] in ("areas", "dias", "tipo_violencia") and r["ciclo"] == HIST:
        r["valor"] = 1 if r["valor"] else 0
# Supresión de conteos pequeños en acompañamiento, solo en filas por YMCA (el valor no se guarda).
for r in cat_rows:
    if r["dimension"] == "acompanamiento" and r["valor"] is not None and r["valor"] < 5:
        r["valor"], r["estado"] = None, "suprimido"
for r in agg_cat:
    if r["dimension"] == "acompanamiento" and r["ymca"] != TODAS and r["valor"] is not None and r["valor"] < 5:
        r["valor"], r["estado"] = None, "suprimido"

indicadores = ind_rows + agg_ind
edad_genero = eg_rows + agg_eg
categorias = cat_rows + agg_cat


def con_id(filas, cols):
    for r in filas:
        r["id"] = "|".join(str(r[c]) for c in cols)
    return filas


implementaciones = [{"id": f"{p}|{c}|{y}", "programa": p, "ciclo": c, "ymca": y, "pais": INFO[y][1],
                     "ciudad": INFO[y][2], "lat": INFO[y][3], "lon": INFO[y][4]}
                    for p, pc in impl.items() for c, ys in pc.items() for y in ys]
ymca = [{"ymca": y, "pais": pa, "ciudad": ci, "lat": la, "lon": lo} for y, pa, ci, la, lo in YMCAS]

datasets = {
    "ymca": ymca,
    "implementaciones": implementaciones,
    "indicadores": indicadores,
    "edad_genero": edad_genero,
    "categorias": categorias,
    "cronogramas": cron,
    "alianzas": alianzas,
    "narrativas": narr,
    "donantes": con_id(donantes, ["programa", "ciclo", "ymca"]),
    "delta_eventos": eventos,
    "bluedrop_dispositivos": bd_disp,
}
for k, v in datasets.items():
    (OUT / f"{k}.json").write_text(json.dumps(v, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{k:24s} {len(v):6d} filas  {(OUT / f'{k}.json').stat().st_size / 1024:8.1f} KB")
