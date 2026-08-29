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
  amountInr?: string
  orderId?: string
  utr?: string
  txnId?: string
  creditedAt?: string
  balanceInr?: string
  walletUrl?: string
}

const Email = ({
  amountInr = '0.00',
  orderId = '',
  utr = '—',
  txnId = '—',
  creditedAt = '',
  balanceInr = '',
  walletUrl = 'https://flexipro.in/wallet',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Payment confirmed — ₹${amountInr} added to your FlexiPro wallet`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>FlexiPro</Text>
        <Heading style={h1}>Payment confirmed</Heading>
        <Text style={text}>
          We received your UPI payment and your wallet has been credited. Here is your receipt.
        </Text>

        <Section style={card}>
          <Text style={rowLabel}>Amount credited</Text>
          <Text style={rowValueStrong}>{`₹${amountInr}`}</Text>
          <Text style={rowLabel}>Order reference</Text>
          <Text style={rowValue}>{orderId}</Text>
          <Text style={rowLabel}>UTR / Transaction ID</Text>
          <Text style={rowValue}>{`${utr} · ${txnId}`}</Text>
          {creditedAt ? (
            <>
              <Text style={rowLabel}>Credited at</Text>
              <Text style={rowValue}>{creditedAt}</Text>
            </>
          ) : null}
          {balanceInr ? (
            <>
              <Text style={rowLabel}>New wallet balance</Text>
              <Text style={rowValue}>{`₹${balanceInr}`}</Text>
            </>
          ) : null}
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          View your wallet and full deposit timeline:{' '}
          <Link href={walletUrl} style={link}>{walletUrl}</Link>
        </Text>
        <Text style={muted}>
          Keep the UTR safe — it is the fastest way for support to check any dispute.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `₹${data['amountInr'] ?? ''} added to your FlexiPro wallet`.trim(),
  displayName: 'Deposit credited',
  previewData: {
    amountInr: '100.00',
    orderId: 'ZAP_a7b11f3c89134a1c994298c1a18db9e2',
    utr: '520912617438',
    txnId: 'ZUD623C1AAEEA20F78',
    creditedAt: '29 Aug 2026, 17:39 UTC',
    balanceInr: '100.00',
    walletUrl: 'https://flexipro.in/wallet',
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
const rowValueStrong = { fontSize: '20px', color: '#111827', fontWeight: 700 as const, margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const link = { color: '#6d28d9' }
const muted = { fontSize: '12px', color: '#6b7280' }
