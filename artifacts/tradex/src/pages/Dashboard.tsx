import { MonitorSmartphone, Puzzle, Play } from "lucide-react";
import { SiGoogledrive } from "react-icons/si";

export default function Dashboard() {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#E5E7EB] mb-2">Load or build your bot</h1>
        <p className="text-[#9CA3AF]">Choose how to get started with your trading strategy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#121821] border border-[#1F2933] hover:border-[#3B82F6] rounded-xl p-6 cursor-pointer transition-colors group">
          <MonitorSmartphone className="w-10 h-10 text-[#3B82F6] mb-4" />
          <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2 group-hover:text-[#3B82F6] transition-colors">Local</h2>
          <p className="text-[#9CA3AF]">Load from your device</p>
        </div>

        <div className="bg-[#121821] border border-[#1F2933] hover:border-[#3B82F6] rounded-xl p-6 cursor-pointer transition-colors group">
          <SiGoogledrive className="w-10 h-10 text-[#3B82F6] mb-4" />
          <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2 group-hover:text-[#3B82F6] transition-colors">Google Drive</h2>
          <p className="text-[#9CA3AF]">Load from Google Drive</p>
        </div>

        <div className="bg-[#121821] border border-[#1F2933] hover:border-[#3B82F6] rounded-xl p-6 cursor-pointer transition-colors group">
          <Puzzle className="w-10 h-10 text-[#3B82F6] mb-4" />
          <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2 group-hover:text-[#3B82F6] transition-colors">Bot Builder</h2>
          <p className="text-[#9CA3AF]">Build a new bot visually</p>
        </div>

        <div className="bg-[#121821] border border-[#1F2933] hover:border-[#3B82F6] rounded-xl p-6 cursor-pointer transition-colors group">
          <Play className="w-10 h-10 text-[#3B82F6] mb-4" />
          <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2 group-hover:text-[#3B82F6] transition-colors">Quick Strategy</h2>
          <p className="text-[#9CA3AF]">Start with a pre-built strategy</p>
        </div>
      </div>
    </div>
  );
}
