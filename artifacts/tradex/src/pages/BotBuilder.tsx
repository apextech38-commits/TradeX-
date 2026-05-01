import { Save, List, Undo, Redo, ZoomIn, ZoomOut, Play } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function BotBuilder() {
  return (
    <div className="flex flex-1 h-[calc(100vh-56px-52px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-16 md:w-[200px] border-r border-border bg-background flex flex-col items-center md:items-stretch py-4 gap-2 shrink-0">
        {[
          { icon: Save, label: "File" },
          { icon: List, label: "Blocks" },
          { icon: Undo, label: "Undo" },
          { icon: Redo, label: "Redo" },
          { icon: ZoomIn, label: "Zoom In" },
          { icon: ZoomOut, label: "Zoom Out" },
        ].map((item, i) => (
          <button
            key={i}
            data-testid={`sidebar-${item.label.toLowerCase()}`}
            className="w-10 md:w-auto md:mx-4 h-10 md:px-3 bg-secondary border border-border hover:border-primary rounded-md flex items-center justify-center md:justify-start gap-3 text-foreground hover:text-primary transition-colors"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden md:block text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-card overflow-y-auto p-4 md:p-6">
        <div className="mb-6 flex justify-end">
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors">
            <Play className="w-4 h-4" /> Quick Strategy
          </button>
        </div>

        <Accordion type="multiple" defaultValue={["item-1"]} className="w-full space-y-4">
          {[
            { value: "item-1", title: "1. Trade Parameters", defaultOpen: true },
            { value: "item-2", title: "2. Purchase Conditions" },
            { value: "item-3", title: "3. Sell Conditions" },
            { value: "item-4", title: "4. Restart Trading Conditions" },
          ].map((section, idx) => (
            <AccordionItem
              key={section.value}
              value={section.value}
              className="border border-border rounded-lg bg-background overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50 transition-colors">
                <span className="text-lg font-semibold text-foreground">{section.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t border-border">
                {idx === 0 ? (
                  <div className="space-y-4 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Market", value: "Derived > Continuous Indices > Volatility 100 Index" },
                        { label: "Trade Type", value: "Digits > Even/Odd" },
                        { label: "Contract Type", value: "Both" },
                        { label: "Default Candle Interval", value: "1 minute" },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-1.5">
                          <label className="text-sm text-muted-foreground">{label}</label>
                          <select className="w-full bg-card border border-border rounded-md h-10 px-3 text-foreground focus:outline-none focus:border-primary">
                            <option>{value}</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 py-2">
                      {[
                        { id: "restart-err", label: "Restart bot on error" },
                        { id: "disable-size", label: "Disable trade size check" },
                      ].map(({ id, label }) => (
                        <div key={id} className="flex items-center space-x-2">
                          <Checkbox id={id} className="border-primary data-[state=checked]:bg-primary" />
                          <label htmlFor={id} className="text-sm font-medium leading-none text-foreground cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-start">
                        <span className="bg-background pr-3 text-sm text-muted-foreground">Run once at start</span>
                      </div>
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-border">
                      {[
                        { label: "set stake to", value: "1" },
                        { label: "set stake w to", value: "1" },
                        { label: "set stop loss to", value: "2000" },
                        { label: "set take profit to", value: "2" },
                        { label: "set Duration ticks to", value: "1" },
                        { label: "set Product Martingale after loss to", value: "1" },
                      ].map((block, i) => (
                        <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-md p-2 w-fit shadow-sm">
                          <span className="text-foreground text-sm whitespace-nowrap">{block.label}</span>
                          <Input defaultValue={block.value} className="w-20 h-8 bg-background border-border text-center" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border flex flex-wrap gap-4 items-end">
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-sm text-muted-foreground">Duration</label>
                        <div className="flex gap-2">
                          <Input defaultValue="1" type="number" className="w-20 bg-card border-border" />
                          <select className="flex-1 bg-card border border-border rounded-md px-3 text-foreground">
                            <option>Ticks</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-sm text-muted-foreground">Stake</label>
                        <Input defaultValue="1.00" type="number" min="0.5" max="69000" step="0.5" className="bg-card border-border" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {idx === 1 && "Define when the bot should purchase a contract."}
                    {idx === 2 && "Define when the bot should sell a contract before expiry."}
                    {idx === 3 && "Define logic to execute after a trade finishes."}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
