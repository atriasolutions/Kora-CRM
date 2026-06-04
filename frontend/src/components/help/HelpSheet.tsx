import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Keyboard,
  Search,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { HelpTopicBody } from '@/components/help/HelpTopicBody'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { useHelpOverlay } from '@/contexts/help-context-provider'
import { useMenuAccess } from '@/hooks/use-menu-access'
import {
  allHelpTopicsForIndex,
  buildEffectiveTopic,
  filterHelpTopics,
  HELP_CONTENT,
  lookupHelpTopic,
  moduleIdFromHelpKey,
} from '@/help/help-topics'
import { resolveHelpContext } from '@/lib/help-context'
import {
  BookOpen as BookOpenIcon,
  helpViewLabel,
  navIconForModule,
  navLabelForModule,
} from '@/lib/help-nav'
import { navSections } from '@/navigation'
import { cn } from '@/lib/utils'

export function HelpSheet() {
  const { open, showIndex, closeHelp, openHelp, openHelpIndex } = useHelpOverlay()
  const { pathname } = useLocation()
  const { can } = useMenuAccess()
  const [search, setSearch] = useState('')
  const [pinnedTopicKey, setPinnedTopicKey] = useState<string | null>(null)

  const helpCtx = useMemo(() => resolveHelpContext(pathname), [pathname])
  const baseTopic = useMemo(() => {
    if (pinnedTopicKey && !showIndex) {
      return HELP_CONTENT[pinnedTopicKey] ?? lookupHelpTopic(helpCtx)
    }
    return lookupHelpTopic(helpCtx)
  }, [helpCtx, pinnedTopicKey, showIndex])

  const topicModuleId = useMemo(() => {
    if (pinnedTopicKey) return moduleIdFromHelpKey(pinnedTopicKey)
    return helpCtx.moduleId
  }, [pinnedTopicKey, helpCtx.moduleId])

  const effectiveTopic = useMemo(() => {
    if (!topicModuleId) {
      return buildEffectiveTopic(baseTopic, helpCtx, () => false)
    }
    return buildEffectiveTopic(
      baseTopic,
      helpCtx,
      (moduleId, action) => can(moduleId, action),
      topicModuleId,
    )
  }, [baseTopic, helpCtx, topicModuleId, can])

  const ContextIcon = topicModuleId
    ? navIconForModule(topicModuleId)
    : HelpCircle
  const contextModuleLabel = topicModuleId
    ? navLabelForModule(topicModuleId)
    : 'Kora CRM'
  const contextViewLabel = helpViewLabel(helpCtx.view)

  useEffect(() => {
    setPinnedTopicKey(null)
    setSearch('')
  }, [pathname])

  const indexTopics = useMemo(() => allHelpTopicsForIndex(), [])
  const filteredIndex = useMemo(
    () => filterHelpTopics(search, indexTopics),
    [search, indexTopics],
  )

  const groupedIndex = useMemo(() => {
    const groups: { heading: string; items: typeof filteredIndex }[] = []
    for (const section of navSections) {
      const heading = section.type === 'group' ? section.heading : 'Principal'
      const moduleIds = section.items.map((i) => i.moduleId)
      const items = filteredIndex.filter((entry) => {
        const mod = entry.key.split('.')[0]
        return moduleIds.includes(mod as (typeof moduleIds)[number])
      })
      if (items.length > 0) groups.push({ heading, items })
    }
    const known = new Set(groups.flatMap((g) => g.items.map((i) => i.key)))
    const rest = filteredIndex.filter((e) => !known.has(e.key))
    if (rest.length > 0) {
      groups.push({ heading: 'Otros', items: rest })
    }
    return groups
  }, [filteredIndex])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPinnedTopicKey(null)
      setSearch('')
      closeHelp()
    }
  }

  const showContextualHelp = () => {
    setPinnedTopicKey(null)
    setSearch('')
    openHelp()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-border/80 bg-background p-0 shadow-xl sm:max-w-lg"
      >
        {/* Cabecera con gradiente al estilo dashboard */}
        <div
          className={cn(
            'relative shrink-0 border-b border-primary/15',
            'bg-gradient-to-br from-primary/14 via-primary/6 to-chart-5/8',
            'px-4 pb-4 pt-4 pe-12',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -end-6 -top-6 size-28 rounded-full bg-primary/20 blur-2xl"
          />
          <div className="relative space-y-3">
            {showIndex ? (
              <div className="flex items-start gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-lg bg-background/60 text-foreground shadow-sm backdrop-blur-sm hover:bg-background/90"
                  aria-label="Volver a ayuda contextual"
                  onClick={showContextualHelp}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-background/70 text-primary shadow-sm">
                      <BookOpenIcon aria-hidden className="size-4" />
                    </span>
                    <Badge variant="secondary" className="font-normal">
                      Índice
                    </Badge>
                  </div>
                  <SheetTitle id="help-sheet-title" className="text-lg">
                    Centro de ayuda
                  </SheetTitle>
                  <SheetDescription className="mt-1 text-foreground/70">
                    Busca por módulo o palabra clave y abre cualquier guía.
                  </SheetDescription>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-background/80 text-primary shadow-sm backdrop-blur-sm">
                    <ContextIcon aria-hidden className="size-5" />
                  </span>
                  <Badge variant="outline" className="border-primary/25 bg-background/50 font-normal">
                    {contextModuleLabel}
                  </Badge>
                  {!pinnedTopicKey && helpCtx.moduleId ? (
                    <Badge variant="muted" className="font-normal">
                      {contextViewLabel}
                    </Badge>
                  ) : null}
                </div>
                <SheetTitle id="help-sheet-title" className="text-xl leading-tight">
                  {effectiveTopic.title}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground/65">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles aria-hidden className="size-3.5 text-primary" />
                    Guía contextual de esta pantalla
                  </span>
                  <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden />
                  <span className="inline-flex items-center gap-1.5">
                    <Keyboard aria-hidden className="size-3.5" />
                    Atajo{' '}
                    <kbd className="rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm">
                      ?
                    </kbd>
                  </span>
                </SheetDescription>
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
          {showIndex ? (
            <>
              <div className="shrink-0 px-4 py-3">
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar módulo, acción o concepto…"
                    className="h-10 rounded-xl border-border/80 bg-background ps-9 text-sm shadow-sm"
                    aria-label="Buscar en todas las ayudas"
                  />
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 px-4 pb-4">
                  {groupedIndex.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-background/80 px-6 py-10 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Search aria-hidden className="size-5" />
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Sin resultados para tu búsqueda.
                      </p>
                    </div>
                  ) : (
                    groupedIndex.map((group) => (
                      <section key={group.heading}>
                        <h3 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.heading}
                        </h3>
                        <ul className="space-y-1.5">
                          {group.items.map(({ key, topic, moduleLabel }) => {
                            const modId = key.split('.')[0] ?? ''
                            const ItemIcon = navIconForModule(modId)
                            return (
                              <li key={key}>
                                <button
                                  type="button"
                                  className={cn(
                                    'group flex w-full items-center gap-3 rounded-xl border border-transparent',
                                    'bg-background px-3 py-2.5 text-start shadow-sm',
                                    'transition-colors hover:border-primary/20 hover:bg-primary/5',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  )}
                                  onClick={() => {
                                    setSearch('')
                                    setPinnedTopicKey(key)
                                    openHelp()
                                  }}
                                >
                                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                                    <ItemIcon aria-hidden className="size-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-foreground">
                                      {topic.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                      {moduleLabel}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                                  />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-4">
                <HelpTopicBody topic={effectiveTopic} />
              </div>
            </ScrollArea>
          )}

          <div className="shrink-0 border-t border-border/80 bg-background/90 px-4 py-3 backdrop-blur-sm">
            {!showIndex ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 rounded-xl border-primary/20 bg-gradient-to-r from-background to-primary/5 hover:border-primary/30 hover:bg-primary/8"
                onClick={openHelpIndex}
              >
                <BookOpenIcon className="size-4" aria-hidden />
                Explorar todas las ayudas
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={showContextualHelp}
              >
                Volver a ayuda de esta pantalla
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
