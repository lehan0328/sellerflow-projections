import { Button } from "@/components/ui/button";
import { Calendar, Download, Plus, Settings, Building2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DashboardHeaderProps {
  onAddVendor: () => void;
}

export function DashboardHeader({ onAddVendor }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    const error = await signOut();
    if (!error) {
      toast.success('Signed out successfully');
      navigate('/');
    } else {
      toast.error('Failed to sign out');
    }
  };

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
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button variant="outline" size="sm" onClick={onAddVendor}>
          <Building2 className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
        <Button size="sm" className="bg-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}