import { query, queryOne, ensurePerfilColumns } from "./db";
import { obtenerRangoSemana, formatoFechaCorta } from "./nomina";

export interface MiembroRankingSemana {
  nombre: string;
  discord_id: string;
  username: string | null;
  avatar_url: string | null;
  horas: number;
  ventas: number;
  servicios: number;
  puntos: number;
  posicion: number;
}

export interface ResumenTrabajadorSemana {
  semanaTexto: string;
  inicioIso: string;
  finIso: string;
  offset: number;
  esCerrada: boolean;
  ganador: MiembroRankingSemana | null;
  top3: MiembroRankingSemana[];
  totalParticipantes: number;
}

/**
 * Fórmula de ponderación SAMCRO:
 * - 1 hora en turno = 100 pts
 * - $1.000 en ventas = 10 pts ($100 = 1 pt)
 * - 1 servicio completado = 50 pts
 */
export function calcularPuntosRendimiento(horas: number, ventas: number, servicios: number): number {
  const ptsHoras = Math.round(horas * 100);
  const ptsVentas = Math.round(ventas / 100);
  const ptsServicios = Math.round(servicios * 50);
  return ptsHoras + ptsVentas + ptsServicios;
}

/**
 * Obtiene el ranking y trabajador de la semana para un offset específico
 */
export async function obtenerTrabajadorSemana(offset: number = 0): Promise<ResumenTrabajadorSemana> {
  await ensurePerfilColumns();

  const { inicioUtc, finUtc, inicioLocal, finLocal } = obtenerRangoSemana(offset);
  const inicioIso = inicioUtc.toISOString();
  const finIso = finUtc.toISOString();
  const semanaTexto = `${formatoFechaCorta(inicioLocal)} al ${formatoFechaCorta(finLocal)} 16:00`;
  const esCerrada = offset < 0;

  // 1. Obtener registros aprobados de la semana
  const registros = await query<{
    discord_id: string;
    nombre: string;
    tipo: string;
    horas: number;
    monto: number;
  }>(
    `SELECT discord_id, nombre, tipo, COALESCE(horas, 0) as horas, COALESCE(monto, 0) as monto
     FROM registros
     WHERE creado_en >= $1 AND creado_en < $2 AND validado = 1`,
    [inicioIso, finIso]
  );

  // 2. Acumular por trabajador
  const mapa = new Map<
    string,
    {
      discord_id: string;
      nombre: string;
      horas: number;
      ventas: number;
      servicios: number;
    }
  >();

  for (const r of registros) {
    const clave = (r.discord_id || r.nombre || "desconocido").trim();
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        discord_id: r.discord_id || "",
        nombre: r.nombre,
        horas: 0,
        ventas: 0,
        servicios: 0,
      });
    }
    const item = mapa.get(clave)!;
    if (r.tipo === "horas") {
      item.horas += Number(r.horas || 0);
    } else {
      item.ventas += Number(r.monto || 0);
      item.servicios += 1;
    }
  }

  // 3. Obtener perfiles de usuarios para enriquecer fotos y usernames
  const usuarios = await query<{
    username: string;
    nombre: string | null;
    avatar_url: string | null;
    discord_id: string | null;
  }>("SELECT username, nombre, avatar_url, discord_id FROM usuarios");

  const usuariosPorDid = new Map<string, { username: string; avatar_url: string | null }>();
  const usuariosPorNombre = new Map<string, { username: string; avatar_url: string | null }>();

  for (const u of usuarios) {
    if (u.discord_id) {
      usuariosPorDid.set(u.discord_id.trim(), { username: u.username, avatar_url: u.avatar_url });
    }
    if (u.nombre) {
      usuariosPorNombre.set(u.nombre.toLowerCase().trim(), { username: u.username, avatar_url: u.avatar_url });
    }
    usuariosPorNombre.set(u.username.toLowerCase().trim(), { username: u.username, avatar_url: u.avatar_url });
  }

  // 4. Armar lista con puntuación
  const lista: MiembroRankingSemana[] = [];

  for (const item of mapa.values()) {
    const userMatch =
      usuariosPorDid.get(item.discord_id) ||
      usuariosPorNombre.get(item.nombre.toLowerCase().trim()) ||
      null;

    const puntos = calcularPuntosRendimiento(item.horas, item.ventas, item.servicios);

    // Solo considerar a quienes tuvieron alguna actividad
    if (item.horas > 0 || item.ventas > 0 || item.servicios > 0) {
      lista.push({
        nombre: item.nombre,
        discord_id: item.discord_id,
        username: userMatch?.username || null,
        avatar_url: userMatch?.avatar_url || null,
        horas: Math.round(item.horas * 10) / 10,
        ventas: Math.round(item.ventas),
        servicios: item.servicios,
        puntos,
        posicion: 0,
      });
    }
  }

  // Ordenar por puntos desc, luego ventas desc, luego horas desc
  lista.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.ventas !== a.ventas) return b.ventas - a.ventas;
    return b.horas - a.horas;
  });

  lista.forEach((item, idx) => {
    item.posicion = idx + 1;
  });

  const ganador = lista.length > 0 ? lista[0] : null;
  const top3 = lista.slice(0, 3);

  // 5. Si la semana ya está cerrada y hay un ganador, asegurar persistencia en tabla trabajador_semana
  if (esCerrada && ganador) {
    try {
      const existe = await queryOne(
        "SELECT semana_inicio FROM trabajador_semana WHERE semana_inicio = $1",
        [inicioIso]
      );
      if (!existe) {
        await query(
          `INSERT INTO trabajador_semana (
            semana_inicio, semana_fin, discord_id, nombre, username, avatar_url,
            horas, ventas, servicios, puntos, otorgado_automatico, creado_en
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11)`,
          [
            inicioIso,
            finIso,
            ganador.discord_id,
            ganador.nombre,
            ganador.username,
            ganador.avatar_url,
            ganador.horas,
            ganador.ventas,
            ganador.servicios,
            ganador.puntos,
            new Date().toISOString(),
          ]
        );
      }
    } catch (e) {
      console.warn("Aviso al persistir trabajador_semana:", e);
    }
  }

  return {
    semanaTexto,
    inicioIso,
    finIso,
    offset,
    esCerrada,
    ganador,
    top3,
    totalParticipantes: lista.length,
  };
}

