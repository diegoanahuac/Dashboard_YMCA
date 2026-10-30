# Dashboard MEAL YMCA LAC

Dashboard regional del sistema MEAL (Monitoreo, Evaluación, Rendición de cuentas y Aprendizaje) de YMCA Latinoamérica y el Caribe. Corresponde al **Producto 3: dashboards de monitoreo**.

> **Datos de demostración.** Las YMCA («YMCA Demo A–F») y todas las cifras de `data/` son ficticias. Sirven para probar el diseño y no son resultados de YMCA LAC.

- Dashboard publicado (Claude Artifacts, privado): https://claude.ai/artifact/K93wRCYcBYdMAByqCdEwq5
- Análisis y propuesta (Fase 1) y decisiones (Fases 2–5): https://claude.ai/artifact/96bQGvVER99TTLyUK5U4Sy

## Qué muestra

| Página | Contenido |
| --- | --- |
| Resumen regional | Una tarjeta por programa, mapa de YMCA y matriz YMCA × programa. No suma participantes entre programas. |
| Eleva | Bloque común + jóvenes/adultos, equipo, intervenciones, acompañamiento (con «<5»), alcance comunitario, cronograma, alianzas, comunidad. Pre/post en definición. |
| After School | Bloque común + grupos, locaciones, Hello Insight, terms, días, modalidad, áreas, financiamiento. Pestaña **Bluedrop**: participantes, dispositivos, uso, habilidades. |
| Tejiendo Paz | Bloque común + grupos prioritarios (solo número de YMCA, oculto por YMCA), liderazgo juvenil, tipo de violencia, cronograma, alianzas. Resultados en definición. |
| Patrocinios Delta | Bloque común + eventos, participantes y fondos por evento, voluntariado corporativo, narrativa. |
| Notas sobre los datos | Estados del dato, completitud por programa y ciclo, supuestos y privacidad. |

Filtros: **Programa**, **Vista** (Histórico / Ciclo), **Ciclo** y **YMCA**. La frase «Estás viendo» siempre dice qué se consulta (por ejemplo, «Eleva · Ciclo 2026 — Todas las YMCA»).

Estados del dato: `s/d` (sin dato, nunca cero), `No recopilado`, `En definición`, `<5` (oculto por privacidad), `No implementó`.

## Estructura

```
data/                       Datasets de demostración (JSON, tablas planas)
dashboard/src/              Código fuente: estilos.css, meal-core.js, meal-draw.js, meal-app.js
dashboard/dist/             Página armada (index.html + scripts) tal como se publica
dashboard/store/            Documentos que se escriben en el almacenamiento del Dashboard
scripts/generar_datos_demo.py   Genera data/*.json (semilla fija)
scripts/construir_pagina.py     Arma dashboard/dist/index.html
scripts/preparar_store.py       Arma dashboard/store/ (dash/meta, dash/params, datasets/*, files/*)
tests/                      Prueba funcional con una simulación de la API del Dashboard
docs/                       Decisiones, fases e integración futura con Google Sheets
```

## Cómo actualizar

```bash
npm install            # d3 y playwright para las pruebas
npm run datos          # regenera data/*.json
npm run build          # arma dashboard/dist y dashboard/store
npm test               # 84 combinaciones de filtros x 2 anchos (1280 y 390 px)
```

Para publicar cambios en el Dashboard: subir cada `data/*.json` como archivo del artifact, actualizar las URL `/_blob/...` en `scripts/preparar_store.py`, volver a correr `npm run build` y escribir `dashboard/store/` en el almacenamiento del Dashboard.

## Trazabilidad

Ninguna cifra está escrita a mano en el HTML. Cada número lleva `data-source`, `data-field` y `data-where` (o el gráfico lleva `data-source`), y el panel *Sources* del Dashboard muestra su origen. Los valores calculados (variación % y completitud) son `dash.calc` visibles para quien lee.

## Estructura de los datasets

Todas las tablas usan `programa`, `ciclo` (texto) y `ymca`, con filas precalculadas `ciclo = "Histórico"` y `ymca = "Todas"`, y una columna `estado` (`dato`, `sin_dato`, `no_recopilado`, `en_definicion`, `suprimido`). Ver [docs/integracion-google-sheets.md](docs/integracion-google-sheets.md).
