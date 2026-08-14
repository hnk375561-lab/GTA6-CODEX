// scripts/process-images.test.mjs
// ============================================================
// Tests del sistema de matching de scripts/process-images.mjs.
//
// Corre con: node --test scripts/process-images.test.mjs
// (usa el test runner nativo de Node, sin dependencias nuevas)
//
// Cubre el bug crítico auditado: matchEntity() usaba index.find(),
// que devuelve la PRIMERA entidad que matchea en vez de la más
// específica, dependiendo del orden de fs.readdirSync (no
// garantizado). Estos tests verifican que la resolución por tiers
// (resolveMatch) es determinista y correcta sin importar el orden
// del índice.
// ============================================================

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalize, matchEntity, resolveMatch } from './process-images.mjs'

/** Construye una entidad de fixture con el mismo shape que loadEntityIndex() */
function entity(slug, type, title) {
  return { slug, type, title, normalizedTitle: normalize(title) }
}

// Índice de fixture que reproduce las 4 colisiones reales confirmadas en la
// auditoría (bravado-buffalo, invetero-coquette, leonida, vice-city), más
// dos entidades cross-type con el mismo slug ('roxy') para los casos
// sintéticos de ambigüedad.
const BASE_INDEX = [
  entity('bravado-buffalo', 'vehiculos', 'Bravado Buffalo'),
  entity('bravado-buffalo-stx', 'vehiculos', 'Bravado Buffalo STX'),
  entity('invetero-coquette', 'vehiculos', 'Invetero Coquette'),
  entity('invetero-coquette-d10', 'vehiculos', 'Invetero Coquette D10'),
  entity('leonida', 'ubicaciones', 'Leonida'),
  entity('leonida-keys', 'ubicaciones', 'Leonida Keys'),
  entity('vice-city', 'ubicaciones', 'Vice City'),
  entity('vice-city-port', 'ubicaciones', 'Vice City Port'),
  entity('lucia-caminos', 'personajes', 'Lucia Caminos'),
  entity('roxy', 'personajes', 'Roxy'),
  entity('roxy', 'vehiculos', 'Roxy'),
]

function assertMatch(fileBaseName, index, expectedSlug, expectedConfidence) {
  const result = matchEntity(fileBaseName, index, null)
  assert.equal(result.status, 'match', `esperaba match para "${fileBaseName}", obtuve ${result.status}`)
  assert.equal(result.entity.slug, expectedSlug)
  if (expectedConfidence) assert.equal(result.confidence, expectedConfidence)
}

describe('matchEntity — casos de colisión confirmados en la auditoría', () => {
  test('bravado-buffalo.jpg -> bravado-buffalo (exact-slug)', () => {
    assertMatch('bravado-buffalo', BASE_INDEX, 'bravado-buffalo', 'exact-slug')
  })

  test('bravado-buffalo-stx.jpg -> bravado-buffalo-stx (exact-slug)', () => {
    assertMatch('bravado-buffalo-stx', BASE_INDEX, 'bravado-buffalo-stx', 'exact-slug')
  })

  test('bravado-buffalo-stx-lateral.jpg -> bravado-buffalo-stx (slug-prefix, caso que hoy puede fallar)', () => {
    assertMatch('bravado-buffalo-stx-lateral', BASE_INDEX, 'bravado-buffalo-stx', 'slug-prefix')
  })

  test('invetero-coquette-d10-01.jpg -> invetero-coquette-d10 (no invetero-coquette)', () => {
    assertMatch('invetero-coquette-d10-01', BASE_INDEX, 'invetero-coquette-d10', 'slug-prefix')
  })

  test('leonida-keys-mapa.jpg -> leonida-keys (no leonida)', () => {
    assertMatch('leonida-keys-mapa', BASE_INDEX, 'leonida-keys', 'slug-prefix')
  })

  test('vice-city-port-muelle.jpg -> vice-city-port (no vice-city)', () => {
    assertMatch('vice-city-port-muelle', BASE_INDEX, 'vice-city-port', 'slug-prefix')
  })

  test('leonida.jpg -> leonida exacto, sin ambigüedad con leonida-keys', () => {
    assertMatch('leonida', BASE_INDEX, 'leonida', 'exact-slug')
  })
})

describe('matchEntity — funcionalidad preservada (nombres tipo "Lucia Caminos 01.jpg")', () => {
  test('lucia-caminos-01.jpg -> lucia-caminos vía slug-prefix', () => {
    assertMatch('lucia-caminos-01', BASE_INDEX, 'lucia-caminos', 'slug-prefix')
  })

  test('"Lucia Caminos 01.jpg" normalizado -> lucia-caminos vía title-prefix cuando no hay slug-prefix', () => {
    // Índice sin el slug 'lucia-caminos' explícito en el nombre de archivo:
    // el título "Lucia Caminos" normalizado también debe matchear por prefijo.
    const index = [entity('protagonista-1', 'personajes', 'Lucia Caminos')]
    const result = matchEntity('Lucia Caminos 01', index, null)
    assert.equal(result.status, 'match')
    assert.equal(result.entity.slug, 'protagonista-1')
    assert.equal(result.confidence, 'title-prefix')
  })
})

