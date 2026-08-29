import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  ticketNumber?: string
  subject?: string
  category?: string
  priority?: string
  submittedAt?: string
  attachmentCount?: number
  detailLines?: string[]
  ticketUrl?: string
}

const Email = ({
  ticketNumber = 'TKT-000000',
  subject = 'Support request',
  category = 'general',
  priority = 'medium',
  submittedAt = '',
  attachmentCount = 0,
  detailLines = [],
  ticketUrl = 'https://flexipro.in/support',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`We received your ticket ${ticketNumber} — here is your receipt`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>FlexiPro</Text>
        <Heading style={h1}>We received your request</Heading>
        <Text style={text}>
          Thanks for contacting FlexiPro support. Your ticket has been logged and our team
          is reviewing it. Please keep the ticket ID below for reference.
        </Text>

        <Section style={card}>
          <Text style={rowLabel}>Ticket ID</Text>
          <Text style={rowValueStrong}>{ticketNumber}</Text>
          <Text style={rowLabel}>Subject</Text>
          <Text style={rowValue}>{subject}</Text>
          <Text style={rowLabel}>Category / Priority</Text>
          <Text style={rowValue}>{`${category} · ${priority}`}</Text>
          {submittedAt ? (
            <>
              <Text style={rowLabel}>Submitted</Text>
              <Text style={rowValue}>{submittedAt}</Text>
            </>
          ) : null}
          <Text style={rowLabel}>Proof files attached</Text>
          <Text style={rowValue}>{String(attachmentCount)}</Text>
        </Section>

        {detailLines.length > 0 ? (
          <Section>
            <Heading as="h2" style={h2}>Submitted details</Heading>
            {detailLines.map((line) => (
              <Text key={line} style={detail}>{line}</Text>
            ))}
          </Section>
        ) : null}

        <Hr style={hr} />

        <Heading as="h2" style={h2}>What happens next</Heading>
        <Text style={detail}>1. Our team reviews your ticket — typical first response within one business day.</Text>
        <Text style={detail}>2. If we need more evidence, the ticket moves to “More proof requested”.</Text>
        <Text style={detail}>3. Once verified, we resolve it with a redelivery, wallet credit or refund as applicable.</Text>

        <Text style={text}>
          Track live status here: <Link href={ticketUrl} style={link}>{ticketUrl}</Link>
        </Text>
        <Text style={muted}>
          Need to add something? Reply to this email or message support with your ticket ID.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `FlexiPro ticket ${data['ticketNumber'] ?? ''} received`.trim(),
  displayName: 'Ticket receipt',
  previewData: {
    ticketNumber: 'TKT-000123',
    subject: 'Refund claim — Order not delivered',
    category: 'order',
    priority: 'high',
    submittedAt: '29 Aug 2026, 14:20',
    attachmentCount: 2,
    detailLines: ['Order ID: ORD-8891', 'Payment method: UPI', 'Preferred remedy: Redelivery'],
    ticketUrl: 'https://flexipro.in/support',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Manrope, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '2px', color: '#6d28d9', fontWeight: 700 as const, margin: '0 0 8px' }
const h1 = { fontSize: '22px', margin: '0 0 12px', color: '#111827' }
const h2 = { fontSize: '16px', margin: '20px 0 8px', color: '#111827' }
const text = { fontSize: '14px', lineHeight: '22px', color: '#374151' }
const card = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '16px 18px', margin: '16px 0' }
const rowLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#6b7280', margin: '10px 0 2px' }
const rowValue = { fontSize: '14px', color: '#111827', margin: '0' }
const rowValueStrong = { fontSize: '16px', color: '#111827', fontWeight: 700 as const, margin: '0' }
const detail = { fontSize: '13px', lineHeight: '20px', color: '#374151', margin: '4px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const link = { color: '#6d28d9' }
const muted = { fontSize: '12px', color: '#6b7280' }
