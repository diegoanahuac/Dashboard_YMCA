// Dibujos del Dashboard MEAL YMCA LAC. Cada cifra sale de un dataset y lleva su marca de origen.
(() => {
  const { keys, where, rows, fmt, pending, implementa, stateEl, el, empty, foot, tip, svg, RANGOS, GENEROS, PROG } = window.M;
  const q = () => dash.params();
  const inPeriod = (r, k) => (k.hist ? true : r.ciclo === k.ciclo) && (k.ymca === 'Todas' || r.ymca === k.ymca);
  const keyRows = (data, k, extra) => data.filter((r) => r.ciclo === k.ciclo && r.ymca === k.ymca && extra(r));
  const mark = (node, source, field, w) => { node.dataset.source = source; node.dataset.field = field; if (w) node.dataset.where = where(w); return node; };

  // ---------- Frase de contexto y filtros ----------
  dash.draw('contexto', (b) => {
    const k = keys();
    const prog = q().programa;
    const nombre = { resumen: 'Resumen regional', notas: 'Notas sobre los datos' }[prog] || PROG[prog] || '';
    b.textContent = `${nombre} · ${k.hist ? 'Histórico' : 'Ciclo ' + k.ciclo} — ${k.ymca === 'Todas' ? 'Todas las YMCA' : k.ymca}`;
  });

  dash.draw('sel-ciclo', (sel) => {
    const im = rows('implementaciones');
    const ciclos = im ? [...new Set(im.map((r) => String(r.ciclo)))].sort() : [];
    sel.replaceChildren(...ciclos.map((c) => new Option(c, c)));
    sel.value = String(q().ciclo ?? '');
    sel.disabled = keys().hist;
    sel.onchange = () => dash.setParams({ ciclo: sel.value });
  });

  dash.draw('sel-ymca', (sel) => {
    const ys = rows('ymca') || [];
    sel.replaceChildren(new Option('Todas las YMCA', 'Todas'), ...ys.map((r) => new Option(`${r.ymca} (${r.pais})`, r.ymca)));
    sel.value = q().ymca || 'Todas';
    sel.onchange = () => dash.setParams({ ymca: sel.value });
  });

  // ---------- Tarjetas KPI ----------
  const findInd = (data, p, k, ind) => data.find((r) => r.programa === p && r.ciclo === k.ciclo && r.ymca === k.ymca && r.indicador === ind);

  dash.draw('kpi', (box) => {
    if (pending(box, ['indicadores', 'implementaciones'])) return;
    const { prog: p, ind, fmt: f = 'n', de, nohist } = box.dataset;
    const k = keys();
    box.replaceChildren();
    if (k.hist && nohist) { box.append(stateEl('no_aplica')); return; }
    const data = rows('indicadores');
    const r = findInd(data, p, k, ind);
    if (!r) { box.append(stateEl(implementa(p, k) ? 'sin_dato' : 'no_impl')); return; }
    if (r.estado !== 'dato') { box.append(stateEl(r.estado)); return; }
    const w = { programa: p, ciclo: k.ciclo, ymca: k.ymca, indicador: ind };
    if (f === 'sino' && k.ymca !== 'Todas') { box.textContent = Number(r.valor) ? 'Sí' : 'No'; return; }
    if (f === 'usd') box.append(el('span', 'm-unit', 'USD'));
    box.append(mark(el('span', null, fmt(r.valor)), 'indicadores', 'valor', w));
    if (de) {
      const r2 = findInd(data, p, k, de);
      if (r2 && r2.estado === 'dato') {
        box.append(el('span', 'm-of', ' de '), mark(el('span', 'm-of', fmt(r2.valor)), 'indicadores', 'valor', { ...w, indicador: de }), el('span', 'm-of', ' ' + (box.dataset.deLabel || '')));
      }
    }
    if (Number(r.faltantes) > 0) box.append(el('span', 'm-miss', `Faltan ${r.faltantes} YMCA sin dato`));
  });

  dash.draw('var', (box) => {
    if (pending(box, ['variacion'])) return;
    const { prog: p, ind } = box.dataset;
    const k = keys();
    box.replaceChildren();
    if (k.hist) { box.textContent = 'Sin comparación en vista histórica'; return; }
    const r = (rows('variacion') || []).find((x) => x.programa === p && x.ciclo === k.ciclo && x.ymca === k.ymca && x.indicador === ind);
    if (!r || r.variacion_pct == null) { box.textContent = `s/d frente a ${Number(k.ciclo) - 1}`; return; }
    const v = Number(r.variacion_pct);
    box.append(el('span', null, v > 0 ? '▲ +' : v < 0 ? '▼ ' : '= '),
      mark(el('span', null, `${v}%`), 'variacion', 'variacion_pct', { programa: p, ciclo: k.ciclo, ymca: k.ymca, indicador: ind }),
      el('span', null, ` frente a ${r.anterior}`));
  });

  dash.draw('donantes', (box) => {
    if (pending(box, ['donantes'])) return;
    const k = keys();
    const ds = [...new Set(rows('donantes').filter((r) => r.programa === box.dataset.prog && inPeriod(r, k)).map((r) => r.donante))].sort();
    box.replaceChildren(...(ds.length ? ds.map((d) => el('span', 'm-chip', d)) : [stateEl('sin_dato')]));
  });

  // ---------- Mapa de cobertura (puntos por ciudad sede) ----------
  dash.draw('mapa', (box) => {
    if (pending(box, ['implementaciones'])) return;
    box.replaceChildren();
    const k = keys();
    const p = box.dataset.prog;
    const im = rows('implementaciones').filter((r) => (p === 'todos' ? true : r.programa === p) && inPeriod(r, k));
    if (!im.length) { empty(box, 'Ninguna YMCA implementó en este periodo.'); return; }
    const porY = d3.groups(im, (r) => r.ymca).map(([ymca, rs]) => ({ ymca, pais: rs[0].pais, ciudad: rs[0].ciudad, lat: +rs[0].lat, lon: +rs[0].lon, programas: [...new Set(rs.map((r) => r.programa))] }));
    const h = Math.min(420, Math.max(260, Math.floor((box.clientWidth || 400) * 0.95)));
    const { s, w } = svg(box, h);
    // Proyección Mercator propia: esta versión de d3 no incluye d3-geo.
    const merc = ([lon, lat]) => [lon, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
    const [x0, y0] = merc([-118, 33]), [x1, y1] = merc([-34, -56]);
    const sc = Math.min((w - 20) / (x1 - x0), (h - 20) / (y0 - y1));
    const ox = (w - sc * (x1 - x0)) / 2, oy = (h - sc * (y0 - y1)) / 2;
    const proj = (c) => { const [mx, my] = merc(c); return [ox + sc * (mx - x0), oy + sc * (y0 - my)]; };
    const grid = s.append('g').attr('stroke', 'var(--cds-chart-grid)').attr('stroke-width', 1);
    for (let lon = -110; lon <= -40; lon += 10) { const [a] = proj([lon, 0]); grid.append('line').attr('x1', a).attr('x2', a).attr('y1', proj([lon, 33])[1]).attr('y2', proj([lon, -56])[1]); }
    for (let lat = -50; lat <= 30; lat += 10) { if (lat === 0) continue; const [, b] = proj([0, lat]); grid.append('line').attr('x1', proj([-118, lat])[0]).attr('x2', proj([-34, lat])[0]).attr('y1', b).attr('y2', b); }
    const eq = proj([-118, 0])[1];
    s.append('line').attr('x1', proj([-118, 0])[0]).attr('x2', proj([-34, 0])[0]).attr('y1', eq).attr('y2', eq).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 4');
    s.append('text').attr('x', proj([-118, 0])[0] + 4).attr('y', eq - 4).text('Ecuador');
    const t = tip(box);
    const g = s.append('g').selectAll('g').data(porY).join('g').attr('transform', (d) => `translate(${proj([d.lon, d.lat])})`);
    g.append('circle').attr('r', (d) => 5 + 2 * d.programas.length).attr('fill', (d) => (p === 'todos' ? 'var(--color-fg)' : M.colorProg(p))).attr('fill-opacity', 0.85).attr('stroke', 'var(--color-panel)').attr('stroke-width', 2)
      .on('mousemove', (e, d) => t.show(e, `${d.ymca}`, [['Ciudad', d.ciudad], ['País', d.pais], ...(p === 'todos' ? [['Programas', d.programas.map((x) => PROG[x]).join(', ')]] : [])]))
      .on('mouseleave', () => t.hide());
    g.append('text').attr('x', 12).attr('y', 4).attr('class', 'm-strong').text((d) => d.ciudad);
    const paises = [...new Set(porY.map((d) => d.pais))].sort();
    box.append(el('p', 'm-countries', `${paises.length} ${paises.length === 1 ? 'país' : 'países'}: ${paises.join(', ')}. Mapa esquemático de puntos (sin fronteras) en la ciudad sede de cada YMCA.`));
  });

  // ---------- Pirámide edad × género ----------
  const egRows = (box, k) => rows('edad_genero').filter((r) => r.programa === box.dataset.prog && r.grupo === (box.dataset.grupo || 'participantes') && r.ciclo === k.ciclo && r.ymca === k.ymca);
  const egState = (box, rs, k) => {
    if (!rs.length) { empty(box, implementa(box.dataset.prog, k) ? 'Sin dato de edad y género en este periodo.' : 'La YMCA no implementó el programa en este periodo.'); return true; }
    const datos = rs.filter((r) => r.estado === 'dato');
    if (!datos.length) { empty(box, rs[0].estado === 'no_recopilado' ? 'No recopilado: este programa no registra edad ni género de participantes.' : 'Sin dato de edad y género en este periodo.'); return true; }
    if (!datos.some((r) => Number(r.n) > 0)) { empty(box, 'Sin participantes registrados.'); return true; }
    return false;
  };

  dash.draw('piramide', (box) => {
    if (pending(box, ['edad_genero', 'implementaciones'])) return;
    box.replaceChildren();
    const k = keys();
    const rs = egRows(box, k);
    if (egState(box, rs, k)) return;
    const val = (r, g) => { const x = rs.find((d) => d.rango === r && d.genero === g); return x ? Number(x.n) || 0 : 0; };
    const W = Math.max(260, Math.floor(box.clientWidth || 600));
    const largo = W > 560;
    const labelW = largo ? 190 : 52;
    const rowH = 20, top = 22;
    const h = top + RANGOS.length * rowH + 30;
    const { s, w } = svg(box, h);
    const half = (w - labelW - 16) / 2;
    const max = d3.max(RANGOS, ([r]) => Math.max(val(r, 'Hombre/niño'), val(r, 'Mujer/niña'), val(r, 'No binario') + val(r, 'No especifica'))) || 1;
    const x = d3.scaleLinear([0, max], [0, half - 30]);
    const cx = labelW + 8 + half;
    const y = (i) => top + (RANGOS.length - 1 - i) * rowH;
    s.append('text').attr('x', cx - 6).attr('y', 12).attr('text-anchor', 'end').attr('class', 'm-strong').text('← Hombre/niño');
    s.append('text').attr('x', cx + 6).attr('y', 12).attr('class', 'm-strong').text('Mujer/niña →');
    const t = tip(box);
    RANGOS.forEach(([r, nombre], i) => {
      const hv = val(r, 'Hombre/niño'), mv = val(r, 'Mujer/niña'), nb = val(r, 'No binario'), ne = val(r, 'No especifica');
      const g = s.append('g');
      g.append('text').attr('x', labelW).attr('y', y(i) + rowH / 2 + 4).attr('text-anchor', 'end').text(largo ? nombre : r);
      g.append('rect').attr('x', cx - x(hv)).attr('y', y(i) + 2).attr('width', x(hv)).attr('height', rowH - 4).attr('rx', 2).attr('fill', M.colorGenero('Hombre/niño'));
      g.append('rect').attr('x', cx).attr('y', y(i) + 2).attr('width', x(mv)).attr('height', rowH - 4).attr('rx', 2).attr('fill', M.colorGenero('Mujer/niña'));
      if (hv) g.append('text').attr('x', cx - x(hv) - 4).attr('y', y(i) + rowH / 2 + 4).attr('text-anchor', 'end').text(fmt(hv));
      if (mv) g.append('text').attr('x', cx + x(mv) + 4).attr('y', y(i) + rowH / 2 + 4).text(fmt(mv));
      g.append('rect').attr('x', labelW + 8).attr('y', y(i)).attr('width', w - labelW - 8).attr('height', rowH).attr('fill', 'transparent')
        .on('mousemove', (e) => t.show(e, nombre, GENEROS.map((gg) => [gg, fmt(val(r, gg)), M.colorGenero(gg)])))
        .on('mouseleave', () => t.hide());
    });
    s.append('line').attr('x1', cx).attr('x2', cx).attr('y1', top).attr('y2', top + RANGOS.length * rowH).attr('stroke', 'var(--cds-chart-axis)');
    // Franja aparte: No binario y No especifica, misma escala
    const nbT = d3.sum(rs, (d) => (d.genero === 'No binario' ? Number(d.n) || 0 : 0));
    const neT = d3.sum(rs, (d) => (d.genero === 'No especifica' ? Number(d.n) || 0 : 0));
    s.append('text').attr('x', labelW + 8).attr('y', h - 8).text(`No binario: ${fmt(nbT)} · No especifica: ${fmt(neT)}`);
    foot(box, d3.max(rs, (d) => Number(d.faltantes) || 0));
  });

  dash.draw('dona', (box) => {
    if (pending(box, ['edad_genero', 'implementaciones'])) return;
    box.replaceChildren();
    const k = keys();
    const rs = egRows(box, k);
    if (egState(box, rs, k)) return;
    const tot = GENEROS.map((g) => ({ g, n: d3.sum(rs, (d) => (d.genero === g ? Number(d.n) || 0 : 0)) }));
    const all = d3.sum(tot, (d) => d.n) || 1;
    const size = Math.min(220, Math.max(160, Math.floor((box.clientWidth || 300) * 0.55)));
    const { s } = svg(box, size);
    const g = s.append('g').attr('transform', `translate(${size / 2},${size / 2})`);
    const arcs = d3.pie().sort(null).value((d) => d.n)(tot);
    const t = tip(box);
    g.selectAll('path').data(arcs).join('path').attr('d', d3.arc().innerRadius(size * 0.3).outerRadius(size * 0.47)).attr('fill', (d) => M.colorGenero(d.data.g)).attr('stroke', 'var(--color-panel)').attr('stroke-width', 2)
      .on('mousemove', (e, d) => t.show(e, d.data.g, [['Personas', fmt(d.data.n)], ['Porcentaje', d3.format('.1%')(d.data.n / all)]]))
      .on('mouseleave', () => t.hide());
    g.append('text').attr('text-anchor', 'middle').attr('y', 4).attr('class', 'm-strong').text(fmt(all));
    const ul = el('ul', 'm-legend');
    tot.forEach((d) => { const li = el('li'); const sw = el('span', 'm-sw'); sw.style.background = M.colorGenero(d.g); li.append(sw, el('span', null, `${d.g}: ${fmt(d.n)} (${d3.format('.1%')(d.n / all)})`)); ul.append(li); });
    box.append(ul);
    foot(box, d3.max(rs, (d) => Number(d.faltantes) || 0));
  });

  // ---------- Serie por ciclo (participantes, fondos) ----------
  dash.draw('serie', (box) => {
    if (pending(box, ['indicadores', 'implementaciones'])) return;
    box.replaceChildren();
    const { prog: p, ind, fmt: f } = box.dataset;
    const k = keys();
    const ciclos = [...new Set(rows('implementaciones').map((r) => String(r.ciclo)))].sort();
    const data = rows('indicadores');
    const pts = ciclos.map((c) => {
      const r = data.find((x) => x.programa === p && x.ciclo === c && x.ymca === k.ymca && x.indicador === ind);
      const impl = implementa(p, { hist: false, ciclo: c, ymca: k.ymca });
      return { c, v: r && r.estado === 'dato' ? Number(r.valor) : null, estado: r ? r.estado : impl ? 'sin_dato' : 'no_impl', falt: r ? Number(r.faltantes) || 0 : 0 };
    });
    const h = 190;
    const { s, w } = svg(box, h);
    const m = { t: 22, r: 8, b: 26, l: 8 };
    const x = d3.scaleBand(ciclos, [m.l, w - m.r]).padding(0.35);
    const max = d3.max(pts, (d) => d.v) || 1;
    const y = d3.scaleLinear([0, max], [h - m.b, m.t]);
    const t = tip(box);
    const lbl = (v) => (f === 'usd' ? 'USD ' : '') + fmt(v);
    pts.forEach((d) => {
      const sel = !k.hist && d.c === k.ciclo;
      const bw = Math.min(56, x.bandwidth()), bx = x(d.c) + (x.bandwidth() - bw) / 2;
      if (d.v != null) {
        s.append('rect').attr('x', bx).attr('y', y(d.v)).attr('width', bw).attr('height', y(0) - y(d.v)).attr('rx', 3)
          .attr('fill', sel || k.hist ? M.colorProg(p) : 'var(--cds-chart-muted)')
          .on('mousemove', (e) => t.show(e, `Ciclo ${d.c}`, [[box.dataset.label || ind, lbl(d.v)], ...(d.falt ? [['YMCA sin dato', String(d.falt)]] : [])])).on('mouseleave', () => t.hide());
        s.append('text').attr('x', bx + bw / 2).attr('y', y(d.v) - 5).attr('text-anchor', 'middle').attr('class', 'm-strong').text(lbl(d.v) + (d.falt ? '*' : ''));
      } else {
        s.append('rect').attr('x', bx).attr('y', m.t + 20).attr('width', bw).attr('height', h - m.b - m.t - 20).attr('rx', 3).attr('fill', 'none').attr('stroke', 'var(--color-border-line)').attr('stroke-dasharray', '4 3');
        s.append('text').attr('x', bx + bw / 2).attr('y', h - m.b - 8).attr('text-anchor', 'middle').text(M.ESTADO[d.estado] ? M.ESTADO[d.estado][0] : d.estado);
      }
      s.append('text').attr('x', bx + bw / 2).attr('y', h - 8).attr('text-anchor', 'middle').attr('class', sel ? 'm-strong' : null).text(d.c);
    });
    s.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    if (pts.some((d) => d.falt)) box.append(el('p', 'm-foot', '* Hay YMCA sin dato en ese ciclo: el total real es mayor.'));
  });

  // ---------- Barras horizontales por categoría ----------
  dash.draw('barras', (box) => {
    if (pending(box, ['categorias', 'implementaciones'])) return;
    box.replaceChildren();
    const { prog: p, dim, orden, privado } = box.dataset;
    const k = keys();
    if (privado && k.ymca !== 'Todas') { empty(box, 'Oculto en la vista por YMCA para proteger a las poblaciones prioritarias. Elige «Todas las YMCA».'); return; }
    let rs = rows('categorias').filter((r) => r.programa === p && r.dimension === dim && r.ciclo === k.ciclo && r.ymca === k.ymca);
    if (!rs.length) { empty(box, implementa(p, k) ? 'Sin dato en este periodo.' : 'La YMCA no implementó el programa en este periodo.'); return; }
    if (orden === 'rangos') rs = RANGOS.map(([r]) => rs.find((d) => d.categoria === r)).filter(Boolean);
    else if (orden !== 'fijo') rs = rs.slice().sort((a, b) => (Number(b.valor) || -1) - (Number(a.valor) || -1));
    const unidad = rs[0].unidad;
    const W = Math.max(260, Math.floor(box.clientWidth || 600));
    const nombre = (c) => (orden === 'rangos' ? (RANGOS.find(([r]) => r === c) || [c, c])[W > 560 ? 1 : 0] : c);
    const rowH = 26;
    const h = rs.length * rowH + 8;
    const { s, w } = svg(box, h);
    const probe = s.append('text').text('');
    const labelW = Math.min(w * 0.48, d3.max(rs, (r) => { probe.text(nombre(r.categoria)); return probe.node().getComputedTextLength(); }) + 10);
    probe.remove();
    const max = d3.max(rs, (r) => Number(r.valor) || 0) || 1;
    const x = d3.scaleLinear([0, max], [0, w - labelW - 70]);
    const t = tip(box);
    const lbl = (v) => (unidad === 'USD' ? 'USD ' : '') + fmt(v);
    rs.forEach((r, i) => {
      const yy = i * rowH + 4;
      s.append('text').attr('x', labelW - 8).attr('y', yy + rowH / 2 + 2).attr('text-anchor', 'end').text(nombre(r.categoria));
      if (r.estado === 'dato') {
        s.append('rect').attr('x', labelW).attr('y', yy + 3).attr('height', rowH - 10).attr('width', Math.max(1, x(Number(r.valor) || 0))).attr('rx', 3).attr('fill', M.colorProg(p))
          .on('mousemove', (e) => t.show(e, nombre(r.categoria), [[unidad, lbl(r.valor)]])).on('mouseleave', () => t.hide());
        s.append('text').attr('x', labelW + x(Number(r.valor) || 0) + 6).attr('y', yy + rowH / 2 + 2).attr('class', 'm-strong').text(lbl(r.valor));
      } else {
        s.append('text').attr('x', labelW + 4).attr('y', yy + rowH / 2 + 2).attr('font-style', 'italic').text(M.ESTADO[r.estado] ? M.ESTADO[r.estado][0] + ' · ' + M.ESTADO[r.estado][1] : r.estado);
      }
    });
    box.append(el('p', 'm-countries', `Unidad: ${unidad}${unidad === 'YMCA' ? ' (número de YMCA)' : ''}.`));
    foot(box, d3.max(rs, (d) => Number(d.faltantes) || 0));
  });

  // ---------- Días de implementación (After School) ----------
  dash.draw('dias', (box) => {
    if (pending(box, ['categorias', 'implementaciones'])) return;
    box.replaceChildren();
    const k = keys();
    if (k.hist) { empty(box, 'Elige un ciclo para ver los días de implementación.'); return; }
    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const rs = rows('categorias').filter((r) => r.programa === 'afterschool' && r.dimension === 'dias' && r.ciclo === k.ciclo && r.ymca !== 'Todas' && (k.ymca === 'Todas' || r.ymca === k.ymca));
    const ys = [...new Set(rs.map((r) => r.ymca))].sort();
    if (!ys.length) { empty(box, 'La YMCA no implementó el programa en este periodo.'); return; }
    const W = Math.max(260, Math.floor(box.clientWidth || 600));
    const labelW = W > 480 ? 110 : 84, rowH = 28;
    const h = 24 + ys.length * rowH;
    const { s, w } = svg(box, h);
    const x = d3.scaleBand(DIAS, [labelW, w]).padding(0.12);
    DIAS.forEach((d) => s.append('text').attr('x', x(d) + x.bandwidth() / 2).attr('y', 14).attr('text-anchor', 'middle').text(W > 480 ? d.slice(0, 3) : d[0]));
    ys.forEach((y, i) => {
      const yy = 22 + i * rowH;
      s.append('text').attr('x', labelW - 8).attr('y', yy + rowH / 2 + 2).attr('text-anchor', 'end').text(y.replace('YMCA ', ''));
      DIAS.forEach((d) => {
        const r = rs.find((x2) => x2.ymca === y && x2.categoria === d);
        const on = r && Number(r.valor) === 1;
        s.append('rect').attr('x', x(d)).attr('y', yy + 3).attr('width', x.bandwidth()).attr('height', rowH - 6).attr('rx', 3)
          .attr('fill', on ? M.colorProg('afterschool') : 'none').attr('stroke', 'var(--color-border-line)');
        s.append('text').attr('x', x(d) + x.bandwidth() / 2).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'middle').attr('fill', on ? 'var(--color-bg)' : null).text(on ? '✓' : '·');
      });
    });
  });

  // ---------- Cronograma (Gantt) ----------
  dash.draw('gantt', (box) => {
    if (pending(box, ['cronogramas'])) return;
    box.replaceChildren();
    const p = box.dataset.prog;
    const k = keys();
    if (k.hist && k.ymca === 'Todas') { empty(box, 'Elige un ciclo o una YMCA para ver el cronograma (el histórico con todas las YMCA tendría demasiadas filas).'); return; }
    const parse = d3.utcParse('%Y-%m-%d');
    const rs = rows('cronogramas').filter((r) => r.programa === p && inPeriod(r, k)).map((r) => ({ ...r, a: parse(String(r.inicio).slice(0, 10)), b: parse(String(r.fin).slice(0, 10)) })).filter((r) => r.a && r.b)
      .sort((a, b) => d3.ascending(a.ymca, b.ymca) || d3.ascending(a.a, b.a));
    if (!rs.length) { empty(box, 'Sin cronograma registrado en este periodo.'); return; }
    const W = Math.max(260, Math.floor(box.clientWidth || 600));
    const lab = (r) => `${W > 560 ? r.ymca.replace('YMCA ', '') + ' · ' : ''}${k.hist ? r.ciclo + ' · ' : ''}${r.actividad}`;
    const rowH = 22, top = 24;
    const h = top + rs.length * rowH + 6;
    const { s, w } = svg(box, h);
    const probe = s.append('text').text('');
    const labelW = Math.min(w * 0.45, d3.max(rs, (r) => { probe.text(lab(r)); return probe.node().getComputedTextLength(); }) + 12);
    probe.remove();
    const x = d3.scaleUtc([d3.min(rs, (r) => r.a), d3.utcDay.offset(d3.max(rs, (r) => r.b), 1)], [labelW, w - 8]);
    const ax = s.append('g').attr('transform', `translate(0,${top - 6})`).call(d3.axisTop(x).ticks(Math.max(2, Math.floor((w - labelW) / 70))).tickFormat(d3.utcFormat(k.hist ? '%b %y' : '%b')).tickSizeOuter(0));
    ax.attr('font-size', null).attr('font-family', null).select('.domain').attr('stroke', 'var(--cds-chart-axis)');
    ax.selectAll('line').attr('stroke', 'var(--cds-chart-axis)');
    const t = tip(box);
    const fd = d3.utcFormat('%d/%m/%Y');
    let prev = null;
    rs.forEach((r, i) => {
      const yy = top + i * rowH;
      if (prev && prev !== r.ymca) s.append('line').attr('x1', 0).attr('x2', w).attr('y1', yy).attr('y2', yy).attr('stroke', 'var(--cds-chart-grid)');
      prev = r.ymca;
      s.append('text').attr('x', labelW - 8).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'end').text(lab(r));
      const x1 = x(r.a), x2 = Math.max(x1 + 4, x(d3.utcDay.offset(r.b, 1)));
      s.append('rect').attr('x', x1).attr('y', yy + 4).attr('width', x2 - x1).attr('height', rowH - 8).attr('rx', 3).attr('fill', M.colorProg(p))
        .on('mousemove', (e) => t.show(e, r.actividad, [['YMCA', r.ymca], ['Inicio', fd(r.a)], ['Fin', fd(r.b)]])).on('mouseleave', () => t.hide());
    });
  });

  // ---------- Barras de eventos Delta ----------
  dash.draw('barras-ev', (box) => {
    if (pending(box, ['delta_eventos'])) return;
    box.replaceChildren();
    const k = keys();
    const field = box.dataset.campo;
    const rs = rows('delta_eventos').filter((r) => inPeriod(r, k)).sort((a, b) => Number(b[field]) - Number(a[field]));
    if (!rs.length) { empty(box, 'Sin eventos en este periodo.'); return; }
    const rowH = 24, h = rs.length * rowH + 8;
    const { s, w } = svg(box, h);
    const probe = s.append('text').text('');
    const labelW = Math.min(w * 0.45, d3.max(rs, (r) => { probe.text(r.evento); return probe.node().getComputedTextLength(); }) + 10);
    probe.remove();
    const x = d3.scaleLinear([0, d3.max(rs, (r) => Number(r[field])) || 1], [0, w - labelW - 80]);
    const t = tip(box);
    const lbl = (v) => (field === 'fondos_usd' ? 'USD ' : '') + fmt(v);
    rs.forEach((r, i) => {
      const yy = i * rowH + 4;
      s.append('text').attr('x', labelW - 8).attr('y', yy + rowH / 2 + 2).attr('text-anchor', 'end').text(r.evento);
      s.append('rect').attr('x', labelW).attr('y', yy + 3).attr('height', rowH - 9).attr('width', Math.max(1, x(Number(r[field])))).attr('rx', 3).attr('fill', M.colorProg('delta'))
        .on('mousemove', (e) => t.show(e, r.evento, [['YMCA', r.ymca], ['Fecha', String(r.inicio)], [field === 'fondos_usd' ? 'Fondos' : 'Participantes', lbl(r[field])]])).on('mouseleave', () => t.hide());
      s.append('text').attr('x', labelW + x(Number(r[field])) + 6).attr('y', yy + rowH / 2 + 2).attr('class', 'm-strong').text(lbl(r[field]));
    });
  });

  // ---------- Matriz YMCA × programa (Resumen) ----------
  dash.draw('matriz-prog', (box) => {
    if (pending(box, ['implementaciones', 'ymca'])) return;
    box.replaceChildren();
    const k = keys();
    const im = rows('implementaciones');
    const ys = rows('ymca').map((r) => r.ymca).filter((y) => k.ymca === 'Todas' || y === k.ymca);
    const progs = ['eleva', 'afterschool', 'bluedrop', 'tejiendo', 'delta'];
    const W = Math.max(260, Math.floor(box.clientWidth || 600));
    const labelW = W > 480 ? 110 : 80, rowH = 28;
    const h = 30 + ys.length * rowH;
    const { s, w } = svg(box, h);
    const x = d3.scaleBand(progs, [labelW, w]).padding(0.1);
    progs.forEach((p) => s.append('text').attr('x', x(p) + x.bandwidth() / 2).attr('y', 16).attr('text-anchor', 'middle').attr('class', 'm-strong').text(W > 560 ? PROG[p] : PROG[p].split(' ')[0].slice(0, 7)));
    ys.forEach((y, i) => {
      const yy = 24 + i * rowH;
      s.append('text').attr('x', labelW - 8).attr('y', yy + rowH / 2 + 3).attr('text-anchor', 'end').text(y.replace('YMCA ', ''));
      progs.forEach((p) => {
        const n = im.filter((r) => r.programa === p && r.ymca === y && (k.hist || r.ciclo === k.ciclo)).length;
        s.append('rect').attr('x', x(p)).attr('y', yy + 3).attr('width', x.bandwidth()).attr('height', rowH - 6).attr('rx', 3)
          .attr('fill', n ? M.colorProg(p) : 'none').attr('fill-opacity', n ? 0.9 : 0).attr('stroke', 'var(--color-border-line)');
        s.append('text').attr('x', x(p) + x.bandwidth() / 2).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'middle').attr('fill', n ? 'var(--color-bg)' : null)
          .text(n ? (k.hist ? `${n} ${n === 1 ? 'ciclo' : 'ciclos'}` : '✓') : '·');
      });
    });
  });

  // ---------- Tablas ----------
  const tbody = (name, id, filter, cols) => dash.draw(name, (tb) => {
    if (pending(tb, [id])) return;
    const k = keys();
    const rs = rows(id).filter((r) => filter(r, k, tb));
    tb.replaceChildren(...rs.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id;
      cols.forEach(([c, f]) => { const td = el('td', f === 'n' ? 'm-num' : null, f === 'n' ? fmt(r[c]) : String(r[c] ?? '')); tr.append(td); });
      return tr;
    }));
    if (!rs.length) { const tr = document.createElement('tr'); const td = el('td', null, 'Sin registros en este periodo.'); td.colSpan = cols.length; tr.append(td); tb.append(tr); }
  });
  tbody('t-alianzas', 'alianzas', (r, k, tb) => r.programa === tb.dataset.prog && inPeriod(r, k), [['ymca'], ['ciclo'], ['organizacion'], ['objetivo']]);
  tbody('t-eventos', 'delta_eventos', (r, k) => inPeriod(r, k), [['evento'], ['ymca'], ['inicio'], ['participantes', 'n'], ['fondos_usd', 'n'], ['voluntariado']]);
  tbody('t-bd', 'bluedrop_dispositivos', (r, k) => inPeriod(r, k), [['ymca'], ['ciclo'], ['tipo'], ['modelo'], ['cantidad', 'n']]);
  tbody('t-completitud', 'completitud', () => true, [['programa'], ['ciclo'], ['dato', 'n'], ['sin_dato', 'n'], ['no_recopilado', 'n'], ['en_definicion', 'n'], ['suprimido', 'n']]);

  // ---------- Fichas narrativas ----------
  dash.draw('fichas', (box) => {
    if (pending(box, ['narrativas'])) return;
    const k = keys();
    const { prog: p, tipo } = box.dataset;
    if (k.hist && k.ymca === 'Todas') { empty(box, 'Elige un ciclo o una YMCA para leer las fichas.'); return; }
    const rs = rows('narrativas').filter((r) => r.programa === p && r.tipo === tipo && inPeriod(r, k));
    if (!rs.length) { empty(box, 'Sin fichas en este periodo.'); return; }
    box.replaceChildren(...rs.map((r) => { const f = el('article', 'm-ficha'); f.append(el('h5', null, `${r.ymca} · ${r.ciclo}`), el('p', null, r.texto)); return f; }));
  });
  dash.draw('fichas-ev', (box) => {
    if (pending(box, ['delta_eventos'])) return;
    const k = keys();
    const rs = rows('delta_eventos').filter((r) => inPeriod(r, k));
    if (!rs.length) { empty(box, 'Sin eventos en este periodo.'); return; }
    box.replaceChildren(...rs.map((r) => { const f = el('article', 'm-ficha'); f.append(el('h5', null, `${r.evento} · ${r.ymca}`), el('p', null, r.narrativa)); return f; }));
  });
})();
