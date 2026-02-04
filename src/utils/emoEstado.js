export function calcularEstadoEMO(fechaVencimiento) {
  // Fecha actual en hora Perú
  const hoyPeru = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  )

  // Normalizamos hoy a inicio del día
  hoyPeru.setHours(0, 0, 0, 0)

  // Fecha de vencimiento al final del día
  const vencimiento = new Date(fechaVencimiento)
  vencimiento.setHours(23, 59, 59, 999)

  // Diferencia en días
  const diffMs = vencimiento - hoyPeru
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return "caducado"
  if (diffDias <= 15) return "por vencer"
  return "vigente"
}
export const prioridadEstadoEMO = {
  caducado: 1,
  "por vencer": 2,
  vigente: 3
}
export function ordenarEmosPorEstadoYVencimiento(emos) {
  return [...emos].sort((a, b) => {
    const estadoA = calcularEstadoEMO(a.fecha_vencimiento)
    const estadoB = calcularEstadoEMO(b.fecha_vencimiento)

    // 1️⃣ Prioridad por estado
    const prioridadA = prioridadEstadoEMO[estadoA]
    const prioridadB = prioridadEstadoEMO[estadoB]

    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB
    }

    // 2️⃣ Si tienen el mismo estado → ordenar por fecha de vencimiento
    return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)
  })
}
