// Utilidades compartidas del Dashboard MEAL YMCA LAC (window.M).
(() => {
  const RANGOS = [
    ['3-5', 'Primera infancia (3–5)'], ['6-8', 'Niñez temprana (6–8)'], ['9-11', 'Niñez media (9–11)'],
    ['12-14', 'Adolescencia temprana (12–14)'], ['15-17', 'Adolescencia media (15–17)'],
    ['18-20', 'Juventud temprana (18–20)'], ['21-25', 'Juventudes (21–25)'], ['26-30', 'Juventudes adultas (26–30)'],
    ['31-35', 'Personas adultas (31–35)'], ['36-59', 'Personas adultas (36–59)'], ['60+', 'Personas adultas mayores (60+)'],
  ];
  const GENEROS = ['Hombre/niño', 'Mujer/niña', 'No binario', 'No especifica'];
  const PROG = { eleva: 'Eleva', afterschool: 'After School', bluedrop: 'Bluedrop', tejiendo: 'Tejiendo Paz', delta: 'Patrocinios Delta' };
  const PROG_ORDEN = ['eleva', 'afterschool', 'tejiendo', 'delta'];
  const ESTADO = {
    sin_dato: ['s/d', 'Sin dato: la YMCA no reportó este valor.'],
    no_recopilado: ['No recopilado', 'Este dato todavía no se recopila.'],
    en_definicion: ['En definición', 'La herramienta o la fórmula aún no está definida por la coordinación.'],
    suprimido: ['<5', 'Valor menor a 5 oculto para proteger a las personas.'],
    no_impl: ['No implementó', 'La YMCA no implementó el programa en este periodo.'],
    no_aplica: ['No aplica', 'Este indicador no se acumula en la vista histórica.'],
  };

  const keys = () => {
    const q = dash.params();
    const hist = q.vista === 'historico';
    return { hist, ciclo: hist ? 'Histórico' : String(q.ciclo ?? ''), ymca: q.ymca || 'Todas' };
  };
  const enc = (v) => String(v).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const where = (o) => Object.entries(o).map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  const rows = (id) => { const d = dash.data(id); return d.status === 'ok' ? (d.data || []) : null; };
  const nf = d3.format(',');
  const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? '' : nf(Number(v)));

  // Devuelve true si algún dataset no está listo, y deja el elemento en su estado de carga o falla.
  const pending = (el, ids) => {
    const st = ids.map((id) => dash.data(id).status);
    if (st.every((s) => s === 'ok')) { el.classList.remove('dash-skeleton'); return false; }
    el.replaceChildren();
    if (st.some((s) => s === 'error' || s === 'missing' || s === 'declined' || s === 'connect')) {
      el.classList.remove('dash-skeleton');
      const f = document.createElement('div'); f.className = 'm-failed'; f.textContent = 'No se pudo cargar';
      el.append(f);
    } else {
      if (!el.matches('tbody, select')) el.classList.add('dash-skeleton');
    }
    if (el.matches('.m-kpi-val, .m-kpi-var, b, span')) el.textContent = '—';
    return true;
  };

  const implementa = (prog, k = keys()) => (rows('implementaciones') || [])
    .some((r) => r.programa === prog && (k.hist || r.ciclo === k.ciclo) && (k.ymca === 'Todas' || r.ymca === k.ymca));

  const stateEl = (estado) => {
    const s = document.createElement('span');
    s.className = 'm-state m-state-' + estado;
    const [t, title] = ESTADO[estado] || [estado, ''];
    s.textContent = t; s.title = title;
    return s;
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const empty = (box, text) => { box.replaceChildren(el('div', 'm-empty', text)); };
  const foot = (box, faltantes) => { if (faltantes > 0) box.append(el('p', 'm-foot', `No incluye ${faltantes} ${faltantes === 1 ? 'YMCA' : 'YMCA'} sin dato: el total real es mayor.`)); };

  // Tooltip que vive dentro del contenedor del gráfico (position: relative).
  const tip = (box) => {
    const t = el('div', 'm-tip'); t.hidden = true; box.append(t);
    return {
      show(event, head, lines) {
        t.replaceChildren(el('div', 'm-tip-h', head), ...lines.map(([a, b, color]) => {
          const d = document.createElement('div');
          const l = el('span', null, a);
          if (color) { const sw = el('span', 'm-sw'); sw.style.background = color; l.prepend(sw); l.style.display = 'flex'; l.style.gap = '6px'; l.style.alignItems = 'center'; }
          d.append(l, el('b', null, b)); return d;
        }));
        t.hidden = false;
        const r = box.getBoundingClientRect();
        let x = event.clientX - r.left + 12, y = event.clientY - r.top + 12;
        const w = t.offsetWidth, h = t.offsetHeight;
        if (x + w > r.width) x = Math.max(0, event.clientX - r.left - w - 12);
        if (y + h > r.height) y = Math.max(0, event.clientY - r.top - h - 12);
        t.style.left = x + 'px'; t.style.top = y + 'px';
      },
      hide() { t.hidden = true; },
    };
  };
  const svg = (box, h) => {
    const w = Math.max(260, Math.floor(box.clientWidth || 600));
    const s = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img');
    return { s, w, h };
  };
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const colorGenero = (g) => dash.colors[GENEROS.indexOf(g)] || dash.colors[4];
  const colorProg = (p) => dash.colors[{ eleva: 0, afterschool: 1, bluedrop: 5, tejiendo: 2, delta: 3 }[p] ?? 6];

  window.M = { RANGOS, GENEROS, PROG, PROG_ORDEN, ESTADO, keys, where, rows, nf, fmt, pending, implementa, stateEl, el, empty, foot, tip, svg, cssVar, colorGenero, colorProg };
})();
