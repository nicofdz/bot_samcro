export interface SeccionConfig {
  nombre_visible: string;
  rol_jefe: string[];
  tarifa_hora: number;
  comision_servicio: number;
  usa_sueldo_base: boolean;
}

export const SECCIONES: Record<string, SeccionConfig> = {
  mecanica: {
    nombre_visible: "🔧 Mecánica",
    rol_jefe: ["Encargado de mecanicos", "Jefe Mecanicos", "Jefe de Mecánico", "Jefe Mecánica", "Enc. de Mecánico"],
    tarifa_hora: 0,
    comision_servicio: 0.30,
    usa_sueldo_base: true,
  },
  bar: {
    nombre_visible: "🍺 Bar / Comida",
    rol_jefe: ["Jefe Bar", "Jefe de Barra", "Enc. de BAR"],
    tarifa_hora: 0,
    comision_servicio: 0.40,
    usa_sueldo_base: false,
  },
  tatuajes: {
    nombre_visible: "🖋️ Tatuajes",
    rol_jefe: ["Jefe Tatuador", "Jefe Tatuajes", "Enc. de Tattoo"],
    tarifa_hora: 0,
    comision_servicio: 0.30,
    usa_sueldo_base: false,
  },
  show: {
    nombre_visible: "💃 Bailarinas / Show",
    rol_jefe: ["Jefe Bailarina", "Jefa de Bailarinas", "Jefe Show"],
    tarifa_hora: 0,
    comision_servicio: 0.35,
    usa_sueldo_base: false,
  },
};

export const SUELDO_BASE_TRABAJADOR = 10000;
export const SUELDO_BASE_JEFE = 20000;
export const HORAS_MINIMAS_SUELDO_BASE = 10.0;

export const PORCENTAJES_JEFE: Record<string, number> = {
  mecanica: 0.40,
  tatuajes: 0.40,
  bar: 0.50,
  show: 0.40,
};

export const DIA_CIERRE_SEMANA = 6; // Domingo
export const HORA_CIERRE_SEMANA = "16:00"; // 16:00 hrs
export const ZONA_HORARIA = "America/Santiago";
