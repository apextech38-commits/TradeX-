import { MonitorSmartphone, Puzzle, Play } from "lucide-react";
import { SiGoogledrive } from "react-icons/si";

export default function Dashboard() {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Load or build your bot</h1>
        <p className="text-muted-foreground">Choose how to get started with your trading strategy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[
          { icon: MonitorSmartphone, label: "Local", sub: "Load from your device" },
          { icon: SiGoogledrive, label: "Google Drive", sub: "Load from Google Drive" },
          { icon: Puzzle, label: "Bot Builder", sub: "Build a new bot visually" },
          { icon: Play, label: "Quick Strategy", sub: "Start with a pre-built strategy" },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className="bg-card border border-border hover:border-primary rounded-xl p-6 cursor-pointer transition-colors group shadow-sm"
          >
            <Icon className="w-10 h-10 text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{label}</h2>
            <p className="text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
