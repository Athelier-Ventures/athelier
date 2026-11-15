# Athelier — arquitectura comercial y versión V0.3.0

## Estado y alcance real
Esta versión implementa una experiencia pública de navegación y la **base tipada del
motor de costos y configuración**, pero no habilita inventarios, pedidos reales, cobro,
autenticación administrativa ni escritura en Firebase. No crear registros de prueba en
producción. No publicar identidades administrativas ni claves en el cliente.

## Experiencia aprobada
- Pantalla inicial: imagen frontal Athelier con eslogan «Tu historia hecha presente, única como tú», sin alterarla.
- Tras el primer scroll **desktop/laptop**: tres paneles **verticales simultáneos**, cada uno de un tercio del ancho de la pantalla. Se descubren desde la derecha hacia la izquierda, con separadores verticales, fotografías editoriales y movimiento sutil.
- En **celular**: tres **franjas horizontales apiladas**; superior repostería, intermedia personalizaciones, inferior fotografía, de aproximadamente un tercio de la altura de pantalla cada una.
- Cada panel es un enlace real a una ruta independiente: /colecciones/reposteria, /colecciones/personalizaciones y /colecciones/fotografia.
- La portada mantiene selector ES/EN; las rutas de colección se presentan en español en V0.3.0 y tendrán localización persistente en una siguiente versión.
- Respeta la preferencia del usuario de reducir movimiento y la navegación por teclado.
- Imágenes de categorías: referencias editoriales de Unsplash bajo su licencia; **no** son fotografías oficiales ni un catálogo de artículos comercializados.

## 1. Catálogo maestro de insumos y compras
Entidades previstas en src/lib/commerce.ts:
- Material (insumo maestro), unidad base, varias líneas de uso y estado.
- Presentación de compra (paquete, caja, rollo): unidades base por presentación.
- Proveedor.
- Compra inmutable: proveedor, fecha, cantidad de paquetes, unidades por paquete históricas, costo base, impuesto separado, moneda y ámbito del importe (total de compra o por paquete).
- Cálculo de total de unidades y costo ponderado por unidad en un período.
- Impuestos: se guardan separados; el cálculo podrá incluirlos según el tratamiento contable definido.
- Ejemplo: 5 paquetes × 1,000 hojas = 5,000 hojas. Si **100 CAD es el total de la compra**, antes de impuestos = 0.02 CAD/hoja. Si el importe es **por paquete**, el costo es 0.10 CAD/hoja. La captura deberá obligar a elegir ámbito.

La clasificación de un insumo para una o más líneas **no** lo incorpora a todos los productos de esas líneas. La lista de materiales (BOM) vincula expresamente consumos y desperdicios por producto.

## 2. Constructor de productos
- Producto comercial distinto del insumo; título, estado borrador/publicado/archivado, moneda, precio base y asignación a una o varias líneas.
- Grupos de opciones seleccionables, obligatorios u opcionales, de selección única o múltiple, con límites.
- Opciones con precio fijo o por cantidad y restricciones que deben validarse también del lado del servidor.
- Precio al cliente = precio base + incrementos de las opciones, definidos **por el propietario**, no automáticamente por costo.
- Consumo teórico de materiales + precio histórico de compra = estimación interna de costo.
- Pedido futuro: una línea de carrito por artículo configurado, con snapshot de opciones, cantidades y precio para conservar lo contratado aunque el catálogo cambie.
- Ejemplo: libreta 20 CAD + calendario 4 + pasta dura 5 + dedicatoria 2 = 31 CAD. En el pedido es **una** libreta con tres opciones, no cuatro productos.

## 3. Publicación por línea
- Repostería / Dulce Tentación: productos con alternativas limitadas por el propietario, como caja/bolsa, nuez, arándanos o chocolate; no personalización libre de recetas.
- Personalizaciones / Manchas y Trazos: libretas, tazas y cilindros; opciones para hojas, pastas, secciones, imágenes, dedicatorias y vinil permanente.
- Fotografía / Eco en Tinta: el cliente aporta fotografías; el taller crea álbumes, portarretratos, pósters, piezas NFC y galerías actualizables; **no sesiones fotográficas**.
- Un producto puede publicarse en una o varias líneas sin duplicar registro.
- Un único carrito futuro compartido por las tres líneas, checkout de invitado y cuenta opcional; cada artículo guarda su propia configuración e instrucciones de producción.

## Seguridad obligatoria antes de habilitar administración
Tres superadministradores fueron designados por los propietarios, **sin incluir sus emails en el repositorio público**.
- Login Google ≠ permisos administrativos. Permitir acceso solo tras verificación de UID/claims/rol explícito **en backend y reglas Firebase**.
- Proteger compras, costos, proveedores, productos en borrador, cambios de precios, archivos subidos y galerías privadas.
- Auditoría y control de modificaciones; operaciones de pagos solo con integración validada.
- No habilitar rutas de edición, bases con permisos abiertos, ni checkout hasta pasar pruebas de acceso.

## Fases siguientes
1. Autenticación, provisioning seguro de superadmins, reglas y persistencia Firebase.
2. Captura de insumos/proveedores/presentaciones/compras; historial de precios y conversiones, entradas por ticket sin OCR obligatorio.
3. Constructor de productos y opciones dinámicas, galería, catálogo publicado y cotizaciones.
4. Carrito único persistido, checkout como invitado, pedidos, producción, cargas privadas y pago.
5. Galerías NFC privadas y operación postventa.

## Precisión de unidades
Una **hoja** no siempre equivale a dos **páginas** de contenido: el propietario definirá cómo se consumen las hojas por sección, con restricción por cantidad, impresiones y desperdicio.
