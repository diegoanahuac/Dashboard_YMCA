"""Arma dashboard/dist/index.html a partir de dashboard/src/.

La página sigue la regla de la plantilla Dashboard: el texto fijo vive en el HTML
y todo lo que depende de los datos es un dibujo (data-draw) marcado con su origen.
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / "dashboard" / "src", ROOT / "dashboard" / "dist"
DIST.mkdir(parents=True, exist_ok=True)


def kpi(prog, ind, label, note="", fmt="n", var=True, de=None, de_label="", nohist=False, color=True):
    attrs = f'data-draw="kpi" data-prog="{prog}" data-ind="{ind}" data-source="indicadores implementaciones"'
    if fmt != "n":
        attrs += f' data-fmt="{fmt}"'
    if de:
        attrs += f' data-de="{de}" data-de-label="{escape(de_label)}"'
    if nohist:
        attrs += ' data-nohist="1"'
    v = f'<span class="m-kpi-var" data-draw="var" data-prog="{prog}" data-ind="{ind}" data-source="variacion">—</span>' if var else ""
    n = f'<span class="m-kpi-note">{escape(note)}</span>' if note else ""
    return f'<div class="m-kpi"><span class="m-kpi-label">{escape(label)}</span><span class="m-kpi-val" {attrs}>—</span>{v}{n}</div>'


def card(title, note, body, wide=False, cid=""):
    i = f' id="{cid}"' if cid else ""
    return f'<div class="m-card{" m-wide" if wide else ""}"{i}><h4>{escape(title)}</h4><p>{escape(note)}</p>{body}</div>'


def chart(name, prog, source, **extra):
    a = " ".join(f'data-{k.replace("_", "-")}="{escape(str(v))}"' for k, v in extra.items())
    return f'<div class="m-chart" data-draw="{name}" data-prog="{prog}" data-source="{source}" {a}></div>'


def pending(title, text):
    return f'<div class="m-pending"><h4>{escape(title)}</h4><p>{escape(text)}</p></div>'


def table(source, draw, prog, cols):
    num = ' class="m-num"'
    th = "".join(f'<th data-field="{c}"{num if n else ""}>{escape(l)}</th>' for c, l, n in cols)
    return (f'<div class="m-tablebox"><table class="m-table" data-source="{source}" data-row-key="id"><thead><tr>{th}</tr></thead>'
            f'<tbody data-draw="{draw}" data-prog="{prog}"></tbody></table></div>')


def section(title, note, body, sid=""):
    i = f' id="{sid}"' if sid else ""
    p = f"<p>{escape(note)}</p>" if note else ""
    return f'<section class="m-section"{i}><h3 class="m-h3">{escape(title)}</h3>{p}{body}</section>'


def phead(prog, title, sub):
    return (f'<header class="m-phead"><h2>{escape(title)}</h2><p>{escape(sub)}</p>'
            f'<div class="m-donors"><span class="m-label">Donantes</span><span data-draw="donantes" data-prog="{prog}" data-source="donantes">—</span></div></header>'
            f'<p class="m-alert m-noimpl" data-prog="{prog}" hidden>La YMCA elegida no implementó este programa en el periodo consultado. Los indicadores muestran «No implementó».</p>')


def bloque_comun(prog, extra_kpis="", grupo_nota="participaciones registradas en el periodo"):
    """Bloque común obligatorio: igual en todos los programas."""
    kpis = (kpi(prog, "participantes", "Participantes", grupo_nota) + extra_kpis
            + kpi(prog, "ymca_participantes", "YMCA participantes", "movimientos que implementan", var=False)
            + kpi(prog, "paises", "Países", "con implementación", var=False)
            + kpi(prog, "fondos_usd", "Fondos asignados", "en el periodo, USD", fmt="usd"))
    grid = (card("Cobertura geográfica", "Ciudad sede de cada YMCA participante.", chart("mapa", prog, "implementaciones"))
            + card("Edad y género", "Pirámide con los 11 rangos de edad de la coordinación.", chart("piramide", prog, "edad_genero implementaciones", grupo="participantes"))
            + card("Composición por género", "Las cuatro categorías de género.", chart("dona", prog, "edad_genero implementaciones", grupo="participantes"))
            + card("Participantes por ciclo", "El ciclo elegido va resaltado.", chart("serie", prog, "indicadores implementaciones", ind="participantes", label="Participantes"))
            + card("Fondos asignados por ciclo", "USD. La comparación aplica desde dos ciclos con dato.", chart("serie", prog, "indicadores implementaciones", ind="fondos_usd", fmt="usd", label="Fondos")))
    return section("Indicadores comunes", "Mismo bloque y misma lógica en todos los programas para poder comparar.",
                   f'<div class="m-kpis">{kpis}</div><div class="m-grid">{grid}</div>', sid=f"{prog}-comun")


def page(pid, body):
    return f'<section class="m-page" id="{pid}" data-page="{pid}" hidden>{body}</section>'


# ---------- Resumen ----------
def tarjeta_resumen(prog, nombre, sub):
    k = (kpi(prog, "participantes", "Participantes", "", var=True)
         + kpi(prog, "ymca_participantes", "YMCA", "", var=False)
         + kpi(prog, "paises", "Países", "", var=False)
         + (kpi(prog, "fondos_usd", "Fondos", "", fmt="usd", var=False) if prog != "bluedrop" else kpi(prog, "dispositivos", "Dispositivos", "", var=False)))
    return f'<div class="m-card"><h4>{escape(nombre)}</h4><p>{escape(sub)}</p><div class="m-kpis">{k}</div></div>'


resumen = page("resumen",
    '<header class="m-phead"><h2>Resumen regional</h2><p>Una tarjeta por programa. Los participantes no se suman entre programas porque una misma persona puede estar en varios.</p></header>'
    + section("Programas en el periodo", "", '<div class="m-grid">'
              + tarjeta_resumen("eleva", "Eleva", "Salud mental")
              + tarjeta_resumen("afterschool", "After School", "Programa extraescolar")
              + tarjeta_resumen("bluedrop", "Bluedrop", "Módulo de After School: dispositivos donados")
              + tarjeta_resumen("tejiendo", "Tejiendo Paz", "Prevención de la violencia")
              + tarjeta_resumen("delta", "Patrocinios Delta", "Eventos y programas con Delta Air Lines") + "</div>")
    + section("Dónde trabajamos", "", '<div class="m-grid">'
              + card("Mapa regional", "Cada punto es una YMCA; el tamaño crece con el número de programas.", chart("mapa", "todos", "implementaciones"))
              + card("Programas por YMCA", "Qué programas implementa cada movimiento en el periodo.", chart("matriz-prog", "todos", "implementaciones ymca"))
              + "</div>"))

# ---------- Eleva ----------
eleva = page("eleva",
    phead("eleva", "Eleva", "Programa Regional de Salud Mental con personas jóvenes, adultas, pares, voluntarias y profesionales.")
    + bloque_comun("eleva", kpi("eleva", "participantes_jovenes", "Jóvenes", "según tipo de participante")
                   + kpi("eleva", "participantes_adultos", "Adultos", "según tipo de participante"))
    + section("Equipo de implementación", "", '<div class="m-kpis">'
              + kpi("eleva", "equipo_pares", "Personas pares") + kpi("eleva", "equipo_voluntarios", "Personas voluntarias")
              + kpi("eleva", "equipo_profesionales", "Personas profesionales") + '</div><div class="m-grid">'
              + card("Edad y género del equipo", "Pares, voluntarias y profesionales juntos.", chart("piramide", "eleva", "edad_genero implementaciones", grupo="equipo"))
              + card("Género del equipo", "", chart("dona", "eleva", "edad_genero implementaciones", grupo="equipo")) + "</div>", sid="eleva-equipo")
    + section("Intervenciones", "", '<div class="m-kpis">'
              + kpi("eleva", "talleres_jovenes", "Talleres con jóvenes") + kpi("eleva", "talleres_adultos", "Talleres con adultos")
              + kpi("eleva", "tasa_fin_jovenes", "Tasa de finalización, jóvenes", "criterio en definición", var=False)
              + kpi("eleva", "tasa_fin_adultos", "Tasa de finalización, adultos", "criterio en definición", var=False) + "</div>", sid="eleva-intervenciones")
    + section("Acompañamiento y seguimiento", "Personas atendidas. En la vista por YMCA, los valores menores a 5 se muestran como «<5».",
              card("Personas por tipo de acompañamiento", "", chart("barras", "eleva", "categorias implementaciones", dim="acompanamiento", orden="fijo"), wide=True), sid="eleva-acompanamiento")
    + section("Alcance comunitario", "", '<div class="m-kpis">'
              + kpi("eleva", "act_comunitarias", "Actividades comunitarias") + kpi("eleva", "personas_alcanzadas", "Personas alcanzadas") + '</div>'
              + card("Personas alcanzadas por rango de edad", "", chart("barras", "eleva", "categorias implementaciones", dim="alcance_edad", orden="rangos"), wide=True), sid="eleva-alcance")
    + section("Resultados", "", pending("Mediciones pre y post: herramienta en definición",
              "La coordinación regional todavía define la herramienta de medición. Este espacio queda reservado; no se muestran escalas ni fórmulas provisionales."), sid="eleva-resultados")
    + section("Implementación", "", '<div class="m-grid">'
              + card("Cronograma", "Fases por YMCA. Con «Todas las YMCA» se ven juntas.", chart("gantt", "eleva", "cronogramas"), wide=True)
              + card("Alianzas establecidas", "", table("alianzas", "t-alianzas", "eleva", [("ymca", "YMCA", 0), ("ciclo", "Ciclo", 0), ("organizacion", "Organización", 0), ("objetivo", "Objetivo", 0)]), wide=True)
              + card("Contexto territorial", "Descripción de la comunidad por YMCA.", '<div class="m-fichas" data-draw="fichas" data-prog="eleva" data-tipo="comunidad" data-source="narrativas"></div>', wide=True)
              + "</div>", sid="eleva-implementacion"))

# ---------- After School ----------
as_prog = ('<div class="m-subpage" data-astab="programa">'
    + bloque_comun("afterschool")
    + section("Implementación", "", '<div class="m-kpis">'
              + kpi("afterschool", "grupos", "Grupos") + kpi("afterschool", "locaciones", "Locaciones")
              + kpi("afterschool", "hello_insight", "Usa Hello Insight", "Sí/No por YMCA", fmt="sino", var=False, de="ymca_participantes", de_label="YMCA", nohist=True)
              + kpi("afterschool", "tasa_finalizacion", "Tasa de finalización", "aún no se recopila", var=False) + '</div><div class="m-grid">'
              + card("Cronograma de terms", "Cada YMCA organiza su calendario académico en terms propios.", chart("gantt", "afterschool", "cronogramas"), wide=True)
              + card("Días de implementación", "Lunes a domingo, por YMCA.", chart("dias", "afterschool", "categorias implementaciones"))
              + card("Modalidad", "Número de grupos por modalidad.", chart("barras", "afterschool", "categorias implementaciones", dim="modalidad"))
              + "</div>", sid="afterschool-implementacion")
    + section("Áreas de intervención", "Número de YMCA que trabajan cada área (una YMCA puede trabajar varias).",
              card("YMCA por área", "", chart("barras", "afterschool", "categorias implementaciones", dim="areas"), wide=True), sid="afterschool-areas")
    + section("Financiamiento", "", '<div class="m-kpis">'
              + kpi("afterschool", "fondos_otros_donantes", "Fondos de otros donantes", "USD", fmt="usd") + '</div><div class="m-grid">'
              + card("Uso de los fondos", "USD por categoría. Categorías de ejemplo hasta que la coordinación defina el catálogo.", chart("barras", "afterschool", "categorias implementaciones", dim="uso_fondos"))
              + card("Fondos de otros donantes por ciclo", "USD.", chart("serie", "afterschool", "indicadores implementaciones", ind="fondos_otros_donantes", fmt="usd", label="Otros donantes"))
              + "</div>", sid="afterschool-financiamiento")
    + section("Contexto", "", card("Descripción de la comunidad", "", '<div class="m-fichas" data-draw="fichas" data-prog="afterschool" data-tipo="comunidad" data-source="narrativas"></div>', wide=True), sid="afterschool-contexto")
    + "</div>")
bluedrop = ('<div class="m-subpage" data-astab="bluedrop" hidden>'
    + '<header class="m-phead"><h2>Bluedrop</h2><p>Donación de tablets y computadoras vinculada a After School. Sus participantes son parte de After School y no se suman al total regional.</p></header>'
    + section("Participantes", "", '<div class="m-kpis">' + kpi("bluedrop", "participantes", "Participantes") + kpi("bluedrop", "ymca_participantes", "YMCA", var=False) + '</div><div class="m-grid">'
              + card("Edad y género", "", chart("piramide", "bluedrop", "edad_genero implementaciones", grupo="participantes"))
              + card("Género", "", chart("dona", "bluedrop", "edad_genero implementaciones", grupo="participantes")) + "</div>", sid="bluedrop-participantes")
    + section("Dispositivos", "", '<div class="m-kpis">' + kpi("bluedrop", "dispositivos", "Dispositivos entregados") + '</div><div class="m-grid">'
              + card("Por tipo", "", chart("barras", "bluedrop", "categorias implementaciones", dim="tipo_dispositivo"))
              + card("Por modelo", "", table("bluedrop_dispositivos", "t-bd", "bluedrop", [("ymca", "YMCA", 0), ("ciclo", "Ciclo", 0), ("tipo", "Tipo", 0), ("modelo", "Modelo", 0), ("cantidad", "Cantidad", 1)]))
              + "</div>", sid="bluedrop-dispositivos")
    + section("Utilización", "", '<div class="m-grid">'
              + card("Programas donde se usan", "Dispositivos por programa.", chart("barras", "bluedrop", "categorias implementaciones", dim="programa_uso"))
              + card("Habilidades desarrolladas", "Participantes por habilidad. Catálogo de ejemplo: la coordinación aún no lo define.", chart("barras", "bluedrop", "categorias implementaciones", dim="habilidades"))
              + card("Actividades realizadas con los dispositivos", "", '<div class="m-fichas" data-draw="fichas" data-prog="bluedrop" data-tipo="actividades" data-source="narrativas"></div>', wide=True)
              + "</div>", sid="bluedrop-utilizacion")
    + "</div>")
afterschool = page("afterschool",
    phead("afterschool", "After School", "Programa extraescolar implementado por diferentes YMCA, cada una con sus propios terms.")
    + '<div class="m-subtabs" role="tablist" aria-label="Secciones de After School"><button class="m-sub-tab" role="tab" data-astab="programa">Programa</button><button class="m-sub-tab" role="tab" data-astab="bluedrop">Módulo Bluedrop</button></div>'
    + as_prog + bluedrop)

# ---------- Tejiendo Paz ----------
tejiendo = page("tejiendo",
    phead("tejiendo", "Tejiendo Paz", "Jóvenes que diseñan y lideran proyectos comunitarios para prevenir la violencia.")
    + bloque_comun("tejiendo")
    + section("Grupos prioritarios", "Por sensibilidad se muestra cuántas YMCA trabajan con cada grupo, nunca cuántas personas. Se oculta en la vista por YMCA.",
              card("YMCA por grupo prioritario", "", chart("barras", "tejiendo", "categorias implementaciones", dim="grupos_prioritarios", orden="fijo", privado="1"), wide=True), sid="tejiendo-grupos")
    + section("Liderazgo juvenil", "", '<div class="m-kpis">' + kpi("tejiendo", "jovenes_lideres", "Jóvenes que lideran proyectos") + '</div><div class="m-grid">'
              + card("Edad y género de quienes lideran", "", chart("piramide", "tejiendo", "edad_genero implementaciones", grupo="lideres"))
              + card("Género de quienes lideran", "", chart("dona", "tejiendo", "edad_genero implementaciones", grupo="lideres")) + "</div>", sid="tejiendo-liderazgo")
    + section("Intervención", "", '<div class="m-kpis">' + kpi("tejiendo", "actividades", "Actividades") + '</div><div class="m-grid">'
              + card("Tipo de violencia abordada", "Número de YMCA por tipo. Catálogo de ejemplo hasta que la coordinación lo defina.", chart("barras", "tejiendo", "categorias implementaciones", dim="tipo_violencia"))
              + card("Cronograma de actividades", "", chart("gantt", "tejiendo", "cronogramas"), wide=True) + "</div>", sid="tejiendo-intervencion")
    + section("Alianzas", "", card("Organizaciones aliadas y objetivo", "", table("alianzas", "t-alianzas", "tejiendo", [("ymca", "YMCA", 0), ("ciclo", "Ciclo", 0), ("organizacion", "Organización", 0), ("objetivo", "Objetivo", 0)]), wide=True), sid="tejiendo-alianzas")
    + section("Contexto", "", card("Descripción de la comunidad", "", '<div class="m-fichas" data-draw="fichas" data-prog="tejiendo" data-tipo="comunidad" data-source="narrativas"></div>', wide=True), sid="tejiendo-contexto")
    + section("Resultados", "", pending("Indicadores de la herramienta de medición: en definición",
              "La herramienta todavía no está definida. No se muestran métricas provisionales."), sid="tejiendo-resultados"))

# ---------- Patrocinios Delta ----------
delta = page("delta",
    phead("delta", "Patrocinios Delta", "Actividades, eventos y programas respaldados por Delta Air Lines.")
    + bloque_comun("delta", kpi("delta", "eventos", "Eventos")
                   + kpi("delta", "voluntariado_eventos", "Con voluntariado corporativo", "eventos con registro «Sí»", var=False, de="eventos", de_label="eventos"),
                   grupo_nota="suma de todos los eventos")
    + section("Eventos", "", '<div class="m-grid">'
              + card("Participantes por evento", "", chart("barras-ev", "delta", "delta_eventos", campo="participantes"))
              + card("Fondos asignados por evento", "USD.", chart("barras-ev", "delta", "delta_eventos", campo="fondos_usd"))
              + card("Cronograma de eventos", "", chart("gantt", "delta", "cronogramas"), wide=True)
              + card("Detalle de eventos", "", table("delta_eventos", "t-eventos", "delta", [("evento", "Evento", 0), ("ymca", "YMCA", 0), ("inicio", "Fecha", 0), ("participantes", "Participantes", 1), ("fondos_usd", "Fondos USD", 1), ("voluntariado", "Voluntariado corporativo", 0)]), wide=True)
              + card("Información narrativa", "", '<div class="m-fichas" data-draw="fichas-ev" data-prog="delta" data-source="delta_eventos"></div>', wide=True)
              + "</div>", sid="delta-eventos"))

# ---------- Notas ----------
notas = page("notas",
    '<header class="m-phead"><h2>Notas sobre los datos</h2><p>Qué muestra el dashboard, qué falta y qué supuestos usa. Es la parte de rendición de cuentas del propio tablero.</p></header>'
    + '<div class="m-notes">'
    + section("Cómo leer los estados del dato", "", '<dl>'
              '<dt><span class="m-state">s/d</span></dt><dd>Sin dato: la YMCA no reportó el valor. Nunca se reemplaza por cero.</dd>'
              '<dt><span class="m-state">No recopilado</span></dt><dd>El dato todavía no se recopila (por ejemplo, tasa de finalización de After School, o edad y género en Delta).</dd>'
              '<dt><span class="m-state">En definición</span></dt><dd>La coordinación aún define la herramienta o la fórmula.</dd>'
              '<dt><span class="m-state m-state-suprimido">&lt;5</span></dt><dd>Valor menor a 5 oculto para proteger a las personas; el valor no se guarda en los datos.</dd>'
              '<dt><span class="m-state">No implementó</span></dt><dd>La YMCA no implementó el programa en ese periodo.</dd>'
              '<dt>«Faltan N YMCA sin dato»</dt><dd>El total suma solo las YMCA que reportaron: el total real es mayor y la comparación con otros ciclos es parcial.</dd>'
              '</dl>')
    + section("Completitud por programa y ciclo", "Valores reportados por YMCA según su estado.",
              table("completitud", "t-completitud", "notas", [("programa", "Programa", 0), ("ciclo", "Ciclo", 0), ("dato", "Con dato", 1), ("sin_dato", "Sin dato", 1),
                                                                ("no_recopilado", "No recopilado", 1), ("en_definicion", "En definición", 1), ("suprimido", "<5 oculto", 1)]))
    + section("Supuestos en uso (pendientes de validar con la coordinación)", "", '<ul>'
              '<li>Ciclo = año calendario. Los terms de After School van dentro del año.</li>'
              '<li>Se cuentan participaciones, no personas únicas: el Histórico suma ciclos y una persona que repite cuenta dos veces.</li>'
              '<li>Histórico con una sola YMCA muestra el acumulado de esa YMCA.</li>'
              '<li>Jóvenes y adultos de Eleva según el tipo de participante que registra la YMCA.</li>'
              '<li>Bluedrop es un subconjunto de After School.</li>'
              '<li>Variación = (actual − anterior) / anterior; s/d si el ciclo anterior no tiene dato o vale cero. La flecha no indica si el cambio es bueno o malo.</li>'
              '<li>Fondos asignados en USD tal como los reporta cada YMCA.</li>'
              '<li>Ciudad del mapa = ciudad sede de la YMCA.</li>'
              '<li>Catálogos de ejemplo (marcados «demo»): tipos de violencia, habilidades Bluedrop, uso de fondos.</li>'
              '</ul>')
    + section("Privacidad", "", '<ul>'
              '<li>Uso interno. Solo datos agregados; ningún registro personal.</li>'
              '<li>Grupos prioritarios: solo número de YMCA a nivel regional; no hay datos por YMCA.</li>'
              '<li>Acompañamiento psicológico, canalización y seguimiento: «&lt;5» en la vista por YMCA.</li>'
              '</ul>')
    + section("Origen de los datos", "", '<p class="m-countries">Hoy: archivos JSON de demostración generados por <code>scripts/generar_datos_demo.py</code>. '
              'Siguiente paso: reemplazarlos por los datos del Producto 2 (Google Sheets) con la misma estructura de columnas; ver <code>docs/integracion-google-sheets.md</code> en el repositorio.</p>')
    + "</div>")

TABS = [("resumen", "Resumen"), ("eleva", "Eleva"), ("afterschool", "After School"), ("tejiendo", "Tejiendo Paz"), ("delta", "Patrocinios Delta"), ("notas", "Notas sobre los datos")]
tabs = "".join(f'<button class="m-tab" role="tab" data-prog="{p}">{escape(l)}</button>' for p, l in TABS)

css = (SRC / "estilos.css").read_text(encoding="utf-8")
html = f"""<meta name="dash-one-writer">
<style>
{css}
</style>
<div class="m-wrap">
<header class="m-head" id="inicio">
<h1 class="m-title">Dashboard MEAL YMCA LAC</h1>
<p class="m-lead">Monitoreo regional de Eleva, After School con Bluedrop, Tejiendo Paz y Patrocinios Delta. Uso interno: solo datos agregados.</p>
<p class="m-demo" role="note"><b>Datos de demostración.</b> Todas las YMCA («YMCA Demo A–F») y todas las cifras son ficticias. Sirven para probar el diseño y no son resultados de YMCA LAC.</p>
</header>
<nav class="m-bar" aria-label="Navegación y filtros">
<div class="m-tabs" role="tablist" aria-label="Programa">{tabs}</div>
<div class="m-controls">
<div class="m-seg" role="group" aria-label="Vista"><button type="button" data-vista="historico">Histórico</button><button type="button" data-vista="ciclo">Ciclo</button></div>
<label class="m-field">Ciclo<select data-draw="sel-ciclo" data-source="implementaciones" aria-label="Ciclo"></select></label>
<label class="m-field">YMCA<select data-draw="sel-ymca" data-source="ymca" aria-label="YMCA"></select></label>
<button type="button" class="m-reset">Restablecer filtros</button>
</div>
<p class="m-ctx">Estás viendo: <b data-draw="contexto">—</b></p>
</nav>
{resumen}
{eleva}
{afterschool}
{tejiendo}
{delta}
{notas}
</div>
<script src="meal-core.js"></script>
<script src="meal-draw.js"></script>
<script src="meal-app.js"></script>
"""
(DIST / "index.html").write_text(html, encoding="utf-8")
for f in ("meal-core.js", "meal-draw.js", "meal-app.js"):
    (DIST / f).write_text((SRC / f).read_text(encoding="utf-8"), encoding="utf-8")
print("index.html", round(len(html.encode()) / 1024, 1), "KB")
