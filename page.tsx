 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, BrainCircuit, PanelsTopLeft as Cards, CircleDollarSign, Dices, Eye, EyeOff, FlaskConical, History, Layers, Play, RotateCcw, ShieldCheck, Shuffle, Upload, ImagePlus, Pause, ScanLine, CheckCircle2 } from "lucide-react";

type Card = { rank: string; suit: string; value: number };
type Outcome = "Player" | "Banker" | "Tie";
type Hand = {
  id: number; player: Card[]; banker: Card[]; pTotal: number; bTotal: number;
  outcome: Outcome; profit: number; balance: number; cardsRemaining: number; source: "Simulated" | "Manual" | "Screenshot";
};
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = ["♠","♥","♦","♣"];
const cardValue = (rank: string) => rank === "A" ? 1 : ["10","J","Q","K"].includes(rank) ? 0 : Number(rank);
const total = (cards: Card[]) => cards.reduce((s,c) => s + c.value, 0) % 10;
const fmt = (c: Card) => `${c.rank}${c.suit}`;
function makeShoe(decks = 8, seed?: number) {
  const shoe: Card[] = [];
  for (let d=0; d<decks; d++) for (const suit of suits) for (const rank of ranks) shoe.push({rank,suit,value:cardValue(rank)});
  let state = (seed ?? Math.floor(Math.random()*0xffffffff)) >>> 0;
  const rand = () => { state = (Math.imul(state,1664525)+1013904223) >>> 0; return state / 4294967296; };
  for (let i=shoe.length-1; i>0; i--) { const j=Math.floor(rand()*(i+1)); [shoe[i],shoe[j]]=[shoe[j],shoe[i]]; }
  return shoe;
}
function dealHand(shoe: Card[], pos: number, id: number, stake: number, balance: number): Hand | null {
  if (shoe.length-pos < 6) return null;
  let cursor = pos;
  const take = () => shoe[cursor++];
  const p = [take(), take()];
  const b = [take(), take()];
  let pt = total(p), bt = total(b);
  if (pt < 8 && bt < 8) {
    if (pt <= 5) p.push(take());
    pt = total(p);
    const p3 = p.length === 3 ? p[2].value : null;
    bt = total(b);
    let drawB = false;
    if (p3 === null) drawB = bt <= 5;
    else if (bt <= 2) drawB = true;
    else if (bt === 3) drawB = p3 !== 8;
    else if (bt === 4) drawB = p3 >= 2 && p3 <= 7;
    else if (bt === 5) drawB = p3 >= 4 && p3 <= 7;
    else if (bt === 6) drawB = p3 === 6 || p3 === 7;
    if (drawB) b.push(take());
    pt = total(p); bt = total(b);
  }
  const outcome: Outcome = pt > bt ? "Player" : bt > pt ? "Banker" : "Tie";
  const profit = outcome === "Tie" ? 0 : outcome === "Player" ? -stake : bt === 6 ? stake/2 : stake;
  return {id,player:p,banker:b,pTotal:pt,bTotal:bt,outcome,profit,balance:balance+profit,cardsRemaining:shoe.length-cursor,source:"Simulated"};
}
const money = (n: number) => `LKR ${n.toLocaleString("en-US",{maximumFractionDigits:2})}`;
function CardTile({card}:{card:Card}) {
  const red = card.suit === "♥" || card.suit === "♦";
  return <span className={`playing-card ${red?"red":""}`}><b>{card.rank}</b><span>{card.suit}</span></span>;
}


