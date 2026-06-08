/** Usuarios visibles en listados, asignaciones y menciones (@). */
export const USER_DIRECTORY_VISIBLE_CONDITION = 'COALESCE(hidden_from_directory, false) = false'

export const USER_DIRECTORY_VISIBLE_CONDITION_U =
  'COALESCE(u.hidden_from_directory, false) = false'
