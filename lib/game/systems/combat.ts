import { Building, EntityId, GameState, GRID_H, GRID_W, Tile, Unit } from "../types";
import { eachUnit, tileAt, setTile, eachBuilding } from "../state";

function manhattan(a: {x:number;y:number}, b:{x:number;y:number}) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function canWalk(gs: GameState, x:number, y:number) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
  const t = tileAt(gs, x, y);
  return t !== Tile.Blocked;
}

function stepMovement(gs: GameState, u: Unit) {
  if (!u.moveTarget) return;
  const dx = Math.sign(u.moveTarget.x - u.x);
  const dy = Math.sign(u.moveTarget.y - u.y);
  // simple axis-priority
  const try1 = { x: u.x + dx, y: u.y };
  const try2 = { x: u.x, y: u.y + dy };
  const options = Math.abs(u.moveTarget.x - u.x) >= Math.abs(u.moveTarget.y - u.y) ? [try1, try2] : [try2, try1];

  for (const t of options) {
    if (canWalk(gs, t.x, t.y)) {
      u.x = t.x; u.y = t.y;
      break;
    }
  }
  if (u.x === u.moveTarget.x && u.y === u.moveTarget.y) u.moveTarget = undefined;
}

function findTargets(gs: GameState, u: Unit): EntityId | undefined {
  // find nearest enemy unit or building
  let best: { id: EntityId; d: number } | null = null;
  for (const id of gs.units) {
    const e = gs.entities.get(id) as Unit;
    if (!e || e.owner === u.owner) continue;
    const d = manhattan(u, e);
    if (!best || d < best.d) best = { id: id, d };
  }
  for (const id of gs.buildings) {
    const b = gs.entities.get(id) as Building;
    if (!b || b.owner === u.owner) continue;
    const center = { x: b.x + 1, y: b.y + 1 };
    const d = manhattan(u, center);
    if (!best || d < best.d) best = { id: id, d };
  }
  return best?.id;
}

export function stepCombatAndMovement(gs: GameState) {
  // movement
  for (const id of gs.units) {
    const u = gs.entities.get(id) as Unit;
    stepMovement(gs, u);
  }

  // target selection and attacks
  for (const id of gs.units) {
    const u = gs.entities.get(id) as Unit;
    if (u.attackCooldown > 0) u.attackCooldown--;

    const tid = findTargets(gs, u);
    if (!tid) continue;
    const t = gs.entities.get(tid) as Unit | Building;
    const tx = (t as any).x;
    const ty = (t as any).y;
    const d = Math.abs(u.x - tx) + Math.abs(u.y - ty);

    if (d <= u.range) {
      if (u.attackCooldown === 0) {
        (t as any).hp -= u.attack;
        u.attackCooldown = 10;
        if ((t as any).hp <= 0) {
          // destroy target
          if ((t as any).kind === "unit") {
            gs.units.delete((t as any).id);
            gs.entities.delete((t as any).id);
          } else {
            const b = t as Building;
            // free tiles
            for (let dy = 0; dy < b.size; dy++) for (let dx = 0; dx < b.size; dx++) {
              setTile(gs, b.x + dx, b.y + dy, Tile.Empty);
            }
            gs.buildings.delete(b.id);
            gs.entities.delete(b.id);
          }
        }
      }
    } else {
      // move toward target if we have no explicit move order
      if (!u.moveTarget) u.moveTarget = { x: tx, y: ty };
    }
  }
}
