import { Save, List, Undo, Redo, ZoomIn, ZoomOut, Play } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function BotBuilder() {
  return (
    <div className="flex flex-1 h-[calc(100vh-56px-52px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-16 md:w-[200px] border-r border-[#1F2933] bg-[#0B0F14] flex flex-col items-center md:items-stretch py-4 gap-2 shrink-0">
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
            className="w-10 md:w-auto md:mx-4 h-10 md:px-3 bg-[#1F2933] border border-[#1F2933] hover:border-[#3B82F6] rounded-md flex items-center justify-center md:justify-start gap-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden md:block text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 bg-[#121821] overflow-y-auto p-4 md:p-6">
        <div className="mb-6 flex justify-end">
          <button className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors">
            <Play className="w-4 h-4" /> Quick Strategy
          </button>
        </div>

        <Accordion type="multiple" defaultValue={["item-1"]} className="w-full space-y-4">
          <AccordionItem value="item-1" className="border border-[#1F2933] rounded-lg bg-[#0B0F14] overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[#1F2933]/50 transition-colors">
              <span className="text-lg font-semibold text-[#E5E7EB]">1. Trade Parameters</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 border-t border-[#1F2933]">
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-[#9CA3AF]">Market</label>
                    <select className="w-full bg-[#121821] border border-[#1F2933] rounded-md h-10 px-3 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
                      <option>Derived {'>'} Continuous Indices {'>'} Volatility 100 Index</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-[#9CA3AF]">Trade Type</label>
                    <select className="w-full bg-[#121821] border border-[#1F2933] rounded-md h-10 px-3 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
                      <option>Digits {'>'} Even/Odd</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-[#9CA3AF]">Contract Type</label>
                    <select className="w-full bg-[#121821] border border-[#1F2933] rounded-md h-10 px-3 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
                      <option>Both</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-[#9CA3AF]">Default Candle Interval</label>
                    <select className="w-full bg-[#121821] border border-[#1F2933] rounded-md h-10 px-3 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
                      <option>1 minute</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="restart-err" className="border-[#3B82F6] data-[state=checked]:bg-[#3B82F6]" />
                    <label htmlFor="restart-err" className="text-sm font-medium leading-none text-[#E5E7EB] cursor-pointer">
                      Restart bot on error
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="disable-size" className="border-[#3B82F6] data-[state=checked]:bg-[#3B82F6]" />
                    <label htmlFor="disable-size" className="text-sm font-medium leading-none text-[#E5E7EB] cursor-pointer">
                      Disable trade size check
                    </label>
                  </div>
                </div>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#1F2933]" />
                  </div>
                  <div className="relative flex justify-start">
                    <span className="bg-[#0B0F14] pr-3 text-sm text-[#9CA3AF]">Run once at start</span>
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-[#1F2933]">
                  {[
                    { label: "set stake to", value: "1" },
                    { label: "set stake w to", value: "1" },
                    { label: "set stop loss to", value: "2000" },
                    { label: "set take profit to", value: "2" },
                    { label: "set Duration ticks to", value: "1" },
                    { label: "set Product Martingale after loss to", value: "1" },
                  ].map((block, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#121821] border border-[#1F2933] rounded-md p-2 w-fit">
                      <span className="text-[#E5E7EB] text-sm whitespace-nowrap">{block.label}</span>
                      <Input defaultValue={block.value} className="w-20 h-8 bg-[#0B0F14] border-[#1F2933] text-center" />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#1F2933] flex flex-wrap gap-4 items-end">
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="text-sm text-[#9CA3AF]">Duration</label>
                    <div className="flex gap-2">
                      <Input defaultValue="1" type="number" className="w-20 bg-[#121821] border-[#1F2933]" />
                      <select className="flex-1 bg-[#121821] border border-[#1F2933] rounded-md px-3 text-[#E5E7EB]">
                        <option>Ticks</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <label className="text-sm text-[#9CA3AF]">Stake</label>
                    <Input defaultValue="1.00" type="number" min="0.5" max="69000" step="0.5" className="bg-[#121821] border-[#1F2933]" />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border border-[#1F2933] rounded-lg bg-[#0B0F14] overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[#1F2933]/50 transition-colors">
              <span className="text-lg font-semibold text-[#E5E7EB]">2. Purchase Conditions</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 border-t border-[#1F2933]">
              <p className="text-[#9CA3AF] text-sm">Define when the bot should purchase a contract.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border border-[#1F2933] rounded-lg bg-[#0B0F14] overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[#1F2933]/50 transition-colors">
              <span className="text-lg font-semibold text-[#E5E7EB]">3. Sell Conditions</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 border-t border-[#1F2933]">
              <p className="text-[#9CA3AF] text-sm">Define when the bot should sell a contract before expiry.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border border-[#1F2933] rounded-lg bg-[#0B0F14] overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[#1F2933]/50 transition-colors">
              <span className="text-lg font-semibold text-[#E5E7EB]">4. Restart Trading Conditions</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 border-t border-[#1F2933]">
              <p className="text-[#9CA3AF] text-sm">Define logic to execute after a trade finishes.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
