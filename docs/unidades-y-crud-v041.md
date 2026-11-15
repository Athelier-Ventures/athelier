# Athelier V0.4.1 — Catálogo flexible de unidades y CRUD seguro

## Objetivo
Permitir al propietario crear/editar unidades y equivalencias sin editar código y utilizarlas en insumos/presentaciones de compra, con rastreo de costos históricos y seguridad por servidor.

## Conceptos
- **Unidad base**: la unidad de consumo/costeo para un insumo: hoja, pieza, litro, metro o cualquier otra que el propietario necesite. Ejemplo: `Hoja (hoja)`.
- **Unidad derivada o de compra**: cantidad equivalente a una **unidad base definida**; p. ej. `Paquete de 100 (paq100)` = 100 `Hoja`. Otro ejemplo: `Caja de 12` = 12 `Pieza`.
- **Material / insumo**: elige su unidad base. No se permite cambiarla cuando ya hay compras o presentaciones asociadas.
- **Presentación**: vincula un insumo con una unidad derivada compatible o conserva la posibilidad de escribir la equivalencia manual, útil para insumos anteriores. Si se selecciona una unidad del catálogo, la equivalencia es validada y calculada por el **servidor**, no por el navegador.
- **Compra**: guarda `unitsPerPackageSnapshot`, `unitIdSnapshot` y `presentationNameSnapshot`, además del costo, impuestos y fecha; si cambia una presentación después, los costos históricos **no cambian**.

## Ejemplo de extremo a extremo
1. En **Unidades**, crear unidad base `Hoja`, abreviatura `hoja`.
2. Crear unidad derivada `Paquete de 100 hojas`, abreviatura `paq100`, con base `Hoja` y conversión `100`.
3. En **Insumos**, crear `Papel bond 125 g` y seleccionar la nueva unidad base `Hoja`.
4. En **Presentaciones**, crear `Paquete bond 100 hojas` y asociar la unidad derivada `Paquete de 100 hojas`. El sistema determina `1 paquete = 100 hojas`.
5. En **Compras**, seleccionar el proveedor, la presentación y la cantidad de paquetes. Si se registran 5 paquetes, se contabilizan 500 hojas. Los importes capturados quedan en MXN.
6. Cuando se compre en cajas de 500 hojas, se puede crear una nueva unidad derivada y otra presentación; no se altera la compra anterior.

## CRUD
| Catálogo | Crear | Consultar | Editar | Eliminar |
|---|---|---|---|---|
| Unidades | Sí | Sí | Sí | Sólo sin referencias |
| Proveedores | Sí | Sí | Sí | Sólo sin compras |
| Insumos | Sí | Sí | Sí | Sólo sin presentaciones, compras ni recetas |
| Presentaciones | Sí | Sí | Sí | Sólo sin compras |
| Productos | Sí | Sí | Sí | Eliminar sólo borradores; archivar publicados |
| Compras | Sí | Sí | No | No: histórico inmutable |

Para elementos usados, la interfaz permite **desactivar** en vez de borrarlos. Las acciones pasan por la sesión Google verificada en servidor, lista privada de administradores y validación de referencias antes de escribir; los cambios quedan en `admin_audit`. Ninguna eliminación peligrosa se permite simplemente porque un usuario alteró un formulario.

## Compatibilidad
- Los insumos creados con unidades anteriores `sheet`, `piece`, `gram`, `millilitre`, `centimetre` siguen disponibles sin migración destructiva.
- El catálogo nuevo de unidades se aplica plenamente a materiales nuevos con `baseUnitId`; las presentaciones de los materiales anteriores pueden seguir usando conversión manual.
- Una nueva equivalencia no es global para unidades incompatibles (un paquete definido como 100 hojas no se asocia a un insumo expresado en gramos).
- No hay cambios retroactivos al histórico de compras.
- Moneda operativa: MXN.

## Control de calidad recomendado
1. Crear hoja y paquete de 100 → guardar y recargar → recuperar registros.
2. Crear papel bond con la unidad hoja → crear presentación con paquete 100 → registrar 5 paquetes → comprobar 500 hojas.
3. Crear caja de 12 piezas con unidad base pieza. Intentar asignarla a papel en hojas: no debe permitirlo.
4. Editar una unidad sin referencias y confirmar los cambios. Al usarla en una presentación, intentar modificar su equivalencia: respuesta 409.
5. Intentar eliminar un proveedor con compras, un material utilizado y una presentación comprada: respuesta 409; desactivarlos en su lugar.
6. Crear un producto en borrador y eliminarlo; archivar un producto publicado sin afectar el histórico de compra.
7. Verificar que una cuenta no autorizada recibe HTTP 403 en POST, PATCH y DELETE.

Las compras y costos corresponden a registros reales: no precargar datos de demostración en producción. Checkout y administración de existencias siguen siendo fases posteriores.
