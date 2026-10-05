import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EnlaceVolver({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand hover:underline"
    >
      <ArrowLeft className="size-3" strokeWidth={2.5} aria-hidden />
      {children}
    </Link>
  )
}