describe('matchEntity — sin candidato', () => {
  test('archivo sin ninguna coincidencia -> status none (va a _sin-identificar/)', () => {
    const result = matchEntity('mi-foto-random', BASE_INDEX, null)
    assert.equal(result.status, 'none')
  })
})

describe('matchEntity — ambigüedad real: NUNCA debe asignarse silenciosamente', () => {
  test('slug-prefix: dos entidades de igual longitud, mismo prefijo, sin categoryHint -> ambiguous-match', () => {
    // 'roxy' está duplicado entre personajes y vehiculos en BASE_INDEX.
    const result = matchEntity('roxy-01', BASE_INDEX, null)
    assert.equal(result.status, 'ambiguous')
    assert.equal(result.tier, 'slug-prefix')
    assert.equal(result.candidates.length, 2)
    const types = result.candidates.map((c) => c.type).sort()
    assert.deepEqual(types, ['personajes', 'vehiculos'])
  })

  test('exact-slug: slug duplicado entre dos tipos, sin categoryHint, match exacto a ambos -> ambiguous-match', () => {
    const result = matchEntity('roxy', BASE_INDEX, null)
    assert.equal(result.status, 'ambiguous')
    assert.equal(result.tier, 'exact-slug')
    assert.equal(result.candidates.length, 2)
  })

  test('categoryHint desambigua un caso que sin hint sería ambiguo', () => {
    const result = matchEntity('roxy', BASE_INDEX, 'vehiculos')
    assert.equal(result.status, 'match')
    assert.equal(result.entity.type, 'vehiculos')
  })

  test('ambigüedad en slug-prefix NO cae a title-prefix (los tiers no se mezclan)', () => {
    // Dos entidades cuyo slug empata en longitud como prefijo de la misma
    // cadena; ninguna de las dos debería "salvarse" cayendo al tier de título.
    const index = [
      entity('foo-aa', 'personajes', 'Something Else A'),
      entity('foo-bb', 'vehiculos', 'Something Else B'),
    ]
    // 'foo-aa-bb' hace startsWith('foo-aa-') -> true (foo-aa) pero NO
    // startsWith('foo-bb-'), así que en realidad no hay ambigüedad acá.
    // Construimos un caso real de empate: dos slugs de igual longitud que
    // son AMBOS prefijo literal de la misma cadena solo puede pasar si son
    // el mismo string (demostrado en la auditoría) salvo cross-type con el
    // mismo slug, ya cubierto arriba. Este test documenta ese invariante.
    const result = matchEntity('foo-aa-anything', index, null)
    assert.equal(result.status, 'match')
    assert.equal(result.entity.slug, 'foo-aa')
  })
})

describe('resolveMatch — independencia del orden del índice', () => {
  const REVERSED_INDEX = [...BASE_INDEX].reverse()

  const cases = [
    ['bravado-buffalo', 'bravado-buffalo'],
    ['bravado-buffalo-stx', 'bravado-buffalo-stx'],
    ['bravado-buffalo-stx-lateral', 'bravado-buffalo-stx'],
    ['invetero-coquette-d10-01', 'invetero-coquette-d10'],
    ['leonida-keys-mapa', 'leonida-keys'],
    ['vice-city-port-muelle', 'vice-city-port'],
    ['leonida', 'leonida'],
  ]

  for (const [fileBaseName, expectedSlug] of cases) {
    test(`orden normal vs. invertido dan el mismo resultado para "${fileBaseName}"`, () => {
      const normResult = matchEntity(fileBaseName, BASE_INDEX, null)
      const revResult = matchEntity(fileBaseName, REVERSED_INDEX, null)
      assert.equal(normResult.status, 'match')
      assert.equal(revResult.status, 'match')
      assert.equal(normResult.entity.slug, expectedSlug)
      assert.equal(revResult.entity.slug, expectedSlug)
    })
  }

  test('un shuffle arbitrario del índice tampoco cambia el resultado', () => {
    const shuffled = [BASE_INDEX[3], BASE_INDEX[0], BASE_INDEX[7], BASE_INDEX[1], BASE_INDEX[5], BASE_INDEX[2], BASE_INDEX[6], BASE_INDEX[4], BASE_INDEX[8], BASE_INDEX[9], BASE_INDEX[10]]
    const result = matchEntity('bravado-buffalo-stx-lateral', shuffled, null)
    assert.equal(result.status, 'match')
    assert.equal(result.entity.slug, 'bravado-buffalo-stx')
  })
})

describe('resolveMatch — llamado directo (norm ya normalizado)', () => {
  test('normalize + resolveMatch da el mismo resultado que matchEntity', () => {
    const norm = normalize('vice-city-port-muelle')
    const viaResolve = resolveMatch(norm, BASE_INDEX, null)
    const viaMatchEntity = matchEntity('vice-city-port-muelle', BASE_INDEX, null)
    assert.deepEqual(viaResolve, viaMatchEntity)
  })
})
