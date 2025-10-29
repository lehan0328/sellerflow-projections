import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Plus, Trash2, Search, Upload, Loader2, FileText } from "lucide-react";
import { format, addDays, parse } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSubscription } from "@/hooks/useSubscription";
import { VendorForm } from "./vendor-form";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { AddCategoryDialog } from "./add-category-dialog";
import { hasPlanAccess } from "@/lib/planUtils";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useNavigate } from "react-router-dom";
interface Vendor {
  id: string;
  name: string;
  paymentType?: string;
  paymentMethod?: string;
  netTermsDays?: string | number;
  category?: string;
}
interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  onSubmitOrder: (orderData: any) => void;
  onDeleteAllVendors?: () => void;
  onAddVendor: (vendorData: any) => void;
}
interface PaymentSchedule {
  id: string;
  amount: string;
  dueDate: Date | undefined;
  description: string;
}
export const PurchaseOrderForm = ({
  open,
  onOpenChange,
  vendors,
  onSubmitOrder,
  onDeleteAllVendors,
  onAddVendor
}: PurchaseOrderFormProps) => {
  const navigate = useNavigate();
  const { categories, addCategory, refetch: refetchCategories } = useCategories('expense');
  const {
    creditCards
  } = useCreditCards();
  const subscription = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    poName: "",
    vendor: "",
    vendorId: "",
    amount: "",
    poDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    dueDate: undefined as Date | undefined,
    deliveryDate: undefined as Date | undefined,
    description: "",
    category: "",
    notes: "",
    paymentType: "due-upon-order" as "due-upon-order" | "net-terms" | "preorder" | "due-upon-delivery",
    netTermsDays: "30" as "30" | "60" | "90" | "custom",
    customDays: "",
    paymentMethod: "bank-transfer" as "bank-transfer" | "credit-card",
    selectedCreditCard: "",
    splitPayment: false,
    documentType: "purchase_order" as "sales_order" | "invoice" | "proforma_invoice" | "purchase_order"
  });
  const [cardSplits, setCardSplits] = useState<Array<{
    cardId: string;
    amount: string;
  }>>([{
    cardId: "",
    amount: ""
  }]);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([{
    id: "1",
    amount: "",
    dueDate: undefined,
    description: "Initial deposit"
  }]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [extractedVendorName, setExtractedVendorName] = useState<string>("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [saveToStorage, setSaveToStorage] = useState(() => {
    const saved = localStorage.getItem('po-save-to-storage');
    return saved !== null ? saved === 'true' : true;
  });

  // Date picker states
  const [isPODatePickerOpen, setIsPODatePickerOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [isDeliveryDatePickerOpen, setIsDeliveryDatePickerOpen] = useState(false);
  const [openPaymentDatePickers, setOpenPaymentDatePickers] = useState<Record<string, boolean>>({});

  // Ensure newly added category appears immediately even before realtime refresh
  const combinedCategories = React.useMemo(() => {
    const name = formData.category?.trim();
    if (name && !categories.some(c => c.name.toLowerCase().trim() === name.toLowerCase())) {
      return [
        ...categories,
        { id: `temp-${name}`, name, type: 'expense', is_default: false } as any,
      ];
    }
    return categories;
  }, [categories, formData.category]);

  // Get unique vendors first, then filter and sort alphabetically
  const uniqueVendors = vendors.filter((vendor, index, self) => index === self.findIndex(v => v.id === vendor.id)).sort((a, b) => a.name.localeCompare(b.name));

  // Filter unique vendors based on search term
  const filteredVendors = uniqueVendors.filter(vendor => vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()));

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Refetch categories to ensure newly added categories are available
      refetchCategories();
      
      setFormData({
        poName: "",
        vendor: "",
        vendorId: "",
        amount: "",
        poDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        dueDate: undefined,
        deliveryDate: undefined,
        description: "",
        category: "",
        notes: "",
        paymentType: "due-upon-order",
        netTermsDays: "30",
        customDays: "",
        paymentMethod: "bank-transfer",
        selectedCreditCard: "",
        splitPayment: false,
        documentType: "purchase_order"
      });
      setCardSplits([{
        cardId: "",
        amount: ""
      }]);
      setPaymentSchedule([{
        id: "1",
        amount: "",
        dueDate: undefined,
        description: "Initial deposit"
      }]);
      setVendorSearchTerm("");
    }
  }, [open]);

  // Refresh categories when closing the Vendor form to reflect newly added categories immediately
  useEffect(() => {
    if (!showVendorForm && open) {
      refetchCategories();
    }
  }, [showVendorForm, open]);

  // Auto-update vendorId and category when a matching vendor is found (after adding new vendor)
  useEffect(() => {
    if (formData.vendor && !formData.vendorId) {
      const matchingVendor = vendors.find(v => v.name === formData.vendor);
      if (matchingVendor) {
        setFormData(prev => ({
          ...prev,
          vendorId: matchingVendor.id,
          // Only update category if we have a category from vendor or if current category is empty
          category: matchingVendor.category || prev.category || "",
          paymentType: mapVendorPaymentType(matchingVendor.paymentType),
          paymentMethod: matchingVendor.paymentMethod === "credit-card" ? "credit-card" : "bank-transfer",
          netTermsDays: mapNetTermsDays(matchingVendor.netTermsDays),
          customDays: isCustomNetTerms(matchingVendor.netTermsDays) ? matchingVendor.netTermsDays?.toString() || "" : ""
        }));
      }
    }
  }, [vendors, formData.vendor, formData.vendorId]);
  const handleVendorSelect = (vendor: Vendor) => {
    console.log('Selected vendor:', vendor);
    setFormData(prev => ({
      ...prev,
      vendor: vendor.name,
      vendorId: vendor.id,
      category: vendor.category || "",
      paymentType: mapVendorPaymentType(vendor.paymentType),
      paymentMethod: vendor.paymentMethod === "credit-card" ? "credit-card" : "bank-transfer",
      netTermsDays: mapNetTermsDays(vendor.netTermsDays),
      customDays: isCustomNetTerms(vendor.netTermsDays) ? vendor.netTermsDays?.toString() || "" : ""
    }));
    setVendorSearchTerm(vendor.name);
    setShowVendorDropdown(false);
  };
  const mapVendorPaymentType = (vendorPaymentType?: string): "due-upon-order" | "net-terms" | "preorder" | "due-upon-delivery" => {
    switch (vendorPaymentType) {
      case 'net-terms':
        return 'net-terms';
      case 'preorder':
        return 'preorder';
      case 'due-upon-delivery':
        return 'due-upon-delivery';
      default:
        return 'due-upon-order';
    }
  };
  const mapNetTermsDays = (days?: string | number): "30" | "60" | "90" | "custom" => {
    const dayString = days?.toString();
    if (dayString === "30" || dayString === "60" || dayString === "90") {
      return dayString as "30" | "60" | "90";
    }
    return dayString ? "custom" : "30";
  };
  const isCustomNetTerms = (days?: string | number): boolean => {
    const dayString = days?.toString();
    return dayString ? !["30", "60", "90"].includes(dayString) : false;
  };
  const calculateDueDate = (): Date | undefined => {
    switch (formData.paymentType) {
      case "due-upon-order":
        return formData.poDate;
      case "net-terms":
        const days = formData.netTermsDays === "custom" ? parseInt(formData.customDays) || 0 : parseInt(formData.netTermsDays);
        return addDays(formData.poDate, days);
      case "due-upon-delivery":
        return formData.deliveryDate;
      case "preorder":
        return undefined;
      // Due dates are in payment schedule
      default:
        return formData.poDate;
    }
  };
  const addPayment = () => {
    // Calculate remaining balance
    const totalAmount = parseFloat(formData.amount) || 0;
    const paidAmount = paymentSchedule.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remainingBalance = Math.max(0, totalAmount - paidAmount);

    const newPayment: PaymentSchedule = {
      id: Date.now().toString(),
      amount: remainingBalance > 0 ? remainingBalance.toFixed(2) : "",
      dueDate: undefined,
      description: "Remaining Balance"
    };
    setPaymentSchedule([...paymentSchedule, newPayment]);
  };
  const removePayment = (id: string) => {
    if (paymentSchedule.length > 1) {
      setPaymentSchedule(paymentSchedule.filter(p => p.id !== id));
    }
  };
  const updatePayment = (id: string, field: keyof PaymentSchedule, value: any) => {
    const updatedSchedule = paymentSchedule.map(p => p.id === id ? {
      ...p,
      [field]: value
    } : p);
    
    // If amount was updated, recalculate the last payment's remaining balance
    if (field === "amount") {
      const totalAmount = parseFloat(formData.amount) || 0;
      const lastPaymentIndex = updatedSchedule.length - 1;
      
      // Calculate sum of all payments except the last one
      const paidAmountExceptLast = updatedSchedule.slice(0, -1).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const remainingBalance = Math.max(0, totalAmount - paidAmountExceptLast);
      
      // Update the last payment if it has "Remaining Balance" description
      if (updatedSchedule[lastPaymentIndex]?.description === "Remaining Balance") {
        updatedSchedule[lastPaymentIndex].amount = remainingBalance > 0 ? remainingBalance.toFixed(2) : "";
      }
    }
    
    setPaymentSchedule(updatedSchedule);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poName || !formData.vendor || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check credit card availability and limits if using credit card
    if (formData.paymentMethod === "credit-card") {
      if (formData.splitPayment) {
        // Validate split payment amounts
        const splitTotal = cardSplits.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
        const orderAmount = parseFloat(formData.amount) || 0;
        if (splitTotal !== orderAmount) {
          toast.error(`Split total ($${splitTotal.toFixed(2)}) must equal order amount ($${orderAmount.toFixed(2)})`);
          return;
        }

        // Check if all cards are selected
        if (cardSplits.some(s => !s.cardId || !s.amount)) {
          toast.error('Please select a card and amount for each split');
          return;
        }
      } else {
        if (!formData.selectedCreditCard) {
          toast.error('Please select a credit card for payment');
          return;
        }
        const selectedCard = creditCards.find(card => card.id === formData.selectedCreditCard);
        const orderAmount = parseFloat(formData.amount) || 0;
        if (selectedCard && selectedCard.available_credit < orderAmount) {
          toast.error(`Insufficient credit limit. Available: $${selectedCard.available_credit.toFixed(2)}, Required: $${orderAmount.toFixed(2)}`);
          return;
        }
      }
    }
    const calculatedDueDate = calculateDueDate();
    const orderData = {
      ...formData,
      dueDate: calculatedDueDate,
      paymentSchedule: formData.paymentType === "preorder" ? paymentSchedule : undefined
    };
    console.log("Submitting purchase order:", orderData);
    onSubmitOrder(orderData);

    // Save uploaded document to storage if exists and toggle is on
    if (uploadedFile && saveToStorage) {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's account_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', user.id)
          .single();
        
        if (profileError || !profile?.account_id) {
          throw new Error('Could not fetch user account');
        }

        // Create a safe filename using PO name
        const fileExtension = uploadedFile.name.split('.').pop();
        const safeFileName = `${formData.poName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${fileExtension}`;
        const filePath = `${profile.account_id}/${safeFileName}`;

        // Upload to storage
        const {
          error: uploadError
        } = await supabase.storage.from('purchase-orders').upload(filePath, uploadedFile);
        if (uploadError) throw uploadError;

        // Save metadata
        const {
          error: metadataError
        } = await supabase.from('documents_metadata').insert({
          user_id: user.id,
          account_id: profile.account_id,
          file_name: safeFileName,
          file_path: filePath,
          display_name: formData.poName,
          description: formData.description,
          notes: formData.notes,
          vendor_id: formData.vendorId || null,
          amount: parseFloat(formData.amount),
          document_date: formData.poDate.toISOString().split('T')[0],
          document_type: formData.documentType || 'purchase_order'
        });
        if (metadataError) throw metadataError;
        console.log('Document saved to storage:', safeFileName);
      } catch (error) {
        console.error('Error saving document:', error);
        toast.error('Failed to save document to storage');
      }
    }
    toast.success(`Purchase Order "${formData.poName}" created successfully!`);
    onOpenChange(false);
  };
  const handleDeleteAllVendors = () => {
    if (onDeleteAllVendors) {
      onDeleteAllVendors();
      toast.success("All vendors deleted successfully!");
    }
    setShowDeleteAllDialog(false);
  };
  const handleAddVendorFromForm = async (vendorData: any) => {
    try {
      // Calculate due date based on payment terms
      let dueDate = new Date();
      if (vendorData.paymentType === 'net-terms' && vendorData.netTermsDays) {
        const days = parseInt(vendorData.netTermsDays);
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
      }
      await onAddVendor({
        name: vendorData.name,
        totalOwed: 0,
        nextPaymentDate: dueDate,
        nextPaymentAmount: 0,
        status: 'upcoming',
        category: vendorData.category || '',
        paymentType: vendorData.paymentType,
        paymentMethod: vendorData.paymentMethod, // Save payment method
        netTermsDays: vendorData.netTermsDays,
        source: 'management'
      });

      // Auto-select the newly created vendor
      setFormData(prev => ({
        ...prev,
        vendor: vendorData.name,
        vendorId: '',
        // Will be updated when vendors refresh
        category: vendorData.category || '',
        paymentType: mapVendorPaymentType(vendorData.paymentType),
        paymentMethod: vendorData.paymentMethod === 'credit-card' ? 'credit-card' : 'bank-transfer', // Auto-select payment method
        netTermsDays: mapNetTermsDays(vendorData.netTermsDays),
        customDays: isCustomNetTerms(vendorData.netTermsDays) ? vendorData.netTermsDays?.toString() || '' : ''
      }));
      setVendorSearchTerm(vendorData.name);
      setShowVendorForm(false);
      setExtractedVendorName(""); // Clear extracted name after successful addition
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast.error('Failed to create vendor. Please try again.');
    }
  };
  const handleGoToVendorManagement = () => {
    onOpenChange(false);
    // Navigate to Settings page where vendor management is located
    navigate('/settings');
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if user has access to PDF extractor (growing, professional plans)
    const hasAccess = hasPlanAccess(subscription.plan, 'growing');
    if (!hasAccess) {
      setShowUpgradeModal(true);
      return;
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Store the file for later upload when PO is finalized
    setUploadedFile(file);
    setIsProcessingDocument(true);
    setUploadedFileName(file.name);
    try {
      // Create form data
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      // Call the edge function
      const {
        data,
        error
      } = await supabase.functions.invoke('parse-purchase-order', {
        body: formDataToSend
      });

      // Check for edge function invocation errors
      if (error) {
        console.error('Edge function invocation error:', error);
        toast.error('Failed to process document. Please try again.');
        return;
      }

      // Check for application-level errors in the response
      if (data?.error || !data?.success) {
        toast.error(data?.error || 'Could not extract purchase order data from document');
        return;
      }
      if (data.success && data.data) {
        const extracted = data.data;
        console.log("Extracted data from document:", extracted);

        // Auto-fill form fields with extracted data
        setFormData(prev => ({
          ...prev,
          poName: extracted.poName || prev.poName,
          amount: extracted.amount || prev.amount,
          description: extracted.description || prev.description,
          category: extracted.category || prev.category,
          notes: extracted.notes || prev.notes,
          netTermsDays: extracted.netTermsDays || prev.netTermsDays,
          dueDate: extracted.dueDate ? parse(extracted.dueDate, 'yyyy-MM-dd', new Date()) : prev.dueDate,
          deliveryDate: extracted.deliveryDate ? parse(extracted.deliveryDate, 'yyyy-MM-dd', new Date()) : prev.deliveryDate,
          documentType: extracted.documentType || prev.documentType
        }));

        // Try to match vendor name
        if (extracted.vendorName) {
          const matchedVendor = vendors.find(v => v.name.toLowerCase().includes(extracted.vendorName.toLowerCase()) || extracted.vendorName.toLowerCase().includes(v.name.toLowerCase()));
          if (matchedVendor) {
            handleVendorSelect(matchedVendor);
            toast.success(`✓ Document processed! Matched vendor: ${matchedVendor.name}. Please review and confirm details.`);
          } else {
            // Set vendor search term for user to select or create
            setVendorSearchTerm(extracted.vendorName);
            setExtractedVendorName(extracted.vendorName); // Store for vendor form
            setShowVendorDropdown(true); // Open dropdown to show "Add vendor" option
            toast.info(`✓ Document processed! Extracted vendor: "${extracted.vendorName}". Please select or create this vendor below, then review all details before submitting.`);
          }
        } else {
          toast.success('✓ Document processed! Form auto-filled with extracted data. Please select a vendor and review all details.');
        }
      } else {
        toast.error('Could not extract purchase order data from document');
      }
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(error.message || 'Failed to process document. Please try again.');
    } finally {
      setIsProcessingDocument(false);
    }
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", !formData.vendorId ? "max-w-lg" : "max-w-3xl w-full")}>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">
              Add Purchase Order
            </DialogTitle>
          </DialogHeader>
          
          {/* Step 1: Vendor Selection */}
          {!formData.vendorId && <div className="space-y-6 pt-2">
              <div className="text-center py-2">
                <h3 className="text-lg font-semibold mb-1">Select a Vendor</h3>
                <p className="text-sm text-muted-foreground">Choose a vendor to create a purchase order</p>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="vendor" className="text-sm font-medium">Vendor *</Label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <div className="relative">
                      <Input placeholder="Search or select vendor..." value={vendorSearchTerm} onChange={e => {
                    setVendorSearchTerm(e.target.value);
                    if (e.target.value) setShowVendorDropdown(true);
                  }} onClick={() => setShowVendorDropdown(true)} className="pr-8" />
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {showVendorDropdown && <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredVendors.length === 0 ? <div className="p-3 text-sm text-muted-foreground text-center bg-background">
                            {vendorSearchTerm ? <div className="space-y-2">
                                <div>No vendors found matching your search</div>
                                 <Button size="sm" variant="outline" onClick={() => setShowVendorForm(true)} className="text-xs">
                                   Add "{vendorSearchTerm}" as new vendor
                                 </Button>
                              </div> : <div className="space-y-2">
                                <div>No vendors available</div>
                                 <Button size="sm" variant="outline" onClick={() => setShowVendorForm(true)} className="text-xs">
                                   Create Your First Vendor
                                 </Button>
                              </div>}
                          </div> : filteredVendors.map(vendor => <div key={vendor.id} className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-b-0 bg-background" onClick={() => handleVendorSelect(vendor)}>
                              <div className="font-medium">{vendor.name}</div>
                              {vendor.category && <div className="text-xs text-muted-foreground">{vendor.category}</div>}
                            </div>)}
                      </div>}
                  </div>
                  
                  <Button type="button" variant="outline" onClick={() => setShowVendorForm(true)} className="px-3 shadow-sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">
                    Or upload document
                  </span>
                </div>
              </div>

              {/* AI Document Upload */}
              <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="save-toggle" className="text-xs font-medium cursor-pointer">
                        Save to Document Storage
                      </Label>
                    </div>
                    <Switch id="save-toggle" checked={saveToStorage} onCheckedChange={checked => {
                  setSaveToStorage(checked);
                  localStorage.setItem('po-save-to-storage', String(checked));
                }} />
                  </div>
                  <div className="text-center space-y-2.5">
                    <div className="flex justify-center">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Upload Purchase Order Document</h4>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Let AI automatically fill the form from your document
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG, JPEG, WEBP
                    </p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileUpload} className="hidden" />
                  <Button 
                    type="button" 
                    variant="default"
                    onClick={() => {
                      if (!hasPlanAccess(subscription.plan, 'growing')) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      fileInputRef.current?.click();
                    }} 
                    disabled={isProcessingDocument} 
                    className="w-full shadow-sm h-9"
                  >
                    {isProcessingDocument ? <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Processing {uploadedFileName}...
                      </> : <>
                        <Upload className="h-3.5 w-3.5 mr-2" />
                        Upload Document
                      </>}
                  </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>}

          {/* Step 2: Purchase Order Details */}
          {formData.vendorId && <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Selected Vendor Display */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Selected Vendor</div>
                      <div className="font-semibold text-base">{formData.vendor}</div>
                      {formData.category && <div className="text-sm text-muted-foreground mt-0.5">{formData.category}</div>}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  vendor: "",
                  vendorId: ""
                }));
                setVendorSearchTerm("");
              }} className="shadow-sm">
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

            {/* PO Name and Amount in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poName" className="text-sm font-medium">PO Name *</Label>
                <Input id="poName" placeholder="e.g., Q1 Inventory Restock" value={formData.poName} onChange={e => setFormData(prev => ({
                ...prev,
                poName: e.target.value
              }))} required className="h-10" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">Total Amount *</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({
                ...prev,
                amount: e.target.value
              }))} required className="h-10" />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category *</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setShowAddCategory(true);
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      category: value
                    }));
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <div className="border-b pb-1 mb-1">
                    <SelectItem value="__add_new__" className="text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Category
                      </div>
                    </SelectItem>
                  </div>
                  {combinedCategories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.name}</span>
                        {category.is_default && (
                          <span className="text-xs text-muted-foreground ml-2">(default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AddCategoryDialog
              open={showAddCategory}
              onOpenChange={setShowAddCategory}
              onAddCategory={async (name) => {
                await addCategory(name);
                await refetchCategories();
                setFormData(prev => ({
                  ...prev,
                  category: name
                }));
              }}
              type="expense"
            />

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Brief description of the purchase order..." 
                value={formData.description} 
                onChange={e => setFormData(prev => ({
                  ...prev,
                  description: e.target.value
                }))} 
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes(optional)</Label>
              <Textarea id="notes" placeholder="Additional notes or comments" value={formData.notes} onChange={e => setFormData(prev => ({
              ...prev,
              notes: e.target.value
            }))} rows={2} />
            </div>
            
            {/* PO Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">PO Date *</Label>
              <Popover open={isPODatePickerOpen} onOpenChange={setIsPODatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.poDate ? format(formData.poDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50">
                  <Calendar mode="single" selected={formData.poDate} onSelect={date => {
                  setFormData(prev => ({
                    ...prev,
                    poDate: date || new Date(new Date().setDate(new Date().getDate() + 1))
                  }));
                  setIsPODatePickerOpen(false);
                }} disabled={(date) => date <= new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className={cn("pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Terms */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Payment Terms</Label>
              <RadioGroup value={formData.paymentType} onValueChange={value => setFormData(prev => ({
              ...prev,
              paymentType: value as any
            }))} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="due-upon-order" id="due-upon-order" />
                  <Label htmlFor="due-upon-order" className="text-sm">Due Upon Order</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="net-terms" id="net-terms" />
                  <Label htmlFor="net-terms" className="text-sm">Net Terms</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="preorder" id="preorder" />
                  <Label htmlFor="preorder" className="text-sm">Preorder</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="due-upon-delivery" id="due-upon-delivery" />
                  <Label htmlFor="due-upon-delivery" className="text-sm">Due Upon Delivery</Label>
                </div>
              </RadioGroup>

              {/* Payment Due Date Display - for non net-terms payment types */}
              {formData.paymentType !== "net-terms" && (() => {
              const calculatedDueDate = calculateDueDate();
              if (calculatedDueDate) {
                return <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-primary" />
                          <span className="text-base font-semibold text-foreground">Payment Due Date:</span>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {format(calculatedDueDate, "PPP")}
                        </span>
                      </div>
                    </div>;
              } else if (formData.paymentType === "preorder") {
                return <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <div className="text-sm font-medium text-center text-muted-foreground">
                        Due dates will be set in payment schedule below
                      </div>
                    </div>;
              } else if (formData.paymentType === "due-upon-delivery" && !formData.deliveryDate) {
                return <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <div className="text-sm font-medium text-center text-muted-foreground">
                        Select delivery date below to calculate due date
                      </div>
                    </div>;
              }
              return null;
            })()}

              {/* Net Terms Days */}
              {formData.paymentType === "net-terms" && <div className="space-y-2">
                  <Label>Net Terms Days</Label>
                  <Select value={formData.netTermsDays} onValueChange={value => setFormData(prev => ({
                ...prev,
                netTermsDays: value as any
              }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Net 30</SelectItem>
                      <SelectItem value="60">Net 60</SelectItem>
                      <SelectItem value="90">Net 90</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.netTermsDays === "custom" && <Input type="number" placeholder="Enter custom days" value={formData.customDays} onChange={e => setFormData(prev => ({
                ...prev,
                customDays: e.target.value
              }))} />}
                  
                  {/* Payment Due Date Display for Net Terms */}
                  {(() => {
                const calculatedDueDate = calculateDueDate();
                if (calculatedDueDate) {
                  return <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Payment Due Date:</span>
                          <span className="text-sm font-semibold text-accent-foreground">
                            {format(calculatedDueDate, "PPP")}
                          </span>
                        </div>
                      </div>;
                }
                return null;
              })()}
                </div>}

              {/* Delivery Date for Due Upon Delivery */}
              {formData.paymentType === "due-upon-delivery" && <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Popover open={isDeliveryDatePickerOpen} onOpenChange={setIsDeliveryDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.deliveryDate ? format(formData.deliveryDate, "PPP") : "Pick delivery date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50">
                      <Calendar mode="single" selected={formData.deliveryDate} onSelect={date => {
                    setFormData(prev => ({
                      ...prev,
                      deliveryDate: date
                    }));
                    setIsDeliveryDatePickerOpen(false);
                  }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>}
            </div>

            {/* Preorder Payment Schedule */}
            {formData.paymentType === "preorder" && <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Payment Schedule</Label>
                  <Button type="button" onClick={addPayment} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {paymentSchedule.map((payment, index) => <Card key={payment.id}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Payment {index + 1}</Label>
                          {paymentSchedule.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removePayment(payment.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>}
                        </div>
                        
                        <Input placeholder="Description" value={payment.description} onChange={e => updatePayment(payment.id, "description", e.target.value)} />
                        
                        <Input type="number" step="0.01" placeholder="Amount" value={payment.amount} onChange={e => updatePayment(payment.id, "amount", e.target.value)} />
                        
                        <Popover open={openPaymentDatePickers[payment.id]} onOpenChange={open => setOpenPaymentDatePickers(prev => ({
                    ...prev,
                    [payment.id]: open
                  }))}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payment.dueDate ? format(payment.dueDate, "PPP") : "Pick due date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50">
                            <Calendar mode="single" selected={payment.dueDate} onSelect={date => {
                        updatePayment(payment.id, "dueDate", date);
                        setOpenPaymentDatePickers(prev => ({
                          ...prev,
                          [payment.id]: false
                        }));
                      }} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </CardContent>
                    </Card>)}
                </div>
              </div>}

            {/* Payment Method Section */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <input type="radio" id="bank-transfer-po" name="paymentMethodPO" value="bank-transfer" checked={formData.paymentMethod === "bank-transfer"} onChange={e => setFormData(prev => ({
                  ...prev,
                  paymentMethod: e.target.value as "bank-transfer" | "credit-card"
                }))} className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" />
                  <Label htmlFor="bank-transfer-po" className="text-sm font-normal cursor-pointer">
                    Bank Transfer
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input type="radio" id="credit-card-po" name="paymentMethodPO" value="credit-card" checked={formData.paymentMethod === "credit-card"} onChange={e => setFormData(prev => ({
                  ...prev,
                  paymentMethod: e.target.value as "bank-transfer" | "credit-card"
                }))} className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary" />
                  <Label htmlFor="credit-card-po" className="text-sm font-normal cursor-pointer">
                    Credit Card
                  </Label>
                </div>
              </div>

              {/* Credit Card Selection */}
              {formData.paymentMethod === "credit-card" && <div className="space-y-3 p-4 bg-accent/10 rounded-lg border">
                  {/* Split Payment Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="split-payment">Split between multiple cards</Label>
                    <Switch id="split-payment" checked={formData.splitPayment} onCheckedChange={checked => {
                  setFormData(prev => ({
                    ...prev,
                    splitPayment: checked
                  }));
                  if (!checked) {
                    setCardSplits([{
                      cardId: "",
                      amount: ""
                    }]);
                  }
                }} />
                  </div>

                  {!formData.splitPayment ?
              // Single Card Selection
              <>
                      <div className="space-y-2">
                        <Label>Select Credit Card</Label>
                        <Select value={formData.selectedCreditCard} onValueChange={value => setFormData(prev => ({
                    ...prev,
                    selectedCreditCard: value
                  }))}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Choose a credit card" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {creditCards.filter(card => card.is_active).sort((a, b) => (a.priority || 3) - (b.priority || 3)).map(card => <SelectItem key={card.id} value={card.id}>
                                <div className="flex items-center gap-2 w-full">
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    {card.priority || 3}
                                  </span>
                                  <span className="font-medium">{card.account_name}</span>
                                  <span className="text-sm text-muted-foreground ml-auto">
                                    ${card.available_credit.toLocaleString()}
                                  </span>
                                </div>
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Credit Card Info */}
                      {formData.selectedCreditCard && (() => {
                  const selectedCard = creditCards.find(card => card.id === formData.selectedCreditCard);
                  const orderAmount = parseFloat(formData.amount) || 0;
                  const remainingCredit = selectedCard ? selectedCard.available_credit - orderAmount : 0;
                  const hasInsufficientCredit = selectedCard ? selectedCard.available_credit < orderAmount : false;
                  return selectedCard ? <div className="space-y-2">
                            <div className="text-sm">
                              <div className="flex justify-between">
                                <span>Credit Limit:</span>
                                <span className="font-medium">${selectedCard.credit_limit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Available Credit:</span>
                                <span className="font-medium">${selectedCard.available_credit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Order Amount:</span>
                                <span className="font-medium">${orderAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 mt-2">
                                <span>Remaining After Purchase:</span>
                                <span className={cn("font-semibold", hasInsufficientCredit ? "text-red-600" : remainingCredit < 1000 ? "text-yellow-600" : "text-green-600")}>
                                  ${remainingCredit.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            {hasInsufficientCredit && <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-red-800">
                                    Insufficient Credit Available
                                  </span>
                                </div>
                              </div>}

                            <div className="text-xs text-muted-foreground">
                              * Credit will be reserved from the purchase order date
                            </div>
                          </div> : null;
                })()}
                    </> :
              // Split Payment UI
              <div className="space-y-3">
                      <Label>Split Transaction</Label>
                      {cardSplits.map((split, index) => <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select value={split.cardId} onValueChange={value => {
                      const newSplits = [...cardSplits];
                      newSplits[index].cardId = value;
                      setCardSplits(newSplits);
                    }}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Choose card" />
                              </SelectTrigger>
                              <SelectContent className="bg-background z-50">
                                {creditCards.filter(card => card.is_active && !cardSplits.some((s, i) => i !== index && s.cardId === card.id)).sort((a, b) => (a.priority || 3) - (b.priority || 3)).map(card => <SelectItem key={card.id} value={card.id}>
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                          {card.priority || 3}
                                        </span>
                                        <span className="font-medium">{card.account_name}</span>
                                        <span className="text-sm text-muted-foreground ml-auto">
                                          ${card.available_credit.toLocaleString()}
                                        </span>
                                      </div>
                                    </SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32">
                            <Input type="number" placeholder="Amount" value={split.amount} onChange={e => {
                      const newSplits = [...cardSplits];
                      newSplits[index].amount = e.target.value;
                      setCardSplits(newSplits);
                    }} />
                          </div>
                          {cardSplits.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => {
                    setCardSplits(cardSplits.filter((_, i) => i !== index));
                  }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>}
                        </div>)}
                      
                      <Button type="button" variant="outline" size="sm" onClick={() => setCardSplits([...cardSplits, {
                  cardId: "",
                  amount: ""
                }])} disabled={cardSplits.length >= creditCards.filter(c => c.is_active).length}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Card
                      </Button>

                      {/* Split Summary */}
                      {cardSplits.some(s => s.amount) && <div className="bg-accent/20 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Total Amount:</span>
                            <span className="font-semibold">${parseFloat(formData.amount || "0").toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Split Total:</span>
                            <span className={cn("font-semibold", cardSplits.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0) === parseFloat(formData.amount || "0") ? "text-green-600" : "text-red-600")}>
                              ${cardSplits.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0).toLocaleString()}
                            </span>
                          </div>
                        </div>}
                    </div>}
                  
                  {creditCards.filter(card => card.is_active).length === 0 && <div className="text-center text-sm text-muted-foreground py-4">
                      No active credit cards found. Please add a credit card in Settings.
                    </div>}
                </div>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="shadow-sm min-w-[160px]">
                Create Purchase Order
              </Button>
            </div>
        </form>}
    </DialogContent>
  </Dialog>

  {/* Delete All Vendors Confirmation Dialog */}
  <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete All Vendors?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete all vendors and their associated data.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDeleteAllVendors} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete All Vendors
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

      <VendorForm open={showVendorForm} onOpenChange={setShowVendorForm} onAddVendor={handleAddVendorFromForm} existingVendors={uniqueVendors.map(v => ({
      name: v.name,
      id: v.id
    }))} initialVendorName={extractedVendorName} />

    <UpgradeModal 
      open={showUpgradeModal} 
      onOpenChange={setShowUpgradeModal}
      feature="AI PDF extractor"
    />

    </>;
};