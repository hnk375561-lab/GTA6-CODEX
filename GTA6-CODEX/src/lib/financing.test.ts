import { describe, expect, it } from 'vitest'
import { calculateFinancing } from '@/lib/financing'

describe('calculateFinancing', () => {
  it('calcula una cuota mensual fija con tasa > 0 (sistema francés)', () => {
    // Caso de referencia verificable a mano: 12.000 financiados, 12%
    // anual (1% mensual), 12 cuotas -> cuota = 12000*0.01*1.01^12 /
    // (1.01^12 - 1) ≈ 1066.19.
    const result = calculateFinancing({
      price: 12000,
      downPaymentPercent: 0,
      annualRatePercent: 12,
      termMonths: 12,
    })
    expect(result).not.toBeNull()
    expect(result!.monthlyPayment).toBeCloseTo(1066.19, 1)
    expect(result!.financedAmount).toBe(12000)
    expect(result!.downPayment).toBe(0)
  })

  it('resta la entrega del monto financiado', () => {
    const result = calculateFinancing({
      price: 20000,
      downPaymentPercent: 20,
      annualRatePercent: 10,
      termMonths: 24,
    })
    expect(result).not.toBeNull()
    expect(result!.downPayment).toBe(4000)
    expect(result!.financedAmount).toBe(16000)
  })

  it('con tasa 0% reparte el monto financiado en partes iguales', () => {
    const result = calculateFinancing({
      price: 12000,
      downPaymentPercent: 0,
      annualRatePercent: 0,
      termMonths: 12,
    })
    expect(result).not.toBeNull()
    expect(result!.monthlyPayment).toBeCloseTo(1000, 6)
    expect(result!.totalInterest).toBeCloseTo(0, 6)
  })

  it('el total pagado es coherente: entrega + cuotas = total', () => {
    const result = calculateFinancing({
      price: 15000,
      downPaymentPercent: 10,
      annualRatePercent: 8,
      termMonths: 36,
    })
    expect(result).not.toBeNull()
    const { downPayment, monthlyPayment, totalPaid } = result!
    expect(totalPaid).toBeCloseTo(downPayment + monthlyPayment * 36, 6)
  })

  it('el interés total es positivo cuando la tasa es > 0', () => {
    const result = calculateFinancing({
      price: 10000,
      downPaymentPercent: 0,
      annualRatePercent: 15,
      termMonths: 48,
    })
    expect(result!.totalInterest).toBeGreaterThan(0)
  })

  it('devuelve null para precio no positivo', () => {
    expect(calculateFinancing({ price: 0, downPaymentPercent: 0, annualRatePercent: 10, termMonths: 12 })).toBeNull()
    expect(calculateFinancing({ price: -100, downPaymentPercent: 0, annualRatePercent: 10, termMonths: 12 })).toBeNull()
  })

  it('devuelve null para plazo no positivo', () => {
    expect(calculateFinancing({ price: 10000, downPaymentPercent: 0, annualRatePercent: 10, termMonths: 0 })).toBeNull()
  })

  it('devuelve null para porcentaje de entrega fuera de 0-100', () => {
    expect(calculateFinancing({ price: 10000, downPaymentPercent: -5, annualRatePercent: 10, termMonths: 12 })).toBeNull()
    expect(calculateFinancing({ price: 10000, downPaymentPercent: 150, annualRatePercent: 10, termMonths: 12 })).toBeNull()
  })

  it('devuelve null para tasa negativa', () => {
    expect(calculateFinancing({ price: 10000, downPaymentPercent: 0, annualRatePercent: -1, termMonths: 12 })).toBeNull()
  })

  it('entrega del 100% financia monto cero y cuota cero', () => {
    const result = calculateFinancing({ price: 10000, downPaymentPercent: 100, annualRatePercent: 10, termMonths: 12 })
    expect(result).not.toBeNull()
    expect(result!.financedAmount).toBe(0)
    expect(result!.monthlyPayment).toBeCloseTo(0, 6)
  })
})
