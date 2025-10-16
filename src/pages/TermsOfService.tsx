import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PublicLayout>
      <Helmet>
        <title>Terms of Service | Auren</title>
        <meta name="description" content="Terms of Service for Auren cash flow management platform for Amazon sellers." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aurenapp.com/terms" />
      </Helmet>

      <div className="min-h-screen py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Last Updated: January 2025
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle>1. Agreement to Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Welcome to Auren ("Company," "we," "our," "us"). These Terms of Service ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Service").
                </p>
                <p>
                  By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.
                </p>
                <p>
                  These Terms apply to all visitors, users, and others who access or use the Service.
                </p>
              </CardContent>
            </Card>

            {/* Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>2. Accounts and Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">2.1 Account Creation</h3>
                <p>
                  To access certain features of the Service, you must register for an account. You must provide accurate, current, and complete information during registration and keep your account information updated.
                </p>
                
                <h3 className="font-semibold text-lg">2.2 Account Security</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Immediately notify us of any unauthorized use of your account</li>
                  <li>Not share your account credentials with third parties</li>
                  <li>Use a strong, unique password for your account</li>
                  <li>Log out from your account at the end of each session</li>
                </ul>

                <h3 className="font-semibold text-lg">2.3 Account Eligibility</h3>
                <p>
                  You must be at least 18 years old to use this Service. By using the Service, you represent and warrant that you meet this requirement.
                </p>
              </CardContent>
            </Card>

            {/* Service Usage */}
            <Card>
              <CardHeader>
                <CardTitle>3. Use of Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">3.1 License</h3>
                <p>
                  Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Service for your personal or internal business purposes.
                </p>

                <h3 className="font-semibold text-lg">3.2 Restrictions</h3>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any illegal purpose or in violation of any laws</li>
                  <li>Attempt to gain unauthorized access to the Service or related systems</li>
                  <li>Interfere with or disrupt the integrity or performance of the Service</li>
                  <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
                  <li>Use any automated system to access the Service without our permission</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Upload or transmit viruses, malware, or other malicious code</li>
                  <li>Collect or harvest any information from other users</li>
                </ul>

                <h3 className="font-semibold text-lg">3.3 Third-Party Integrations</h3>
                <p>
                  Our Service may integrate with third-party services (such as Amazon and banking institutions). Your use of such integrations is subject to the terms and policies of those third parties. We are not responsible for third-party services.
                </p>
              </CardContent>
            </Card>

            {/* Subscription and Payment */}
            <Card>
              <CardHeader>
                <CardTitle>4. Subscription and Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">4.1 Subscription Plans</h3>
                <p>
                  Access to certain features of the Service requires a paid subscription. Subscription details, including pricing and features, are available on our pricing page.
                </p>

                <h3 className="font-semibold text-lg">4.2 Billing</h3>
                <p>
                  You agree to pay all fees associated with your subscription. Fees are billed in advance on a recurring basis (monthly or annually) according to your selected plan. All payments are processed securely through Stripe.
                </p>

                <h3 className="font-semibold text-lg">4.3 Automatic Renewal</h3>
                <p>
                  Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date. We will charge your payment method on file for the renewal.
                </p>

                <h3 className="font-semibold text-lg">4.4 Price Changes</h3>
                <p>
                  We reserve the right to modify our pricing. We will provide at least 30 days' notice before any price changes take effect. Continued use of the Service after price changes constitutes acceptance of the new pricing.
                </p>

                <h3 className="font-semibold text-lg">4.5 Refund Policy</h3>
                <p>
                  All fees are non-refundable except as required by law or as expressly stated in these Terms. If you believe you have been incorrectly charged, please contact us within 30 days.
                </p>

                <h3 className="font-semibold text-lg">4.6 Cancellation</h3>
                <p>
                  You may cancel your subscription at any time through your account settings. Upon cancellation, you will retain access to paid features until the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            {/* Data and Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>5. Data and Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">5.1 Your Data</h3>
                <p>
                  You retain all rights to the data you input into the Service. We do not claim ownership of your business data, financial information, or other content you provide.
                </p>

                <h3 className="font-semibold text-lg">5.2 Data Security</h3>
                <p>
                  We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </p>

                <h3 className="font-semibold text-lg">5.3 Privacy Policy</h3>
                <p>
                  Our Privacy Policy explains how we collect, use, and protect your personal information. By using the Service, you also agree to our Privacy Policy.
                </p>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle>6. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">6.1 Our Property</h3>
                <p>
                  The Service and its original content, features, and functionality are owned by Auren and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>

                <h3 className="font-semibold text-lg">6.2 Feedback</h3>
                <p>
                  If you provide us with any feedback, suggestions, or ideas about the Service, you grant us a worldwide, perpetual, irrevocable, royalty-free license to use, modify, and incorporate such feedback into our Service.
                </p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle>7. Termination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
                </p>
                <p>
                  Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service and cancel your subscription.
                </p>
                <p>
                  All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                </p>
              </CardContent>
            </Card>

            {/* Disclaimers */}
            <Card>
              <CardHeader>
                <CardTitle>8. Disclaimers and Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">8.1 Disclaimer of Warranties</h3>
                <p className="uppercase font-semibold">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p>
                  We do not warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service will meet your specific requirements</li>
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>The results obtained from using the Service will be accurate or reliable</li>
                  <li>Any errors in the Service will be corrected</li>
                </ul>

                <h3 className="font-semibold text-lg">8.2 Financial Disclaimer</h3>
                <p>
                  The Service provides tools for cash flow forecasting and financial planning. However, we do not provide financial advice. Any projections, forecasts, or recommendations are for informational purposes only and should not be relied upon as the sole basis for financial decisions.
                </p>

                <h3 className="font-semibold text-lg">8.3 Limitation of Liability</h3>
                <p className="uppercase font-semibold">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AUREN, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE.
                </p>
                <p>
                  Our total liability to you for all claims arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
                </p>
              </CardContent>
            </Card>

            {/* Indemnification */}
            <Card>
              <CardHeader>
                <CardTitle>9. Indemnification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  You agree to defend, indemnify, and hold harmless Auren and its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your violation of these Terms</li>
                  <li>Your use or misuse of the Service</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Any content or data you provide through the Service</li>
                </ul>
              </CardContent>
            </Card>

            {/* Dispute Resolution */}
            <Card>
              <CardHeader>
                <CardTitle>10. Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">10.1 Governing Law</h3>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions.
                </p>

                <h3 className="font-semibold text-lg">10.2 Arbitration</h3>
                <p>
                  Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in Yonkers, New York.
                </p>

                <h3 className="font-semibold text-lg">10.3 Class Action Waiver</h3>
                <p>
                  You agree that any arbitration or proceeding shall be limited to the dispute between you and Auren individually. To the full extent permitted by law, no arbitration or proceeding shall be joined with any other, no dispute shall be arbitrated on a class-action basis, and you waive any right to participate in a class-action lawsuit.
                </p>
              </CardContent>
            </Card>

            {/* General Provisions */}
            <Card>
              <CardHeader>
                <CardTitle>11. General Provisions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">11.1 Changes to Terms</h3>
                <p>
                  We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or through the Service at least 30 days before the changes take effect. Your continued use of the Service after changes constitute acceptance of the modified Terms.
                </p>

                <h3 className="font-semibold text-lg">11.2 Entire Agreement</h3>
                <p>
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Auren regarding the Service and supersede all prior agreements.
                </p>

                <h3 className="font-semibold text-lg">11.3 Severability</h3>
                <p>
                  If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
                </p>

                <h3 className="font-semibold text-lg">11.4 Waiver</h3>
                <p>
                  No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term, and our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.
                </p>

                <h3 className="font-semibold text-lg">11.5 Assignment</h3>
                <p>
                  You may not assign or transfer these Terms or your rights under these Terms without our prior written consent. We may assign or transfer these Terms without restriction.
                </p>

                <h3 className="font-semibold text-lg">11.6 Force Majeure</h3>
                <p>
                  We shall not be liable for any failure to perform our obligations under these Terms due to circumstances beyond our reasonable control, including acts of God, war, terrorism, pandemic, government regulations, natural disasters, or internet service disruptions.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>12. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p><strong>Email:</strong> support@aurenapp.com</p>
                  <p><strong>Mailing Address:</strong> 430 Nepperhan Ave, Yonkers, NY 10701</p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  We aim to respond to all inquiries within 48 hours.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <Button onClick={() => navigate("/")} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default TermsOfService;
