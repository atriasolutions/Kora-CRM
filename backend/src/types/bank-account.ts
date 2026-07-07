export type BankAccount = {
  id: string
  accountName: string
  bankCode: string
  bankName: string
  accountType: string
  accountNumber: string
  rut: string
  email: string
  isDefault: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateBankAccountInput = {
  accountName: string
  bankCode: string
  accountType: string
  accountNumber: string
  rut: string
  email?: string
  isDefault?: boolean
  sortOrder?: number
}

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>
