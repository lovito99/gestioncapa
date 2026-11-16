import { test } from '../../ayud/prueba'
import { flujoRegistro } from '../../ayud/registro'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-50: registro persistente con sesión y recuperación asistida a 360 px', async ({ page }) => {
  await flujoRegistro(page)
})

test('HU22-P2: registro real vuelve al curso elegido y crea cuenta participante',async({page,request})=>{
  const datos=await(await request.get('/api/publico/cursos')).json()
  const curso=datos.items.find((item:{cuposDisponibles:number})=>item.cuposDisponibles>0) as {id:string;titulo:string}
  await flujoRegistro(page,curso)
})
