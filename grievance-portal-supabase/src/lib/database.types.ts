import type { Category, ComplaintStatus, MemberRole, Severity } from '../types'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  role: MemberRole
  created_at: string
}

type ComplaintRow = {
  id: string
  case_number: number
  reference: string
  sender_id: string
  recipient_id: string
  title: string
  category: Category
  body: string
  severity: Severity
  status: ComplaintStatus
  created_at: string
  updated_at: string
  closed_at: string | null
}

type ReplyRow = {
  id: string
  complaint_id: string
  responder_id: string
  body: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: { id: string; username: string; display_name: string; role?: MemberRole; created_at?: string }
        Update: never
        Relationships: []
      }
      complaints: {
        Row: ComplaintRow
        Insert: {
          sender_id: string
          recipient_id: string
          title: string
          category: Category
          body: string
          severity: Severity
        }
        Update: { status?: ComplaintStatus; closed_at?: string | null }
        Relationships: [
          { foreignKeyName: 'complaints_sender_id_fkey'; columns: ['sender_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'complaints_recipient_id_fkey'; columns: ['recipient_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      complaint_replies: {
        Row: ReplyRow
        Insert: { complaint_id: string; responder_id: string; body: string }
        Update: never
        Relationships: [
          { foreignKeyName: 'complaint_replies_complaint_id_fkey'; columns: ['complaint_id']; isOneToOne: true; referencedRelation: 'complaints'; referencedColumns: ['id'] },
          { foreignKeyName: 'complaint_replies_responder_id_fkey'; columns: ['responder_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      finish_the_drama: { Args: { p_complaint_id: string }; Returns: undefined }
    }
    Enums: { complaint_status: ComplaintStatus; member_role: MemberRole }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = ProfileRow
export type ComplaintRecord = ComplaintRow
export type ReplyRecord = ReplyRow
