// Pequenos formatadores de texto usados por mais de um componente.

export function tamanhoLegivel(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

// 75 -> "1:15". O relógio do processamento é lido de relance, não somado.
export function minutosESegundos(total) {
  const minutos = Math.floor(total / 60)
  const segundos = String(total % 60).padStart(2, '0')
  return `${minutos}:${segundos}`
}
