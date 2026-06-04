import type { ReactNode } from 'react'

import { WorkboardTableHead } from '@/components/projects/workboard/WorkboardTableHead'
import { workboardTableClass } from '@/components/projects/workboard/workboard-table'

const COLGROUP = (
  <colgroup>
    <col className="w-9" />
    <col className="min-w-[180px]" />
    <col className="min-w-[120px]" />
    <col className="w-[108px]" />
    <col className="w-[56px]" />
    <col className="w-[56px]" />
    <col className="w-[100px]" />
    <col className="w-[100px]" />
    <col className="w-[100px]" />
    <col className="w-[100px]" />
    <col className="min-w-[120px]" />
    <col className="w-9" />
  </colgroup>
)

type WorkboardTableShellProps = {
  children: ReactNode
}

export function WorkboardTableShell({ children }: WorkboardTableShellProps) {
  return (
    <table className={workboardTableClass}>
      {COLGROUP}
      <WorkboardTableHead />
      {children}
    </table>
  )
}
