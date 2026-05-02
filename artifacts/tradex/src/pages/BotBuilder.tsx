import { useState, useEffect, useRef, useCallback } from "react";
import {
  Folder, List, LineChart, TrendingDown, Undo2, Redo2,
  ZoomIn, ZoomOut, ChevronDown, ChevronRight, ChevronLeft,
  Search, X, RotateCcw, Flame,
} from "lucide-react";
import { useBot } from "@/context/BotContext";

// ─── Quick Strategy modal (inline) ──────────────────────────────────────────
const ACC_STRATS = [
  "Martingale","Martingale on Stat Reset","D'Alembert","D'Alembert on Stat Reset",
  "Reverse Martingale","Reverse Martingale on Stat Reset",
  "Reverse D'Alembert","Reverse D'Alembert on Stat Reset",
];
const OPT_STRATS = ["Martingale","D'Alembert","Reverse Martingale","Reverse D'Alembert","Oscar's Grind"];

function QuickStrategyModal({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (s: string) => void;
}) {
  const [tab, setTab]   = useState<"All"|"Accumulators"|"Options">("All");
  const [q, setQ]       = useState("");
  const showAcc = tab !== "Options";
  const showOpt = tab !== "Accumulators";
  const filterAcc = ACC_STRATS.filter(s => s.toLowerCase().includes(q.toLowerCase()));
  const filterOpt = OPT_STRATS.filter(s => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col overflow-hidden" style={{maxHeight:"80vh"}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Step 1 / 2</p>
            <h2 className="text-xl font-bold text-foreground">Choose your strategy</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search strategies..."
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"/>
          </div>
        </div>
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {(["All","Accumulators","Options"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab===t?"bg-primary text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-4">
          {showAcc && filterAcc.length>0 && (
            <div>
              {tab==="All"&&<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Accumulators</p>}
              <div className="border border-border rounded-xl overflow-hidden">
                {filterAcc.map((s,i)=>(
                  <button key={s} onClick={()=>onSelect(s)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/60 transition-colors group ${i<filterAcc.length-1?"border-b border-border":""}`}>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">{s}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0"/>
                  </button>
                ))}
              </div>
            </div>
          )}
          {showOpt && filterOpt.length>0 && (
            <div>
              {tab==="All"&&<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Options</p>}
              <div className="border border-border rounded-xl overflow-hidden">
                {filterOpt.map((s,i)=>(
                  <button key={s} onClick={()=>onSelect(s)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/60 transition-colors group ${i<filterOpt.length-1?"border-b border-border":""}`}>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">{s}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0"/>
                  </button>
                ))}
              </div>
            </div>
          )}
          {filterAcc.length===0&&filterOpt.length===0&&(
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-40"/><p className="text-sm">No strategies match</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drag hook ────────────────────────────────────────────────────────────────
function useDraggable(initial: {x:number;y:number}) {
  const posRef = useRef(initial);
  const [pos, setPos] = useState(initial);
  const drag = useRef({active:false, ox:0, oy:0});

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = e.target as Element;
    if (el.closest('button,input,select,label,textarea,[data-nodrag]')) return;
    drag.current = {active:true, ox:e.clientX-posRef.current.x, oy:e.clientY-posRef.current.y};
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const next = {x:Math.max(0,e.clientX-drag.current.ox), y:Math.max(0,e.clientY-drag.current.oy)};
      posRef.current = next;
      setPos({...next});
    };
    const onUp = () => { drag.current.active = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return {pos, onMouseDown};
}

// ─── Block wrapper ────────────────────────────────────────────────────────────
function Block({
  id, title, initialPos, zIndex, onFocus, visible, children,
}: {
  id:string; title:string; initialPos:{x:number;y:number};
  zIndex:number; onFocus:(id:string)=>void; visible:boolean; children:React.ReactNode;
}) {
  const {pos, onMouseDown} = useDraggable(initialPos);
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  return (
    <div
      style={{position:'absolute', left:pos.x, top:pos.y, zIndex, minWidth:340, maxWidth:420}}
      onMouseDown={() => onFocus(id)}
    >
      <div className="rounded-lg overflow-hidden shadow-xl" style={{border:'1px solid rgba(14,44,84,0.5)'}}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 select-none"
          style={{background:'#0e2c54', color:'#fff', cursor:'grab'}}
          onMouseDown={onMouseDown}
        >
          <span className="text-sm font-semibold tracking-wide">{title}</span>
          <button
            data-nodrag
            onClick={()=>setCollapsed(v=>!v)}
            className="text-white/70 hover:text-white transition-colors ml-2 shrink-0"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${collapsed?"rotate-180":""}`}/>
          </button>
        </div>
        {/* Body */}
        {!collapsed && (
          <div className="bg-card text-foreground">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Select row helper ────────────────────────────────────────────────────────
function Sel({value,options,onChange}:{value:string;options:string[];onChange:(v:string)=>void}) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary h-7">
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Arrow() { return <span className="text-muted-foreground text-xs mx-1">›</span>; }

// ─── Set-row (blue subblock) ──────────────────────────────────────────────────
function SetRow({label,options,val,onVal}:{label:string;options:string[];val:string;onVal:(v:string)=>void}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-white/70 text-xs">set</span>
      <select className="bg-[#0a2040] border border-blue-900/40 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none h-6">
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      <span className="text-white/70 text-xs">to</span>
      <input type="number" defaultValue={val}
        className="w-14 bg-[#0a2040] border border-blue-900/40 rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none h-6"/>
    </div>
  );
}

// ─── Trade Parameters block content ──────────────────────────────────────────
function TradeParamsContent() {
  const {params, setParams} = useBot();
  const [restart, setRestart] = useState(false);
  const [lastTrade, setLastTrade] = useState(true);

  return (
    <div className="p-3 space-y-3 text-sm">
      {/* Market row */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-muted-foreground text-xs w-28 shrink-0">Market:</span>
        <Sel value="Derived" options={["Derived","Forex","Stocks"]} onChange={()=>{}}/>
        <Arrow/>
        <Sel value="Continuous Indices" options={["Continuous Indices","Daily Reset Indices"]} onChange={()=>{}}/>
        <Arrow/>
        <Sel value={params.symbol} options={["R_10","R_25","R_50","R_75","R_100"]}
          onChange={v=>setParams({symbol:v})}/>
      </div>

      {/* Trade Type */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-muted-foreground text-xs w-28 shrink-0">Trade Type:</span>
        <Sel value="Digits" options={["Digits","Up/Down","Touch/No Touch"]} onChange={()=>{}}/>
        <Arrow/>
        <Sel value={params.contractType.includes("EVEN")?"Even/Odd":params.contractType.includes("OVER")?"Over/Under":params.contractType.includes("MATCH")?"Matches/Differs":"Rise/Fall"}
          options={["Even/Odd","Over/Under","Matches/Differs","Rise/Fall"]}
          onChange={v=>{
            const map:Record<string,string>={  "Even/Odd":"DIGITEVEN","Over/Under":"DIGITOVER","Matches/Differs":"DIGITMATCH","Rise/Fall":"CALL"};
            setParams({contractType:map[v]||"DIGITEVEN"});
          }}/>
      </div>

      {/* Contract Type */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-muted-foreground text-xs w-28 shrink-0">Contract Type:</span>
        <Sel value={params.contractType==="DIGITEVEN"?"Even":params.contractType==="DIGITODD"?"Odd":"Both"}
          options={["Even","Odd","Both"]}
          onChange={v=>setParams({contractType:v==="Even"?"DIGITEVEN":v==="Odd"?"DIGITODD":"DIGITEVEN"})}/>
      </div>

      {/* Candle Interval */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-muted-foreground text-xs w-28 shrink-0">Default Candle Interval:</span>
        <Sel value="1 minute" options={["1 minute","5 minutes","15 minutes","1 hour"]} onChange={()=>{}}/>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-1">
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground leading-tight">
            Restart buy/sell on error (disable for better performance)
          </span>
          <button data-nodrag onClick={()=>setRestart(v=>!v)}
            className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${restart?"bg-primary":"bg-secondary border border-border"}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${restart?"left-4":"left-0.5"}`}/>
          </button>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={lastTrade} onChange={e=>setLastTrade(e.target.checked)}
            className="w-4 h-4 accent-primary shrink-0"/>
          <span className="text-xs text-muted-foreground leading-tight">
            Restart last trade on error (bot ignores the unsuccessful trade)
          </span>
        </label>
      </div>

      {/* Run once at start subblock */}
      <div className="rounded-md overflow-hidden" style={{background:'#0e2c54'}}>
        <div className="px-3 py-2">
          <span className="text-white/90 text-xs font-semibold tracking-wide">Run once at start:</span>
        </div>
        <div className="px-3 pb-3 space-y-2">
          <SetRow label="stake"    options={["stake","stake w"]}              val="1"    onVal={()=>{}}/>
          <SetRow label="stake w"  options={["stake w","stake"]}              val="1"    onVal={()=>{}}/>
          <SetRow label="stop loss" options={["stop loss","take profit"]}      val="2000" onVal={()=>{}}/>
          <SetRow label="take profit" options={["take profit","stop loss"]}    val="2"    onVal={()=>{}}/>
          <SetRow label="Duration ticks" options={["Duration ticks","Duration seconds"]} val="1" onVal={()=>{}}/>
          <SetRow label="Product Martingale after loss" options={["Product Martingale after loss","Product D'Alembert"]} val="1" onVal={()=>{}}/>
        </div>
      </div>

      {/* Duration + Stake */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-muted-foreground text-xs">Duration</span>
        <input type="number" value={params.duration} onChange={e=>setParams({duration:Number(e.target.value)})} min="1"
          className="w-12 bg-background border border-border rounded px-2 py-1 text-xs text-foreground text-center focus:outline-none h-7"/>
        <Sel value={params.durationUnit==="t"?"Ticks":params.durationUnit==="s"?"Seconds":"Minutes"}
          options={["Ticks","Seconds","Minutes"]}
          onChange={v=>setParams({durationUnit:v==="Ticks"?"t":v==="Seconds"?"s":"m"})}/>
        <span className="text-muted-foreground text-xs ml-2">Stake</span>
        <input type="number" value={params.stake} onChange={e=>setParams({stake:Number(e.target.value)})} min="0.5" max="69000" step="0.01"
          className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-foreground text-center focus:outline-none h-7"/>
        <span className="text-[10px] text-muted-foreground">(min 0.5 max 69000)</span>
      </div>
    </div>
  );
}

// ─── Simple collapsible block content ─────────────────────────────────────────
function SimpleBlockContent({hint}:{hint:string}) {
  return (
    <div className="p-4 text-xs text-muted-foreground">
      {hint}
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({collapsed, onToggle}:{collapsed:boolean;onToggle:()=>void}) {
  const [tab, setTab] = useState("Summary");
  const {totalStake,totalPayout,totalProfit,won,lost,runs,results,reset} = useBot();

  return (
    <div className={`shrink-0 border-l border-border bg-card flex flex-col transition-all duration-300 ${collapsed?"w-8":"w-[260px]"}`}>
      {/* Toggle button */}
      <button onClick={onToggle}
        className="flex items-center justify-center w-full h-9 border-b border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
        {collapsed
          ? <ChevronLeft className="w-4 h-4 rotate-180"/>
          : <><ChevronLeft className="w-4 h-4"/><span className="text-xs ml-1">Hide</span></>
        }
      </button>

      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {["Summary","Transactions","Journal"].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab==="Summary" && (
              <div className="space-y-3">
                {runs===0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When you're ready to trade, hit <span className="font-bold text-foreground">Run</span>.{" "}
                      You'll be able to track your bot's performance here.
                    </p>
                    <a href="#" className="text-[10px] text-primary underline mt-2 block">What's this?</a>
                  </div>
                ) : null}

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    {label:"Total stake",    val:totalStake.toFixed(2)},
                    {label:"Total payout",   val:totalPayout.toFixed(2)},
                    {label:"No. of runs",    val:String(runs)},
                    {label:"Contracts lost", val:String(lost)},
                    {label:"Contracts won",  val:String(won)},
                    {label:"Total profit",   val:(totalProfit>=0?"+":"")+totalProfit.toFixed(2), highlight:true, positive:totalProfit>=0},
                  ].map(s=>(
                    <div key={s.label} className="bg-background border border-border rounded-lg p-2">
                      <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
                      <div className={`text-sm font-bold mt-0.5 ${s.highlight?(s.positive?"text-[#22C55E]":"text-[#EF4444]"):"text-foreground"}`}>
                        {s.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="Transactions" && (
              results.length===0
                ? <p className="text-xs text-muted-foreground text-center py-6">No transactions yet.</p>
                : <div className="space-y-1.5">
                    {results.map(r=>(
                      <div key={r.id} className="bg-background border border-border rounded px-2 py-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-mono">#{r.id}</span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            r.status==="won"?"bg-[#22C55E]/10 text-[#22C55E]":
                            r.status==="lost"?"bg-[#EF4444]/10 text-[#EF4444]":
                            "bg-primary/10 text-primary"}`}>
                            {r.status==="open"?"Open":r.status==="won"?`+${r.profit?.toFixed(2)}`:r.profit?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">Stake: {r.buyPrice.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
            )}

            {tab==="Journal" && (
              <p className="text-xs text-muted-foreground text-center py-6">No journal entries yet.</p>
            )}
          </div>

          <div className="border-t border-border p-3 shrink-0">
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border border-border rounded hover:bg-secondary hover:text-foreground transition-colors">
              <RotateCcw className="w-3.5 h-3.5"/> Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main BotBuilder ──────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  {id:"analysis",    label:"Analysis Logics", icon:<Flame className="w-4 h-4 text-orange-400"/>, fire:true},
  {id:"trade",       label:"Trade parameters",        icon:null},
  {id:"purchase",    label:"Purchase conditions",     icon:null},
  {id:"sell",        label:"Sell conditions (optional)", icon:null},
  {id:"restart",     label:"Restart trading conditions", icon:null},
  {id:"analysis2",   label:"Analysis",                icon:null, hasArrow:true},
];

export default function BotBuilder() {
  const {setBotLoaded} = useBot();
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string,boolean>>({analysis:true});

  // Which blocks are visible on canvas
  const [visible, setVisible] = useState({
    trade:true, purchase:true, sell:true, restart:true,
  });

  // Z-index tracking (bring to front on click)
  const [topBlock, setTopBlock] = useState("trade");
  const zFor = (id:string) => topBlock===id ? 20 : 10;

  const toggleVisible = (id:string) => {
    if (id==="trade"||id==="purchase"||id==="sell"||id==="restart") {
      setVisible(v=>({...v,[id]:!v[id as keyof typeof v]}));
    }
  };

  const handleSelectStrategy = (name: string) => {
    setBotLoaded(true);
    setShowStrategy(false);
  };

  // Toolbar actions
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {showStrategy && (
        <QuickStrategyModal onClose={()=>setShowStrategy(false)} onSelect={handleSelectStrategy}/>
      )}
      <input ref={fileRef} type="file" accept=".xml" className="hidden"
        onChange={()=>{ setBotLoaded(true); }}/>

      <div className="flex h-[calc(100vh-56px-52px)] overflow-hidden bg-background">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <div className={`shrink-0 border-r border-border bg-card flex flex-col transition-all duration-300 ${sidebarOpen?"w-[200px]":"w-0 overflow-hidden"}`}>
          {/* Quick Strategy button */}
          <button onClick={()=>setShowStrategy(true)}
            className="mx-3 mt-3 mb-2 py-2.5 rounded-md text-sm font-bold text-white transition-colors shrink-0"
            style={{background:'#0e2c54'}}>
            Quick strategy
          </button>

          {/* Blocks menu header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-sm font-bold text-foreground">Blocks menu</span>
            <button onClick={()=>setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4"/>
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"/>
              <input value={sidebarSearch} onChange={e=>setSidebarSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"/>
            </div>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto">
            {SIDEBAR_SECTIONS.filter(s=>!sidebarSearch||s.label.toLowerCase().includes(sidebarSearch.toLowerCase())).map(s=>(
              <div key={s.id}>
                <button
                  onClick={()=>{
                    setSidebarExpanded(v=>({...v,[s.id]:!v[s.id]}));
                    toggleVisible(s.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors text-left"
                >
                  {s.icon ?? null}
                  <span className="flex-1">{s.label}</span>
                  {s.hasArrow
                    ? <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${sidebarExpanded[s.id]?"rotate-180":""}`}/>
                    : <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${sidebarExpanded[s.id]?"":"rotate-180"}`}/>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Middle: toolbar + canvas ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="shrink-0 h-11 border-b border-border bg-card flex items-center px-3 gap-1">
            {!sidebarOpen && (
              <button onClick={()=>setSidebarOpen(true)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors mr-1">
                <ChevronRight className="w-4 h-4"/>
              </button>
            )}
            {[
              {icon:<Folder className="w-4 h-4"/>,     tip:"Open file",    act:()=>fileRef.current?.click()},
              {icon:<List className="w-4 h-4"/>,       tip:"Blocks view",  act:()=>setSidebarOpen(v=>!v)},
              {icon:<LineChart className="w-4 h-4"/>,  tip:"Line chart",   act:()=>{}},
              {icon:<TrendingDown className="w-4 h-4"/>,tip:"Trend chart",  act:()=>{}},
              {icon:null, sep:true},
              {icon:<Undo2 className="w-4 h-4"/>,      tip:"Undo",         act:()=>{}},
              {icon:<Redo2 className="w-4 h-4"/>,      tip:"Redo",         act:()=>{}},
              {icon:null, sep:true},
              {icon:<ZoomIn className="w-4 h-4"/>,     tip:"Zoom in",      act:()=>{}},
              {icon:<ZoomOut className="w-4 h-4"/>,    tip:"Zoom out",     act:()=>{}},
            ].map((item,i)=>
              item.sep
                ? <div key={i} className="w-px h-5 bg-border mx-1"/>
                : <button key={i} onClick={item.act} title={item.tip}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
                    {item.icon}
                  </button>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-auto" style={{background:"#f1f5f9"}} id="bb-canvas">
            <div className="absolute inset-0" style={{minWidth:900, minHeight:700}}>

              {/* Trade Parameters */}
              <Block id="trade" title="1. Trade parameters"
                initialPos={{x:20,y:20}} zIndex={zFor("trade")}
                onFocus={setTopBlock} visible={visible.trade}>
                <TradeParamsContent/>
              </Block>

              {/* Purchase Conditions */}
              <Block id="purchase" title="2. Purchase conditions"
                initialPos={{x:20,y:500}} zIndex={zFor("purchase")}
                onFocus={setTopBlock} visible={visible.purchase}>
                <SimpleBlockContent hint="Define when the bot should purchase a contract. Drag to reposition."/>
              </Block>

              {/* Sell Conditions */}
              <Block id="sell" title="3. Sell conditions ▼"
                initialPos={{x:440,y:20}} zIndex={zFor("sell")}
                onFocus={setTopBlock} visible={visible.sell}>
                <SimpleBlockContent hint="Define when the bot should sell a contract before expiry."/>
              </Block>

              {/* Restart Trading Conditions */}
              <Block id="restart" title="4. Restart trading conditions ▼"
                initialPos={{x:440,y:180}} zIndex={zFor("restart")}
                onFocus={setTopBlock} visible={visible.restart}>
                <SimpleBlockContent hint="Define logic to execute after a trade finishes."/>
              </Block>

            </div>
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <RightPanel collapsed={rightCollapsed} onToggle={()=>setRightCollapsed(v=>!v)}/>
      </div>
    </>
  );
}
