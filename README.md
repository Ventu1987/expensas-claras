# Expensas Claras

App web para liquidar y controlar expensas de barrios cerrados chicos. Es un solo archivo (`index.html`) que se publica gratis en GitHub Pages y guarda los datos en una planilla de Google Sheets.

## Qué hace

- Rubros propios por barrio ("+ Nuevo rubro…" al cargar un gasto).
- Resumen con composición del gasto, evolución mensual, indicadores clave y deuda por unidad.
- Varios barrios, cada uno con sus secciones: Resumen, Unidades, Gastos, Liquidación, Caja y banco, Controles, Estado de cuenta, Historial y Ajustes.
- Prorrateo por coeficiente, fondo de reserva, interés por mora solo sobre el capital adeudado (sin interés sobre interés) y gastos particulares.
- Fondos ordinario y extraordinario separados, con conciliación contra el extracto bancario.
- Variación de cada rubro contra el mes anterior, con una columna de **Observaciones** para explicar la suba o la baja (incluye sugerencias automáticas).
- Controles automáticos: conciliación, fondos negativos, créditos sin cobrar, gastos sin comprobante, morosidad, gastos bancarios, variaciones fuertes y rubros sin explicar.
- **Modo Doña Rosa**: cada sección explica sus conceptos en lenguaje simple.
- Modo claro y modo oscuro.
- Todos los montos con separador de miles; opción de mostrar centavos (Configuración > Preferencias). Los campos aceptan "1234567,89" o "1.234.567,89".
- PDF de la pantalla actual, del informe completo del período o de todos los estados de cuenta (uno por hoja).
- Cierre de período: pasa los saldos al mes siguiente y guarda el historial.

## Instalación

### 1. La planilla (Google Sheets)

1. Creá una planilla nueva en Google Drive, por ejemplo "Expensas Claras — datos".
2. Abrí **Extensiones > Apps Script**, borrá lo que haya y pegá el contenido de `Code.gs`.
3. En la línea `const TOKEN = 'CAMBIAR-ESTA-CLAVE';` poné una clave propia, larga.
4. Guardá, elegí la función `setup` en el menú de arriba y tocá **Ejecutar**. Aceptá los permisos. Se crean las pestañas Barrios, Unidades, Gastos, Historial y Observaciones.
5. **Implementar > Nueva implementación > Tipo: Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
6. Copiá la URL que termina en `/exec`.

La clave protege la planilla: sin ella, la app web no lee ni escribe nada.

### 2. La app (GitHub Pages)

1. En GitHub, creá un repositorio nuevo, por ejemplo `expensas-claras`.
2. Subí `index.html` (y este README).
3. **Settings > Pages > Branch: main / root > Save**.
4. En uno o dos minutos la app queda en `https://<tu-usuario>.github.io/expensas-claras/`.

### 3. Conectar la app con la planilla

1. Abrí la app publicada y entrá en **Configuración**, en el menú de la izquierda.
2. Pegá la URL `/exec` y la clave. Tocá **Probar conexión**.
3. La primera vez, tocá **Subir todo a la planilla**. Desde ahí, cada cambio se guarda solo, unos segundos después.
4. En otra computadora: abrí la app, cargá la URL y la clave, y tocá **Traer todo desde la planilla**.

## Cómo se usa cada mes

1. **Ajustes**: confirmá el período, el vencimiento y los saldos iniciales de cada fondo.
2. **Gastos**: cargá cada factura con su rubro, comprobante y tipo (A = ordinario, B = extraordinario).
3. **Unidades**: cargá los pagos del mes de cada lote.
4. **Liquidación**: revisá la variación de cada rubro y escribí la observación. El botón "Completar con sugerencias" llena las vacías con un borrador.
5. **Controles**: resolvé las alertas en rojo y naranja.
6. **PDF**: exportá el informe completo y los estados de cuenta.
7. **Cerrar período**: pasa todo al mes siguiente.

## Notas

- Sin conexión a la planilla, los datos quedan solo en el navegador. Usá "Copiar todo", en Configuración, como respaldo manual.
- La vista previa de la app dentro de Claude no permite imprimir ni conectarse con Google. Las dos cosas funcionan en la versión publicada en GitHub Pages.
- Si cambiás `Code.gs`: pegá el código nuevo, ejecutá otra vez `setup` (agrega columnas nuevas sin borrar datos) y hacé **Implementar > Gestionar implementaciones > Editar > Nueva versión**. La URL sigue siendo la misma.
