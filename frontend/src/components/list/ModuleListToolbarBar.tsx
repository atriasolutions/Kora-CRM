import type { ReactNode } from 'react'

function ToolbarDivider() {
  return <div className="hidden w-px shrink-0 self-stretch bg-border md:block" aria-hidden />
}

type ModuleListToolbarBarProps = {
  viewSwitcher?: ReactNode | null
  scopeSwitcher?: ReactNode
  search: ReactNode
  toolbarEnd?: ReactNode
}

export function ModuleListToolbarBar({
  viewSwitcher,
  scopeSwitcher,
  search,
  toolbarEnd,
}: ModuleListToolbarBarProps) {
  return (
    <>
      <div className="space-y-2 rounded-lg border border-border bg-card p-2 shadow-sm md:hidden">
        {viewSwitcher ?? null}
        {scopeSwitcher}
        {search}
        {toolbarEnd ? (
          <div className="flex w-full items-center justify-end gap-2">{toolbarEnd}</div>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <div className="flex min-h-[3.5rem] min-w-0 flex-wrap items-stretch">
          {viewSwitcher ? (
            <div className="flex shrink-0 items-center px-4 py-2.5">{viewSwitcher}</div>
          ) : null}

          {viewSwitcher && scopeSwitcher ? <ToolbarDivider /> : null}

          {scopeSwitcher ? (
            <div className="flex shrink-0 items-center px-4 py-2.5">{scopeSwitcher}</div>
          ) : null}

          <ToolbarDivider />

          <div className="flex min-w-[12rem] flex-1 items-center px-4 py-2.5">{search}</div>

          {toolbarEnd ? (
            <>
              <ToolbarDivider />
              <div className="flex shrink-0 items-center gap-2 px-4 py-2.5">{toolbarEnd}</div>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
