import { Building, BuildingType, GameState, Tile, Unit, UnitType } from "../types";
import { eachUnit, tileAt, setTile } from "../state";

function nearestCommandCenter(gs: GameState, owner: "player"|"ai") {
  let best: Building | null = null, bestD = 1e9;
  for (const id of gs.buildings) {
    const b = gs.entities.get(id) as Building;
    if (b.owner !== owner || b.btype !== BuildingType.CommandCenter) continue;
    // use player base
    const d = 0;
    if (d < bestD) { best = b; bestD = d; }
  }
  return best;
}

export function stepEconomy(gs: GameState) {
  // harvest and deliver for workers
  eachUnit(gs, (u: Unit) => {
    if (u.utype !== UnitType.Worker) return;

    // if assigned a harvest tile and at that tile, harvest
    if (u.harvesting) {
      if (u.x === u.harvesting.tx && u.y === u.harvesting.ty) {
        // harvest 1 gold per 5 ticks
        if ((gs.tick % 5) === 0 && tileAt(gs, u.x, u.y) === Tile.Resource) {
          u.carrying = (u.carrying ?? 0) + 1;
          if ((u.carrying ?? 0) >= (u.carryMax ?? 20)) {
            // go deliver
            const cc = nearestCommandCenter(gs, u.owner);
            if (cc) u.moveTarget = { x: cc.x, y: cc.y + cc.size }; // crude drop spot
            u.harvesting = null;
          }
        }
      }
    } else {
      // delivering?
      const cc = nearestCommandCenter(gs, u.owner);
      if (cc && u.carrying && (Math.abs(u.x - cc.x) + Math.abs(u.y - (cc.y + cc.size))) <= 1) {
        gs.players[u.owner].gold += u.carrying;
        u.carrying = 0;
        // resume harvest if a resource is adjacent
      }
    }
  });

  // optional: resource depletion, small chance to remove a resource after harvest burst
  // Omitted for now to keep it simple
}
