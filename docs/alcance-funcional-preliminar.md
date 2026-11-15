# Athelier — alcance funcional preliminar

> Documento de continuidad en elaboración. No significa que exista funcionalidad comercial implementada. No publicar datos personales de administradores en el cliente.

## Marcas y secuencia en la portada
1. **Repostería — Dulce Tentación**
2. **Personalizaciones — Manchas y Trazos**
3. **Fotografía — Eco en Tinta**

## Experiencia pública
- Primera pantalla: identidad Athelier con fotografía frontal aprobada y eslogan «Tu historia hecha presente, única como tú».
- Al hacer scroll: tres franjas sucesivas, cada una de aproximadamente 1/3 del alto visible, con transiciones discretas y adaptables a portrait/landscape.
- Español (México) predeterminado con alternancia ES/EN. Las marcas conservan sus nombres en ambos idiomas.
- La landing V0.2.0 es **visual exclusivamente**. No se ofrecen aún productos, precios, registros, pedidos, cotizaciones ni pagos.

## Catálogo de insumos y adquisiciones (diseño futuro)
- Gestión restringida a propietarios/superadministradores autorizados.
- Productos maestros, proveedores, presentaciones y unidades de medida.
- Compras: artículo, presentación, unidades por presentación, número de presentaciones compradas, costo, impuestos y proveedor. Posibilidad de registrar desde ticket como flujo futuro.
- Normalización de costo unitario y costos por cantidades derivadas: hoja, centenar, etc.
- Ejemplo proporcionado: papel bond 125 g, 1,000 hojas por paquete, compra de 5 paquetes, costo 100 e impuesto 15. **Por definir** si costo e impuestos se aplican por paquete o al total, y cómo se administran inventarios, desperdicio, envíos y márgenes.
- Las reglas de precio se ejecutarán con una fuente única de cálculo y datos validados. La IA, si se integra después, no definirá precios por cuenta propia.

## Catálogo comercial por línea
- **Dulce Tentación:** productos de repostería con **opciones de personalización establecidas por el propietario**. Ejemplo: galletas, empaque en caja o bolsa, ingredientes adicionales seleccionables como arándanos, nuez o chocolate. El cliente no puede inventar recetas ni combinaciones fuera de catálogo. Galería por producto.
- **Manchas y Trazos:** artículos personalizados bajo configuraciones habilitadas por el propietario, calculadas por consumo de insumos. Ejemplo de libreta: 50/100/150 páginas; pasta dura o suave; imágenes de portada y separadores; secciones opcionales de calendario, agenda, notas. Galería y carga de material del cliente en fases futuras.
- **Eco en Tinta:** **no presta sesiones fotográficas**. Recibe fotografías que el cliente aporta y fabrica álbumes, portarretratos, pósters y productos terminados con características seleccionables. Puede incorporar NFC enlazado a una galería digital actualizable. Control de acceso a las galerías y derechos de las imágenes por definir.

## Seguridad (pendiente de implementación)
- Acceso con Google para clientes **no otorga acceso a la administración**.
- Superadministradores: tres identidades designadas fuera del código público.
- La autorización deberá validarse en backend/Firebase Rules mediante identidad Firebase UID/claims/rol concedido, **nunca por una lista de emails incluida en código frontend ni por iniciar sesión únicamente**.
- Mínimo privilegio, auditoría de cambios de precios, productos y roles; separación de vista pública vs panel administrativo.

## Estado
- Implementado hasta V0.2.0: portada, navegación por scroll, franjas visuales, idiomas ES/EN, PWA web básica y assets.
- Aún no implementado: login, permisos, catálogo, proveedores, compras, inventarios, costos, configuradores, galerías privadas, NFC, pagos, IA.
- App Store/Google Play: empaquetado y procesos de publicación pendientes.
