import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
}

interface SearchableVendorSelectProps {
  vendors: Vendor[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableVendorSelect = ({ 
  vendors, 
  value, 
  onValueChange, 
  placeholder = "Select vendor...",
  className 
}: SearchableVendorSelectProps) => {
  const [open, setOpen] = useState(false);

  // Get unique vendors and sort alphabetically by name
  const uniqueVendors = vendors
    .filter((vendor, index, self) => 
      index === self.findIndex(v => v.id === vendor.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Find selected vendor
  const selectedVendor = uniqueVendors.find(vendor => vendor.id === value);

  const handleSelect = (vendorId: string) => {
    
    onValueChange(vendorId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          type="button"
        >
          <span className="truncate">
            {selectedVendor ? selectedVendor.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-background text-foreground border border-border shadow-lg z-[200]"
        sideOffset={2}
        align="start"
      >
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {uniqueVendors.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No vendors found.
              </div>
            ) : (
              uniqueVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === vendor.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelect(vendor.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {vendor.name}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};