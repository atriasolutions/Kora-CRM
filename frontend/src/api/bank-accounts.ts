import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'

export type BankAccount = {
  id: string
  accountName: string
  bankCode: string
  bankName: string
  accountType: string
  accountNumber: string
  email: string
  isDefault: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type BankAccountInput = {
  accountName: string
  bankCode: string
  accountType: string
  accountNumber: string
  email?: string
  isDefault?: boolean
  sortOrder?: number
}

const BASE = `${API_V1}/bank-accounts`

type ApiListResponse<T> = { data: T[] }
type ApiItemResponse<T> = { data: T }

export async function listBankAccountsApi(): Promise<BankAccount[]> {
  const res = await fetchJSON<ApiListResponse<BankAccount>>(BASE)
  return res.data
}

export async function createBankAccountApi(
  input: BankAccountInput,
): Promise<BankAccount> {
  const res = await fetchJSON<ApiItemResponse<BankAccount>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateBankAccountApi(
  id: string,
  input: Partial<BankAccountInput>,
): Promise<BankAccount> {
  const res = await fetchJSON<ApiItemResponse<BankAccount>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteBankAccountApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
