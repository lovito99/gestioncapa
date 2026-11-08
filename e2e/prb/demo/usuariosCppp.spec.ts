import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoUsuarios } from '../../ayud/usuarios'
test.use({viewport:{width:360,height:800}})
test('HU-35: administrador gestiona cuentas y roles en demo',async ({page}) => {await flujoUsuarios(page,cuentas.admin)})
