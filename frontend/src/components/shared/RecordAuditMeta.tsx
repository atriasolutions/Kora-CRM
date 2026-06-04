import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatAuditDateTime,
  resolveUserDisplay,
  type RecordAuditFields,
} from '@/lib/record-audit'
import { ensureRecordAudit } from '@/lib/seed-audit'
import { getUserDetailPath } from '@/lib/user-routes'

type RecordAuditMetaProps = {
  record: Partial<RecordAuditFields> & { ownerName?: string; owner?: string }
  className?: string
}

function AuditUserLink({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const user = resolveUserDisplay(userId, userName)
  if (!user.id) {
    return <span className="font-medium text-foreground">{user.name}</span>
  }
  return (
    <Link
      to={getUserDetailPath(user.id)}
      className="font-medium text-primary hover:underline"
      title={user.email}
    >
      {user.name}
    </Link>
  )
}

export function RecordAuditMeta({ record, className }: RecordAuditMetaProps) {
  const audit = ensureRecordAudit(
    record,
    record.updatedByName ??
      record.createdByName ??
      record.ownerName ??
      record.owner,
  )
  return (
    <Card className={className ?? 'shadow-sm'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Registro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fecha/Hora de creación</p>
          <p className="font-medium tabular-nums">{formatAuditDateTime(audit.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Creado por</p>
          <AuditUserLink userId={audit.createdById} userName={audit.createdByName} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fecha/Hora última modificación</p>
          <p className="font-medium tabular-nums">{formatAuditDateTime(audit.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Modificado por</p>
          <AuditUserLink userId={audit.updatedById} userName={audit.updatedByName} />
        </div>
      </CardContent>
    </Card>
  )
}
