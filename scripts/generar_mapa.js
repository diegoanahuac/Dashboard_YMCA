// Genera data/mapa_paises.json: contornos de países de América Latina y el Caribe (Natural Earth 1:50m vía world-atlas).
// Uso: node scripts/generar_mapa.js data/mapa_paises.json
const topo = require('topojson-client'); const fs = require('fs');
const w = require('world-atlas/countries-50m.json') // Natural Earth (dominio público) vía world-atlas;
const fc = topo.feature(w, w.objects.countries);
const inBox = ([x, y]) => x > -125 && x < -28 && y > -60 && y < 36;
const rnd = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100] : c.map(rnd));
const ES = { Mexico: 'México', Colombia: 'Colombia', Peru: 'Perú', Chile: 'Chile', Brazil: 'Brasil', Uruguay: 'Uruguay', Argentina: 'Argentina', Bolivia: 'Bolivia', Ecuador: 'Ecuador', Venezuela: 'Venezuela', Paraguay: 'Paraguay', Guatemala: 'Guatemala', Honduras: 'Honduras', Nicaragua: 'Nicaragua', 'El Salvador': 'El Salvador', 'Costa Rica': 'Costa Rica', Panama: 'Panamá', Cuba: 'Cuba', 'Dominican Rep.': 'República Dominicana', Haiti: 'Haití', 'Puerto Rico': 'Puerto Rico', Jamaica: 'Jamaica', Belize: 'Belice', Guyana: 'Guyana', Suriname: 'Surinam', 'Trinidad and Tobago': 'Trinidad y Tobago', 'United States of America': 'Estados Unidos' };
const rows = [];
for (const f of fc.features) {
  if (!f.geometry) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const keep = polys.filter((p) => p[0].some(inBox));
  if (!keep.length) continue;
  // simplifica: quita puntos consecutivos casi iguales
  const simp = keep.map((p) => p.map((ring) => { const out = []; for (const c of rnd(ring)) { const l = out[out.length - 1]; if (!l || Math.abs(l[0] - c[0]) + Math.abs(l[1] - c[1]) > 0.15) out.push(c); } if (out.length < 4) return null; out.push(out[0]); return out; }).filter(Boolean)).filter((p) => p.length);
  if (simp.length) rows.push({ id: f.id || f.properties.name, pais: ES[f.properties.name] || f.properties.name, geometria: JSON.stringify(simp) });
}
fs.writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(rows.length, 'países', (fs.statSync(process.argv[2]).size / 1024).toFixed(1), 'KB');
