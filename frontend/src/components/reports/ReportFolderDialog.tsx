import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateNodeName } from '@/lib/reports-tree'

type ReportFolderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialName?: string
  onSubmit: (name: string) => void
}

export function ReportFolderDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  onSubmit,
}: ReportFolderDialogProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setName(initialName)
    })
  }, [open, initialName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateNodeName(name)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(name.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva carpeta' : 'Renombrar carpeta'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Se creará dentro de la carpeta seleccionada (o en la raíz).'
              : 'Cambia el nombre de la carpeta.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ContactFormInput
            id="folder-name"
            label="Nombre"
            value={name}
            onChange={setName}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{mode === 'create' ? 'Crear' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
