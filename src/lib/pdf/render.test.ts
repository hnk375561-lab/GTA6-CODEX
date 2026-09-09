import { describe, expect, it } from 'vitest'
import { isWinAnsiEncodable } from './render'

describe('isWinAnsiEncodable', () => {
  it('acepta español con tildes y ñ (WinAnsi los cubre)', async () => {
    expect(await isWinAnsiEncodable('Concepción del Uruguay')).toBe(true)
    expect(await isWinAnsiEncodable('Volkswagen Tiguán')).toBe(true)
  })

  it('acepta texto vacío', async () => {
    expect(await isWinAnsiEncodable('')).toBe(true)
  })

  it('rechaza emoji', async () => {
    expect(await isWinAnsiEncodable('Excelente estado 🚗')).toBe(false)
  })

  it('rechaza caracteres CJK', async () => {
    expect(await isWinAnsiEncodable('豊田')).toBe(false)
  })
})
