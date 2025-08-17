export default function Home() {
  return (
    <main style={{display:"grid",placeItems:"center",height:"100dvh",gap:16}}>
      <h1>Blockcraft Tactics</h1>
      <a href="/game" style={{padding:"12px 16px",border:"1px solid #333",borderRadius:8}}>
        Start Game
      </a>
      <p style={{opacity:.7,fontSize:14}}>
        Minimal prototype: 20×20 grid, resources, CC + Barracks, Worker/Melee/Ranged, simple AI
      </p>
    </main>
  );
}
