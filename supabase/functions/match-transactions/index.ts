import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bankTransactions, vendors, incomeItems } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Matching transactions with AI...', {
      bankCount: bankTransactions?.length,
      vendorCount: vendors?.length,
      incomeCount: incomeItems?.length
    });

    const systemPrompt = `You are a financial transaction matching expert. Your job is to match bank transactions with vendor payments and income items.

Analyze the provided bank transactions, vendors, and income items, and identify potential matches based on:
1. Name/description similarity (fuzzy matching)
2. Amount similarity (exact or very close)
3. Transaction type (debit for vendors, credit for income)
4. Timing proximity (if dates are available)

Return matches with high confidence (60%+) only.`;

    const userPrompt = `Analyze these financial records and find matches:

BANK TRANSACTIONS:
${JSON.stringify(bankTransactions, null, 2)}

VENDORS (expenses to pay):
${JSON.stringify(vendors, null, 2)}

INCOME ITEMS (money to receive):
${JSON.stringify(incomeItems, null, 2)}

Find matches between bank transactions and vendors/income items. Consider:
- Debit bank transactions should match with vendors
- Credit bank transactions should match with income items
- Match based on description/name similarity and amount
- Only suggest matches with 60%+ confidence`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_transaction_matches',
            description: 'Return potential transaction matches',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      bankTransactionId: { type: 'string' },
                      matchedId: { type: 'string' },
                      matchType: { type: 'string', enum: ['vendor', 'income'] },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      reasoning: { type: 'string' }
                    },
                    required: ['bankTransactionId', 'matchedId', 'matchType', 'confidence', 'reasoning'],
                    additionalProperties: false
                  }
                }
              },
              required: ['matches'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_transaction_matches' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matches = JSON.parse(toolCall.function.arguments);
    console.log('Parsed matches:', matches);

    return new Response(
      JSON.stringify(matches),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
