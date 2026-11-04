import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { obtenerCanalesTrabajadores } from "@/lib/trabajadores";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const canales = await obtenerCanalesTrabajadores();
    return NextResponse.json(canales);
  } catch (error: any) {
    console.error("Error al obtener canales:", error);
    return NextResponse.json({ error: error.message || "Error al obtener canales" }, { status: 500 });
  }
}

