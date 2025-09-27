import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useVendors } from "@/hooks/useVendors";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const DeleteAllVendorsButton = () => {
  const { vendors, deleteVendor } = useVendors();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Delete all vendors one by one
      for (const vendor of vendors) {
        await deleteVendor(vendor.id);
      }
      toast.success(`Deleted ${vendors.length} vendors successfully`);
    } catch (error) {
      console.error('Error deleting vendors:', error);
      toast.error("Failed to delete some vendors");
    } finally {
      setIsDeleting(false);
    }
  };

  if (vendors.length === 0) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="fixed top-20 right-4 z-50">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All Vendors ({vendors.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Vendors</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete all {vendors.length} vendors? This action cannot be undone.
            This will also delete all associated transactions and purchase orders.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteAll}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};