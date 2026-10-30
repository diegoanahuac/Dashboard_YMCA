// Toma las capturas de pantalla del README a partir de tests/out/page.html (generado por tests/test.js).
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'docs', 'img');
// Las capturas salen en modo oscuro, con los mismos tokens de color que usa la plataforma.
const OSCURO = `:root { color-scheme: dark; --color-fg:#ececec; --color-fg-muted:#9b9b9b; --color-bg:#0d0d0d; --color-panel:#1e1e1e;
  --color-border-line:#333; --color-warn:#d9a441; --color-bad:#ef6b6b; --cds-chart-grid:#2c2c2c; --cds-chart-axis:#6f6f6f;
  --cds-chart-reference:#555; --cds-chart-muted:#4a4a4a; --cds-surface-popover:#262626; --cds-border:#444; }
  html, body { background: #0d0d0d; color: #ececec; }`;
const base = { programa: 'resumen', vista: 'ciclo', ciclo: '2026', ymca: 'Todas', astab: 'programa' };
const shots = [
  ['01-resumen.png', base, '.m-head, .m-bar, #resumen', 1280],
  ['02-eleva-bloque-comun.png', { ...base, programa: 'eleva' }, '#eleva-comun', 1280],
  ['03-eleva-acompanamiento-por-ymca.png', { ...base, programa: 'eleva', ymca: 'YMCA Demo B' }, '#eleva-acompanamiento', 1280],
  ['04-eleva-cronograma.png', { ...base, programa: 'eleva' }, '#eleva-implementacion', 1280],
  ['05-afterschool-implementacion.png', { ...base, programa: 'afterschool' }, '#afterschool-implementacion', 1280],
  ['06-bluedrop.png', { ...base, programa: 'afterschool', astab: 'bluedrop' }, '#bluedrop-dispositivos', 1280],
  ['07-tejiendo-grupos-prioritarios.png', { ...base, programa: 'tejiendo' }, '#tejiendo-grupos', 1280],
  ['08-delta-eventos.png', { ...base, programa: 'delta' }, '#delta-eventos', 1280],
  ['09-historico-sin-dato.png', { ...base, programa: 'eleva', vista: 'historico' }, '#eleva-comun', 1280],
  ['10-notas-completitud.png', { ...base, programa: 'notas' }, '#notas', 1280],
  ['11-movil.png', { ...base, programa: 'eleva' }, 'viewport', 390],
];
(async () => {
  const b = await chromium.launch();
  for (const [file, params, sel, width] of shots) {
    const p = await b.newPage({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
    await p.goto('file://' + path.join(__dirname, 'out', 'page.html'));
    await p.addStyleTag({ content: OSCURO + '\n.m-bar { position: static !important; }' });
    await p.evaluate((o) => dash.setParams(o), params); await p.waitForTimeout(150);
    if (sel === 'viewport') await p.screenshot({ path: path.join(OUT, file) });
    else if (sel.includes(',')) await p.screenshot({ path: path.join(OUT, file), clip: await p.evaluate((s) => { const els = [...document.querySelectorAll(s)]; const r = els.map((e) => e.getBoundingClientRect()); const top = Math.min(...r.map((x) => x.top)); const bottom = Math.min(Math.max(...r.map((x) => x.bottom)), top + 1400); return { x: 0, y: top + scrollY, width: innerWidth, height: bottom - top + 16 }; }, sel) });
    else await p.locator(sel).screenshot({ path: path.join(OUT, file) });
    await p.close();
    console.log(file);
  }
  await b.close();
})();
