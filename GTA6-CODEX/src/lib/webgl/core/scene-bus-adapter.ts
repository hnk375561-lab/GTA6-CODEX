/**
 * Scene Bus Integration Layer
 *
 * Pure function for transforming scene-bus snapshot data into engine state updates.
 * This module handles the adaptation layer between the UI-driven scene bus events
 * and the internal animation state of the engine.
 *
 * The actual subscription and callback registration remain in engine.ts;
 * this module provides only the pure transformation logic.
 */

import type { SceneFocus, EntityAtmosphere } from '../scene-bus'
import { SECTION_MOOD, CATEGORY_WARMTH, STATUS_UNREST, CATEGORY_PACE, CATEGORY_FRAME } from '../config/scene'

/**
 * Subset of scene-bus snapshot relevant to engine state.
 * (The full snapshot has more fields; we use only these.)
 */
export interface SceneBusSnapshot {
  focus: SceneFocus
  pointerIntent: number
  entityAtmosphere: EntityAtmosphere | null
}

/**
 * Complete state update derived from a scene-bus snapshot.
 * All fields are mandatory — consumers assign directly: Object.assign(this, update)
 */
export interface SceneBusStateUpdate {
  sceneFocus: SceneFocus
  pointerIntentTarget: number
  sceneMoodTarget: number
  arrivalKick: number
  entityAtmosphere: EntityAtmosphere | null
  entityWarmthTarget: number
  entityUnrestTarget: number
  entityPresenceTarget: number
  entityPaceTarget: number
  entityFrameTarget: number
}

/**
 * Compute engine state updates from a scene-bus snapshot.
 *
 * This is a pure function that replicates the logic from the sceneBus.subscribe()
 * callback in engine.ts constructor. It derives:
 *  - sceneFocus: copied from snapshot.focus
 *  - pointerIntentTarget: copied from snapshot.pointerIntent
 *  - sceneMoodTarget: looked up from SECTION_MOOD table if a section is active,
 *    else retained from previous value
 *  - arrivalKick: set to 1 if entering a new section (and not reduced motion), else 0
 *  - entityAtmosphere: copied from snapshot
 *  - entityWarmth/Unrest/Presence/Pace/Frame targets: derived from entityAtmosphere
 *    via category/status lookups in CATEGORY_* and STATUS_* tables
 *
 * @param snapshot Scene-bus snapshot (subset: focus, pointerIntent, entityAtmosphere)
 * @param previousSceneFocus Last known sceneFocus (to detect section entry)
 * @param currentSceneMoodTarget Current sceneMoodTarget (retained if no section active)
 * @param reducedMotion Whether reduced motion is enabled (suppresses arrivalKick)
 * @returns Complete state update object
 */
export function computeSceneBusStateUpdate(
  snapshot: SceneBusSnapshot,
  previousSceneFocus: SceneFocus,
  currentSceneMoodTarget: number,
  reducedMotion: boolean
): SceneBusStateUpdate {
  // Detect entry into a new section (sectionId changed)
  const enteringNewSection =
    snapshot.focus.sectionId !== null && snapshot.focus.sectionId !== previousSceneFocus.sectionId

  // Scene mood: lookup if entering a section and progress is sufficient,
  // else retain previous value
  let sceneMoodTarget = currentSceneMoodTarget
  if (snapshot.focus.sectionId && snapshot.focus.progress > 0.35) {
    sceneMoodTarget = SECTION_MOOD[snapshot.focus.sectionId] ?? currentSceneMoodTarget
  }

  // Arrival kick: pulse of light when entering a new section (unless reduced motion)
  const arrivalKick = enteringNewSection && !reducedMotion ? 1 : 0

  // Entity atmosphere transforms
  const entityWarmthTarget = snapshot.entityAtmosphere
    ? CATEGORY_WARMTH[snapshot.entityAtmosphere.category] ?? 0
    : 0

  const entityUnrestTarget = snapshot.entityAtmosphere
    ? STATUS_UNREST[snapshot.entityAtmosphere.status] ?? 0
    : 0

  const entityPresenceTarget = snapshot.entityAtmosphere?.featured ? 1 : 0

  const entityPaceTarget = snapshot.entityAtmosphere
    ? CATEGORY_PACE[snapshot.entityAtmosphere.category] ?? 1
    : 1

  const entityFrameTarget = snapshot.entityAtmosphere
    ? CATEGORY_FRAME[snapshot.entityAtmosphere.category] ?? 0
    : 0

  return {
    sceneFocus: snapshot.focus,
    pointerIntentTarget: snapshot.pointerIntent,
    sceneMoodTarget,
    arrivalKick,
    entityAtmosphere: snapshot.entityAtmosphere,
    entityWarmthTarget,
    entityUnrestTarget,
    entityPresenceTarget,
    entityPaceTarget,
    entityFrameTarget,
  }
}
