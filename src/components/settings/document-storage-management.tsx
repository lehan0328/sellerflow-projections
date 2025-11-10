import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export const DocumentStorageManagement = () => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch document count and total size
  const { data: storageStats, refetch } = useQuery({
    queryKey: ['document-storage-stats'],
    staleTime: 2 * 60 * 1000, // 2 minutes - storage stats change with uploads/deletes
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.account_id) throw new Error('Account not found');

      // Get document count and line items count
      const { data: docs, error: docsError } = await supabase
        .from('documents_metadata')
        .select('id, file_name')
        .eq('account_id', profile.account_id);

      if (docsError) throw docsError;

      const { data: lineItems, error: lineItemsError } = await supabase
        .from('purchase_order_line_items')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', profile.account_id);

      if (lineItemsError) throw lineItemsError;

      return {
        documentCount: docs?.length || 0,
        lineItemCount: lineItems ? (lineItems as any).count : 0
      };
    }
  });

  const handleClearDocuments = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase.rpc('clear_user_documents');
      
      if (error) throw error;

      toast.success('All documents and line items cleared successfully');
      setShowClearDialog(false);
      refetch();
    } catch (error: any) {
      console.error('Error clearing documents:', error);
      toast.error(error.message || 'Failed to clear documents');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Document Storage</CardTitle>
          <CardDescription>
            Manage your stored purchase order documents and line items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Stored Documents</p>
                <p className="text-sm text-muted-foreground">
                  {storageStats?.documentCount || 0} documents with {storageStats?.lineItemCount || 0} line items
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div>
              <p className="font-medium text-destructive">Clear All Documents</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all stored documents and their line items
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={!storageStats?.documentCount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: Clearing documents will permanently delete all uploaded files and their associated line items. This action cannot be undone.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {storageStats?.documentCount || 0} documents and {storageStats?.lineItemCount || 0} line items from storage. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDocuments}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : 'Clear All Documents'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
