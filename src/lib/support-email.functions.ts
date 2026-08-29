import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const STATUS_LABELS: Record<string, string> = {
  open: 'Submitted',
  submitted: 'Submitted',
  pending: 'More proof requested',
  more_proof_requested: 'More proof requested',
  in_progress: 'In review',
  in_review: 'In review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const siteUrl = 'https://flexipro.in'

/**
 * Sends the confirmation receipt for a ticket the caller owns.
 * The recipient is always the authenticated user's own email address —
 * never a value supplied by the browser.
 */
export const sendTicketReceipt = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, message, category, priority, created_at, attachments, user_id')
      .eq('id', data.ticketId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!ticket || ticket.user_id !== userId) throw new Error('Ticket not found')

    const email = (claims as { email?: string } | null)?.email
    if (!email) return { sent: false, reason: 'no_recipient' as const }

    const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : []
    const detailLines = String(ticket.message ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12)

    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    try {
      const result = await sendTemplateEmail('ticket-receipt', email, {
        idempotencyKey: `ticket-receipt-${ticket.id}`,
        templateData: {
          ticketNumber: ticket.ticket_number ?? ticket.id.slice(0, 8),
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          submittedAt: ticket.created_at
            ? new Date(ticket.created_at).toUTCString()
            : '',
          attachmentCount: attachments.length,
          detailLines,
          ticketUrl: `${siteUrl}/tickets/${ticket.id}`,
        },
      })
      return result
    } catch (e) {
      console.error('[ticket-receipt] send failed', e instanceof Error ? e.message : e)
      return { sent: false, reason: 'send_failed' as const }
    }
  })

/**
 * Admin-only: moves a ticket to a new status and emails the ticket owner.
 */
export const updateTicketStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ticketId: z.string().uuid(),
        status: z.enum([
          'open',
          'pending',
          'in_progress',
          'resolved',
          'closed',
        ]),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status: data.status })
      .eq('id', data.ticketId)
      .select('id, ticket_number, subject, status, user_id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!ticket) throw new Error('Ticket not found')

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
    const email = authUser?.user?.email
    if (!email) return { updated: true, emailed: false as const }

    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')

    try {
      await sendTemplateEmail('ticket-status-update', email, {
        idempotencyKey: `ticket-status-${ticket.id}-${data.status}`,
        templateData: {
          ticketNumber: ticket.ticket_number ?? ticket.id.slice(0, 8),
          subject: ticket.subject,
          statusLabel: STATUS_LABELS[data.status] ?? data.status,
          note: data.note ?? '',
          ticketUrl: `${siteUrl}/tickets/${ticket.id}`,
        },
      })
      return { updated: true, emailed: true as const }
    } catch (e) {
      console.error('[ticket-status] send failed', e instanceof Error ? e.message : e)
      return { updated: true, emailed: false as const }
    }
  })
