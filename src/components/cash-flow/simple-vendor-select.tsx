import React, { useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  category?: string;
}

interface SimpleVendorSelectProps {
  vendors: Vendor[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleVendorSelect = ({ 
  vendors, 
  value, 
  onValueChange, 
  placeholder = "Select vendor...",
  className 
}: SimpleVendorSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Get unique vendors and sort alphabetically
  const uniqueVendors = vendors
    .filter((vendor, index, self) => 
      index === self.findIndex(v => v.id === vendor.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedVendor = uniqueVendors.find(vendor => vendor.id === value);
  
  const filteredVendors = uniqueVendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (vendorId: string) => {
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
          type="button"
        >
          <span className="truncate">
            {selectedVendor ? selectedVendor.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-background border border-border shadow-lg z-[100]"
        sideOffset={2}
        align="start"
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {filteredVendors.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No vendors found.
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
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
                  <div className="flex flex-col">
                    <span>{vendor.name}</span>
                    {vendor.category && (
                      <span className="text-xs text-muted-foreground">{vendor.category}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};