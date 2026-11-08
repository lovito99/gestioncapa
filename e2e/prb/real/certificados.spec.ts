import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { completarAcceso, entrar } from '../../ayud/sesion'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-20: constancia real de demostración, PDF estable y verificación sin DNI', async ({ page, context }) => {
  test.setTimeout(90000)
  const { stdout } = await promisify(execFile)('npm',['exec','-w','backend','--','tsx','src/scripts/certificadoDemoE2e.ts'],{env:{...process.env,NODE_ENV:'test',DB_NAME:'gestioncapa_e2e',ADMIN_EMAIL:cuentaReal.email,ADMIN_PASSWORD:cuentaReal.password,JWT_SECRET:'secreto-local-exclusivo-para-pruebas-e2e',QR_SECRET:'secreto-qr-local-exclusivo-para-pruebas-e2e'}})
  const { cursoId, titulo } = JSON.parse(stdout) as {cursoId:string;titulo:string}
  await entrar(page,cuentaReal)
  await page.goto(`/admin/cursos/${cursoId}/cerrar`)
  await expect(page.getByRole('row').filter({hasText:'María Quispe'})).toContainText('8 de 10 (80 %)')
  await expect(page.getByRole('row').filter({hasText:'Luz Apaza'})).toContainText('7 de 10 (70 %)')
  await page.getByRole('button',{name:'Emitir constancias',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Certificados del curso',exact:true})).toBeVisible()
  const fila=page.getByRole('row').filter({hasText:'María Quispe'})
  const codigo=(await fila.getByRole('link').first().textContent())!.trim()
  await expect(page.getByRole('row').filter({hasText:'Luz Apaza'})).toContainText('No emitido')
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await completarAcceso(page,cuentas.luz)
  await page.getByRole('link',{name:'Mis cursos',exact:true}).click()
  await expect(page.getByRole('article').filter({has:page.getByRole('heading',{name:titulo,exact:true})})).toContainText('tu asistencia fue 70 %')
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await completarAcceso(page,cuentas.part)
  await expect(page.getByRole('navigation',{name:'Navegación principal'})).toBeVisible()
  await page.goto(`/certificados/${codigo}`)
  await expect(page.getByText('Documento de demostración. Sin validez oficial; firmas genéricas.')).toBeVisible()
  const descargar = async () => {
    const espera=page.waitForEvent('download')
    await page.getByRole('button',{name:'Descargar PDF',exact:true}).click()
    const descarga=await espera
    expect(descarga.suggestedFilename()).toContain(codigo)
    return descarga
  }
  await (await descargar()).saveAs(test.info().outputPath('constancia.pdf'))
  await descargar()
  const qr=page.getByRole('link',{name:`Verificar el certificado ${codigo}`,exact:true})
  await expect(qr).toHaveAttribute('href',new RegExp(`/verificar/${codigo}$`))
  const verificado=page.waitForResponse(r => new URL(r.url()).pathname===`/api/certificados/${codigo}` && r.status()===200)
  await qr.click()
  await verificado
  await expect(page.getByRole('region',{name:'Resultado de la verificación'})).toContainText('Válido')
  const anonima=await context.browser()!.newContext()
  try {
    const publica=await anonima.newPage()
    await publica.goto(`${new URL(page.url()).origin}/verificar/${codigo}`)
    await expect(publica.getByRole('region',{name:'Resultado de la verificación'})).toContainText('Válido')
    await expect(publica.getByRole('region',{name:'Resultado de la verificación'})).not.toContainText('DNI')
  } finally {await anonima.close()}
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await completarAcceso(page,cuentaReal)
  await expect(page.getByRole('navigation',{name:'Navegación principal'})).toBeVisible()
  await page.goto(`/admin/cursos/${cursoId}/certificados`)
  const luz=page.getByRole('row').filter({hasText:'Luz Apaza'})
  await luz.getByRole('button',{name:'Emitir por excepción',exact:true}).click()
  const dialogo=page.getByRole('alertdialog')
  await dialogo.getByRole('button',{name:'Emitir constancia',exact:true}).click()
  await expect(dialogo).toContainText('Ingresa el motivo de la excepción.')
  await dialogo.getByLabel('Motivo de la excepción').fill('Justificación del administrador en prueba.')
  await dialogo.getByRole('button',{name:'Emitir constancia',exact:true}).click()
  await expect(luz).toContainText('Por excepción')
})
