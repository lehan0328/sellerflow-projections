import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface VerificationCodeEmailProps {
  token: string
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
}

export const VerificationCodeEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: VerificationCodeEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your Auren account with this code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://7a7abab6-1ab3-40f5-8847-2b043f3ea03c.lovableproject.com/auren-full-logo.png"
            width="180"
            height="auto"
            alt="Auren"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Verify Your Email Address</Heading>
        
        <Text style={text}>
          Welcome to Auren! To complete your registration and start managing your cash flow, please verify your email address.
        </Text>
        
        <Section style={codeSection}>
          <Text style={codeLabel}>Your verification code:</Text>
          <Text style={code}>{token}</Text>
        </Section>
        
        <Text style={text}>
          This code will expire in 24 hours. Simply copy and paste it into the verification screen.
        </Text>
        
        <Section style={buttonSection}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            Verify Email Address
          </Link>
        </Section>
        
        <Text style={smallText}>
          Or click this link to verify automatically:
        </Text>
        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          target="_blank"
          style={link}
        >
          {`${supabase_url}/auth/v1/verify?token=${token_hash.substring(0, 30)}...`}
        </Link>
        
        <Text style={footer}>
          If you didn't create an account with Auren, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          © {new Date().getFullYear()} Auren. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default VerificationCodeEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const logoSection = {
  padding: '32px 20px 20px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 20px',
  lineHeight: '1.4',
  textAlign: 'center' as const,
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 20px',
  margin: '16px 0',
}

const codeSection = {
  backgroundColor: '#f4f4f4',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 20px',
  border: '2px dashed #e1e4e8',
  textAlign: 'center' as const,
}

const codeLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
}

const code = {
  backgroundColor: '#ffffff',
  border: '1px solid #e1e4e8',
  borderRadius: '6px',
  color: '#0066FF',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  padding: '20px 16px',
  margin: '0',
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
}

const buttonSection = {
  padding: '20px 20px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#0066FF',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  margin: '0 auto',
}

const link = {
  color: '#0066FF',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  padding: '0 20px',
  display: 'block',
  margin: '8px 0 24px',
}

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0 20px',
  margin: '24px 0 8px',
  textAlign: 'center' as const,
}

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 20px',
  margin: '32px 0 8px',
  textAlign: 'center' as const,
}
