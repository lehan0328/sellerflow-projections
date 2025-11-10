import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, Eye, UserCheck, Globe } from "lucide-react";
import { Helmet } from "react-helmet";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy | Auren</title>
        <meta name="description" content="Privacy Policy for Auren cash flow management platform. Learn how we protect your financial data and Amazon seller information." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aurenapp.com/privacy" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cash flow management platform. We are committed to protecting your privacy and ensuring the security of your financial data.
              </p>
              <p>
                By using our service, you agree to the collection and use of information in accordance with this policy. We handle sensitive financial information with the utmost care and comply with all applicable data protection regulations.
              </p>
            </CardContent>
          </Card>

          {/* Bank Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Bank Account Connections via Plaid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">How We Connect to Your Bank Accounts</h3>
              <p>
                We use Plaid Inc., a trusted third-party service provider, to securely connect to your bank accounts. When you link your bank account:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Plaid handles authentication:</strong> Your bank login credentials are never stored on our servers or accessed by our team. Plaid uses bank-level encryption (256-bit SSL) to securely transmit your credentials directly to your financial institution.
                </li>
                <li>
                  <strong>Read-only access:</strong> We only request read-only access to your account information. We cannot initiate transactions, move money, or make changes to your bank accounts.
                </li>
                <li>
                  <strong>Data we collect:</strong> Through Plaid, we collect your account balances, transaction history, account names, account types, and routing/account numbers (last 4 digits only for display purposes).
                </li>
                <li>
                  <strong>Encrypted storage:</strong> All bank account access tokens and sensitive data are encrypted using industry-standard encryption algorithms before being stored in our database.
                </li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">What We Do With Your Bank Data</h3>
              <p className="mb-3">
                Your bank data is used <strong>exclusively for your benefit</strong> to help you plan and manage your cash flow with the most accurate and up-to-date information from your accounts. All processing happens securely within your account, and <strong>our team cannot see, access, or view your bank data</strong>.
              </p>
              <p className="mb-3">
                The platform uses your encrypted bank data to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Display your account balances and transaction history in your dashboard</li>
                <li>Calculate your current and projected cash flow based on your actual financial data</li>
                <li>Provide personalized financial insights and forecasting for your business</li>
                <li>Allow you to match and reconcile bank transactions with your purchase orders and sales records</li>
                <li>Generate reports and analytics that help you make informed business decisions</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                <strong>Important:</strong> Your bank data remains private and encrypted. Only you can view your financial information through your secure account. Our team does not have access to decrypt or view your individual bank transactions or balances.
              </p>

              <h3 className="font-semibold text-lg mt-6">Your Bank Data Rights</h3>
              <p>
                You can disconnect your bank accounts at any time through the Settings page. Upon disconnection, we will delete your access tokens and stop syncing new transaction data. Historical transaction data may be retained for up to 90 days for accounting purposes unless you request immediate deletion.
              </p>
            </CardContent>
          </Card>

          {/* Amazon Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Amazon Seller Central Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">How We Connect to Amazon Seller Central</h3>
              <p>
                When you connect your Amazon Seller Central account, you authorize us to access specific data through Amazon's Selling Partner API:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>OAuth authentication:</strong> We use OAuth 2.0 for secure authentication with Amazon. Your Amazon login credentials are never stored or accessed by our platform.
                </li>
                <li>
                  <strong>API access tokens:</strong> Amazon provides us with encrypted access and refresh tokens that allow us to retrieve your seller data. These tokens are encrypted and securely stored in our database.
                </li>
                <li>
                  <strong>Limited permissions:</strong> We only request the minimum permissions necessary to provide our service, including access to settlement reports, financial events, and order data.
                </li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">Amazon Data We Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Seller account information (Seller ID, Marketplace details)</li>
                <li>Settlement and payout data (dates, amounts, currencies)</li>
                <li>Transaction details (orders, refunds, fees, adjustments)</li>
                <li>Financial event data for cash flow tracking</li>
                <li>Product SKUs and order IDs (for transaction matching)</li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">How We Use Your Amazon Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Track Amazon payouts and predict future settlements</li>
                <li>Categorize and analyze your Amazon revenue and expenses</li>
                <li>Integrate Amazon transactions with your overall cash flow</li>
                <li>Generate reports on your Amazon business performance</li>
                <li>Provide insights and forecasts based on historical Amazon data</li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">Your Amazon Data Rights</h3>
              <p>
                You can revoke our access to your Amazon Seller Central account at any time through the Settings page or through Amazon Seller Central's App Authorization page. We will immediately delete your Amazon access tokens and stop syncing new data.
              </p>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Security & Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">How We Protect Your Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Encryption in transit:</strong> All data transmitted between your browser and our servers uses TLS/SSL encryption (HTTPS).
                </li>
                <li>
                  <strong>Encryption at rest:</strong> Sensitive data including access tokens, account numbers, and credentials are encrypted using AES-256 encryption before storage.
                </li>
                <li>
                  <strong>Database security:</strong> Our database employs Row-Level Security (RLS) policies ensuring users can only access their own data.
                </li>
                <li>
                  <strong>Authentication:</strong> We use Supabase Auth with secure session management and JWT tokens for user authentication.
                </li>
                <li>
                  <strong>Access controls:</strong> Only authorized personnel have access to production systems, and all access is logged and monitored.
                </li>
                <li>
                  <strong>Regular security audits:</strong> We conduct regular security assessments and vulnerability scans.
                </li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">Data Breach Protocol</h3>
              <p>
                In the unlikely event of a data breach affecting your personal or financial information, we will notify you within 72 hours and provide detailed information about the nature of the breach, potentially affected data, and steps being taken to address the situation.
              </p>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Data Sharing & Third Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">Who We Share Data With</h3>
              <p>We do not sell, rent, or trade your personal or financial information to third parties. We only share data with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Plaid:</strong> For secure bank account connections and transaction retrieval.
                </li>
                <li>
                  <strong>Amazon:</strong> When you authorize access to your Seller Central account (data flows from Amazon to us only).
                </li>
                <li>
                  <strong>Supabase:</strong> Our infrastructure provider for database and authentication services.
                </li>
                <li>
                  <strong>Stripe:</strong> For payment processing and subscription management (only billing information, not financial account data).
                </li>
                <li>
                  <strong>Legal authorities:</strong> When required by law or to comply with legal processes.
                </li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">Service Providers</h3>
              <p>
                All third-party service providers are carefully selected and contractually obligated to maintain the confidentiality and security of your information. They are only permitted to use your data to provide services to us and are prohibited from using it for their own purposes.
              </p>
            </CardContent>
          </Card>

          {/* User Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Your Rights & Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">You Have the Right To:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Access your data:</strong> Request a copy of all personal and financial data we have stored about you.
                </li>
                <li>
                  <strong>Correct your data:</strong> Update or correct any inaccurate information in your account.
                </li>
                <li>
                  <strong>Delete your data:</strong> Request deletion of your account and all associated data. We will delete your data within 30 days except where retention is required by law.
                </li>
                <li>
                  <strong>Export your data:</strong> Download your transaction history, reports, and other data in common formats (CSV, JSON).
                </li>
                <li>
                  <strong>Disconnect accounts:</strong> Remove bank or Amazon connections at any time without deleting your account.
                </li>
                <li>
                  <strong>Opt-out of communications:</strong> Unsubscribe from marketing emails while still receiving important service notifications.
                </li>
              </ul>

              <h3 className="font-semibold text-lg mt-6">Data Retention</h3>
              <p>
                We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Immediately revoke all bank and Amazon access tokens</li>
                <li>Delete personal information within 30 days</li>
                <li>Retain transaction records for 7 years for tax and legal compliance (anonymized after 90 days)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Regulations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We comply with the following data protection regulations:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>GDPR:</strong> General Data Protection Regulation (for EU users)
                </li>
                <li>
                  <strong>CCPA:</strong> California Consumer Privacy Act (for California residents)
                </li>
                <li>
                  <strong>SOC 2:</strong> Our infrastructure providers maintain SOC 2 Type II compliance
                </li>
                <li>
                  <strong>PCI DSS:</strong> Payment Card Industry Data Security Standard (through Stripe)
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, regulatory, or operational reasons. We will notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date at the top of this policy</li>
                <li>Sending an email notification to your registered email address</li>
              </ul>
              <p className="mt-4">
                Your continued use of our service after any changes indicates your acceptance of the updated Privacy Policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about this Privacy Policy, want to exercise your data rights, or have concerns about how we handle your information, please contact us:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Email:</strong> support@aurenapp.com</p>
                <p><strong>Data Protection Officer:</strong> support@aurenapp.com</p>
                <p><strong>Mailing Address:</strong> 430 Nepperhan Ave, Yonkers, NY 10701</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                We aim to respond to all privacy-related inquiries within 48 hours.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="inline-flex items-center text-primary hover:underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
