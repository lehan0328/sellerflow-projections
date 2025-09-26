import { DollarSign } from "lucide-react";

export function DemoDashboardHeader() {
  return (
    <div className="relative w-full">
      {/* Logo - Top Left */}
      <div className="absolute top-6 left-6 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CashFlow Pro
          </span>
        </div>
      </div>

      {/* Demo Badge - Top Right */}
      <div className="absolute top-6 right-6 z-40">
        <div className="px-3 py-1 bg-orange-500/20 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-full border border-orange-200 dark:border-orange-700">
          Interactive Demo
        </div>
      </div>

      {/* Centered Dashboard Title */}
      <div className="flex justify-center items-center pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Demo Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore CashFlow Pro features in this interactive demo
          </p>
        </div>
      </div>
    </div>
  );
}