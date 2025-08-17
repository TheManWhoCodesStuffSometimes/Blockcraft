import { Building, BuildingType, GameState, UnitType } from "../types";
import { trainUnit, tryPlaceBarracks } from "../state";

function findBuilding(gs: GameState, owner: "player"|"ai", type: BuildingType): Building | undefined {
  for (const id of gs.buildings) {
    const b = gs.entities.get(id) as Building;
    if (b.owner === owner && b.btype === type) return b;
  }
  return undefined;
}

export function aiStep(gs: GameState) {
  // run every 10 ticks
  if (gs.tick % 10 !== 0) return;
  const p = gs.players.ai;

  const cc = findBuilding(gs, "ai", BuildingType.CommandCenter);
  const barracks = findBuilding(gs, "ai", BuildingType.Barracks);

  // early game: get a second worker
  if (cc && p.gold >= 50 && Math.random() < 0.2) {
    trainUnit(gs, BuildingType.CommandCenter, UnitType.Worker, "ai");
  }

  // build barracks when enough gold
  if (!barracks && p.gold >= 100) {
    // try place near CC
    if (cc) {
      const tx = Math.max(0, Math.min(cc.x - 2,  GRID_W - 2));
      const ty = Math.max(0, Math.min(cc.y + 2,  GRID_H - 2));
      tryPlaceBarracks(gs, tx, ty, "ai");
    }
  }

  // if we have barracks, train melee or ranged
  if (barracks && p.gold >= 30) {
    const pick = Math.random() < 0.6 ? UnitType.Melee : UnitType.Ranged;
    trainUnit(gs, BuildingType.Barracks, pick, "ai");
  }
}
