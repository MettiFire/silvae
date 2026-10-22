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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      reader_connections: {
        Row: { id: string; user_id: string; name: string; kind: string; mode: string; created_at: string; last_received_at: string | null; revoked_at: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      reader_documents: {
        Row: { id: string; connection_id: string; user_id: string; external_id: string; title: string; authors: string[]; book_id: string | null; session_id: string | null; confirmed_manual_at: string | null; progress_payload: Json | null; last_received_at: string; result: string }
        Insert: never
        Update: never
        Relationships: []
      }

      fragments: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          kind: string;
          quote: string;
          note: string;
          position: string;
          tags: string[];
          favorite: boolean;
          source: string;
          source_ref: string | null;
          dedupe_key: string;
          highlighted_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          kind?: string;
          quote: string;
          note?: string;
          position?: string;
          tags?: string[];
          favorite?: boolean;
          source?: string;
          source_ref?: string | null;
          dedupe_key: string;
          highlighted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          kind?: string;
          quote?: string;
          note?: string;
          position?: string;
          tags?: string[];
          favorite?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fragments_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_progress_events: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          session_id: string;
          percentage: number;
          locator: string | null;
          source: string;
          external_id: string | null;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          book_id: string;
          session_id: string;
          percentage: number;
          locator?: string | null;
          source: string;
          external_id?: string | null;
          observed_at: string;
        };
        Update: never;
        Relationships: [];
      };

      activities: {
        Row: {
          book_id: string | null
          created_at: string
          id: string
          metadata: Json
          type: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          authors: string[]
          categories: string[]
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          page_count: number | null
          published_year: number | null
          title: string
        }
        Insert: {
          authors?: string[]
          categories?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id: string
          page_count?: number | null
          published_year?: number | null
          title: string
        }
        Update: {
          authors?: string[]
          categories?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          page_count?: number | null
          published_year?: number | null
          title?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          created_at: string
          goal: number
          id: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          goal?: number
          id?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      dismissed_books: {
        Row: {
          book_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          book_id: string
          created_at: string
          progress_percent: number | null
          progress_source: string | null
          progress_updated_at: string | null
          reading_session_id: string
          current_page: number
          favorite: boolean
          finished_at: string | null
          id: string
          last_reread_at: string | null
          needs_review: boolean
          rating: number | null
          reread_count: number
          started_at: string | null
          status: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          progress_percent?: number | null
          progress_source?: string | null
          progress_updated_at?: string | null
          reading_session_id?: string
          current_page?: number
          favorite?: boolean
          finished_at?: string | null
          id?: string
          last_reread_at?: string | null
          needs_review?: boolean
          rating?: number | null
          reread_count?: number
          started_at?: string | null
          status?: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          progress_percent?: number | null
          progress_source?: string | null
          progress_updated_at?: string | null
          reading_session_id?: string
          current_page?: number
          favorite?: boolean
          finished_at?: string | null
          id?: string
          last_reread_at?: string | null
          needs_review?: boolean
          rating?: number | null
          reread_count?: number
          started_at?: string | null
          status?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_at: string
          book_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "book_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          book_id: string
          created_at: string
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          body: string
          book_id: string
          created_at?: string
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          body?: string
          book_id?: string
          created_at?: string
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_lists: {
        Row: {
          created_at: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "book_lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_reader_connection: { Args: { p_name: string; p_kind: string; p_secret: string }; Returns: string }
      revoke_reader_connection: { Args: { p_connection: string }; Returns: undefined }
      bind_reader_document: { Args: { p_document: string; p_book: string }; Returns: string }
      ingest_reader_batch: { Args: { p_connection: string; p_credential: string; p_documents: Json }; Returns: Json }
      reader_kosync: { Args: { p_connection: string; p_credential: string; p_document?: string }; Returns: Json }

      fragment_books: {
        Args: Record<string, never>;
        Returns: { id: string; title: string; authors: string[] }[];
      };
      record_reading_progress: {
        Args: {
          p_book_id: string;
          p_percentage: number;
          p_observed_at: string;
          p_source: string;
          p_external_id: string | null;
          p_session_id: string;
          p_finished?: boolean;
          p_locator?: string | null;
        };
        Returns: string;
      };
      start_reading_session: { Args: { p_book_id: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
