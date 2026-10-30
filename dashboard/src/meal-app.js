// Cálculos, navegación y filtros del Dashboard MEAL YMCA LAC.
dash.calc('variacion', {
  inputs: ['indicadores'],
  title: 'Variación frente al ciclo anterior',
  description: '(actual − anterior) / anterior × 100, por programa, YMCA e indicador; vacío si el ciclo anterior no tiene dato o vale cero.',
  fn: (indicadores) => {
    const idx = new Map(indicadores.map((r) => [[r.programa, r.ciclo, r.ymca, r.indicador].join('|'), r]));
    return indicadores.filter((r) => r.ciclo !== 'Histórico').map((r) => {
      const anterior = String(Number(r.ciclo) - 1);
      const a = idx.get([r.programa, anterior, r.ymca, r.indicador].join('|'));
      const ok = r.estado === 'dato' && a && a.estado === 'dato' && Number(a.valor) > 0;
      return { programa: r.programa, ciclo: r.ciclo, ymca: r.ymca, indicador: r.indicador, anterior,
        variacion_pct: ok ? Math.round(((Number(r.valor) - Number(a.valor)) / Number(a.valor)) * 1000) / 10 : null };
    });
  },
});

dash.calc('completitud', {
  inputs: ['indicadores', 'categorias'],
  title: 'Completitud de los datos',
  description: 'Cuántos valores reportados por cada YMCA tienen dato, sin dato, no recopilado, en definición o suprimido, por programa y ciclo.',
  fn: (indicadores, categorias) => {
    const nombres = { eleva: 'Eleva', afterschool: 'After School', bluedrop: 'Bluedrop', tejiendo: 'Tejiendo Paz', delta: 'Patrocinios Delta' };
    const out = new Map();
    for (const r of [...indicadores, ...categorias]) {
      if (r.ymca === 'Todas' || r.ciclo === 'Histórico') continue;
      const id = r.programa + '|' + r.ciclo;
      if (!out.has(id)) out.set(id, { id, programa: nombres[r.programa], ciclo: r.ciclo, dato: 0, sin_dato: 0, no_recopilado: 0, en_definicion: 0, suprimido: 0 });
      out.get(id)[r.estado] += 1;
    }
    return [...out.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  },
});

(() => {
  const PAGES = ['resumen', 'eleva', 'afterschool', 'tejiendo', 'delta', 'notas'];
  const all = (sel) => document.querySelectorAll(sel);
  all('.m-tab').forEach((b) => b.addEventListener('click', () => { dash.setParams({ programa: b.dataset.prog }); dash.setLink(b.dataset.prog); }));
  all('.m-seg button').forEach((b) => b.addEventListener('click', () => dash.setParams({ vista: b.dataset.vista })));
  all('.m-sub-tab').forEach((b) => b.addEventListener('click', () => dash.setParams({ astab: b.dataset.astab })));
  all('.m-reset').forEach((b) => b.addEventListener('click', () => dash.resetParams()));

  const named = location.hash.slice(1);
  if (PAGES.includes(named)) dash.setParams({ programa: named });

  dash.onData(() => {
    const q = dash.params();
    const prog = PAGES.includes(q.programa) ? q.programa : 'resumen';
    all('.m-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.prog === prog)));
    all('.m-page').forEach((s) => { s.hidden = s.dataset.page !== prog; });
    all('.m-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === (q.vista || 'ciclo'))));
    const astab = q.astab === 'bluedrop' ? 'bluedrop' : 'programa';
    all('.m-sub-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.astab === astab)));
    all('.m-subpage').forEach((s) => { s.hidden = s.dataset.astab !== astab; });
    // Aviso cuando la YMCA elegida no implementó el programa en el periodo.
    const im = dash.data('implementaciones');
    const hist = q.vista === 'historico';
    all('.m-noimpl').forEach((p) => {
      const ymca = q.ymca || 'Todas';
      p.hidden = im.status !== 'ok' || ymca === 'Todas' || im.data.some((r) => r.programa === p.dataset.prog && r.ymca === ymca && (hist || String(r.ciclo) === String(q.ciclo)));
    });
  });
})();
