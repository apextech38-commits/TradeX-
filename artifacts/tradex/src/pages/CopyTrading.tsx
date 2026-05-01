import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CopyTrading() {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <Button
          data-testid="button-start-copy"
          className="bg-[#22C55E] hover:bg-[#16a34a] text-white h-12 px-8 text-base font-semibold rounded-lg shadow-sm"
        >
          Start Demo to Real Copy Trading
        </Button>
        <Button
          variant="outline"
          data-testid="button-tutorial"
          className="border-border text-foreground hover:bg-secondary h-12 px-8 text-base font-semibold rounded-lg"
        >
          Tutorial
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-medium">Your Token</h2>
        <div
          data-testid="text-token"
          className="bg-card border border-border rounded-lg p-4 inline-block font-mono text-xl text-foreground tracking-widest select-all shadow-sm"
        >
          CR*****
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-6">Add tokens to Replicator</h2>

        <div className="space-y-6">
          <Input
            placeholder="Enter client token"
            data-testid="input-client-token"
            className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground font-mono"
          />

          <div className="flex flex-wrap gap-3">
            <Button
              data-testid="button-add-token"
              className="bg-primary hover:bg-primary/90 text-white h-10 px-6"
            >
              Add
            </Button>
            <Button
              variant="outline"
              data-testid="button-sync"
              className="border-teal-500 text-teal-500 hover:bg-teal-500/10 h-10 px-6"
            >
              Sync
            </Button>
            <Button
              data-testid="button-start-copy-trading"
              className="bg-[#22C55E] hover:bg-[#16a34a] text-white h-10 px-6 ml-auto"
            >
              Start Copy Trading
            </Button>
          </div>

          <div className="pt-6 border-t border-border flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total Clients added:</span>
            <span className="text-foreground font-bold" data-testid="text-client-count">0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