// Screenshot road scanner: finds connected clusters of common Player-blue, Banker-red,
// and Tie-green pixels. It proposes results for review; it is not guaranteed OCR.
function scanRoadImage(file: File): Promise<{outcomes: Outcome[]; preview: string; message: string}> {
  return new Promise((resolve,reject)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxWidth = 1000;
        const scale = Math.min(1,maxWidth/img.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height = Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx = canvas.getContext("2d",{willReadFrequently:true});
        if(!ctx) throw new Error("Could not read screenshot pixels in this browser.");
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
        const w=canvas.width,h=canvas.height;
        const labels=new Int8Array(w*h);
        for(let i=0;i<w*h;i++){
          const p=i*4,r=data[p],g=data[p+1],b=data[p+2];
          // Ignore near-gray and dark backgrounds; use saturated road marker colors.
          if(b>105 && b>r*1.22 && b>g*1.03 && r<110) labels[i]=1; // Player blue
          else if(r>130 && r>g*1.35 && r>b*1.25 && g<125) labels[i]=2; // Banker red
          else if(g>100 && g>r*1.12 && g>b*1.04 && r<145) labels[i]=3; // Tie green
        }
        const seen=new Uint8Array(w*h), components:{color:number;x:number;y:number;area:number;minX:number;maxX:number;minY:number;maxY:number}[]=[];
        const queue:number[]=[];
        for(let i=0;i<labels.length;i++){
          if(!labels[i]||seen[i]) continue;
          const color=labels[i]; queue.length=0;queue.push(i);seen[i]=1;
          let head=0,minX=w,maxX=0,minY=h,maxY=0,area=0,sumX=0,sumY=0;
          while(head<queue.length){
            const q=queue[head++],x=q%w,y=Math.floor(q/w);area++;sumX+=x;sumY+=y;
            minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
            const ns=[x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1];
            for(const n of ns) if(n>=0&&!seen[n]&&labels[n]===color){seen[n]=1;queue.push(n);}
          }
          const bw=maxX-minX+1,bh=maxY-minY+1;
          // Filter tiny speckles and large UI panels; road markers are roughly compact.
          if(area>=18 && area<=1800 && bw>=5 && bh>=5 && bw<=70 && bh<=70 && bw/bh>.45 && bw/bh<2.2)
            components.push({color,x:sumX/area,y:sumY/area,area,minX,maxX,minY,maxY});
        }
        // Road marker candidates usually form compact similarly-sized colored clusters.
        const filtered=components.filter(c=>c.area>=28 && c.area<=1100);
        filtered.sort((a,b)=>a.x-b.x || a.y-b.y);
        const outcomes=filtered.map(c=>c.color===1?"Player":c.color===2?"Banker":"Tie") as Outcome[];
        const preview=canvas.toDataURL("image/jpeg",.82);
        resolve({outcomes,preview,message:outcomes.length
          ? `Detected ${outcomes.length} possible colored road markers. Review and remove any false detections before importing.`
          : "No clear road markers detected. Try a tighter screenshot crop or enter P, B, T manually."});
      } catch(e){reject(e)} finally {URL.revokeObjectURL(url);}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not open this image."))};
    img.src=url;
  });
}

