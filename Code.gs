/**
 * Expensas Claras — backend en Google Sheets (Apps Script)
 *
 * Guarda cada barrio en tablas legibles:
 *   Barrios · Unidades · Gastos · Historial · Observaciones
 *
 * Instalación (una sola vez):
 *   1. Planilla nueva > Extensiones > Apps Script > pegar este archivo.
 *   2. Cambiar TOKEN por una clave propia.
 *   3. Ejecutar la función setup() y aceptar los permisos.
 *   4. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 *   5. Copiar la URL que termina en /exec y pegarla en la app (Google Sheets).
 */

const TOKEN = 'CAMBIAR-ESTA-CLAVE';

const SHEETS = {
  Barrios: ['id', 'nombre', 'zona', 'administracion', 'cuit', 'periodo', 'vencimiento', 'fondo_reserva_pct', 'interes_pct',
            'caja_ord_inicial', 'caja_ext_inicial', 'fondo_reserva_acum', 'cobranza_ext', 'egresos_ord', 'egresos_ext',
            'saldo_banco', 'observaciones_periodo', 'actualizado', 'rubros_propios', 'cobros_no_identificados'],
  Unidades: ['barrio_id', 'orden', 'unidad', 'propietario', 'coeficiente', 'saldo_anterior', 'intereses_en_saldo',
             'pagos', 'particulares', 'total_segun_admin'],
  Gastos: ['barrio_id', 'periodo', 'orden', 'fecha', 'rubro', 'proveedor_concepto', 'comprobante', 'tipo', 'importe'],
  Historial: ['barrio_id', 'orden', 'periodo', 'nota', 'ordinarios', 'extraordinarios', 'fondo_reserva', 'particulares',
              'total', 'cobranza', 'morosidad', 'caja_ord_cierre', 'caja_ext_cierre', 'rubros_json', 'observacion', 'detalle_json'],
  Observaciones: ['barrio_id', 'periodo', 'rubro', 'texto']
};
// Columnas que deben quedar como texto (evita que Sheets convierta "2026-11" en fecha).
const TEXT_COLS = ['id', 'barrio_id', 'periodo', 'vencimiento', 'fecha', 'unidad', 'cuit', 'comprobante', 'tipo', 'rubro', 'nota', 'actualizado'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const h = SHEETS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#e7eff6');
    sh.setFrozenRows(1);
    h.forEach((col, i) => { if (TEXT_COLS.indexOf(col) >= 0) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'); });
  });
  const def = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
}

