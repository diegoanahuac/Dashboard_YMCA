const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const R = path.resolve(__dirname, '..');
const ds = {}; for (const f of fs.readdirSync(R + '/data')) ds[f.replace('.json', '')] = JSON.parse(fs.readFileSync(R + '/data/' + f));
const PARAMS = { programa: 'resumen', vista: 'ciclo', ciclo: '2026', ymca: 'Todas', astab: 'programa' };
const body = fs.readFileSync(R + '/dashboard/dist/index.html', 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (m, f) => `<script>${fs.readFileSync(R + '/dashboard/dist/' + f, 'utf8')}</script>`);
const page0 = `<!doctype html><html><head><meta charset="utf-8"><style>:root{--color-fg:#1b1b1b;--color-fg-muted:#666;--color-bg:#fff;--color-panel:#fafafa;--color-border-line:#ddd;--color-warn:#a66a00;--color-bad:#c00;--cds-gap-xs:4px;--cds-gap-sm:8px;--cds-gap-md:12px;--cds-gap-lg:20px;--cds-pad-xs:4px;--cds-pad-sm:8px;--cds-pad-md:12px;--cds-pad-lg:16px;--cds-radius:6px;--cds-font-size-caption:12px;--cds-font-size-body:14px;--cds-font-size-heading:16px;--cds-font-size-title:28px;--cds-font-weight-medium:600;--cds-chart-grid:#eee;--cds-chart-axis:#999;--cds-chart-reference:#bbb;--cds-chart-muted:#ccc;--cds-surface-popover:#fff;--cds-border:#ccc;--font-anthropic-sans:sans-serif;--font-anthropic-serif:serif} body{margin:0;padding:16px;font-family:sans-serif}</style>
<script>${fs.readFileSync(path.resolve(__dirname, '..', 'node_modules', 'd3', 'dist', 'd3.min.js'), 'utf8')}</script><script>delete d3.geoMercator; delete d3.geoPath; delete d3.geoGraticule;</script>
<script>window.__DATA=${JSON.stringify(ds)};window.__PARAMS=${JSON.stringify(PARAMS)};</script>
<script>${fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8')}</script></head><body><div id="dash-root">${body}</div><script>dash.__run()</script></body></html>`;
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'page.html'), page0);
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const width of [1280, 390]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    p.on('pageerror', (e) => errors.push(`[${width}] ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errors.push(`[${width}] console ${m.text()}`); });
    await p.goto('file://' + path.join(__dirname, 'out', 'page.html'));
    const scen = [];
    for (const programa of ['resumen', 'eleva', 'afterschool', 'tejiendo', 'delta', 'notas']) for (const vista of ['ciclo', 'historico']) for (const ymca of ['Todas', 'YMCA Demo D', 'YMCA Demo F']) for (const ciclo of (vista === 'ciclo' ? ['2024', '2025', '2026'] : ['2026'])) for (const astab of (programa === 'afterschool' ? ['programa', 'bluedrop'] : ['programa'])) scen.push({ programa, vista, ymca, ciclo, astab });
    let issues = 0;
    for (const s of scen) {
      await p.evaluate((s) => dash.setParams(s), s); await p.waitForTimeout(30);
      const r = await p.evaluate(() => {
        const out = [];
        const txt = document.querySelector('#dash-root').innerText;
        if (/NaN|undefined|Invalid/.test(txt)) out.push('texto con NaN/undefined: ' + txt.match(/.{0,40}(NaN|undefined|Invalid).{0,20}/)[0]);
        const D = (id) => dash.data(id).data;
        document.querySelectorAll('[data-source][data-field][data-where]').forEach((m) => {
          if (m.closest('[hidden]')) return;
          const w = Object.fromEntries(m.dataset.where.split('&').map((kv) => kv.split('=').map(decodeURIComponent)));
          const rows = D(m.dataset.source).filter((r) => Object.entries(w).every(([k, v]) => String(r[k]) === v));
          if (rows.length !== 1) { out.push(`marca sin fila única ${m.dataset.source} ${m.dataset.where} (${rows.length})`); return; }
          const v = rows[0][m.dataset.field]; const shown = Number(m.textContent.replace(/[,%+]/g, ''));
          if (Number(v) !== shown) out.push(`marca distinta ${m.dataset.where}: muestra ${m.textContent} dato ${v}`);
        });
        document.querySelectorAll('[data-draw]').forEach((e) => { if (!e.closest('[hidden]') && e.textContent.trim() === '—' && !e.matches('.m-kpi-var')) out.push('sigue en — : ' + e.dataset.draw + ' ' + (e.dataset.ind || '')); });
        const ctx = document.querySelector('[data-draw=contexto]').textContent;
        return { out, ctx, w: document.documentElement.scrollWidth };
      });
      if (r.w > width + 1) r.out.push(`desborde horizontal ${r.w}px`);
      if (r.out.length) { issues++; if (issues < 25) console.log(width, JSON.stringify(s), r.ctx, '\n  ' + [...new Set(r.out)].slice(0, 6).join('\n  ')); }
    }
    console.log(`ancho ${width}: ${scen.length} escenarios, ${issues} con problemas`);
    for (const [prog, extra] of [['resumen', {}], ['eleva', {}], ['afterschool', {}], ['afterschool', { astab: 'bluedrop' }], ['tejiendo', {}], ['delta', {}], ['notas', {}]]) {
      await p.evaluate((o) => dash.setParams(o), { programa: prog, vista: 'ciclo', ciclo: '2026', ymca: 'Todas', astab: 'programa', ...extra }); await p.waitForTimeout(50);
      await p.screenshot({ path: path.join(__dirname, 'out', `shot-${width}-${prog}${extra.astab ? '-bd' : ''}.png`), fullPage: true });
    }
    await p.close();
  }
  console.log('errores JS:', errors.slice(0, 10));
  await b.close();
})();
