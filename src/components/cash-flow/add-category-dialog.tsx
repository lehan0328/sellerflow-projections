import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCategory: (name: string) => Promise<void>;
  type: 'expense' | 'income';
}

export function AddCategoryDialog({ open, onOpenChange, onAddCategory, type }: AddCategoryDialogProps) {
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent forms
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(categoryName.trim());
      setCategoryName("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[60]">
        <DialogHeader>
          <DialogTitle>Add New {type === 'expense' ? 'Expense' : 'Income'} Category</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategoryName("");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
