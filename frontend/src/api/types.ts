export type ApiListMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ApiListResponse<T> = {
  data: T[]
  meta: ApiListMeta
}

export type ApiItemResponse<T> = {
  data: T
}
