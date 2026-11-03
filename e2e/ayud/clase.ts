import { expect, type Page } from '@playwright/test'
import { claseNueva } from './datos'

export async function completarClase(page: Page, datos = claseNueva) {
  const curso = page.getByRole('combobox', { name: 'Curso', exact: true })
  // Con el backend real el coordinador aún no puede listar cursos (GET /api/cursos): el campo
  // queda deshabilitado y la clase se guarda sin curso. Ver docs/esp/pantallas-figma.md.
  await expect(curso).not.toHaveText('Cargando cursos…')
  if (await curso.isEnabled()) await curso.selectOption({ label: datos.curso })
  await page.getByLabel('Nombre de la clase').fill(datos.nombre)
  await page.getByRole('combobox', { name: 'Instructor', exact: true }).selectOption({ label: datos.instructor })
  await page.getByLabel('Fecha').fill(datos.fecha)
  await page.getByLabel('Hora de inicio').fill(datos.inicio)
  await page.getByLabel('Hora de fin').fill(datos.fin)
  await page.getByLabel('Lugar').fill(datos.lugar)
}
