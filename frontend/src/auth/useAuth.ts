import { useContext } from 'react'
import { contextoAuth } from './contexto'

export function useAuth() {
  const valor = useContext(contextoAuth)
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return valor
}
