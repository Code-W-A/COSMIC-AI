type ChartImageSource = {
  chartImageSvg?: string | null
  chartImageBase64?: string | null
} | null | undefined

export function getNatalChartImageSrc(summary: ChartImageSource) {
  const svg = summary?.chartImageSvg
  if (typeof svg === "string" && svg.trim()) {
    return svg.trim().startsWith("<svg")
      ? `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`
      : svg.trim()
  }

  const base64 = summary?.chartImageBase64
  if (typeof base64 === "string" && base64.trim()) {
    return base64.trim().startsWith("data:")
      ? base64.trim()
      : `data:image/png;base64,${base64.trim()}`
  }

  return null
}
