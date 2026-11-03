# SAMCRO MC — Dashboard Web en Next.js (Vercel)

Panel de control, auditoría y liquidación de nóminas para **SAMCRO MC**, migrado a **Next.js 16 + React 19 + Tailwind CSS**, diseñado para desplegarse en **Vercel** sin límites de horas ni apagados.

---

## 🚀 Despliegue en Vercel en 3 Pasos

1. **Sube este repositorio a GitHub**:
   - Puedes subir la carpeta completa o el proyecto a tu repositorio de GitHub.
2. **Conecta en Vercel**:
   - Entra a [vercel.com](https://vercel.com) y dale a **Add New... → Project**.
   - Importa tu repositorio.
   - Si tu proyecto Next.js está en la subcarpeta `bot_samcro`, en **Root Directory** selecciona `bot_samcro` (o déjalo en `./` si subiste directamente esta carpeta).
3. **Agrega la Variable de Entorno**:
   - En la sección **Environment Variables**, agrega:
     - `DATABASE_URL`: La URL de tu base de datos PostgreSQL (ej. la de Supabase, Neon o Render PostgreSQL).
   - Haz clic en **Deploy**.

---

## ✨ Características del Nuevo Dashboard

- ⚡ **Cero costo de horas**: En Vercel corre en Serverless, por lo que **no se apaga nunca** y no requiere ningún pinger externo.
- 🎨 **Diseño Sons of Anarchy**: Dark theme inmersivo, tonos oro y carbón, responsive en móviles y PC.
- 📊 **Resumen Consolidado y Secciones**: Mecánica, Bar, Tatuajes, Show y vista combinada.
- 🕒 **Histórico de Semanas**: Selector interactivo para auditar semanas pasadas con un clic.
- 🟢 **Turnos en Vivo**: Cronómetro en tiempo real de trabajadores con turno abierto en Discord.
- 🧾 **Visor de Fotos y Comprobantes**: Amplía las fotos de los servicios en alta definición.
- ✏️ **Ajuste de Horas y Anulación**: Edita la duración de los turnos o anula servicios duplicados directamente desde la web.
- 🛡️ **Checklist de Pago en Vivo**: Marca quién ya fue pagado con guardado instantáneo en la base de datos.
- 👥 **Gestión de Jefaturas**: Panel de administración para asignar qué secciones puede ver cada usuario.
