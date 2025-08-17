import {
  Building,
  BuildingType,
  EntityId,
  GameState,
  GRID_H,
  GRID_W,
  Logs,
  Owner,
  Systems,
  Tile,
  TICK_MS,
  Unit,
  UnitType,
} from "./types";
import { stepEconomy } from "./systems/economy";
import { stepProduction } from "./systems/production";
import { stepCombatAndMovement } from "./systems/combat";

export { TICK_MS } from "./types";

function randSeeded(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xfffffff) / 0xfffffff;
  };
}

export function idx(x: number, y: number) {
  return y * GRID_W + x;
}

export function tileAt(gs: GameState, x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return Tile.Blocked;
  return gs.tiles[idx(x, y)];
}

export function setTile(gs: GameState, x: number, y: number, t: Tile) {
  gs.tiles[idx(x, y)] = t;
}

function spawnBuilding(
  gs: GameState,
  btype: BuildingType,
  owner: Owner,
  x: number,
  y: number
): Building {
  const id = gs.nextId++;
  const size = 2;
  const maxHp = btype === BuildingType.CommandCenter ? 600 : 400;
  const b: Building = {
    id,
    owner,
    x,
    y,
    hp: maxHp,
    maxHp,
    kind: "building",
    btype,
    size,
    queue: [],
    queueProgress: 0,
  };
  gs.entities.set(id, b);
  gs.buildings.add(id);
  // occupy tiles
  for (let dy = 0; dy < size; dy++)
    for (let dx = 0; dx < size; dx++) {
      setTile(gs, x + dx, y + dy, Tile.Blocked);
    }
  return b;
}

function spawnUnit(
  gs: GameState,
  utype: UnitType,
  owner: Owner,
  x: number,
  y: number
): Unit {
  const id = gs.nextId++;
  let hp = 0,
    atk = 0,
    range = 1,
    speed = 4;
  if (utype === UnitType.Worker) {
    hp = 60;
    atk = 2;
    range = 1;
    speed = 4;
  }
  if (utype === UnitType.Melee) {
    hp = 80;
    atk = 8;
    range = 1;
    speed = 5;
  }
  if (utype === UnitType.Ranged) {
    hp = 60;
    atk = 6;
    range = 3;
    speed = 4;
  }
  const u: Unit = {
    id,
    owner,
    x,
    y,
    hp,
    maxHp: hp,
    kind: "unit",
    utype,
    speed,
    attack: atk,
    range,
    attackCooldown: 0,
    carrying: utype === UnitType.Worker ? 0 : undefined,
    carryMax: utype === UnitType.Worker ? 20 : undefined,
    harvesting: null,
  };
  gs.entities.set(id, u);
  gs.units.add(id);
  return u;
}

export function spawnFromBuilding(
  gs: GameState,
  b: Building,
  utype: UnitType
) {
  // spawn adjacent if possible
  const spots = [
    { x: b.x + b.size, y: b.y },
    { x: b.x - 1, y: b.y },
    { x: b.x, y: b.y + b.size },
    { x: b.x, y: b.y - 1 },
  ];
  for (const s of spots) {
    if (s.x < 0 || s.y < 0 || s.x >= GRID_W || s.y >= GRID_H) continue;
    if (tileAt(gs, s.x, s.y) !== Tile.Empty) continue;
    const u = spawnUnit(gs, utype, b.owner, s.x, s.y);
    gs.logs.events.push({
      t: gs.tick,
      type: "spawn",
      payload: { owner: b.owner, utype, x: s.x, y: s.y },
    });
    return u;
  }
  return null;
}

export function createInitialState(): GameState {
  const rng = randSeeded(Math.floor(Math.random() * 1e9));
  const tiles = new Array(GRID_W * GRID_H).fill(Tile.Empty) as Tile[];
  const entities = new Map<EntityId, any>();
  const units = new Set<EntityId>();
  const buildings = new Set<EntityId>();
  const players: Record<Owner, any> = {
    player: { gold: 50 },
    ai: { gold: 50 },
  };
  const logs: Logs = {
    events: [],
    summary() {
      return {
        version: "0.1",
        events: this.events.slice(-500),
        gold: { player: players.player.gold, ai: players.ai.gold },
        tick: gs.tick,
      };
    },
  };
  const systems: Systems = {
    step(gs: GameState) {
      stepEconomy(gs);
      stepProduction(gs, spawnFromBuilding); // ✅ fixed here
      stepCombatAndMovement(gs);
      gs.tick++;
    },
  };
  const gs: GameState = {
    tick: 0,
    rng,
    tiles,
    entities,
    units,
    buildings,
    nextId: 1,
    players,
    ui: { selectedId: null, mode: "default" },
    logs,
    systems,
  };

  // scatter resources
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(rng() * GRID_W);
    const y = Math.floor(rng() * GRID_H);
    if ((x < 2 && y < 2) || (x > GRID_W - 4 && y > GRID_H - 4)) continue;
    if (tileAt(gs, x, y) === Tile.Empty) setTile(gs, x, y, Tile.Resource);
  }

  // bases
  spawnBuilding(gs, BuildingType.CommandCenter, "player", 1, GRID_H - 3);
  spawnBuilding(gs, BuildingType.CommandCenter, "ai", GRID_W - 3, 1);

  // start workers
  spawnUnit(gs, UnitType.Worker, "player", 3, GRID_H - 3);
  spawnUnit(gs, UnitType.Worker, "ai", GRID_W - 4, 3);

  return gs;
}

