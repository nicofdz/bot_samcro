import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  obtenerTrabajadorSemana,
  obtenerCampeonVigenteYLider,
} from "@/lib/trabajadorSemana";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    const [datosPeriodo, resumenGeneral] = await Promise.all([
      obtenerTrabajadorSemana(offset),
      obtenerCampeonVigenteYLider(),
    ]);

    return NextResponse.json({
      periodoSeleccionado: datosPeriodo,
      campeonVigente: resumenGeneral.campeonVigente,
      liderActual: resumenGeneral.liderActual,
    });
  } catch (error: any) {
    console.error("Error al obtener trabajador de la semana:", error);
    return NextResponse.json(
      { error: error.message || "Error al calcular trabajador de la semana" },
      { status: 500 }
    );
  }
}
