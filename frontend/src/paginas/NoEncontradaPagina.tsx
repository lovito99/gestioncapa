import { Link } from 'react-router-dom'

export function NoEncontradaPagina() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-brand">Error 404</p>
      <h1 className="text-2xl font-semibold text-ink">No encontramos esta página</h1>
      <Link to="/" className="text-sm font-semibold text-brand hover:underline">
        Ir al inicio
      </Link>
    </main>
  )
}
