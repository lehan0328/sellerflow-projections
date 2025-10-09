import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "Auren Contact Form <onboarding@resend.dev>",
      to: ["support@aurenapp.com"],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br />')}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">This message was sent from the Auren contact form.</p>
      `,
    });

    console.log("Contact email sent successfully:", emailResponse);

    // Send confirmation to user
    await resend.emails.send({
      from: "Auren Support <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Thank you for contacting Auren!</h1>
          <p>Hi ${name},</p>
          <p>We've received your message and our support team will get back to you within 24-48 hours.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Your message:</strong></p>
            <p style="margin: 10px 0 0 0; color: #6b7280;">${message.replace(/\n/g, '<br />')}</p>
          </div>
          
          <p>In the meantime, you can:</p>
          <ul>
            <li>Try our <a href="https://aurenapp.com/contact" style="color: #3b82f6;">AI assistant</a> for instant answers</li>
            <li>Browse our <a href="https://aurenapp.com/docs" style="color: #3b82f6;">documentation</a></li>
            <li>Check out our <a href="https://aurenapp.com/docs/faq" style="color: #3b82f6;">FAQ page</a></li>
          </ul>
          
          <p>Best regards,<br>The Auren Support Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            This is an automated confirmation. Please do not reply to this email. 
            If you need to contact us, please visit <a href="https://aurenapp.com/contact" style="color: #3b82f6;">aurenapp.com/contact</a>
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
