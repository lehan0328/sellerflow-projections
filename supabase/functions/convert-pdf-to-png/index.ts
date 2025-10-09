import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      throw new Error("No PDF data provided");
    }

    console.log("[PDF-TO-PNG] Processing PDF:", fileName);

    // Use pdf-lib to read the PDF
    const { PDFDocument } = await import("https://cdn.skypack.dev/pdf-lib@1.17.1");
    
    // Decode base64 to bytes
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    console.log("[PDF-TO-PNG] PDF has", pages.length, "pages");

    // For now, return a message that conversion requires additional setup
    // Real conversion would need a headless browser or external service
    return new Response(
      JSON.stringify({ 
        error: "PDF to PNG conversion requires additional setup. Consider using an external tool like pdf2image or an online converter.",
        pageCount: pages.length,
        suggestion: "You can upload PNG images directly to the purchase order form."
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 501 
      }
    );
  } catch (error) {
    console.error("[PDF-TO-PNG] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process PDF" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
