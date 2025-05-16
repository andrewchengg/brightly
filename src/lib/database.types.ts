export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      Student: {
        Row: {
          id: string
          name: string
          username: string
          email: string
          img?: string | null
          schoolLevel?: number | null
          schoolName?: string | null
          parentId: string
          classId?: string | null
          gradeId?: string | null
          initialSetupComplete: boolean
          createdAt?: string | null
          updatedAt?: string | null
        }
        Insert: {
          id: string
          name: string
          username: string
          email: string
          img?: string | null
          schoolLevel?: number | null
          schoolName?: string | null
          parentId: string
          classId?: string | null
          gradeId?: string | null
          initialSetupComplete: boolean
          createdAt?: string | null
          updatedAt?: string | null
        }
        Update: {
          id?: string
          name?: string
          username?: string
          email?: string
          img?: string | null
          schoolLevel?: number | null
          schoolName?: string | null
          parentId?: string
          classId?: string | null
          gradeId?: string | null
          initialSetupComplete?: boolean
          createdAt?: string | null
          updatedAt?: string | null
        }
      }
      Parent: {
        Row: {
          id: string
          name: string
          username: string
          email: string
          address?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Insert: {
          id: string
          name: string
          username: string
          email: string
          address?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Update: {
          id?: string
          name?: string
          username?: string
          email?: string
          address?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
      }
      Teacher: {
        Row: {
          id: string
          name: string
          username: string
          email: string
          img?: string | null
          department?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Insert: {
          id: string
          name: string
          username: string
          email: string
          img?: string | null
          department?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Update: {
          id?: string
          name?: string
          username?: string
          email?: string
          img?: string | null
          department?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
      }
      Configuration: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
      }
    }
  }
} 