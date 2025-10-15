import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials are not configured");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get auth header for user identification
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing document:", file.name, file.type);

    // PDF files are not supported by the vision API
    // Only image formats (PNG, JPEG, WEBP, GIF) are accepted
    if (file.type === 'application/pdf') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "PDF files cannot be processed directly. The AI vision API only supports image formats (PNG, JPEG, WEBP, GIF).\n\n📸 Please convert your PDF to an image:\n• Take a screenshot (Windows: Win+Shift+S, Mac: Cmd+Shift+4)\n• Use an online PDF to JPG converter\n• Open the PDF and export/save as an image\n\nThen upload the image file instead."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file as base64 for images
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let base64 = '';
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      base64 += String.fromCharCode(...chunk);
    }
    base64 = btoa(base64);

    console.log("Sending to AI for extraction");

    // Use Gemini Flash with proper document/image handling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all purchase order and invoice information from this document. IMPORTANT: For the vendor name, check these fields in order of priority: 'From:', 'Vendor:', 'Supplier:', 'Sold By:', 'Issued By:', 'Ship From:', 'Company:'. Use whichever field is present to identify the vendor (required). Also extract: purchase order or invoice number, total amount (required), item description, payment terms (Net 30/60/90 or immediate), due date, delivery date, category (Inventory, Packaging Materials, Marketing/PPC, Shipping & Logistics, Professional Services, or Other), and additional notes."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_purchase_order",
              description: "Extract purchase order information from a document",
              parameters: {
                type: "object",
                properties: {
                  vendorName: {
                    type: "string",
                    description: "The name of the vendor/supplier"
                  },
                  poName: {
                    type: "string",
                    description: "Purchase order name, number, or invoice number"
                  },
                  amount: {
                    type: "string",
                    description: "Total amount as a number string (e.g., '1500.50')"
                  },
                  description: {
                    type: "string",
                    description: "Description of goods or services"
                  },
                  category: {
                    type: "string",
                    enum: ["Inventory", "Packaging Materials", "Marketing/PPC", "Shipping & Logistics", "Professional Services", "Other"],
                    description: "Category of purchase"
                  },
                  dueDate: {
                    type: "string",
                    description: "Due date in YYYY-MM-DD format if specified"
                  },
                  deliveryDate: {
                    type: "string",
                    description: "Delivery date in YYYY-MM-DD format if specified"
                  },
                  netTermsDays: {
                    type: "string",
                    enum: ["30", "60", "90"],
                    description: "Net payment terms in days (30, 60, or 90)"
                  },
                  notes: {
                    type: "string",
                    description: "Any additional notes or terms"
                  }
                },
                required: ["vendorName", "amount"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_purchase_order" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Rate limit exceeded. Please try again later." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Payment required. Please add credits to your workspace." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `AI service error: ${errorText}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI Response received");

    // Extract the structured data from the tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data.choices?.[0]?.message));
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Could not extract purchase order data from document. Please ensure the document contains clear purchase order or invoice information." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted PO data:", extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-purchase-order error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred while processing document"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
