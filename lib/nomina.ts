import {
  SECCIONES,
  SUELDO_BASE_TRABAJADOR,
  SUELDO_BASE_JEFE,
  HORAS_MINIMAS_SUELDO_BASE,
  DIA_CIERRE_SEMANA,
  HORA_CIERRE_SEMANA,
} from "./config";
import { query } from "./db";

export interface RangoSemana {
  offset: number;
  inicio_utc: string;
  fin_utc: string;
  inicio_local_str: string;
  fin_local_str: string;
  rango_texto: string;
  es_actual: boolean;
  semanas: Array<{
    offset: number;
    label: string;
    rango: string;
    es_actual: boolean;
  }>;
}

export function obtenerRangoSemana(offset: number = 0): {
  inicioUtc: Date;
  finUtc: Date;
  inicioLocal: Date;
  finLocal: Date;
} {
  // Configuración de cierre: Domingo 16:00
  const [cierreH, cierreM] = HORA_CIERRE_SEMANA.split(":").map(Number);
  
  // Ahora aproximado en Chile (UTC-3 por defecto)
  const ahora = new Date();
  
  // Calculamos el próximo domingo 16:00 UTC (ajustando a la hora de cierre chilena, UTC+3)
  const diaSemana = ahora.getUTCDay(); // 0 es Domingo
  // En JS: 0=Dom, 1=Lun, ..., 6=Sab
  // En config DIA_CIERRE_SEMANA = 6 (formato python donde 0=Lun, 6=Dom).
  // Por tanto, el día objetivo en JS es 0 (Domingo).
  let diasHastaCierre = (0 - diaSemana + 7) % 7;
  
  const finUtc = new Date(ahora);
  finUtc.setUTCDate(finUtc.getUTCDate() + diasHastaCierre);
  // Domingo a las 16:00 hora de Chile es ~19:00 UTC (Chile UTC-3) o 20:00 UTC (Chile UTC-4)
  // Usamos 19:00 UTC como estándar
  finUtc.setUTCHours(cierreH + 3, cierreM, 0, 0);

  if (finUtc.getTime() < ahora.getTime()) {
    finUtc.setUTCDate(finUtc.getUTCDate() + 7);
  }

  if (offset !== 0) {
    finUtc.setUTCDate(finUtc.getUTCDate() + offset * 7);
  }

  const inicioUtc = new Date(finUtc);
  inicioUtc.setUTCDate(inicioUtc.getUTCDate() - 7);

  // Fechas locales (restando 3 horas de UTC)
  const inicioLocal = new Date(inicioUtc.getTime() - 3 * 3600 * 1000);
  const finLocal = new Date(finUtc.getTime() - 3 * 3600 * 1000);

  return { inicioUtc, finUtc, inicioLocal, finLocal };
}

export function formatoFechaCorta(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}

export function formatoFechaHora(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export interface TrabajadorNomina {
  nombre: string;
  horas: number;
  pagoHoras: number;
  nServicios: number;
  comisiones: number;
  total: number;
  esJefe: boolean;
  pagado: boolean;
  pagado_por?: string | null;
  discord_id?: string;
  esTrabajadorSemana?: boolean;
}

export async function calcularNominaParaSeccion(
  seccionKey: string,
  inicioUtcIso: string,
  finUtcIso: string,
  checklist: Record<string, { pagado_por?: string }>,
  trabajadoresActivos: Record<string, { nombre: string }>,
  usuariosDb: Record<string, { rol: string }>,
  campeonSemanaNombre?: string | null
): Promise<TrabajadorNomina[]> {
  const seccionCfg = SECCIONES[seccionKey];
  if (!seccionCfg) return [];

  const registros = await query<{
    discord_id: string;
    nombre: string;
    tipo: string;
    horas: number;
    monto: number;
    comision: number;
  }>(
    `SELECT discord_id, nombre, tipo, COALESCE(horas, 0) as horas, COALESCE(monto, 0) as monto, COALESCE(comision, 0) as comision
     FROM registros
     WHERE seccion = $1 AND creado_en >= $2 AND creado_en < $3 AND validado = 1
     ORDER BY creado_en ASC`,
    [seccionKey, inicioUtcIso, finUtcIso]
  );

  const mapa: Record<
    string,
    {
      nombre: string;
      horas: number;
      nServicios: number;
      montoServicios: number;
      pagoComisiones: number;
      esJefe: boolean;
      discord_id: string;
    }
  > = {};

  // Incluir trabajadores con bitácora registrada aunque tengan $0
  for (const [did, info] of Object.entries(trabajadoresActivos)) {
    mapa[did] = {
      nombre: info.nombre,
      horas: 0,
      nServicios: 0,
      montoServicios: 0,
      pagoComisiones: 0,
      esJefe: false,
      discord_id: did,
    };
  }

  // Acumular registros
  for (const r of registros) {
    const did = r.discord_id || r.nombre;
    if (!mapa[did]) {
      mapa[did] = {
        nombre: r.nombre,
        horas: 0,
        nServicios: 0,
        montoServicios: 0,
        pagoComisiones: 0,
        esJefe: false,
        discord_id: did,
      };
    }

    if (r.tipo === "horas") {
      mapa[did].horas += Number(r.horas || 0);
    } else {
      mapa[did].nServicios += 1;
      mapa[did].montoServicios += Number(r.monto || 0);
      mapa[did].pagoComisiones += Number(r.comision || 0);
    }
  }

  const resultado: TrabajadorNomina[] = [];

  for (const [did, datos] of Object.entries(mapa)) {
    const userDb = usuariosDb[datos.nombre.toLowerCase()] || usuariosDb[did];
    const esJefe = userDb?.rol === "superadmin" || userDb?.rol === "jefe";

    let pagoHoras = 0;
    if (esJefe) {
      pagoHoras = datos.horas >= HORAS_MINIMAS_SUELDO_BASE ? SUELDO_BASE_JEFE : 0;
    } else if (seccionCfg.usa_sueldo_base) {
      pagoHoras = datos.horas >= HORAS_MINIMAS_SUELDO_BASE ? SUELDO_BASE_TRABAJADOR : 0;
    } else {
      pagoHoras = Math.round(datos.horas * (seccionCfg.tarifa_hora || 0));
    }

    const comisiones = Math.round(datos.pagoComisiones * 100) / 100;
    const total = Math.round((pagoHoras + comisiones) * 100) / 100;

    const checklistKey = `${seccionKey}_${datos.nombre}`;
    const pagoInfo = checklist[checklistKey];

    const esCampeon = campeonSemanaNombre
      ? datos.nombre.toLowerCase().trim() === campeonSemanaNombre.toLowerCase().trim() ||
        did === campeonSemanaNombre
      : false;

    resultado.push({
      nombre: datos.nombre,
      horas: Math.round(datos.horas * 100) / 100,
      pagoHoras,
      nServicios: datos.nServicios,
      comisiones,
      total,
      esJefe,
      pagado: Boolean(pagoInfo),
      pagado_por: pagoInfo?.pagado_por || null,
      discord_id: did,
      esTrabajadorSemana: esCampeon,
    });
  }

  // Ordenar: primero los que tienen total > 0 desc, luego alfabético
  return resultado.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.nombre.localeCompare(b.nombre);
  });
}
