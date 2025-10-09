import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileImage, Upload, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface PdfConverterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PdfConverterModal({ open, onOpenChange }: PdfConverterModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedImages, setConvertedImages] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setConvertedImages([]);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setConverting(true);
    setProgress(0);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        setProgress(30);

        // Call edge function to convert PDF to PNG
        const { data, error } = await supabase.functions.invoke("convert-pdf-to-png", {
          body: { 
            pdfBase64: base64.split(',')[1], // Remove data:application/pdf;base64, prefix
            fileName: selectedFile.name
          }
        });

        setProgress(70);

        if (error) {
          console.error("Conversion error:", error);
          toast.error("PDF conversion not yet available. Please upload PNG images directly.");
          return;
        }

        if (data?.error) {
          console.log("Conversion info:", data);
          toast.error(data.error, {
            description: data.suggestion || "Please use an external converter or upload PNG images directly.",
            duration: 6000
          });
          return;
        }

        if (data?.images && data.images.length > 0) {
          setConvertedImages(data.images);
          setProgress(100);
          toast.success(`Converted ${data.images.length} page(s) successfully`);
        } else {
          toast.error("No images returned from conversion");
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read PDF file");
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Failed to convert PDF");
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = (imageBase64: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageBase64;
    link.download = `${selectedFile?.name.replace('.pdf', '')}_page_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    convertedImages.forEach((image, index) => {
      setTimeout(() => handleDownload(image, index), index * 100);
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setConvertedImages([]);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileImage className="h-5 w-5" />
            <span>PDF to PNG Converter</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-primary/50 rounded-lg hover:border-primary hover:bg-primary/5 transition-all">
                  <Upload className="h-5 w-5" />
                  <span>{selectedFile ? selectedFile.name : "Choose PDF file"}</span>
                </div>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={converting}
                />
              </label>

              {selectedFile && !converting && convertedImages.length === 0 && (
                <Button onClick={handleConvert}>
                  Convert to PNG
                </Button>
              )}

              {selectedFile && convertedImages.length > 0 && (
                <div className="flex space-x-2">
                  <Button onClick={handleDownloadAll} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button onClick={handleReset} variant="ghost">
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              )}
            </div>

            {converting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Converting PDF... {progress}%
                </p>
              </div>
            )}
          </div>

          {/* Preview Section */}
          {convertedImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Converted Images ({convertedImages.length} page{convertedImages.length > 1 ? 's' : ''})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {convertedImages.map((image, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="aspect-[8.5/11] bg-muted rounded overflow-hidden">
                      <img
                        src={image}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Page {index + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(image, index)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedFile && !converting && convertedImages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Upload a PDF file to convert it to PNG images</p>
              <p className="text-sm mt-2">Each page will be converted to a separate PNG image</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
