import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { test,expect } from '../../ayud/prueba'
import { cuentaReal,cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'
import { entornoBackendReal } from '../../ayud/entornoReal'
import { confirmarInscripcion } from '../../ayud/cobroInscripcion'
import { declararTransferencia } from '../../ayud/pagoCurso'

test('HU32/T25: sube voucher, descarga, rechaza y confirma una transferencia con API y BD reales',async({page,context})=>{
  test.setTimeout(90000)
  const errores:string[]=[]
  page.on('pageerror',error=>errores.push(error.message))
  const {stdout}=await promisify(execFile)('node',['--import','tsx','src/scripts/transferenciaDemoE2e.ts'],{cwd:'backend',env:{...process.env,...entornoBackendReal}})
  const curso=JSON.parse(stdout) as {id:string;titulo:string}
  await page.setViewportSize({width:360,height:800})
  await entrar(page,cuentaReal)
  const participante=await context.newPage()
  participante.on('pageerror',error=>errores.push(error.message))
  await participante.setViewportSize({width:360,height:800})
  await entrar(participante,cuentas.part)
  await participante.goto(`/cursos/${curso.id}`)
  const alta=participante.waitForResponse(respuesta=>respuesta.url().endsWith(`/cursos/${curso.id}/inscribirme`))
  await confirmarInscripcion(participante,true)
  const {pagoId}=await (await alta).json() as {pagoId:string}
  await expect(participante).toHaveURL(`/cursos/${curso.id}/pagar`)
  const motivo='No se encuentra el abono en la cuenta de pruebas.'
  for(const numero of [1,2]) {
    const referencia=`ABONO-E2E-${pagoId}-${numero}`
    await participante.goto(`/cursos/${curso.id}/pagar`)
    // S3 7.1: tras un rechazo, la pantalla de pago muestra el motivo antes de subir otro voucher
    if(numero===2) await expect(participante.getByText(motivo,{exact:true})).toBeVisible()
    await declararTransferencia(participante,pagoId,referencia,async()=>{
      await expect(participante.getByText(/BANCO FICTICIO E2E/).first()).toBeVisible()
      await participante.screenshot({path:test.info().outputPath(`declararTransferencia-${numero}.png`),fullPage:true})
    })
    await participante.goto(`/cursos/${curso.id}`)
    await expect(participante.getByRole('heading',{name:'1. Contenido tras transferencia'})).toHaveCount(0)
    await page.goto(`/admin/pagos/conciliar?pago=${pagoId}`)
    const revision=page.getByRole('region',{name:`Transferencia ${referencia}`,exact:true})
    await expect(revision.getByText('BANCO FICTICIO E2E',{exact:false})).toBeVisible()
    const descarga=page.waitForEvent('download')
    await revision.getByRole('button',{name:'Descargar voucher'}).click()
    expect((await descarga).suggestedFilename()).toBe('voucher.png')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if(numero===1) {
      await revision.getByLabel('Motivo del rechazo').fill(motivo)
      await revision.getByRole('button',{name:'Rechazar transferencia',exact:true}).click()
      await expect(revision.getByRole('status')).toContainText('Transferencia rechazada')
    } else {
      await expect(revision.getByRole('button',{name:'Confirmar abono bancario'})).toBeDisabled()
      await revision.getByLabel('Importe abonado (S/)').fill('30.50')
      await revision.getByRole('checkbox',{name:/He verificado el abono real/}).check()
      await page.screenshot({path:test.info().outputPath('revisarTransferencia.png'),fullPage:true})
      const confirmacion=page.waitForResponse(respuesta=>respuesta.request().method()==='POST'&&respuesta.url().includes('/revision'))
      await revision.getByRole('button',{name:'Confirmar abono bancario'}).click()
      expect((await confirmacion).status()).toBe(200)
      await expect(page.getByRole('status').filter({hasText:'Pago confirmado'})).toBeVisible()
      await expect(page.getByText(/Comprobante de pago · Correo pendiente de envío/)).toBeVisible()
    }
  }
  await participante.goto(`/cursos/${curso.id}/pagar`)
  await expect(participante.getByRole('heading',{name:'¡Pago confirmado!',exact:true})).toBeVisible({timeout:10000})
  await participante.getByRole('link',{name:'Ir al curso',exact:true}).click()
  await expect(participante.getByRole('heading',{name:'1. Contenido tras transferencia'})).toBeVisible()
  for(const ancho of [320,768,1024,1440]) {
    await participante.setViewportSize({width:ancho,height:900})
    await participante.evaluate(()=>document.fonts.ready)
    const medidas=await participante.evaluate(()=>({ancho:innerWidth,contenido:document.documentElement.scrollWidth,
      extremos:[...document.querySelectorAll('body *')].filter(elemento=>elemento.getBoundingClientRect().right>innerWidth&&elemento.getBoundingClientRect().width>0).slice(0,8).map(elemento=>({etiqueta:elemento.tagName,clase:elemento.className,texto:elemento.textContent?.slice(0,80)}))}))
    expect(medidas.contenido,JSON.stringify(medidas)).toBeLessThanOrEqual(medidas.ancho)
  }
  await participante.screenshot({path:test.info().outputPath('transferenciaConfirmada.png'),fullPage:true})
  expect(errores).toEqual([])
  await participante.close()
})
