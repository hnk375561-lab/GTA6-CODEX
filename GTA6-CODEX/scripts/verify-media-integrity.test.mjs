import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('el registro editorial de media pasa la verificación de integridad', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-media-integrity.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})
