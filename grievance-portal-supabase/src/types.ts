export const CATEGORIES = [
  'Attention',
  'Quality time',
  'Affection',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
export const SEVERITIES = [
  'A tiny inconvenience',
  'A medium-sized betrayal',
  'An emotional emergency',
  'Lately Overthinking'
] as const
export type Severity = (typeof SEVERITIES)[number]
export type ComplaintStatus = 'awaiting_response' | 'awaiting_acknowledgement' | 'closed'
export type MemberRole = 'department' | 'user'

export interface Person {
  id: string
  username: string
  display_name: string
  role: MemberRole
}

export interface ComplaintReply {
  id: string
  complaint_id: string
  responder_id: string
  body: string
  created_at: string
}

export interface Complaint {
  id: string
  reference: string
  title: string
  category: Category
  body: string
  created_at: string
  severity: Severity
  status: ComplaintStatus
  sender_id: string
  recipient_id: string
  sender: Person
  recipient: Person
  reply: ComplaintReply | null
}

export interface NewComplaintInput {
  recipientId: string
  title: string
  category: Category
  body: string
  severity: Severity
}
