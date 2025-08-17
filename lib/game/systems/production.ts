import { Building, GameState, UnitType } from "../types";
import { eachBuilding, spawnFromBuilding } from "../state";

export function stepProduction(gs: GameState, spawnUnitFn: typeof spawnFromBuilding) {
  eachBuilding(gs, (b: Building) => {
    if (b.queue.length === 0) return;
    const current = b.queue[0];

    // train time per type
    const time = current === UnitType.Worker ? 60 : current === UnitType.Melee ? 40 : 50; // ticks
    b.queueProgress++;

    if (b.queueProgress >= time) {
      const spawned = spawnUnitFn(gs, b, current);
      if (spawned) {
        // for AI convenience: if unit is combat unit and owner is ai, give it a crude attack rally
        if (spawned.owner === "ai" && (spawned.utype === UnitType.Melee || spawned.utype === UnitType.Ranged)) {
          spawned.moveTarget = { x: 2, y: 18 }; // toward player base
        }
        b.queue.shift();
        b.queueProgress = 0;
      } else {
        // cannot spawn now, wait
        b.queueProgress = time; // hold at ready
      }
    }
  });
}
