export const GRID_W = 20;
export const GRID_H = 20;
export const TILE_SIZE = 24; // device pixels per tile at scale 1 (we scale to DPR)
export const TICKS_PER_SEC = 20;
export const TICK_MS = 1000 / TICKS_PER_SEC;

export type Owner = "player" | "ai";

export enum Tile {
  Empty = 0,
  Resource = 1,
  Blocked = 2, // buildings occupy tiles
}

export type Vec2 = { x: number; y: number };

export enum UnitType {
  Worker = "Worker",
  Melee = "Melee",
  Ranged = "Ranged",
}

export enum BuildingType {
  CommandCenter = "CommandCenter",
  Barracks = "Barracks",
}

export type EntityId = number;

export interface EntityBase {
  id: EntityId;
  owner: Owner;
  x: number; // tile coords
  y: number;
  hp: number;
  maxHp: number;
}

export interface Unit extends EntityBase {
  kind: "unit";
  utype: UnitType;
  speed: number; // tiles per second (we move at tile granularity per tick)
  attack: number;
  range: number; // in tiles (Manhattan)
  attackCooldown: number; // ticks left before next attack
  targetId?: EntityId;
  moveTarget?: { x: number; y: number };
  // worker only
  carrying?: number;
  carryMax?: number;
  harvesting?: { tx: number; ty: number } | null;
}

export interface Building extends EntityBase {
  kind: "building";
  btype: BuildingType;
  size: number; // tiles (square)
  queue: UnitType[];
  queueProgress: number; // ticks into current unit
}

export interface PlayerState {
  gold: number;
}

export interface UIState {
  selectedId: EntityId | null;
  mode: "default" | "placing-barracks";
}

export interface Logs {
  events: Array<{ t: number; type: string; payload: any }>;
  summary(): any;
}

export interface Systems {
  step(gs: GameState): void;
}

export interface GameState {
  tick: number;
  rng: () => number;
  tiles: Tile[]; // length GRID_W*GRID_H
  entities: Map<EntityId, Unit | Building>;
  units: Set<EntityId>;
  buildings: Set<EntityId>;
  nextId: number;
  players: Record<Owner, PlayerState>;
  ui: UIState;
  logs: Logs;
  systems: Systems;
}
