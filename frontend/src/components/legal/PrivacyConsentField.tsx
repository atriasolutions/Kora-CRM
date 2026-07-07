import { Link } from 'react-router-dom'

import {
  PLATFORM_LEGAL,
  PLATFORM_PRIVACY_POLICY_PATH,
  PLATFORM_TERMS_PATH,
} from '@/lib/platform-legal'
import { cn } from '@/lib/utils'

type PrivacyConsentFieldProps = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  showTermsLink?: boolean
}

export function PrivacyConsentField({
  id,
  checked,
  onChange,
  className,
  disabled,
  showTermsLink = true,
}: PrivacyConsentFieldProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/20 p-3', className)}>
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-input"
          required
        />
        <label htmlFor={id} className="min-w-0 text-sm leading-relaxed text-foreground">
          <span className="font-medium">Acepto el tratamiento de mis datos personales.</span>{' '}
          He leído y acepto la{' '}
          <Link
            to={PLATFORM_PRIVACY_POLICY_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Política de Privacidad
          </Link>
          {showTermsLink ? (
            <>
              {' '}
              y los{' '}
              <Link
                to={PLATFORM_TERMS_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Términos de Uso
              </Link>
            </>
          ) : null}{' '}
          de {PLATFORM_LEGAL.controllerTradeName} (versión {PLATFORM_LEGAL.privacyVersion}).
          Puedes ejercer tus derechos ARSOPB escribiendo a{' '}
          <a
            href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {PLATFORM_LEGAL.controllerEmail}
          </a>
          .
        </label>
      </div>
    </div>
  )
}
