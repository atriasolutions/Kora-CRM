import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ContactActivityType } from '@/data/contact-detail.mock'

type RegisterActivityHeaderButtonProps = {
  onRegister?: (presetType?: ContactActivityType) => void
  /** Estilo compacto con menú desplegable (Compras / Inventario). */
  variant?: 'split' | 'dropdown'
}

export function RegisterActivityHeaderButton({
  onRegister,
  variant = 'split',
}: RegisterActivityHeaderButtonProps) {
  if (!onRegister) return null

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-border shadow-sm">
            <Calendar aria-hidden className="size-4" />
            Actividad
            <ChevronDown aria-hidden className="size-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRegister('llamada')}>Llamada</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('email')}>Email</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('reunion')}>Reunión</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('nota')}>Nota</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex">
      <Button
        type="button"
        size="sm"
        className="rounded-e-none shadow-sm"
        onClick={() => onRegister()}
      >
        <CalendarPlus aria-hidden className="size-4" />
        Registrar actividad
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="rounded-s-none border-s-0 px-2 shadow-sm"
            aria-label="Tipo de actividad rápida"
          >
            <ChevronDown aria-hidden className="size-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onRegister('llamada')}>
            <Phone aria-hidden className="size-4" />
            Llamada
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('email')}>
            <Mail aria-hidden className="size-4" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('reunion')}>
            <Calendar aria-hidden className="size-4" />
            Reunión
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('whatsapp')}>
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegister('nota')}>
            <StickyNote aria-hidden className="size-4" />
            Nota
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
