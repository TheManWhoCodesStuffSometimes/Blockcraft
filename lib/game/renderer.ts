import { Building, BuildingType, GameState, GRID_H, GRID_W, TILE_SIZE, Tile, Unit, UnitType } from "./types";

function colorForTile(t: Tile) {
  switch (t) {
    case Tile.Empty: return "#0f0f12";
    case Tile.Resource: return "#9d7c0a";
    case Tile.Blocked: return "#22262c";
  }
}

function colorForUnit(u: Unit) {
  const base = u.owner === "player" ? "#5bc0eb" : "#f25f5c";
  if (u.utype === UnitType.Worker) return base;
  if (u.utype === UnitType.Melee) return base;
  if (u.utype === UnitType.Ranged) return base;
  return base;
}

function colorForBuilding(b: Building) {
  if (b.btype === BuildingType.CommandCenter) return b.owner === "player" ? "#3cb371" : "#8b0000";
  if (b.btype === BuildingType.Barracks) return b.owner === "player" ? "#2e8b57" : "#b22222";
  return "#555";
}

export function render(ctx: CanvasRenderingContext2D, gs: GameState) {
  const w = GRID_W * TILE_SIZE;
  const h = GRID_H * TILE_SIZE;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // center the board
  const scale = Math.min(ctx.canvas.width / w, ctx.canvas.height / h);
  ctx.save();
  ctx.translate((ctx.canvas.width - w * scale) / 2, (ctx.canvas.height - h * scale) / 2);
  ctx.scale(scale, scale);

  // tiles
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      ctx.fillStyle = colorForTile(gs.tiles[y * GRID_W + x]);
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE_SIZE + 0.5, 0);
    ctx.lineTo(x * TILE_SIZE + 0.5, GRID_H * TILE_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE_SIZE + 0.5);
    ctx.lineTo(GRID_W * TILE_SIZE, y * TILE_SIZE + 0.5);
    ctx.stroke();
  }

  // buildings
  gs.buildings.forEach(id => {
    const b = gs.entities.get(id) as Building;
    ctx.fillStyle = colorForBuilding(b);
    ctx.fillRect(b.x * TILE_SIZE, b.y * TILE_SIZE, b.size * TILE_SIZE, b.size * TILE_SIZE);
    // hp bar
    const hpw = Math.max(0, Math.floor((b.hp / b.maxHp) * b.size * TILE_SIZE));
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(b.x * TILE_SIZE, b.y * TILE_SIZE - 3, hpw, 3);
    // queue dots
    if (b.queue.length) {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < Math.min(4, b.queue.length); i++) {
        ctx.fillRect(b.x * TILE_SIZE + 2 + i * 5, b.y * TILE_SIZE + b.size * TILE_SIZE - 6, 3, 3);
      }
    }
  });

  // units
  gs.units.forEach(id => {
    const u = gs.entities.get(id) as Unit;
    ctx.fillStyle = colorForUnit(u);
    ctx.fillRect(u.x * TILE_SIZE + 6, u.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    // hp bar
    const hpw = Math.max(0, Math.floor((u.hp / u.maxHp) * (TILE_SIZE - 12)));
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(u.x * TILE_SIZE + 6, u.y * TILE_SIZE + 4, hpw, 2);
    // selection outline
    if (gs.ui.selectedId === u.id) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(u.x * TILE_SIZE + 5.5, u.y * TILE_SIZE + 5.5, TILE_SIZE - 11, TILE_SIZE - 11);
    }
  });

  ctx.restore();
}