// --- UI Helpers ---

export function worldToTile(gs: GameState, wx: number, wy: number) {
  const tx = Math.floor(wx / 24);
  const ty = Math.floor(wy / 24);
  if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return null;
  return { tx, ty };
}

export function selectEntityAt(gs: GameState, tx: number, ty: number, owner: Owner) {
  let best: { id: number; d: number } | null = null;
  for (const id of gs.units) {
    const e = gs.entities.get(id)! as Unit;
    if (e.owner !== owner) continue;
    const d = Math.abs(e.x - tx) + Math.abs(e.y - ty);
    if (!best || d < best.d) best = { id: e.id, d };
  }
  for (const id of gs.buildings) {
    const b = gs.entities.get(id)! as Building;
    if (b.owner !== owner) continue;
    const within =
      tx >= b.x && tx < b.x + b.size && ty >= b.y && ty < b.y + b.size;
    if (within) {
      best = { id: b.id, d: 0 };
      break;
    }
  }
  gs.ui.selectedId = best ? best.id : null;
}

export function rightClickCommand(gs: GameState, tx: number, ty: number) {
  if (gs.ui.selectedId == null) return;
  const e = gs.entities.get(gs.ui.selectedId);
  if (!e || (e as any).kind !== "unit") return;
  const u = e as Unit;
  if (tileAt(gs, tx, ty) === Tile.Resource && u.utype === UnitType.Worker) {
    u.harvesting = { tx, ty };
    u.moveTarget = { x: tx, y: ty };
    return;
  }
  u.harvesting = null;
  u.moveTarget = { x: tx, y: ty };
}

export function tryPlaceBarracks(gs: GameState, tx: number, ty: number, owner: Owner) {
  const p = gs.players[owner];
  if (p.gold < 100) return { ok: false, msg: "Not enough gold (need 100)" };
  if (tx + 1 >= GRID_W || ty + 1 >= GRID_H)
    return { ok: false, msg: "Out of bounds" };
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      const t = tileAt(gs, tx + dx, ty + dy);
      if (t !== Tile.Empty) return { ok: false, msg: "Space blocked" };
    }
  spawnBuilding(gs, BuildingType.Barracks, owner, tx, ty);
  p.gold -= 100;
  gs.logs.events.push({
    t: gs.tick,
    type: "place_barracks",
    payload: { owner, tx, ty },
  });
  return { ok: true, msg: "Barracks placed" };
}

export function trainUnit(
  gs: GameState,
  buildingType: BuildingType,
  utype: UnitType,
  owner: Owner
) {
  const cost = utype === UnitType.Worker ? 50 : utype === UnitType.Melee ? 30 : 40;
  const p = gs.players[owner];
  if (p.gold < cost) return { ok: false, msg: "Not enough gold" };

  const b = [...gs.buildings]
    .map((id) => gs.entities.get(id) as Building)
    .find((b) => b.owner === owner && b.btype === buildingType);
  if (!b) return { ok: false, msg: `Need ${buildingType}` };

  b.queue.push(utype);
  p.gold -= cost;
  gs.logs.events.push({
    t: gs.tick,
    type: "queue",
    payload: { owner, building: buildingType, utype },
  });
  return { ok: true, msg: `${utype} queued` };
}

// iteration helpers
export function eachUnit(gs: GameState, fn: (u: Unit) => void) {
  for (const id of gs.units) {
    const u = gs.entities.get(id) as Unit;
    if (u) fn(u);
  }
}
export function eachBuilding(gs: GameState, fn: (b: Building) => void) {
  for (const id of gs.buildings) {
    const b = gs.entities.get(id) as Building;
    if (b) fn(b);
  }
}
