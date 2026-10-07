import type { Page } from '@playwright/test'
import { claseNueva } from './datos'

export async function completarClase(page: Page, datos = claseNueva) {
  await page.getByLabel('Nombre de la clase').fill(datos.nombre)
  await page.getByRole('combobox', { name: 'Instructor', exact: true }).selectOption({ label: datos.instructor })
  await page.getByLabel('Fecha').fill(datos.fecha)
  await page.getByLabel('Hora de inicio').fill(datos.inicio)
  await page.getByLabel('Hora de fin').fill(datos.fin)
  await page.getByLabel('Lugar').fill(datos.lugar)
}
