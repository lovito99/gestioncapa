import { expect, type Page } from '@playwright/test'
import { entrar } from './sesion'
export async function flujoUsuarios(page: Page, cuenta: Parameters<typeof entrar>[1]) {
  await entrar(page,cuenta)
  await page.getByRole('link',{name:'Usuarios',exact:true}).click()
  const marca=`Docente ${Date.now()}`
  await page.getByRole('button',{name:'Crear usuario',exact:true}).click()
  await page.getByLabel('Nombre',{exact:true}).fill(marca)
  await page.getByLabel('Correo electrónico',{exact:true}).fill(`docente${Date.now()}@prueba.local`)
  await page.getByLabel('Contraseña inicial').fill('Prueba123')
  await page.getByLabel('Rol',{exact:true}).selectOption('agremiado')
  await page.getByLabel('Motivo del cambio').fill('Alta de docente para capacitación')
  await page.getByRole('button',{name:'Guardar usuario',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Nuevo usuario',exact:true})).toHaveCount(0)
  await page.getByLabel('Buscar por nombre o correo').fill(marca)
  const fila=page.getByRole('listitem').filter({hasText:marca})
  await expect(fila).toContainText('Agremiado · Activo')
  await fila.getByRole('button',{name:`Editar ${marca}`,exact:true}).click()
  await page.getByLabel('Rol',{exact:true}).selectOption('instructor')
  await page.getByLabel('Cuenta activa',{exact:true}).uncheck()
  await page.getByLabel('Motivo del cambio').fill('Cambio de funciones y desactivación de prueba')
  await page.getByRole('button',{name:'Guardar usuario',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Editar usuario',exact:true})).toHaveCount(0)
  await expect(fila).toContainText('Instructor · Inactivo')
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true)
}
