/**
 * Constants extracted from engine.ts for better organization.
 * Pure constants and configuration data with no dependencies.
 */

import * as THREE from 'three'

export interface CameraShot {
  pos: THREE.Vector3
  look: THREE.Vector3
  fovBias: number
  duration: number
}

export const SHOTS: CameraShot[] = [
  { pos: new THREE.Vector3(0, 0.4, 25), look: new THREE.Vector3(-3.2, 0.8, -1), fovBias: 0, duration: 16 },
  { pos: new THREE.Vector3(7, -1.6, 22), look: new THREE.Vector3(-3.2, 1.2, -2.5), fovBias: 3, duration: 15 },
  { pos: new THREE.Vector3(-6.5, 2.2, 23), look: new THREE.Vector3(-1.5, -0.4, -3), fovBias: -2, duration: 17 },
  { pos: new THREE.Vector3(2.5, 3.8, 20), look: new THREE.Vector3(-4.5, 0.2, -4), fovBias: 1.5, duration: 14 },
]

export const FALLBACK_SHOT: CameraShot = {
  pos: new THREE.Vector3(0, 0.4, 25),
  look: new THREE.Vector3(0, 0, 0),
  fovBias: 0,
  duration: 1,
}

export const ROAD_DASH_PERIOD = 6.6
export const ROAD_FLOW_WRAP = ROAD_DASH_PERIOD * 100000

export interface ImageBillboardConfig {
  key: string
  path: string
  width: number
  height: number
  color: number
  radius: number
  baseY: number
  speed: number
  phase: number
  parallax: number
}

export const IMAGE_BILLBOARDS: readonly ImageBillboardConfig[] = [
  {
    key: 'gta6-boxart',
    path: '/images/heroes/hero-gta6-boxart-sunset.webp',
    width: 3.4,
    height: 1.91,
    color: 0xff2d78,
    radius: 5.2,
    baseY: 1.6,
    speed: 0.05,
    phase: 0,
    parallax: 1,
  },
  {
    key: 'port-gellhorn',
    path: '/images/heroes/hero-port-gellhorn-postcard.webp',
    width: 2.6,
    height: 1.1,
    color: 0x22d3ee,
    radius: 6.6,
    baseY: -0.8,
    speed: 0.038,
    phase: 1.9,
    parallax: 0.6,
  },
  {
    key: 'real-dimez',
    path: '/images/entities/personajes/real-dimez.webp',
    width: 2.05,
    height: 1.1,
    color: 0xff2d78,
    radius: 4.5,
    baseY: -1.9,
    speed: 0.062,
    phase: 3.3,
    parallax: 0.85,
  },
  {
    key: 'boobie-ike',
    path: '/images/entities/personajes/boobie-ike.webp',
    width: 1.95,
    height: 1.1,
    color: 0x22d3ee,
    radius: 4.9,
    baseY: 2.7,
    speed: 0.056,
    phase: 4.6,
    parallax: 0.7,
  },
] as const

export const SECTION_MOOD: Record<string, number> = {
  hero: 0,
  stats: 0.15,
  featured: 0.35,
  categories: 0.55,
  about: 0.8,
  'entity-header': 0,
  'entity-content': 0.5,
}

export const CATEGORY_WARMTH: Record<string, number> = {
  personajes: 0.6,
  organizaciones: 0.4,
  negocios: 0.15,
  vehiculos: -0.5,
  ubicaciones: -0.3,
}

export const STATUS_UNREST: Record<string, number> = {
  confirmado: 0,
  rumor: 0.6,
  nuestro: 0.22,
}

export const CATEGORY_PACE: Record<string, number> = {
  personajes: 0.75,
  organizaciones: 0.6,
  negocios: 1,
  vehiculos: 1.85,
  ubicaciones: 0.45,
}

export const CATEGORY_FRAME: Record<string, number> = {
  personajes: -1.2,
  organizaciones: 0.55,
  negocios: 0.15,
  vehiculos: -0.35,
  ubicaciones: 1.6,
}
