import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CleanupDuplicateAmazonButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-amazon-account', {
        body: {
          oldAccountId: '2222a2e8-ad6e-424a-b8d2-4e90d02bc292'
        }
      });

      if (error) throw error;

      toast.success(`Cleanup complete: ${data.deletedTransactions} duplicate transactions removed`);
      
      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCleanup}
      disabled={isLoading}
      variant="destructive"
      size="sm"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {isLoading ? 'Cleaning...' : 'Clean Duplicate Amazon Data'}
    </Button>
  );
}
