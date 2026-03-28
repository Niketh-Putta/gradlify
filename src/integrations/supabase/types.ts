export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_feedback: {
        Row: {
          attempt_id: string
          created_at: string | null
          feedback_json: Json
          id: string
          model: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          feedback_json: Json
          id?: string
          model?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          feedback_json?: Json
          id?: string
          model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_inference_requests: {
        Row: {
          id: string
          question_length: number
          requested_at: string
          user_id: string
        }
        Insert: {
          id?: string
          question_length: number
          requested_at?: string
          user_id: string
        }
        Update: {
          id?: string
          question_length?: number
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_readiness_events: {
        Row: {
          correct: boolean
          created_at: string | null
          difficulty: number | null
          id: number
          model_reasoning: string | null
          session_id: string | null
          time_secs: number | null
          topic: string
          user_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          difficulty?: number | null
          id?: never
          model_reasoning?: string | null
          session_id?: string | null
          time_secs?: number | null
          topic: string
          user_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          difficulty?: number | null
          id?: never
          model_reasoning?: string | null
          session_id?: string | null
          time_secs?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_session_id: string
          content: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          chat_session_id: string
          content: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          chat_session_id?: string
          content?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          all_answers: string[] | null
          calculator: string | null
          correct_answer: string | null
          created_at: string | null
          difficulty: number | null
          explain_on: string | null
          explanation: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          estimated_time_sec: number | null
          marks: number | null
          needs_fix: boolean | null
          question: string | null
          question_type: string | null
          subtopic: string | null
          track: Database["public"]["Enums"]["user_track"]
          tier: string | null
          wrong_answers: string[] | null
        }
        Insert: {
          all_answers?: string[] | null
          calculator?: string | null
          correct_answer?: string | null
          created_at?: string | null
          difficulty?: number | null
          explain_on?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          estimated_time_sec?: number | null
          marks?: number | null
          needs_fix?: boolean | null
          question?: string | null
          question_type?: string | null
          subtopic?: string | null
          track?: Database["public"]["Enums"]["user_track"]
          tier?: string | null
          wrong_answers?: string[] | null
        }
        Update: {
          all_answers?: string[] | null
          calculator?: string | null
          correct_answer?: string | null
          created_at?: string | null
          difficulty?: number | null
          explain_on?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          estimated_time_sec?: number | null
          marks?: number | null
          needs_fix?: boolean | null
          question?: string | null
          question_type?: string | null
          subtopic?: string | null
          track?: Database["public"]["Enums"]["user_track"]
          tier?: string | null
          wrong_answers?: string[] | null
        }
        Relationships: []
      }
      exam_questions_backup_2025_11_19: {
        Row: {
          all_answers: string[] | null
          calculator: string | null
          correct_answer: string | null
          created_at: string | null
          explain_on: string | null
          explanation: string | null
          id: string | null
          image_alt: string | null
          image_url: string | null
          question: string | null
          question_type: string | null
          tier: string | null
          wrong_answers: string[] | null
        }
        Insert: {
          all_answers?: string[] | null
          calculator?: string | null
          correct_answer?: string | null
          created_at?: string | null
          explain_on?: string | null
          explanation?: string | null
          id?: string | null
          image_alt?: string | null
          image_url?: string | null
          question?: string | null
          question_type?: string | null
          tier?: string | null
          wrong_answers?: string[] | null
        }
        Update: {
          all_answers?: string[] | null
          calculator?: string | null
          correct_answer?: string | null
          created_at?: string | null
          explain_on?: string | null
          explanation?: string | null
          id?: string | null
          image_alt?: string | null
          image_url?: string | null
          question?: string | null
          question_type?: string | null
          tier?: string | null
          wrong_answers?: string[] | null
        }
        Relationships: []
      }
      extreme_questions: {
        Row: {
          all_answers: string[] | null
          correct_answer: string | null
          created_at: string | null
          explain_on: string | null
          explanation: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          question: string | null
          track: Database["public"]["Enums"]["user_track"]
          wrong_answers: string[] | null
        }
        Insert: {
          all_answers?: string[] | null
          correct_answer?: string | null
          created_at?: string | null
          explain_on?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          question?: string | null
          track?: Database["public"]["Enums"]["user_track"]
          wrong_answers?: string[] | null
        }
        Update: {
          all_answers?: string[] | null
          correct_answer?: string | null
          created_at?: string | null
          explain_on?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          question?: string | null
          track?: Database["public"]["Enums"]["user_track"]
          wrong_answers?: string[] | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: number
          receiver: string
          requester: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          receiver: string
          requester: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: never
          receiver?: string
          requester?: string
          status?: string
        }
        Relationships: []
      }
      mindprint_events: {
        Row: {
          confidence: string | null
          correct: boolean
          created_at: string | null
          difficulty: number | null
          id: string
          mode: string
          question_id: string | null
          time_spent: number | null
          topic: string
          user_id: string
          wrong_reason: string | null
        }
        Insert: {
          confidence?: string | null
          correct: boolean
          created_at?: string | null
          difficulty?: number | null
          id?: string
          mode: string
          question_id?: string | null
          time_spent?: number | null
          topic: string
          user_id: string
          wrong_reason?: string | null
        }
        Update: {
          confidence?: string | null
          correct?: boolean
          created_at?: string | null
          difficulty?: number | null
          id?: string
          mode?: string
          question_id?: string | null
          time_spent?: number | null
          topic?: string
          user_id?: string
          wrong_reason?: string | null
        }
        Relationships: []
      }
      mindprint_summary: {
        Row: {
          ai_summary: string | null
          confidence_accuracy: number | null
          efficiency_score: number | null
          last_updated: string | null
          peak_hours: string | null
          top_errors: Json | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          confidence_accuracy?: number | null
          efficiency_score?: number | null
          last_updated?: string | null
          peak_hours?: string | null
          top_errors?: Json | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          confidence_accuracy?: number | null
          efficiency_score?: number | null
          last_updated?: string | null
          peak_hours?: string | null
          top_errors?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          mode: string
          score: number | null
          status: string
          title: string
          total_marks: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mode: string
          score?: number | null
          status?: string
          title: string
          total_marks: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mode?: string
          score?: number | null
          status?: string
          title?: string
          total_marks?: number
          user_id?: string
        }
        Relationships: []
      }
      mock_questions: {
        Row: {
          attempt_id: string
          awarded_marks: number | null
          correct_answer: Json | null
          id: string
          idx: number
          mark_scheme: Json | null
          marks: number
          prompt: string
          subtopic: string | null
          topic: string
          user_answer: string | null
        }
        Insert: {
          attempt_id: string
          awarded_marks?: number | null
          correct_answer?: Json | null
          id?: string
          idx: number
          mark_scheme?: Json | null
          marks?: number
          prompt: string
          subtopic?: string | null
          topic: string
          user_answer?: string | null
        }
        Update: {
          attempt_id?: string
          awarded_marks?: number | null
          correct_answer?: Json | null
          id?: string
          idx?: number
          mark_scheme?: Json | null
          marks?: number
          prompt?: string
          subtopic?: string | null
          topic?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_progress: {
        Row: {
          done: boolean
          topic_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          done?: boolean
          topic_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          done?: boolean
          topic_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_results: {
        Row: {
          attempts: number
          correct: number
          created_at: string
          difficulty: string | null
          finished_at: string | null
          id: number
          meta: Json | null
          mode: string | null
          question_id: string | null
          session_id: string | null
          started_at: string | null
          topic: string
          user_id: string
        }
        Insert: {
          attempts: number
          correct: number
          created_at?: string
          difficulty?: string | null
          finished_at?: string | null
          id?: number
          meta?: Json | null
          mode?: string | null
          question_id?: string | null
          session_id?: string | null
          started_at?: string | null
          topic: string
          user_id: string
        }
        Update: {
          attempts?: number
          correct?: number
          created_at?: string
          difficulty?: string | null
          finished_at?: string | null
          id?: number
          meta?: Json | null
          mode?: string | null
          question_id?: string | null
          session_id?: string | null
          started_at?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          daily_challenge_reset_at: string | null
          daily_challenge_uses: number
          daily_mock_reset_at: string | null
          daily_mock_uses: number
          daily_reset_at: string | null
          daily_uses: number
          exam_readiness: number | null
          founder_track: string | null
          full_name: string | null
          id: string
          is_premium: boolean
          plan: string | null
          pending_downgrade_at: string | null
          premium_until: string | null
          premium_track: "gcse" | "eleven_plus" | null
          stripe_customer_id_live: string | null
          stripe_customer_id_test: string | null
          stripe_subscription_id_live: string | null
          stripe_subscription_id_test: string | null
          stripe_subscription_status: string | null
          subscription_interval: string | null
          subscription_status: string | null
          tier: string
          track: Database["public"]["Enums"]["user_track"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          daily_challenge_reset_at?: string | null
          daily_challenge_uses?: number
          daily_mock_reset_at?: string | null
          daily_mock_uses?: number
          daily_reset_at?: string | null
          daily_uses?: number
          exam_readiness?: number | null
          founder_track?: string | null
          full_name?: string | null
          id?: string
          is_premium?: boolean
          plan?: string | null
          pending_downgrade_at?: string | null
          premium_until?: string | null
          premium_track?: "gcse" | "eleven_plus" | null
          stripe_customer_id_live?: string | null
          stripe_customer_id_test?: string | null
          stripe_subscription_id_live?: string | null
          stripe_subscription_id_test?: string | null
          stripe_subscription_status?: string | null
          subscription_interval?: string | null
          subscription_status?: string | null
          tier?: string
          track?: Database["public"]["Enums"]["user_track"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          daily_challenge_reset_at?: string | null
          daily_challenge_uses?: number
          daily_mock_reset_at?: string | null
          daily_mock_uses?: number
          daily_reset_at?: string | null
          daily_uses?: number
          exam_readiness?: number | null
          founder_track?: string | null
          full_name?: string | null
          id?: string
          is_premium?: boolean
          plan?: string | null
          pending_downgrade_at?: string | null
          premium_until?: string | null
          premium_track?: "gcse" | "eleven_plus" | null
          stripe_customer_id_live?: string | null
          stripe_customer_id_test?: string | null
          stripe_subscription_id_live?: string | null
          stripe_subscription_id_test?: string | null
          stripe_subscription_status?: string | null
          subscription_interval?: string | null
          subscription_status?: string | null
          tier?: string
          track?: Database["public"]["Enums"]["user_track"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_history: {
        Row: {
          change: number | null
          created_at: string
          id: number
          readiness_after: number
          readiness_before: number | null
          reason: string
          source_id: string | null
          source_id_old: number | null
          topic: string
          user_id: string
        }
        Insert: {
          change?: number | null
          created_at?: string
          id?: number
          readiness_after: number
          readiness_before?: number | null
          reason: string
          source_id?: string | null
          source_id_old?: number | null
          topic: string
          user_id: string
        }
        Update: {
          change?: number | null
          created_at?: string
          id?: number
          readiness_after?: number
          readiness_before?: number | null
          reason?: string
          source_id?: string | null
          source_id_old?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_scores: {
        Row: {
          score: number
          subtopic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          score: number
          subtopic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          subtopic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_scores_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_activity: {
        Row: {
          activity_date: string
          created_at: string
          id: number
          minutes: number
          user_id: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          id?: never
          minutes?: number
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: never
          minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      study_plan_days: {
        Row: {
          created_at: string
          enabled: boolean
          end_time: string
          id: string
          plan_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          end_time: string
          id?: string
          plan_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          end_time?: string
          id?: string
          plan_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          exam_date: string
          focus_topics: string[] | null
          id: string
          minutes_per_session: number
          sessions_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          focus_topics?: string[] | null
          id?: string
          minutes_per_session?: number
          sessions_per_week?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          focus_topics?: string[] | null
          id?: string
          minutes_per_session?: number
          sessions_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string | null
          ends_at: string
          goal: string | null
          id: string
          is_recurring: boolean | null
          plan_id: string | null
          start_time: string | null
          starts_at: string
          status: string
          subject: string | null
          subtopic: string | null
          subtopic_key: string | null
          topic: string
          topic_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          ends_at: string
          goal?: string | null
          id?: string
          is_recurring?: boolean | null
          plan_id?: string | null
          start_time?: string | null
          starts_at: string
          status?: string
          subject?: string | null
          subtopic?: string | null
          subtopic_key?: string | null
          topic: string
          topic_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          ends_at?: string
          goal?: string | null
          id?: string
          is_recurring?: boolean | null
          plan_id?: string | null
          start_time?: string | null
          starts_at?: string
          status?: string
          subject?: string | null
          subtopic?: string | null
          subtopic_key?: string | null
          topic?: string
          topic_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kind: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subtopic_progress: {
        Row: {
          id: string
          score: number
          subtopic_key: string
          topic_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          score?: number
          subtopic_key: string
          topic_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          score?: number
          subtopic_key?: string
          topic_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtopics: {
        Row: {
          id: string
          name: string
          order_index: number | null
          slug: string
          topic_code: string | null
          topic_id: string
        }
        Insert: {
          id?: string
          name: string
          order_index?: number | null
          slug: string
          topic_code?: string | null
          topic_id: string
        }
        Update: {
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
          topic_code?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_catalog: {
        Row: {
          order_index: number
          subtopic_key: string
          title: string
          topic_key: string
        }
        Insert: {
          order_index: number
          subtopic_key: string
          title: string
          topic_key: string
        }
        Update: {
          order_index?: number
          subtopic_key?: string
          title?: string
          topic_key?: string
        }
        Relationships: []
      }
      topic_readiness: {
        Row: {
          readiness: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          readiness: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          readiness?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          code: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_readiness: boolean
          show_on_global_leaderboard: boolean
          tracking: Database["public"]["Enums"]["tracking_mode"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_readiness?: boolean
          show_on_global_leaderboard?: boolean
          tracking?: Database["public"]["Enums"]["tracking_mode"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_readiness?: boolean
          show_on_global_leaderboard?: boolean
          tracking?: Database["public"]["Enums"]["tracking_mode"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_topic_notes: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          topic_slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          topic_slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          topic_slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      correct_answers_all: {
        Row: {
          correct_count: number | null
          created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      question_events_all: {
        Row: {
          created_at: string | null
          question_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_overall_readiness: {
        Row: {
          overall: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_topic_last_change: {
        Row: {
          created_at: string | null
          delta: number | null
          readiness_after: number | null
          readiness_before: number | null
          reason: string | null
          source_id: string | null
          topic: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_topic_readiness: {
        Row: {
          created_at: string | null
          readiness: number | null
          topic: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_ai_requests: { Args: never; Returns: undefined }
      consume_challenge_session: { Args: never; Returns: Json }
      consume_mock_session: {
        Args: { p_question_count: number }
        Returns: Json
      }
      compute_ai_readiness_delta: {
        Args: {
          p_correct: boolean
          p_difficulty: number
          p_prev_readiness: number
          p_time_secs: number
        }
        Returns: number
      }
      compute_new_readiness: {
        Args: { result_id: number }
        Returns: {
          change: number
          new_readiness: number
          previous_readiness: number
          topic: string
          user_id: string
        }[]
      }
      fetch_exam_questions: {
        Args: {
          p_calculator: string
          p_limit: number
          p_question_types: string[]
          p_tier: string
        }
        Returns: {
          all_answers: string[] | null
          calculator: string | null
          correct_answer: string | null
          created_at: string | null
          explain_on: string | null
          explanation: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          needs_fix: boolean | null
          question: string | null
          question_type: string | null
          tier: string | null
          wrong_answers: string[] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_mindprint_summary_sql: {
        Args: { user_id: string }
        Returns: Json
      }
      get_friends: {
        Args: never
        Returns: {
          avatar_url: string
          connected_at: string
          friend_email: string
          friend_id: string
          friend_name: string
          friendship_id: number
        }[]
      }
      get_leaderboard:
        | {
            Args: { p_period: string }
            Returns: {
              display_name: string
              email: string
              points: number
              rank: number
              user_id: string
            }[]
          }
        | {
            Args: { p_period: string; p_scope: string }
            Returns: {
              avatar_url: string
              is_self: boolean
              name: string
              rank: number
              total_questions: number
              user_id: string
            }[]
          }
      get_leaderboard_correct_friends: {
        Args: { p_period: string; p_timezone?: string }
        Returns: {
          avatar_url: string
          correct_count: number
          founder_track: string | null
          is_self: boolean
          name: string
          rank: number
          user_id: string
        }[]
      }
      get_leaderboard_correct_global: {
        Args: { p_period: string; p_timezone?: string }
        Returns: {
          avatar_url: string
          correct_count: number
          founder_track: string | null
          is_self: boolean
          name: string
          rank: number
          user_id: string
        }[]
      }
      capture_sprint_top10_if_due: {
        Args: { p_sprint_id: string }
        Returns: boolean
      }
      get_sprint_top10: {
        Args: { p_sprint_id: string }
        Returns: {
          avatar_url: string | null
          captured_at: string
          correct_count: number
          name: string | null
          rank: number
          user_id: string
        }[]
      }
      get_my_global_opt_in: { Args: never; Returns: boolean }
      get_pending_friend_requests: {
        Args: never
        Returns: {
          request_id: number
          sender_email: string
          sender_id: string
          sender_name: string
          sent_at: string
        }[]
      }
      get_question_with_answer: {
        Args: { question_id: string }
        Returns: {
          all_answers: Json
          calculator: string
          correct_answer: string
          created_at: string
          explain_on: string
          explanation: string
          id: string
          image_alt: string
          image_url: string
          question: string
          question_type: string
          tier: string
          wrong_answers: Json
        }[]
      }
      get_readiness_overview: {
        Args: never
        Returns: {
          last_updated: string
          overall_average: number
          readiness: number
          topic: string
          tracking_mode: Database["public"]["Enums"]["tracking_mode"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_readiness_change: {
        Args: {
          p_after: number
          p_before: number
          p_reason?: string
          p_topic: string
        }
        Returns: undefined
      }
      manual_set_readiness: {
        Args: { p_readiness: number; p_topic: string }
        Returns: undefined
      }
      monthly_sessions: {
        Args: { p_topic: string; p_user_id: string }
        Returns: number
      }
      recalc_readiness: { Args: { p_user: string }; Returns: undefined }
      recalc_readiness_and_update_profile: {
        Args: { p_user: string }
        Returns: undefined
      }
      recency_factor: { Args: { days_ago: number }; Returns: number }
      respond_friend_request: {
        Args: { p_action: string; p_request_id: number }
        Returns: {
          id: number
          status: string
        }[]
      }
      search_profiles: {
        Args: { q: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          name: string
          user_id: string
        }[]
      }
      send_friend_request: {
        Args: { p_receiver: string }
        Returns: {
          id: number
          status: string
        }[]
      }
      set_global_opt_in: { Args: { p_opt_in: boolean }; Returns: undefined }
      set_tracking_mode: {
        Args: { mode: Database["public"]["Enums"]["tracking_mode"] }
        Returns: undefined
      }
      upsert_readiness_scores: { Args: { rows: Json }; Returns: undefined }
      upsert_subtopic_progress: {
        Args: { p_score: number; p_subtopic_key: string; p_topic_key: string }
        Returns: {
          score: number
          subtopic_key: string
          topic_key: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      user_track: "gcse" | "11plus"
      tracking_mode: "auto" | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      tracking_mode: ["auto", "manual"],
    },
  },
} as const
