# Integración futura con Google Sheets (Producto 2)

**Estado: no conectado ni autorizado.** Hoy el dashboard lee archivos JSON de demostración.

## Qué se necesita

1. Que el Producto 2 publique una hoja por dataset con exactamente las columnas de `data/*.json` (mismos nombres y valores de `estado`).
2. Filas precalculadas para `ciclo = "Histórico"` y `ymca = "Todas"` (o un paso de consolidación que las genere).
3. Decidir el mecanismo:
   - **Archivo exportado** (recomendado al inicio): exportar cada hoja a CSV/JSON y reemplazar el archivo del dataset. No requiere permisos nuevos.
   - **Consulta en vivo**: si se habilita un conector con acceso a Google Sheets o a una base de datos, cada dataset puede pasar a `source.kind = "query"`. Cada lector necesitaría acceso a esa fuente.
4. Revisar privacidad antes de conectar: ningún registro personal, supresión «<5» aplicada en origen y grupos prioritarios solo como número de YMCA.

## Columnas por dataset

| Dataset | Columnas |
| --- | --- |
| indicadores | programa, ciclo, ymca, indicador, valor, estado, faltantes |
| edad_genero | programa, grupo, ciclo, ymca, rango, genero, n, estado, faltantes |
| categorias | programa, dimension, ciclo, ymca, categoria, valor, unidad, estado, faltantes |
| implementaciones | id, programa, ciclo, ymca, pais, ciudad, lat, lon |
| ymca | ymca, pais, ciudad, lat, lon |
| cronogramas | id, programa, ciclo, ymca, actividad, inicio, fin |
| alianzas | id, programa, ciclo, ymca, organizacion, objetivo |
| narrativas | id, programa, ciclo, ymca, tipo, texto |
| donantes | id, programa, ciclo, ymca, donante |
| delta_eventos | id, ciclo, ymca, evento, inicio, fin, participantes, fondos_usd, voluntariado, narrativa |
| bluedrop_dispositivos | id, ciclo, ymca, tipo, modelo, cantidad |
