"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInitialState,
  TICK_MS,
  worldToTile,
  tryPlaceBarracks,
  trainUnit,
  selectEntityAt,
  rightClickCommand,
} from "@/lib/game/state";
import type { GameState } from "@/lib/game/types";
import { UnitType, BuildingType } from "@/lib/game/types";
import { render } from "@/lib/game/renderer";
import { aiStep } from "@/lib/game/systems/ai_stub";

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gs, setGs] = useState<GameState>(() => createInitialState());
  const loopRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const [message, setMessage] = useState<string>("");

  // ----- Main game loop -----
  useEffect(() => {
    const tick = (ts: number) => {
      if (!lastTickRef.current) lastTickRef.current = ts;
      const dt = ts - lastTickRef.current;
      if (dt >= TICK_MS) {
        // AI + systems
        aiStep(gs);
        gs.systems.step(gs);

        // Draw
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) render(ctx, gs);

        lastTickRef.current = ts;
      }
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gs]);

  // ----- Canvas sizing without ResizeObserver feedback loops -----
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement!;
    let raf = 0;

    const setSize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      // Only write when values actually change to avoid reflow storms
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setSize();
      });
    };

    // Initial
    setSize();

    // Observe parent, throttle via rAF
    const ro = new ResizeObserver(schedule);
    ro.observe(parent);

    // Window size changes
    window.addEventListener("resize", schedule);

    // DPR changes (Safari/zoom)
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDprChange = schedule;
    mq.addEventListener?.("change", onDprChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      mq.removeEventListener?.("change", onDprChange);
    };
  }, []);

  // ----- Input handlers -----
  const onCanvasClick = (e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
    const tile = worldToTile(gs, x, y);
    if (!tile) return;

    if (gs.ui.mode === "placing-barracks") {
      const placed = tryPlaceBarracks(gs, tile.tx, tile.ty, "player");
      if (!placed.ok) setMessage(placed.msg);
      else setMessage("Barracks placed");
      gs.ui.mode = "default";
      return;
    }

    selectEntityAt(gs, tile.tx, tile.ty, "player");
  };

  const onCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
    const tile = worldToTile(gs, x, y);
    if (!tile) return;
    rightClickCommand(gs, tile.tx, tile.ty);
  };

  // ----- UI actions -----
  const onBuildBarracks = () => {
    gs.ui.mode = "placing-barracks";
    setMessage("Click a free 2×2 area to place Barracks");
  };

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

  // ----- Log submission on unload -----
  useEffect(() => {
    const handler = () => {
      try {
        const data = JSON.stringify(gs.logs.summary());
        navigator.sendBeacon("/api/submit-game", data);
      } catch {}
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [gs]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: "100dvh" }}>
      <div style={{ padding: 12, overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            background: "#0f0f12",
            imageRendering: "pixelated",
            display: "block",
            cursor: gs.ui.mode === "placing-barracks" ? "crosshair" : "default",
          }}
          onClick={onCanvasClick}
          onContextMenu={onCanvasContextMenu}
        />
      </div>

      <aside
        style={{
          borderLeft: "1px solid #222",
          padding: 12,
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Player</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onTrainWorker} title="Train a Worker at Command Center">
            Train Worker
          </button>
          <button onClick={onBuildBarracks} title="Place a Barracks (cost 100)">
            Build Barracks
          </button>
          <button onClick={onTrainMelee} title="Train Melee at Barracks">
            Train Melee
          </button>
          <button onClick={onTrainRanged} title="Train Ranged at Barracks">
            Train Ranged
          </button>
        </div>

        <div style={{ fontSize: 13, opacity: 0.9 }}>
          <p style={{ margin: "6px 0" }}>Gold: {gs.players.player.gold}</p>
          <p style={{ margin: "6px 0" }}>
            Selected: {gs.ui.selectedId ?? "none"} {gs.ui.mode === "placing-barracks" ? "(placing)" : ""}
          </p>
          <p style={{ margin: "6px 0", color: "#cfcfcf" }}>{message}</p>
          <p style={{ marginTop: 8 }}>
            Left click to select. Right click to move. Workers will harvest if you right click a resource tile.
          </p>
          <p>Win by destroying the enemy Command Center.</p>
        </div>

        <div style={{ alignSelf: "end", fontSize: 12, opacity: 0.6 }}>v0.1 prototype</div>
      </aside>
    </div>
  );
}
