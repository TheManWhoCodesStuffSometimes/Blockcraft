"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialState, GameState, TICK_MS, tileAt, worldToTile, tryPlaceBarracks, trainUnit, selectEntityAt, rightClickCommand } from "@/lib/game/state";
import { render } from "@/lib/game/renderer";
import { UnitType, BuildingType } from "@/lib/game/types";
import { aiStep } from "@/lib/game/systems/ai_stub";

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gs, setGs] = useState<GameState>(() => createInitialState());
  const loopRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const [message, setMessage] = useState<string>("");

  // main loop
  useEffect(() => {
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      if (dt >= TICK_MS) {
        // step AI
        aiStep(gs);
        // step systems
        gs.systems.step(gs);
        // draw
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) render(ctx, gs);
        lastTsRef.current = ts;
      }
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gs]);

  // resize canvas according to CSS size
  useEffect(() => {
    const c = canvasRef.current!;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * devicePixelRatio);
      c.height = Math.floor(rect.height * devicePixelRatio);
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(c);
    return () => obs.disconnect();
  }, []);

  // mouse handlers
  const onCanvasClick = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) * devicePixelRatio;
    const y = (e.clientY - rect.top) * devicePixelRatio;
    const tile = worldToTile(gs, x, y);
    if (!tile) return;

    if (gs.ui.mode === "placing-barracks") {
      const placed = tryPlaceBarracks(gs, tile.tx, tile.ty, "player");
      if (!placed.ok) setMessage(placed.msg);
      else setMessage("Barracks placed");
      gs.ui.mode = "default";
    } else {
      selectEntityAt(gs, tile.tx, tile.ty, "player");
    }
  };

  const onCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) * devicePixelRatio;
    const y = (e.clientY - rect.top) * devicePixelRatio;
    const tile = worldToTile(gs, x, y);
    if (!tile) return;
    rightClickCommand(gs, tile.tx, tile.ty);
  };

  // buttons
  const onTrainWorker = () => {
    const res = trainUnit(gs, BuildingType.CommandCenter, UnitType.Worker, "player");
    setMessage(res.msg);
  };
  const onTrainMelee = () => {
    const res = trainUnit(gs, BuildingType.Barracks, UnitType.Melee, "player");
    setMessage(res.msg);
  };
  const onTrainRanged = () => {
    const res = trainUnit(gs, BuildingType.Barracks, UnitType.Ranged, "player");
    setMessage(res.msg);
  };
  const onBuildBarracks = () => {
    gs.ui.mode = "placing-barracks";
    setMessage("Click a free 2×2 area to place Barracks");
  };

  // submit match log at unload (simple)
  useEffect(() => {
    const handler = () => {
      navigator.sendBeacon("/api/submit-game", JSON.stringify(gs.logs.summary()));
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [gs]);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 280px",height:"100dvh"}}>
      <div style={{padding:12}}>
        <canvas
          ref={canvasRef}
          style={{width:"100%",height:"100%",background:"#0f0f12",imageRendering:"pixelated",cursor: gs.ui.mode==="placing-barracks" ? "crosshair" : "default"}}
          onClick={onCanvasClick}
          onContextMenu={onCanvasContextMenu}
        />
      </div>
      <aside style={{borderLeft:"1px solid #222",padding:12,display:"grid",gridTemplateRows:"auto auto 1fr auto",gap:12}}>
        <h3>Player</h3>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={onTrainWorker}>Train Worker</button>
          <button onClick={onBuildBarracks}>Build Barracks</button>
          <button onClick={onTrainMelee}>Train Melee</button>
          <button onClick={onTrainRanged}>Train Ranged</button>
        </div>
        <div style={{fontSize:13,opacity:.85}}>
          <p>Gold: {gs.players.player.gold}</p>
          <p>Selected: {gs.ui.selectedId ?? "none"} {gs.ui.mode==="placing-barracks" ? "(placing)" : ""}</p>
          <p style={{color:"#ccc"}}>{message}</p>
          <p style={{marginTop:8}}>Left click to select. Right click to move or harvest if a Worker and you right click a resource tile.</p>
          <p>Win by destroying the enemy Command Center.</p>
        </div>
        <div style={{alignSelf:"end",fontSize:12,opacity:.6}}>
          v0.1 prototype
        </div>
      </aside>
    </div>
  );
}
