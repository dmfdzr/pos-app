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
      stores: {
        Row: {
          id: string
          nama_toko: string
          alamat: string | null
          telepon: string | null
          npwp: string | null
          logo_url: string | null
          created_at: string | null
          tax_rate: number | null
        }
        Insert: {
          id?: string
          nama_toko: string
          alamat?: string | null
          telepon?: string | null
          npwp?: string | null
          logo_url?: string | null
          created_at?: string | null
          tax_rate?: number | null
        }
        Update: {
          id?: string
          nama_toko?: string
          alamat?: string | null
          telepon?: string | null
          npwp?: string | null
          logo_url?: string | null
          created_at?: string | null
          tax_rate?: number | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          store_id: string
          name: string
          phone: string | null
          email: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          phone?: string | null
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customers_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          store_id: string | null
          role: Database['public']['Enums']['user_role'] | null
          full_name: string | null
        }
        Insert: {
          id: string
          store_id?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          full_name?: string | null
        }
        Update: {
          id?: string
          store_id?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          full_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      products: {
        Row: {
          id: string
          store_id: string
          sku: string | null
          name: string
          kategori: string | null
          price: number
          cost_price: number | null
          stock_quantity: number
          image_url: string | null
        }
        Insert: {
          id?: string
          store_id: string
          sku?: string | null
          name: string
          kategori?: string | null
          price: number
          cost_price?: number | null
          stock_quantity?: number
          image_url?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          sku?: string | null
          name?: string
          kategori?: string | null
          price?: number
          cost_price?: number | null
          stock_quantity?: number
          image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          store_id: string
          cashier_id: string
          total_amount: number
          payment_method: Database['public']['Enums']['payment_method']
          amount_paid: number | null
          change_amount: number | null
          discount_amount: number
          shift_id: string | null
          tax_amount: number | null
          customer_id: string | null
          status: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          cashier_id: string
          total_amount: number
          payment_method?: Database['public']['Enums']['payment_method']
          amount_paid?: number | null
          change_amount?: number | null
          discount_amount?: number
          shift_id?: string | null
          tax_amount?: number | null
          customer_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          cashier_id?: string
          total_amount?: number
          payment_method?: Database['public']['Enums']['payment_method']
          amount_paid?: number | null
          change_amount?: number | null
          discount_amount?: number
          shift_id?: string | null
          tax_amount?: number | null
          customer_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_cashier_id_fkey'
            columns: ['cashier_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          }
        ]
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          product_id: string
          product_name: string
          product_sku: string | null
          price_at_time: number
          quantity: number
          subtotal: number
        }
        Insert: {
          id?: string
          transaction_id: string
          product_id: string
          product_name: string
          product_sku?: string | null
          price_at_time: number
          quantity: number
          subtotal: number
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string | null
          price_at_time?: number
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: 'transaction_items_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transaction_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          store_id: string
          type: Database['public']['Enums']['stock_movement_type']
          quantity_change: number
          quantity_before: number
          quantity_after: number
          reference_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          store_id: string
          type: Database['public']['Enums']['stock_movement_type']
          quantity_change: number
          quantity_before: number
          quantity_after: number
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          store_id?: string
          type?: Database['public']['Enums']['stock_movement_type']
          quantity_change?: number
          quantity_before?: number
          quantity_after?: number
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          id: string
          store_id: string
          cashier_id: string
          start_time: string
          end_time: string | null
          starting_cash: number
          ending_cash: number | null
          expected_cash: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          store_id: string
          cashier_id: string
          start_time?: string
          end_time?: string | null
          starting_cash: number
          ending_cash?: number | null
          expected_cash?: number | null
          notes?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          cashier_id?: string
          start_time?: string
          end_time?: string | null
          starting_cash?: number
          ending_cash?: number | null
          expected_cash?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'shifts_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shifts_cashier_id_fkey'
            columns: ['cashier_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_transaction: {
        Args: {
          p_store_id: string
          p_cashier_id: string
          p_payment_method: string
          p_amount_paid: number
          p_notes: string | null
          p_items: Json
          p_discount_amount?: number
          p_shift_id?: string | null
          p_tax_amount?: number
          p_customer_id?: string | null
        }
        Returns: string
      }
      void_transaction: {
        Args: {
          p_transaction_id: string
          p_user_id: string
          p_notes: string
        }
        Returns: undefined
      }
      restock_product: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_notes: string | null
          p_user_id: string
        }
        Returns: undefined
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_store_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'OWNER' | 'CASHIER' | 'SUPERADMIN'
      payment_method: 'TUNAI' | 'QRIS' | 'TRANSFER_BANK' | 'KARTU_DEBIT' | 'KARTU_KREDIT'
      stock_movement_type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