/**
 * Obtiene el Campeón Vigente (semana anterior que cerró el domingo a las 16:00)
 * y el Líder Provisional (semana actual en curso)
 */
export async function obtenerCampeonVigenteYLider(): Promise<{
  campeonVigente: ResumenTrabajadorSemana;
  liderActual: ResumenTrabajadorSemana;
}> {
  const [campeonVigente, liderActual] = await Promise.all([
    obtenerTrabajadorSemana(-1), // Semana anterior cerrada
    obtenerTrabajadorSemana(0),  // Semana actual en vivo
  ]);

  return { campeonVigente, liderActual };
}

/**
 * Verifica si un usuario porta actualmente la corona de Trabajador de la Semana
 */
export async function esTrabajadorDeLaSemanaVigente(identificadores: {
  username?: string | null;
  nombre?: string | null;
  discord_id?: string | null;
}): Promise<boolean> {
  try {
    const campeon = await obtenerTrabajadorSemana(-1);
    if (!campeon.ganador) return false;

    const g = campeon.ganador;
    if (identificadores.discord_id && g.discord_id && identificadores.discord_id === g.discord_id) {
      return true;
    }
    if (identificadores.username && g.username && identificadores.username.toLowerCase() === g.username.toLowerCase()) {
      return true;
    }
    if (identificadores.nombre && g.nombre && identificadores.nombre.toLowerCase().trim() === g.nombre.toLowerCase().trim()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
