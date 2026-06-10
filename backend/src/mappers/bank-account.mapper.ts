import type { BankAccount } from '../types/bank-account.js'
import { toIsoString } from '../utils/format.js'

export type BankAccountRow = {
  id: string
  tenant_id: string
  account_name: string
  bank_code: string
  bank_name: string
  account_type: string
  account_number: string
  email: string
  is_default: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export function mapBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    accountName: row.account_name,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountType: row.account_type,
    accountNumber: row.account_number,
    email: row.email ?? '',
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}