export default function Home() {
  const [tab,setTab] = useState("Table");
  const [stake,setStake] = useState(1000);
  const [starting,setStarting] = useState(100000);
  const [balance,setBalance] = useState(100000);
  const [decks,setDecks] = useState(8);
  const [shoe,setShoe] = useState<Card[]>([]);
  const [pos,setPos] = useState(0);
  const [hands,setHands] = useState<Hand[]>([]);
  const [hydrated,setHydrated] = useState(false);
  const [bet,setBet] = useState<"Banker"|"Player"|"Observe">("Banker");
  const [strategy,setStrategy] = useState("Flat stake");
  const [hideBalances,setHideBalances] = useState(false);
  const [seed,setSeed] = useState("20261016");
  const [manual,setManual] = useState("");
  const [notice,setNotice] = useState("");
  const [showAll,setShowAll] = useState(false);
  const [autoRun,setAutoRun] = useState(false);
  const [screenshotPreview,setScreenshotPreview] = useState("");
  const [screenshotName,setScreenshotName] = useState("");
  const [pendingScreenshot,setPendingScreenshot] = useState<Outcome[]>([]);
  const [scanMessage,setScanMessage] = useState("");
  const fileInput = useRef<HTMLInputElement|null>(null);
  // Keep the session on this device between refreshes. No server or account sync.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("baccarat-lab-session-v2");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.hands)) setHands(saved.hands);
        if (typeof saved.starting === "number") setStarting(saved.starting);
        if (typeof saved.balance === "number") setBalance(saved.balance);
        if (Array.isArray(saved.shoe)) setShoe(saved.shoe);
        if (typeof saved.pos === "number") setPos(saved.pos);
        if (typeof saved.stake === "number") setStake(saved.stake);
        if (typeof saved.seed === "string") setSeed(saved.seed);
        if (typeof saved.decks === "number") setDecks(saved.decks);
      }
    } catch { /* Ignore malformed or unavailable browser storage. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem("baccarat-lab-session-v2", JSON.stringify({hands,starting,balance,shoe,pos,stake,seed,decks})); }
    catch { setNotice("Browser storage is full or unavailable; export your history before closing this tab."); }
  }, [hydrated,hands,starting,balance,shoe,pos,stake,seed,decks]);
  const initShoe = () => { setShoe(makeShoe(decks, Number(seed)||20261016)); setPos(0); setHands([]); setBalance(starting); setNotice("New virtual shoe created. No live table connection."); };
  const deal = () => {
    let activeShoe = shoe;
    if (!activeShoe.length || activeShoe.length-pos < 6) {
      activeShoe = makeShoe(decks, (Number(seed)||20261016) + hands.length + 1);
      setShoe(activeShoe); setPos(0);
      setNotice("Virtual shoe reshuffled at the cut-off. Session ledger and bankroll preserved.");
      return;
    }
    const consecutiveLosses = [...hands].reverse().findIndex(h=>h.source!=="Manual" && h.profit>=0);
    const lossRun = consecutiveLosses===-1 ? hands.filter(h=>h.source!=="Manual").length : consecutiveLosses;
    const stakeNow = strategy === "Martingale (demo)" ? Math.min(stake * Math.pow(2, Math.min(10,lossRun)), Math.max(0,balance)) : Math.min(stake,Math.max(0,balance));
    const h = dealHand(activeShoe,pos,hands.length+1,bet==="Observe"?0:stakeNow,balance);
    if (!h) { setNotice("Shoe is near its end. Start a new shoe to continue."); return; }
    let adjusted = h;
    if (bet === "Observe") {
      adjusted = {...h,profit:0,balance};
    } else {
      const profit = h.outcome === "Tie" ? 0 :
        bet === "Banker" ? (h.outcome === "Banker" ? (h.bTotal === 6 ? stakeNow/2 : stakeNow) : -stakeNow) :
        (h.outcome === "Player" ? stakeNow : -stakeNow);
      adjusted = {...h,profit,balance:balance+profit};
    }
    setPos(activeShoe.length-h.cardsRemaining);
    setHands(prev=>[...prev,adjusted]);
    setBalance(adjusted.balance);
    setNotice(`Hand ${adjusted.id}: ${adjusted.outcome}. Virtual result ${money(adjusted.profit)}.`);
  };
  const reset = () => { setShoe([]); setPos(0); setHands([]); setBalance(starting); setNotice("Session reset. Create a new shoe to deal."); };
  useEffect(()=> {
    if(!autoRun) return;
    const timer=window.setInterval(()=>deal(),1400);
    return ()=>window.clearInterval(timer);
  },[autoRun,shoe,pos,hands,balance,bet,stake,strategy,starting,decks,seed]);
  const wins = useMemo(()=>({Player:hands.filter(h=>h.outcome==="Player").length,Banker:hands.filter(h=>h.outcome==="Banker").length,Tie:hands.filter(h=>h.outcome==="Tie").length}),[hands]);
  const streaks = useMemo(()=> {
    let max=0, current=0, last="";
    for(const h of hands){if(h.outcome==="Tie") continue; if(h.outcome===last) current++; else {last=h.outcome;current=1;} max=Math.max(max,current);}
    return {max, last, current};
  },[hands]);
  const betWins = hands.filter(h=>bet==="Observe"?false:(bet==="Banker"?h.outcome==="Banker":h.outcome==="Player")).length;
  const totalStaked = hands.filter(h=>h.outcome!=="Tie" && bet!=="Observe").reduce((s,h)=>s+stake,0);
  const handleScreenshot = async (file?: File) => {
    if(!file) return;
    setScreenshotName(file.name);
    setScanMessage("Scanning image for colored road markers…");
    try {
      const result=await scanRoadImage(file);
      setScreenshotPreview(result.preview);
      setPendingScreenshot(result.outcomes);
      setScanMessage(result.message);
    } catch(e) {
      setScanMessage(e instanceof Error?e.message:"Screenshot scan failed.");
    }
  };
  const importScreenshot = () => {
    if(!pendingScreenshot.length){setScanMessage("No proposed results to import.");return;}
    const imported=pendingScreenshot.map((outcome,i)=>({
      id:Date.now()+i,player:[],banker:[],pTotal:0,bTotal:0,outcome,profit:0,
      balance, cardsRemaining:shoe.length?shoe.length-pos:416,source:"Screenshot" as const
    }));
    setHands(prev=>[...prev,...imported]);
    setScanMessage(`Imported ${imported.length} screenshot-observed outcomes. Cards, exact hand order, and shoe composition were not inferred.`);
    setNotice("Screenshot outcomes added to history as screenshot-observed, separate from simulated hands.");
    setPendingScreenshot([]);
    setTab("Road & Patterns");
  };
  const manualImport = () => {
    const rows = manual.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
    const parsed: Outcome[] = [];
    for(const row of rows) {
      const x = row.toLowerCase();
      if(["p","player","blue"].includes(x)) parsed.push("Player");
      else if(["b","banker","red"].includes(x)) parsed.push("Banker");
      else if(["t","tie","green"].includes(x)) parsed.push("Tie");
    }
    if(!parsed.length){setNotice("No recognised results. Enter P, B, T or Player, Banker, Tie.");return;}
    const imported = parsed.map((outcome,i)=>({id:Date.now()+i,player:[],banker:[],pTotal:0,bTotal:0,outcome,profit:0,balance, cardsRemaining:416,source:"Manual" as const}));
    setHands(prev=>[...prev,...imported]); setNotice(`Imported ${parsed.length} manually recorded outcomes. Card details and payouts were not inferred.`);
    setTab("Patterns");
  };
  const visibleHands = showAll ? [...hands].reverse() : [...hands].slice(-12).reverse();
  const road = hands.slice(-70);
  const net = balance-starting;
  const edge = bet==="Banker" ? 0.0146 : bet==="Player" ? 0.0124 : 0;
  const expected = totalStaked*edge;
  const simulatedHands = hands.filter(h => h.source === "Simulated");
  const screenshotHands = hands.filter(h => h.source === "Screenshot");
  const manualHands = hands.filter(h => h.source === "Manual");
  const runBacktest = (mode: "Flat stake" | "Martingale (demo)") => {
    let virtual = starting, peak = starting, maxDrawdown = 0, losses = 0, wagered = 0;
    let winsCount = 0, decisive = 0;
    for (const h of simulatedHands) {
      if (h.outcome === "Tie") continue;
      const amount = mode === "Martingale (demo)" ? Math.min(stake * Math.pow(2, Math.min(losses, 10)), Math.max(0, virtual)) : Math.min(stake, Math.max(0, virtual));
      if (amount <= 0) break;
      wagered += amount; decisive++;
      const won = bet === "Banker" ? h.outcome === "Banker" : h.outcome === "Player";
      const pnl = won ? (bet === "Banker" && h.outcome === "Banker" && h.bTotal === 6 ? amount / 2 : amount) : -amount;
      virtual += pnl;
      if (won) { winsCount++; losses = 0; } else losses++;
      peak = Math.max(peak, virtual); maxDrawdown = Math.max(maxDrawdown, peak - virtual);
    }
    return { ending: virtual, pnl: virtual - starting, maxDrawdown, wagered, decisive, winsCount };
  };
  const backtest = runBacktest(strategy === "Martingale (demo)" ? "Martingale (demo)" : "Flat stake");
  const nav = [
    {name:"Table",icon:Cards},{name:"Road & Patterns",icon:Activity},{name:"Strategy Lab",icon:FlaskConical},
    {name:"Probability",icon:BarChart3},{name:"Hand History",icon:History},{name:"Import Results",icon:Upload}
  ];
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><Layers size={22}/></div><div><h1>Baccarat <span>Intelligence Lab</span></h1><p>VIRTUAL TABLE · STATISTICAL EXPERIMENTS</p></div></div>
      <button className="ghost icon-button" onClick={()=>setHideBalances(v=>!v)} aria-label="Toggle balance privacy">{hideBalances?<Eye size={18}/>:<EyeOff size={18}/>}<span>{hideBalances?"Show balances":"Hide balances"}</span></button>
    </header>
    <div className="notice"><ShieldCheck size={16}/> Virtual results and screenshot-observed history only. No live Evolution feed or bet placement.</div>
    <div className="layout">
      <aside className="sidebar">
        {nav.map(n=><button key={n.name} className={`nav-item ${tab===n.name?"active":""}`} onClick={()=>setTab(n.name)}><n.icon size={18}/><span>{n.name}</span></button>)}
        <div className="sidebar-note"><BrainCircuit size={19}/><b>Analysis, not prediction</b><p>Roads describe previous results. They cannot guarantee the next hand.</p></div>
      </aside>
      <section className="content">
        <div className="page-heading"><div><p className="eyebrow">BACCARAT LAB / {tab.toUpperCase()}</p><h2>{tab==="Table"?"Virtual baccarat table":tab==="Road & Patterns"?"Road & pattern analysis":tab==="Strategy Lab"?"Strategy backtester":tab==="Probability"?"Probability & expected value":tab==="Hand History"?"Auditable hand history":"Import screenshot results"}</h2><p className="muted">No Commission Baccarat · 8-deck finite shoe</p></div><div className="status-pill"><span/> VIRTUAL + SCREENSHOT TRACKING</div></div>
        {notice && <div className="notice inline-notice">{notice}</div>}
        {tab==="Table" && <>
          <div className="table-panel">
            <div className="table-head"><span><Dices size={17}/> NO COMMISSION BACCARAT</span><span className="live-pill">VIRTUAL · NOT LIVE</span></div>
            <div className="versus">
              <div className="side player"><div className="side-label">PLAYER</div><div className="cards">{(hands.at(-1)?.player??[]).map((c,i)=><CardTile key={i} card={c}/>)}{!hands.length&&<span className="empty-card">—</span>}</div><div className="score">{hands.at(-1)?.pTotal??"—"}</div></div>
              <div className="vs">VS</div>
              <div className="side banker"><div className="side-label">BANKER</div><div className="cards">{(hands.at(-1)?.banker??[]).map((c,i)=><CardTile key={i} card={c}/>)}{!hands.length&&<span className="empty-card">—</span>}</div><div className="score">{hands.at(-1)?.bTotal??"—"}</div></div>
            </div>
            <div className="result-banner">{hands.length ? `${hands.at(-1)?.outcome?.toUpperCase()} ${hands.at(-1)?.bTotal===6&&hands.at(-1)?.outcome==="Banker"?"· BANKER 6 HALF-PAYOUT":""}` : "READY TO DEAL"}<small>{hands.length?`HAND #${hands.length} · ${hands.at(-1)?.source}`:"Create a shoe, then deal one virtual hand."}</small></div>
            <div className="table-stats"><div><span>PLAYER WINS</span><b>{wins.Player}</b></div><div><span>BANKER WINS</span><b>{wins.Banker}</b></div><div><span>TIES</span><b>{wins.Tie}</b></div><div><span>CARDS LEFT</span><b>{shoe.length?shoe.length-pos:"416"}</b></div></div>
          </div>
          <div className="two-col">
            <div className="panel"><div className="panel-title"><h3>Table controls</h3><Shuffle size={18}/></div>
              <label>Virtual bet</label><select value={bet} onChange={e=>setBet(e.target.value as "Banker"|"Player"|"Observe")}><option>Banker</option><option>Player</option><option value="Observe">Observe only</option></select>
              <label>Virtual stake (LKR)</label><input type="number" min="0" step="100" value={stake} onChange={e=>setStake(Math.max(0,Number(e.target.value)))}/>
              <label>Strategy for demo testing</label><select value={strategy} onChange={e=>setStrategy(e.target.value)}><option>Flat stake</option><option>Martingale (demo)</option></select>
              <div className="button-row"><button className="primary" onClick={initShoe}><Shuffle size={16}/> New 8-deck shoe</button><button className="secondary" onClick={deal} disabled={!shoe.length}><Play size={16}/> Deal hand</button></div>
              <button className={`auto-button ${autoRun?"running":""}`} onClick={()=>{if(!shoe.length){setNotice("Create a new shoe before starting auto-deal.");return;}setAutoRun(v=>!v);}}>{autoRun?<><Pause size={16}/> Stop auto-deal</>:<><Play size={16}/> Auto-deal every 1.4 sec</>}</button>
              <button className="text-button" onClick={reset}><RotateCcw size={15}/> Reset session</button>
            </div>
            <div className="panel"><div className="panel-title"><h3>Virtual bankroll</h3><CircleDollarSign size={18}/></div><p className="muted small">Starting balance</p><div className="big-number">{hideBalances?"••••••":money(starting)}</div><p className="muted small">Current balance</p><div className={`big-number ${net>=0?"positive":"negative"}`}>{hideBalances?"••••••":money(balance)}</div><div className={`delta ${net>=0?"positive":"negative"}`}>{hideBalances?"Hidden":`${net>=0?"+":""}${money(net)} since start`}</div><div className="progress-track"><div style={{width:`${Math.min(100,Math.max(0,balance/Math.max(1,starting)*100))}%`}}/></div><p className="muted small">A virtual ledger only. No deposits or withdrawals.</p></div>
          </div>
        </>}
        {tab==="Road & Patterns" && <div className="panel"><div className="panel-title"><h3>Big Road · Recent outcomes</h3><Activity size={18}/></div><p className="muted small">This road combines sources for visual review. Source counts below keep simulated, screenshot-observed, and manual entries distinguishable; imported road markers do not contain card-level data unless the cards were separately recorded.</p><div className="road">{road.length?road.map((h,i)=><div key={h.id} className={`road-dot ${h.outcome.toLowerCase()}`} title={`Hand ${h.id}: ${h.outcome}`}>{h.outcome==="Player"?"P":h.outcome==="Banker"?"B":"T"}</div>):<p className="muted">Deal hands or import results to populate the road.</p>}</div><div className="three-col"><Metric label="Simulated" value={String(simulatedHands.length)}/><Metric label="Screenshot-observed" value={String(screenshotHands.length)}/><Metric label="Manual" value={String(manualHands.length)}/></div><div className="three-col"><Metric label="Player share" value={hands.length?`${(wins.Player/hands.length*100).toFixed(1)}%`:"—"}/><Metric label="Banker share" value={hands.length?`${(wins.Banker/hands.length*100).toFixed(1)}%`:"—"}/><Metric label="Tie share" value={hands.length?`${(wins.Tie/hands.length*100).toFixed(1)}%`:"—"}/></div><div className="two-col"><Metric label="Longest non-tie streak" value={`${streaks.max} hands`}/><Metric label="Last non-tie outcome" value={streaks.last||"—"}/></div><div className="callout"><BrainCircuit size={18}/><div><b>Pattern warning</b><p>Streaks, chops and road shapes describe the sample. They are not evidence that the next hand is due to change or repeat. Tie results are excluded from streak length.</p></div></div></div>}
        {tab==="Strategy Lab" && <div className="two-col"><div className="panel"><div className="panel-title"><h3>Strategy test setup</h3><FlaskConical size={18}/></div><label>Bet selection</label><select value={bet} onChange={e=>setBet(e.target.value as "Banker"|"Player"|"Observe")}><option>Banker</option><option>Player</option><option value="Observe">Observe only</option></select><label>Base stake</label><input type="number" value={stake} min="0" onChange={e=>setStake(Math.max(0,Number(e.target.value)))}/><label>Staking rule</label><select value={strategy} onChange={e=>setStrategy(e.target.value)}><option>Flat stake</option><option>Martingale (demo)</option></select><p className="muted small">This selector applies only to virtual wagers and the retrospective replay below. It does not identify a winning edge.</p><button className="primary full" onClick={()=>setNotice(`Strategy configured: ${strategy} · ${bet} · ${money(stake)} base stake. Deal virtual hands to collect a sample.`)}>Apply test settings</button></div><div className="panel"><div className="panel-title"><h3>Current sample</h3><BarChart3 size={18}/></div><Metric label="Simulated hands in backtest" value={String(simulatedHands.length)}/><Metric label="Screenshot-observed" value={String(screenshotHands.length)}/><Metric label="Manual entries" value={String(manualHands.length)}/><Metric label="Backtest net (historical sim sample)" value={hideBalances?"Hidden":money(backtest.pnl)} tone={backtest.pnl>=0?"positive":"negative"}/><Metric label="Peak-to-trough drawdown" value={hideBalances?"Hidden":money(backtest.maxDrawdown)}/><Metric label="Total virtual stake turnover" value={hideBalances?"Hidden":money(backtest.wagered)}/><p className="muted small">This replays the selected staking rule against the already-generated simulated outcome sequence. It is a retrospective demonstration, not a predictive test; it excludes screenshot/manual outcomes and can be affected by sample selection.</p><div className="callout"><ShieldCheck size={18}/><div><b>Backtesting integrity</b><p>Streaks and road shapes do not reliably predict the next hand. Martingale changes exposure, not the underlying odds, and can accelerate losses.</p></div></div></div></div>}
        {tab==="Probability" && <div className="two-col"><div className="panel"><div className="panel-title"><h3>Theoretical house edge</h3><BarChart3 size={18}/></div><Metric label="Banker bet (standard rules)" value="≈ 1.46%"/><Metric label="Player bet (standard rules)" value="≈ 1.24%"/><p className="muted small">Typical published estimates for standard No Commission rules. Confirm the exact game rules and payout table. Tie pushes are excluded from the stake's net result.</p><div className="callout"><BrainCircuit size={18}/><div><b>Expected loss illustration</b><p>At a 1.46% edge, LKR 100,000 in Banker wagers has an expected net loss of about LKR 1,460. This is a long-run average, not a session prediction.</p></div></div></div><div className="panel"><div className="panel-title"><h3>Sample versus expectation</h3><Activity size={18}/></div><Metric label="Hands in sample" value={String(hands.length)}/><Metric label="Observed Player wins" value={String(wins.Player)}/><Metric label="Observed Banker wins" value={String(wins.Banker)}/><Metric label="Observed ties" value={String(wins.Tie)}/><p className="muted small">Observed frequencies vary from theoretical probabilities, especially in short samples. Outcomes are not guaranteed to converge in a particular session.</p></div></div>}
        {tab==="Hand History" && <div className="panel"><div className="panel-title"><h3>Auditable ledger</h3><History size={18}/></div><div className="ledger-summary"><Metric label="Hands" value={String(hands.length)}/><Metric label="Current balance" value={hideBalances?"Hidden":money(balance)}/><Metric label="Cards remaining" value={shoe.length?String(shoe.length-pos):"—"}/></div><div className="table-scroll"><table><thead><tr><th>Hand</th><th>Source</th><th>Player</th><th>Banker</th><th>Totals</th><th>Winner</th><th>Net</th><th>Balance</th></tr></thead><tbody>{[...hands].reverse().map(h=><tr key={`${h.id}-${h.source}`}><td>{h.id}</td><td>{h.source}</td><td>{h.player.length?h.player.map(fmt).join(" "):"Manual"}</td><td>{h.banker.length?h.banker.map(fmt).join(" "):"Manual"}</td><td>{h.player.length?`${h.pTotal}–${h.bTotal}`:"—"}</td><td><span className={`tag ${h.outcome.toLowerCase()}`}>{h.outcome}</span></td><td className={h.profit>=0?"positive":"negative"}>{money(h.profit)}</td><td>{hideBalances?"••••":money(h.balance)}</td></tr>)}</tbody></table>{!hands.length&&<p className="muted">No hands yet. Create a shoe and deal your first hand.</p>}</div></div>}
        {tab==="Import Results" && <div className="two-col">
          <div className="panel"><div className="panel-title"><h3>Screenshot road scanner</h3><ScanLine size={18}/></div>
            <p className="muted">Upload a screenshot from your device. The browser scans saturated blue, red and green clusters and proposes Player, Banker and Tie markers. This is best-effort image analysis, not guaranteed OCR; review every proposed marker before importing.</p>
            <input ref={fileInput} type="file" accept="image/*" onChange={e=>handleScreenshot(e.target.files?.[0])}/>
            {screenshotName&&<p className="muted small">Image: {screenshotName}</p>}
            {screenshotPreview&&<img className="screenshot-preview" src={screenshotPreview} alt="Uploaded baccarat screenshot preview"/>}
            {scanMessage&&<div className="callout"><ImagePlus size={18}/><div><b>Scan status</b><p>{scanMessage}</p></div></div>}
            {pendingScreenshot.length>0&&<>
              <div className="panel-title sub-title"><h3>Review detected outcomes ({pendingScreenshot.length})</h3><span className="muted small">Tap to cycle P → B → T</span></div>
              <div className="review-road">{pendingScreenshot.map((o,i)=><button key={i} title={`Detected marker ${i+1}: ${o}`} className={`road-dot ${o.toLowerCase()}`} onClick={()=>setPendingScreenshot(prev=>prev.map((x,j)=>j===i?(x==="Player"?"Banker":x==="Banker"?"Tie":"Player"):x))}>{o==="Player"?"P":o==="Banker"?"B":"T"}</button>)}</div>
              <div className="button-row"><button className="primary" onClick={importScreenshot}><CheckCircle2 size={16}/> Confirm & import</button><button className="secondary" onClick={()=>setPendingScreenshot([])}>Clear detections</button></div>
            </>}
            <div className="callout"><ShieldCheck size={18}/><div><b>Source separation</b><p>Imported outcomes are labeled Screenshot. The app does not claim to see the live stream, infer hidden cards, or know the exact shoe.</p></div></div>
          </div>
          <div className="panel"><div className="panel-title"><h3>Manual results entry</h3><Upload size={18}/></div><p className="muted">For clear, auditable entry, type the outcomes you can read from the screenshot. Use P, B, T one per line or separated by commas.</p><textarea value={manual} onChange={e=>setManual(e.target.value)} placeholder={"P\\nB\\nB\\nT\\nP"} rows={7}/><button className="primary" onClick={manualImport}><Upload size={16}/> Import manual outcomes</button><div className="callout"><Eye size={18}/><div><b>Optional card details</b><p>Road markers only provide winners. To record actual cards and totals, enter them in a future card-detail workflow; this import deliberately does not fabricate them.</p></div></div>
          </div>
        </div>}
        <footer><span>LOCAL DEVICE SESSION · AUTO-SAVED</span><span>SIMULATED ≠ SCREENSHOT-OBSERVED · NO LIVE FEED OR BET PLACEMENT</span></footer>
      </section>
    </div>
  </main>;
}
function Metric({label,value,tone}:{label:string;value:string;tone?:string}) { return <div className="metric"><span>{label}</span><b className={tone||""}>{value}</b></div>; }
