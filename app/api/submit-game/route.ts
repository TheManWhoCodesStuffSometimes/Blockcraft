import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const expected = process.env.N8N_TOKEN;
    const body = await req.text(); // accept beacon body as text

    // Accept logs even without auth in dev, but require in prod if set
    const requireAuth = process.env.NODE_ENV === "production" && expected;
    if (requireAuth && token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = process.env.N8N_WEBHOOK_URL;
    if (url) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${expected}` },
        body,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: "n8n failed" }, { status: 502 });
      }
    } else {
      // fallback: just swallow
      console.log("Game log:", body.slice(0, 400));
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
