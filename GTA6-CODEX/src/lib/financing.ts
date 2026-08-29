/**
 * Matemática pura de la calculadora de cuota/financiamiento
 * (TODO.md, "Features" > "Calculadora de cuota/financiamiento").
 *
 * Deliberadamente NO intenta leer el precio real de un vehículo desde su
 * contenido: el campo `price` en `src/content/vehiculos/*.json` es texto
 * libre sin formato consistente (ej. "EUR 31.500 (último precio de lista
 * antes de discontinuarse) / GBP 23.225", o directamente "Discontinuado
 * en EE.UU. ... precio local (ej. India desde ₹53,4 lakh)" sin ningún
 * número limpio). Un parser automático ahí adivinaría mal en varios
 * casos y terminaría mostrando una cuota calculada sobre una cifra
 * incorrecta — la calculadora pide el precio a mano en su lugar.
 */

export interface FinancingInput {
  /** Precio total del vehículo, en la unidad monetaria que el usuario
   *  eligió (la calculadora no convierte monedas, solo hace la cuenta). */
  price: number
  /** Porcentaje de entrega/anticipo, 0-100. */
  downPaymentPercent: number
  /** Tasa de interés anual nominal, en porcentaje (ej. 12 para 12%/año). */
  annualRatePercent: number
  /** Plazo del préstamo en meses. */
  termMonths: number
}

export interface FinancingResult {
  downPayment: number
  financedAmount: number
  /** Cuota mensual fija (sistema francés — la misma composición interés/
   *  capital que usan la enorme mayoría de los planes de financiamiento
   *  de autos). Cuando `annualRatePercent` es 0, es simplemente el monto
   *  financiado dividido en partes iguales. */
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
}

/**
 * Sistema de amortización francés (cuota fija). Devuelve `null` si los
 * inputs no permiten un cálculo con sentido (precio o plazo no positivos),
 * en vez de devolver NaN/Infinity silenciosamente.
 */
export function calculateFinancing(input: FinancingInput): FinancingResult | null {
  const { price, downPaymentPercent, annualRatePercent, termMonths } = input

  if (!Number.isFinite(price) || price <= 0) return null
  if (!Number.isFinite(termMonths) || termMonths <= 0) return null
  if (!Number.isFinite(downPaymentPercent) || downPaymentPercent < 0 || downPaymentPercent > 100) return null
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) return null

  const downPayment = price * (downPaymentPercent / 100)
  const financedAmount = price - downPayment

  let monthlyPayment: number
  if (annualRatePercent === 0) {
    monthlyPayment = financedAmount / termMonths
  } else {
    const monthlyRate = annualRatePercent / 100 / 12
    const factor = Math.pow(1 + monthlyRate, termMonths)
    monthlyPayment = (financedAmount * monthlyRate * factor) / (factor - 1)
  }

  const totalPaid = monthlyPayment * termMonths + downPayment
  const totalInterest = totalPaid - price

  return {
    downPayment,
    financedAmount,
    monthlyPayment,
    totalPaid,
    totalInterest,
  }
}
