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

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "File size exceeds 20MB limit. Please use a smaller file."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64 for AI processing (works for both PDFs and images)
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

    console.log("Document converted to base64, size:", base64.length);

    // Determine MIME type for data URL
    let mimeType = file.type;
    if (!mimeType || mimeType === '') {
      // Infer from extension
      if (file.name.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (file.name.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (file.name.toLowerCase().endsWith('.webp')) {
        mimeType = 'image/webp';
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    const messageContent = [
      {
        type: "text",
        text: "Extract ONLY vendor name, total amount, documentType, and the COMPLETE line items from this document. The input may be a multi‑page PDF or a tall stitched image containing multiple pages stacked vertically.\n\nAbsolute rules:\n- Do NOT extract or return any PO/Order/Sales Order/Invoice/Ref numbers; set poName to an empty string \"\".\n- Focus on the line items table(s). SCAN THE ENTIRE IMAGE from top to bottom, including lower sections after totals/footers and across stitched pages.\n- When descriptions wrap across lines, concatenate them into a single productName, preserving punctuation and hyphens.\n\nDOCUMENT TYPE DETECTION (priority order):\n1. 'Sales Order'/'SO' → sales_order\n2. 'INVOICE' (not Pro-forma) → invoice\n3. 'Pro-forma/Proforma' → proforma_invoice\n4. 'Purchase Order'/'PO' → purchase_order\n5. Default → purchase_order\n\nTOTAL AMOUNT:\n- Return the FINAL payable amount: labels 'Total', 'Grand Total', 'Amount Due', 'Balance Due', 'Total Payable', 'Total Price'.\n- Ignore 'Subtotal', 'Discount', 'Deposit', 'Tax/VAT', 'Shipping/Handling', 'Adjustment', 'Credit'.\n- If multiple totals, use the LAST valid final amount.\n- Return as plain number string without symbols/commas, e.g. 13992.00.\n\nLINE ITEMS (critical):\n- Table headers may include: 'Item', 'Item ID', 'Item No.', 'Description', 'SKU', 'UPC Code', 'Product', 'Qty', 'Quantity', 'Qty Ordered'.\n- For EACH row, return:\n  - sku: value from 'Item ID'/'Item No.'/'SKU'/'UPC Code'/'Product Code'.\n  - productName: the FULL text from 'Item'/'Description'/'Product' (merge wrapped lines).\n  - quantity: numeric from 'Qty'/'Quantity' (strip commas; default 1 if missing).\n- Remove thousands separators in quantity (e.g., '1,200' → 1200).\n- Do not drop ANY rows. If multiple tables appear across pages, MERGE all rows into one array.\n\nDESCRIPTION FIELD (fill reliably):\n- Always set the top-level 'description'.\n- If line items are found, set description to a concise summary of the first 1–3 productName values joined by '; ' (no SKUs or codes).\n- If no line items can be parsed, set description to the clearest visible product/description text block (e.g., a standalone \"Description\" or \"Items\" section), trimming extra whitespace.\n\nREGO TRADING SPECIFICS:\n- If the document is from ReGo Trading, set vendorName to 'ReGo Trading' when a 'ReGo' header/logo/text is present.\n- ReGo rows often look like: Item ID like '2204-...' and Item like 'Air Wick Freshmatic Ultra - ...'.\n- Set productName to the entire 'Item' cell text verbatim (include hyphenated continuations).\n- sku should be the full Item ID string (e.g., '2204-62338-82314').\n\nVENDOR AND TERMS (optional):\n- For vendorName, prefer in order: 'Ordered From', 'From', 'Vendor', 'Supplier', 'Sold By', 'Issued By', 'Ship From', 'Company'.\n- Extract payment terms (Net 30/60/90 or immediate), due date, delivery date, category (Inventory, Packaging Materials, Marketing/PPC, Shipping & Logistics, Professional Services, Other), and notes when present.\n\nOutput to function 'extract_purchase_order'. Ensure lineItems[].productName is always populated; set poName to \"\". If no line‑item table exists at all, it's acceptable to return an empty lineItems array, but if rows are visible anywhere in the image, include them all."
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`
        }
      }
    ];

    console.log("Sending to AI for extraction");

    // Choose the most capable model for both PDFs and images to maximize table/line item extraction
    const modelName = 'google/gemini-2.5-pro';
    console.log("Using model:", modelName, "for mimeType:", mimeType);

    // Use Lovable AI Gateway with proper document/image handling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: messageContent
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
                  documentType: {
                    type: "string",
                    enum: ["sales_order", "invoice", "proforma_invoice", "purchase_order"],
                    description: "Type of document: 'sales_order', 'invoice' (only for documents explicitly labeled INVOICE), 'proforma_invoice', or 'purchase_order'"
                  },
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
                  lineItems: {
                    type: "array",
                    description: "Array of line items with product details",
                    items: {
                      type: "object",
                      properties: {
                        sku: {
                          type: "string",
                          description: "Product SKU or item code"
                        },
                        productName: {
                          type: "string",
                          description: "Product name or description"
                        },
                        quantity: {
                          type: "number",
                          description: "Quantity ordered"
                        }
                      },
                      required: ["productName"]
                    }
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
      
      // Parse error details if available
      let errorMessage = "AI service error";
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        errorMessage = errorText;
      }

      // Retry once with Pro model if extraction failed and Pro wasn't used yet
      if (response.status === 400 && errorMessage.includes("extract") && modelName !== "google/gemini-2.5-pro") {
        try {
          console.log("Retrying with pro model due to image extraction failure");
          const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages: [
                {
                  role: "user",
                  content: messageContent
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
                        documentType: {
                          type: "string",
                          enum: ["sales_order", "invoice", "proforma_invoice", "purchase_order"],
                          description: "Type of document: 'sales_order', 'invoice' (only for documents explicitly labeled INVOICE), 'proforma_invoice', or 'purchase_order'"
                        },
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
                        lineItems: {
                          type: "array",
                          description: "Array of line items with product details",
                          items: {
                            type: "object",
                            properties: {
                              sku: {
                                type: "string",
                                description: "Product SKU or item code"
                              },
                              productName: {
                                type: "string",
                                description: "Product name or description"
                              },
                              quantity: {
                                type: "number",
                                description: "Quantity ordered"
                              }
                            },
                            required: ["productName"]
                          }
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

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log("AI Response received after retry");
            const toolCallRetry = retryData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCallRetry?.function?.arguments) {
              const extractedData = JSON.parse(toolCallRetry.function.arguments);
              console.log("Extracted PO data (retry):", extractedData);
              return new Response(
                JSON.stringify({ success: true, data: extractedData }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              console.error("No tool call in retry response:", JSON.stringify(retryData.choices?.[0]?.message));
            }
          } else {
            const rt = await retryResponse.text();
            console.error("Retry AI gateway error:", retryResponse.status, rt);
          }
        } catch (retryErr) {
          console.error("Retry with pro model failed:", retryErr);
        }
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Rate limit exceeded. Please try again in a few moments." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Your workspace is out of AI credits. Please add more credits in Settings → Workspace → Usage to continue using AI document extraction." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400 && errorMessage.includes("extract")) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Unable to process this document. Please ensure it's a clear, readable PDF or image file (PNG, JPG, WEBP). Try converting scanned PDFs to high-quality images." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to process document: ${errorMessage}` 
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
