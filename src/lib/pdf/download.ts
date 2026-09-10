/**
 * Dispara la descarga de bytes de PDF generados client-side (pdf-lib).
 * Antes esto era la respuesta de un Route Handler con
 * `Content-Disposition: attachment`; en GitHub Pages no hay servidor que
 * la sirva, así que el PDF se arma en el navegador y se "descarga" vía
 * Blob + link temporal — mismo resultado para quien lo usa.
 */
export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
