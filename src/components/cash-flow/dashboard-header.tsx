import { Button } from "@/components/ui/button";
import { Calendar, Download, Plus, Settings } from "lucide-react";

export function DashboardHeader() {
  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Cash Flow Dashboard
        </h1>
        <p className="text-muted-foreground">
          Amazon seller financial management and forecasting
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" />
          Last 30 days
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button size="sm" className="bg-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>
    </div>
  );
}