/* ---------- Web app ---------- */
function doGet(e) {
  const p = e.parameter || {};
  if (p.token !== TOKEN) return out({ ok: false, error: 'Clave incorrecta' });
  if (p.action === 'ping') return out({ ok: true, barrios: rows('Barrios').length });
  if (p.action === 'load') return out({ ok: true, barrios: loadAll() });
  return out({ ok: false, error: 'Acción desconocida' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'JSON inválido' }); }
  if (body.token !== TOKEN) return out({ ok: false, error: 'Clave incorrecta' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'saveBarrio') { saveBarrio(body.barrio); return out({ ok: true }); }
    if (body.action === 'deleteBarrio') { removeBarrio(body.id); return out({ ok: true }); }
    return out({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- Guardar ---------- */
function saveBarrio(b) {
  if (!b || !b.id) throw new Error('Barrio sin id');
  removeBarrio(b.id);
  const c = b.cfg || {};
  append('Barrios', [[b.id, b.nombre, b.zona || '', b.admin || '', c.cuit || '', c.periodo || '', c.venc || '', c.fondo, c.interes,
    c.cajaOrd, c.cajaExt, c.fondoacum, c.cobrExt, c.egrOrd, c.egrExt, c.saldoBanco, c.obsPeriodo || '', b.updated || new Date().toISOString(), JSON.stringify(b.rubros || []), c.cobrosNoId ? JSON.stringify(c.cobrosNoId) : '']]);
  append('Unidades', (b.ufs || []).map((u, i) => [b.id, i + 1, u.id, u.prop || '', u.coef, u.saldo, u.intPrev, u.pagos, u.part, u.ref]));
  append('Gastos', (b.gastos || []).map((g, i) => [b.id, c.periodo || '', i + 1, g.fecha || '', g.rubro || '', g.prov || '', g.comp || '', g.tipo || 'A', g.imp]));
  append('Historial', (b.hist || []).map((h, i) => [b.id, i + 1, h.periodo || '', h.nota || '', h.A, h.B, h.fondo, h.part, h.total, h.cobranza,
    h.mora, h.cajaOrd, h.cajaExt, h.rubros ? JSON.stringify(h.rubros) : '', h.obs || '',
    JSON.stringify({ gastos: h.gastos || [], ufs: h.ufs || [], cajaIniOrd: h.cajaIniOrd, cajaIniExt: h.cajaIniExt, cobrosNoId: h.cobrosNoId || null })]));
  append('Observaciones', Object.keys(b.obs || {}).map(k => { const i = k.indexOf('|'); return [b.id, k.slice(0, i), k.slice(i + 1), b.obs[k]]; }));
}

function removeBarrio(id) {
  // Reescribe cada hoja sin las filas del barrio (más rápido que borrar fila por fila).
  Object.keys(SHEETS).forEach(name => {
    const sh = SpreadsheetApp.getActive().getSheetByName(name);
    const n = sh.getLastRow();
    if (n < 2) return;
    const w = SHEETS[name].length;
    const data = sh.getRange(2, 1, n - 1, w).getValues();
    const keep = data.filter(r => String(r[0]) !== String(id));
    if (keep.length === data.length) return;
    sh.getRange(2, 1, n - 1, w).clearContent();
    if (keep.length) {
      const range = sh.getRange(2, 1, keep.length, w);
      range.setNumberFormats(keep.map(() => SHEETS[name].map(col => TEXT_COLS.indexOf(col) >= 0 ? '@' : 'General')));
      range.setValues(keep);
    }
  });
}

function append(name, data) {
  if (!data.length) return;
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  const h = SHEETS[name];
  const clean = data.map(r => r.map(v => (v === undefined || v === null) ? '' : v));
  const range = sh.getRange(sh.getLastRow() + 1, 1, clean.length, h.length);
  range.setNumberFormats(clean.map(() => h.map(col => TEXT_COLS.indexOf(col) >= 0 ? '@' : 'General')));
  range.setValues(clean);
}

/* ---------- Leer ---------- */
function rows(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const h = SHEETS[name];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues().map(r => {
    const o = {};
    h.forEach((col, i) => {
      let v = r[i];
      if (v instanceof Date) v = col === 'actualizado' ? v.toISOString() : Utilities.formatDate(v, tz, col === 'periodo' ? 'yyyy-MM' : 'yyyy-MM-dd');
      o[col] = v;
    });
    return o;
  });
}

function loadAll() {
  const U = rows('Unidades'), G = rows('Gastos'), H = rows('Historial'), O = rows('Observaciones');
  const n = v => (v === '' || v === null) ? '' : Number(v);
  return rows('Barrios').map(b => {
    const obs = {};
    O.filter(o => o.barrio_id === b.id).forEach(o => { obs[o.periodo + '|' + o.rubro] = String(o.texto); });
    return {
      id: String(b.id), nombre: String(b.nombre), zona: String(b.zona || ''), admin: String(b.administracion || ''),
      cfg: { cuit: String(b.cuit || ''), periodo: String(b.periodo || ''), venc: String(b.vencimiento || ''), fondo: n(b.fondo_reserva_pct),
        interes: n(b.interes_pct), cajaOrd: n(b.caja_ord_inicial), cajaExt: n(b.caja_ext_inicial), fondoacum: n(b.fondo_reserva_acum),
        cobrExt: n(b.cobranza_ext), egrOrd: n(b.egresos_ord), egrExt: n(b.egresos_ext), saldoBanco: n(b.saldo_banco),
        obsPeriodo: String(b.observaciones_periodo || ''), cobrosNoId: b.cobros_no_identificados ? JSON.parse(b.cobros_no_identificados) : null },
      ufs: U.filter(u => u.barrio_id === b.id).sort((a, c) => a.orden - c.orden).map(u => ({ id: String(u.unidad), prop: String(u.propietario || ''),
        coef: n(u.coeficiente), saldo: n(u.saldo_anterior), intPrev: n(u.intereses_en_saldo), pagos: n(u.pagos), part: n(u.particulares), ref: n(u.total_segun_admin) })),
      gastos: G.filter(g => g.barrio_id === b.id).sort((a, c) => a.orden - c.orden).map(g => ({ fecha: String(g.fecha || ''), rubro: String(g.rubro || ''),
        prov: String(g.proveedor_concepto || ''), comp: String(g.comprobante || ''), tipo: String(g.tipo || 'A'), imp: Number(g.importe) || 0 })),
      hist: H.filter(h => h.barrio_id === b.id).sort((a, c) => a.orden - c.orden).map(h => ({ periodo: String(h.periodo), nota: String(h.nota || ''),
        A: n(h.ordinarios), B: n(h.extraordinarios), fondo: n(h.fondo_reserva), part: h.particulares === '' ? null : n(h.particulares), total: n(h.total),
        cobranza: h.cobranza === '' ? null : n(h.cobranza), mora: h.morosidad === '' ? null : n(h.morosidad), cajaOrd: n(h.caja_ord_cierre),
        cajaExt: n(h.caja_ext_cierre), rubros: h.rubros_json ? JSON.parse(h.rubros_json) : null, obs: String(h.observacion || ''),
        ...(h.detalle_json ? JSON.parse(h.detalle_json) : {}) })),
      rubros: b.rubros_propios ? JSON.parse(b.rubros_propios) : [],
      obs: obs,
      updated: String(b.actualizado || '')
    };
  });
}
