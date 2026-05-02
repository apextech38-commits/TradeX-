import { useState } from "react";
import { Save, List, Undo, Redo, ZoomIn, ZoomOut, Play } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useBot } from "@/context/BotContext";

const MARKET_OPTIONS = [
  { label: "Volatility 100 Index", symbol: "R_100", contractType: "DIGITEVEN" },
  { label: "Volatility 75 Index",  symbol: "R_75",  contractType: "DIGITEVEN" },
  { label: "Volatility 50 Index",  symbol: "R_50",  contractType: "DIGITEVEN" },
  { label: "Volatility 25 Index",  symbol: "R_25",  contractType: "DIGITEVEN" },
  { label: "Volatility 10 Index",  symbol: "R_10",  contractType: "DIGITEVEN" },
];

const CONTRACT_TYPES = [
  { label: "Even/Odd — Even",    value: "DIGITEVEN"  },
  { label: "Even/Odd — Odd",     value: "DIGITODD"   },
  { label: "Over/Under — Over 5", value: "DIGITOVER"  },
  { label: "Over/Under — Under 5",value: "DIGITUNDER" },
  { label: "Matches — Match",    value: "DIGITMATCH"  },
  { label: "Matches — Differ",   value: "DIGITDIFF"  },
  { label: "Rise / Fall — Rise", value: "CALL"        },
  { label: "Rise / Fall — Fall", value: "PUT"         },
];

const DURATION_UNITS = [
  { label: "Ticks",   value: "t" },
  { label: "Seconds", value: "s" },
  { label: "Minutes", value: "m" },
];

export default function BotBuilder() {
  const { params, setParams, setBotLoaded, botLoaded } = useBot();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setBotLoaded(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-1 h-[calc(100vh-56px-52px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-16 md:w-[200px] border-r border-border bg-background flex flex-col items-center md:items-stretch py-4 gap-2 shrink-0">
        {[
          { icon: Save,    label: "Save",    action: handleSave },
          { icon: List,    label: "Blocks",  action: () => {} },
          { icon: Undo,    label: "Undo",    action: () => {} },
          { icon: Redo,    label: "Redo",    action: () => {} },
          { icon: ZoomIn,  label: "Zoom In", action: () => {} },
          { icon: ZoomOut, label: "Zoom Out",action: () => {} },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-10 md:w-auto md:mx-4 h-10 md:px-3 bg-secondary border border-border hover:border-primary rounded-md flex items-center justify-center md:justify-start gap-3 text-foreground hover:text-primary transition-colors"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden md:block text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-card overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          {botLoaded ? (
            <span className="text-xs font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-3 py-1 rounded-full">
              ✓ Bot configured — ready to run
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Configure your bot below, then click Save to activate it
            </span>
          )}
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors text-sm ${
              saved
                ? "bg-[#22C55E] text-white"
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
          >
            <Play className="w-4 h-4" />
            {saved ? "Saved!" : "Save Bot"}
          </button>
        </div>

        <Accordion type="multiple" defaultValue={["item-1"]} className="w-full space-y-4">
          {/* Section 1 — Trade Parameters */}
          <AccordionItem value="item-1" className="border border-border rounded-lg bg-background overflow-hidden shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50">
              <span className="text-lg font-semibold text-foreground">1. Trade Parameters</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 border-t border-border">
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Market */}
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Market</label>
                    <select
                      value={params.symbol}
                      onChange={e => {
                        const opt = MARKET_OPTIONS.find(o => o.symbol === e.target.value);
                        if (opt) setParams({ symbol: opt.symbol, contractType: opt.contractType });
                      }}
                      className="w-full bg-card border border-border rounded-md h-10 px-3 text-foreground focus:outline-none focus:border-primary"
                    >
                      {MARKET_OPTIONS.map(o => (
                        <option key={o.symbol} value={o.symbol}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Contract Type */}
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Contract Type</label>
                    <select
                      value={params.contractType}
                      onChange={e => setParams({ contractType: e.target.value })}
                      className="w-full bg-card border border-border rounded-md h-10 px-3 text-foreground focus:outline-none focus:border-primary"
                    >
                      {CONTRACT_TYPES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 py-2">
                  {[
                    { id: "restart-err",  label: "Restart bot on error" },
                    { id: "disable-size", label: "Disable trade size check" },
                  ].map(({ id, label }) => (
                    <div key={id} className="flex items-center space-x-2">
                      <Checkbox id={id} className="border-primary data-[state=checked]:bg-primary" />
                      <label htmlFor={id} className="text-sm font-medium leading-none text-foreground cursor-pointer">{label}</label>
                    </div>
                  ))}
                </div>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-start">
                    <span className="bg-background pr-3 text-sm text-muted-foreground">Run once at start</span>
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-border">
                  {[
                    { label: "set stake to",                         key: "stake",    type: "number", val: String(params.stake)    },
                    { label: "set stop loss to",                     key: null,       type: "number", val: "2000" },
                    { label: "set take profit to",                   key: null,       type: "number", val: "2"    },
                    { label: "set Product Martingale after loss to", key: null,       type: "number", val: "1"    },
                  ].map((block, i) => (
                    <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-md p-2 w-fit shadow-sm">
                      <span className="text-foreground text-sm whitespace-nowrap">{block.label}</span>
                      <Input
                        type={block.type}
                        defaultValue={block.val}
                        onChange={e => {
                          if (block.key === "stake") setParams({ stake: Number(e.target.value) });
                        }}
                        className="w-20 h-8 bg-background border-border text-center"
                      />
                    </div>
                  ))}
                </div>

                {/* Duration + Stake */}
                <div className="pt-4 border-t border-border flex flex-wrap gap-4 items-end">
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="text-sm text-muted-foreground">Duration</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={params.duration}
                        onChange={e => setParams({ duration: Number(e.target.value) })}
                        className="w-20 bg-card border-border"
                      />
                      <select
                        value={params.durationUnit}
                        onChange={e => setParams({ durationUnit: e.target.value })}
                        className="flex-1 bg-card border border-border rounded-md px-3 text-foreground focus:outline-none focus:border-primary"
                      >
                        {DURATION_UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="text-sm text-muted-foreground">Stake (USD)</label>
                    <Input
                      type="number"
                      min="0.35"
                      step="0.01"
                      value={params.stake}
                      onChange={e => setParams({ stake: Number(e.target.value) })}
                      className="bg-card border-border"
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sections 2-4 */}
          {[
            { value: "item-2", title: "2. Purchase Conditions",         desc: "Define when the bot should purchase a contract." },
            { value: "item-3", title: "3. Sell Conditions",             desc: "Define when the bot should sell a contract before expiry." },
            { value: "item-4", title: "4. Restart Trading Conditions",  desc: "Define logic to execute after a trade finishes." },
          ].map(s => (
            <AccordionItem key={s.value} value={s.value} className="border border-border rounded-lg bg-background overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50">
                <span className="text-lg font-semibold text-foreground">{s.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t border-border">
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
