import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
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
  statusLabel?: string
  note?: string
  ticketUrl?: string
}

const NEXT_STEPS: Record<string, string> = {
  'In review': 'Our team is verifying the details and proof you shared. No action needed from you right now.',
  'More proof requested': 'Please open your ticket and attach the additional evidence we asked for so we can continue.',
  Resolved: 'Your ticket has been resolved. If the issue continues, reply on the ticket within 7 days.',
  Closed: 'This ticket is now closed. You can raise a new ticket any time from the Support page.',
  Submitted: 'Your ticket is queued for review — typical first response within one business day.',
}

const Email = ({
  ticketNumber = 'TKT-000000',
  subject = 'Support request',
  statusLabel = 'In review',
  note = '',
  ticketUrl = 'https://flexipro.in/support',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Ticket ${ticketNumber} is now ${statusLabel}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>FlexiPro</Text>
        <Heading style={h1}>Your ticket status changed</Heading>
        <Section style={card}>
          <Text style={rowLabel}>Ticket ID</Text>
          <Text style={rowValueStrong}>{ticketNumber}</Text>
          <Text style={rowLabel}>Subject</Text>
          <Text style={rowValue}>{subject}</Text>
          <Text style={rowLabel}>New status</Text>
          <Text style={rowValueStrong}>{statusLabel}</Text>
        </Section>
        <Text style={text}>{NEXT_STEPS[statusLabel] ?? 'Open your ticket for the latest update.'}</Text>
        {note ? <Text style={text}>{note}</Text> : null}
        <Text style={text}>
          View the full timeline: <Link href={ticketUrl} style={link}>{ticketUrl}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `FlexiPro ticket ${data['ticketNumber'] ?? ''} — ${data['statusLabel'] ?? 'update'}`,
  displayName: 'Ticket status update',
  previewData: {
    ticketNumber: 'TKT-000123',
    subject: 'Refund claim — Order not delivered',
    statusLabel: 'More proof requested',
    ticketUrl: 'https://flexipro.in/support',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Manrope, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '2px', color: '#6d28d9', fontWeight: 700 as const, margin: '0 0 8px' }
const h1 = { fontSize: '22px', margin: '0 0 12px', color: '#111827' }
const text = { fontSize: '14px', lineHeight: '22px', color: '#374151' }
const card = { backgroundColor: '#f9fafb', borderRadius: '12px', padding: '16px 18px', margin: '16px 0' }
const rowLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#6b7280', margin: '10px 0 2px' }
const rowValue = { fontSize: '14px', color: '#111827', margin: '0' }
const rowValueStrong = { fontSize: '16px', color: '#111827', fontWeight: 700 as const, margin: '0' }
const link = { color: '#6d28d9' }
