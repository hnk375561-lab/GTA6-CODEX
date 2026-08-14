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
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { normalize, matchEntity, resolveMatch, loadEntityIndex, CATEGORIES, isValidSlug } from './process-images.mjs'

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

describe('isValidSlug — sanitización contra path traversal e inyección de path', () => {
  test('slugs válidos (lo que normalize() puede producir) se aceptan', () => {
    assert.equal(isValidSlug('lucia-caminos'), true)
    assert.equal(isValidSlug('bravado-buffalo-stx'), true)
    assert.equal(isValidSlug('a'), true)
    assert.equal(isValidSlug('a1-b2'), true)
  })

  test('path traversal (../) se rechaza', () => {
    assert.equal(isValidSlug('../../etc/passwd'), false)
    assert.equal(isValidSlug('..'), false)
    assert.equal(isValidSlug('foo/../bar'), false)
  })

  test('separadores de path se rechazan', () => {
    assert.equal(isValidSlug('foo/bar'), false)
    assert.equal(isValidSlug('foo\\bar'), false)
    assert.equal(isValidSlug('/etc/passwd'), false)
  })

  test('mayúsculas, espacios, guiones dobles/laterales y vacío se rechazan', () => {
    assert.equal(isValidSlug('Foo-Bar'), false)
    assert.equal(isValidSlug('foo bar'), false)
    assert.equal(isValidSlug('foo--bar'), false)
    assert.equal(isValidSlug('-foo'), false)
    assert.equal(isValidSlug('foo-'), false)
    assert.equal(isValidSlug(''), false)
  })

  test('tipos no-string (undefined, null, number) se rechazan sin tirar excepción', () => {
    assert.equal(isValidSlug(undefined), false)
    assert.equal(isValidSlug(null), false)
    assert.equal(isValidSlug(42), false)
  })
})

describe('loadEntityIndex — end-to-end: un slug con path traversal nunca entra al índice', () => {
  test('entidad con slug malicioso se excluye del índice; el resto del contenido se carga normalmente', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'process-images-slug-test-'))
    try {
      const contentDir = path.join(tmpRoot, 'src', 'content', 'personajes')
      fs.mkdirSync(contentDir, { recursive: true })

      // Entidad legítima
      fs.writeFileSync(
        path.join(contentDir, 'lucia.json'),
        JSON.stringify({ slug: 'lucia-caminos', type: 'personajes', title: 'Lucia Caminos' })
      )
      // Entidad con slug de path traversal — nunca debe poder usarse para
      // construir un destPath fuera de public/images/entities/
      fs.writeFileSync(
        path.join(contentDir, 'malicioso.json'),
        JSON.stringify({ slug: '../../../etc/evil', type: 'personajes', title: 'Evil' })
      )

      // loadEntityIndex() usa ROOT = process.cwd() capturado al importar el
      // módulo, así que se corre en un subproceso con cwd = tmpRoot para
      // que CONTENT_DIR apunte al fixture temporal.
      const result = spawnSyncNode(tmpRoot)
      assert.equal(result.status, 0, result.stderr)
      const index = JSON.parse(result.stdout)

      assert.equal(index.length, 1)
      assert.equal(index[0].slug, 'lucia-caminos')
      assert.ok(!index.some((e) => e.slug.includes('..')))
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('CATEGORIES — fuente única de verdad compartida con src/lib/images.ts', () => {
  test('CATEGORIES (script) coincide exactamente con entity-image-categories.json (usado por images.ts)', () => {
    const jsonPath = path.join(import.meta.dirname, '..', 'src', 'config', 'entity-image-categories.json')
    const fromJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    assert.deepEqual(CATEGORIES, fromJson)
  })
})

// --- helper para el test end-to-end de loadEntityIndex ---
function spawnSyncNode(cwd) {
  const scriptPath = path.join(import.meta.dirname, 'process-images.mjs')
  const inline = `
    import { loadEntityIndex } from ${JSON.stringify(scriptPath)}
    process.stdout.write(JSON.stringify(loadEntityIndex()))
  `
  return spawnSync(process.execPath, ['--input-type=module', '-e', inline], {
    cwd,
    encoding: 'utf-8',
  })
}
