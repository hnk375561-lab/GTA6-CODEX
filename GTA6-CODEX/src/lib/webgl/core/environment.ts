/**
 * Environment map procedural (PMREM) para el motor AutoFicha WebGL.
 *
 * Extraído literalmente de `setupEnvironment()`, método privado de
 * `AutoFichaWebGLEngine` (ver `engine.ts`). Genera un gradiente de cielo
 * nocturno de Vice City (zenit añil, banda de horizonte en magenta, suelo
 * oscuro tibio) vía `PMREMGenerator` y lo aplica como `scene.environment`
 * — esto es lo que se ve reflejado/refractado en el vidrio de la torre
 * focal (`buildFocalTower`, sin tocar en esta fase).
 *
 * Es EXTRAÍBLE AHORA (bajo riesgo) porque no registra ningún updater en
 * `this.updaters` ni depende de estado que cambie cuadro a cuadro: recibe
 * `renderer`/`scene` una sola vez, en el constructor, y no vuelve a
 * ejecutarse. No hay nada acá que solo se pueda verificar corriendo el
 * motor en un navegador.
 */

import * as THREE from 'three'

/**
 * Proviene de `setupEnvironment` en `AutoFichaWebGLEngine`. Misma
 * secuencia: `PMREMGenerator` → escena auxiliar con esfera de gradiente →
 * `pmrem.fromScene()` → asignación a `scene.environment` → dispose del
 * generador y de la geometría/material auxiliares (solo existían para
 * alimentar el PMREM; ya renderizados, no hace falta retenerlos).
 *
 * Devuelve el `WebGLRenderTarget` resultante — el llamador es responsable
 * de guardarlo (`this.envRenderTarget`) para liberarlo más tarde en
 * `dispose()` (ver `disposeSceneResources` en `core/lifecycle.ts`).
 */
export function createEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  const envScene = new THREE.Scene()
  const gradientGeo = new THREE.SphereGeometry(30, 32, 32)
  const gradientMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      // Cielo nocturno de Vice City: zenit añil, banda de horizonte en
      // magenta (contaminación lumínica de la ciudad) y suelo oscuro
      // tibio — esto se ve reflejado/refractado en el vidrio de la torre.
      colorTop: { value: new THREE.Color(0x1c1140) },
      colorMid: { value: new THREE.Color(0xff3d78) },
      colorBottom: { value: new THREE.Color(0x0a0612) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 colorTop;
      uniform vec3 colorMid;
      uniform vec3 colorBottom;
      void main() {
        float h = normalize(vPos).y * 0.5 + 0.5;
        vec3 c = mix(colorBottom, colorMid, smoothstep(0.0, 0.5, h));
        c = mix(c, colorTop, smoothstep(0.5, 1.0, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  })
  envScene.add(new THREE.Mesh(gradientGeo, gradientMat))

  const renderTarget = pmrem.fromScene(envScene, 0.04)
  scene.environment = renderTarget.texture
  pmrem.dispose()

  // La geometría/material del paso de gradiente solo existían para
  // alimentar el PMREM; ya renderizados, no hace falta retenerlos.
  gradientGeo.dispose()
  gradientMat.dispose()

  return renderTarget
}
