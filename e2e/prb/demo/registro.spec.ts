import { test,expect } from '../../ayud/prueba'
import { flujoRegistro } from '../../ayud/registro'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-50: registro por DNI, validación y duplicados en demo a 360 px', async ({ page }) => {
  await flujoRegistro(page)
})

test('HU22-P2: alta y cambio login/registro conservan el curso en demo',async({page})=>{
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Catálogo de cursos',exact:true})).toBeVisible()
  const curso=await page.evaluate(async()=>{
    const datos=await(await fetch('/api/publico/cursos')).json()
    return datos.items.find((item:{cuposDisponibles:number})=>item.cuposDisponibles>0) as {id:string;titulo:string}
  })
  await flujoRegistro(page,curso)
})
