import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CopyTrading() {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <Button className="bg-[#22C55E] hover:bg-[#16a34a] text-white h-12 px-8 text-base font-semibold rounded-lg">
          Start Demo to Real Copy Trading
        </Button>
        <Button variant="outline" className="border-[#1F2933] text-[#E5E7EB] hover:bg-[#1F2933] h-12 px-8 text-base font-semibold rounded-lg">
          Tutorial
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-[#9CA3AF] text-sm font-medium">Your Token</h2>
        <div className="bg-[#121821] border border-[#1F2933] rounded-lg p-4 inline-block font-mono text-xl text-[#E5E7EB] tracking-widest select-all">
          CR*****
        </div>
      </div>

      <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#E5E7EB] mb-6">Add tokens to Replicator</h2>
        
        <div className="space-y-6">
          <Input 
            placeholder="Enter client token" 
            className="h-12 bg-[#0B0F14] border-[#1F2933] text-[#E5E7EB] placeholder:text-[#9CA3AF] font-mono"
          />
          
          <div className="flex flex-wrap gap-4">
            <Button className="bg-[#3B82F6] hover:bg-blue-600 text-white h-10 px-6">
              Add
            </Button>
            <Button variant="outline" className="border-teal-500 text-teal-500 hover:bg-teal-500/10 h-10 px-6">
              Sync
            </Button>
            <Button className="bg-[#22C55E] hover:bg-[#16a34a] text-white h-10 px-6 ml-auto">
              Start Copy Trading
            </Button>
          </div>

          <div className="pt-6 border-t border-[#1F2933] flex justify-between items-center text-sm">
            <span className="text-[#9CA3AF]">Total Clients added:</span>
            <span className="text-[#E5E7EB] font-bold">0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
