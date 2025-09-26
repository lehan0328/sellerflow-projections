import { useState, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  placeholder = "Search vendors...",
  className 
}: SearchableVendorSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    return vendors.filter(vendor => 
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  // Find selected vendor
  const selectedVendor = vendors.find(vendor => vendor.id === value);

  const handleSelect = (vendorId: string) => {
    console.log("Vendor selected:", vendorId);
    onValueChange(vendorId);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span className="truncate">
            {selectedVendor ? selectedVendor.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border border-border shadow-lg z-[60]">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <ScrollArea className="max-h-64">
          {filteredVendors.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No vendors found.
            </div>
          ) : (
            <div className="p-1">
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === vendor.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(vendor.id);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {vendor.name}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};