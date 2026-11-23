# ATHELIER — Producto configurable, fotos y subtotal (rama de revisión, 2026-11-22)

Este paquete de cambios extiende la versión V0.5 de `main` sin modificar compras históricas ni crear datos comerciales ficticios. Se trabaja en `feat/product-images-private-personalization-cart-20261122`. **No autoriza producción.** La revisión y publicación deben seguir el protocolo de ATHELIER en el PR documental #6, todavía no fusionado al iniciar este desarrollo.

## Cambios implementados en el código

1. **Administrador / productos:** carga de fotografía JPG/PNG/WebP (máximo 5 MB) autenticada y autorizada, vinculada a la URL interna de imagen del producto. La URL externa antigua sigue disponible.
2. **Administrador / personalización:** secciones de fotos del cliente por producto (nombre y máximo de fotografías; hasta 10 secciones); configuración de compra del producto estándar sin adicionales; control de orden de grupos de personalización con Subir/Bajar, persistido por la secuencia del arreglo, sin introducir IDs nuevos para grupos existentes.
3. **Catálogo:** secciones de selección de fotos con validación básica, selección de «Producto estándar — sin adicionales» únicamente si `allowBasePurchase` se habilita en el producto, precio unitario y subtotal en tiempo real `precioUnitario * cantidad` sin añadir IVA al final.
4. **Carrito:** conserva configuraciones, cantidades e identificadores de fotografías privadas. El subtotal se calcula con `unitPriceCents * quantity`; al quitar el artículo, intenta borrar sus archivos privados locales.

### Cómo activar la compra de libreta estándar existente

El campo `allowBasePurchase` es **false** para los productos existentes hasta que el propietario entre a `/admin`, seleccione la libreta concreta, marque «Permitir comprar el producto estándar sin adicionales» y guarde. No cambiar otros productos ni sobrescribir requisitos de grupos obligatorios que no sean la excepción deliberada del producto estándar. Si el cliente elige alguna alternativa, las reglas de grupos obligatorios vuelven a validarse.

### Fotografías aportadas por el cliente — limitación de la fase actual

- Se pueden seleccionar archivos JPG/PNG/WebP (hasta 5 MB por imagen), en secciones definidas por el administrador (máximo 10 archivos en total por producto).
- **Se guardan únicamente en IndexedDB, en el navegador del cliente y por identificador de artículo del carrito.** No se suben a Firebase, ni al backend ni a otra cuenta.
- El carrito incluye nombres/ubicaciones de los archivos como metadatos, **no sus bytes**. No se presentan como recibidos por el taller. Se avisa explícitamente que la entrega de fotos y la orden real siguen pendientes de un backend transaccional, autenticado y seguro.
- Los archivos pueden perderse si se borra el navegador o se cambia de dispositivo. Antes de aceptar pedidos comerciales reales se requiere carga privada a almacenamiento remoto, consentimiento/retención, backend de órdenes, verificación de titularidad, límite de cuota y limpieza de borradores abandonados.
- NO cachear fotos privadas en el service worker, ni compartirlas con otros clientes.

## Almacenamiento administrativo: configuración necesaria

La carga de imágenes principales utiliza el **Firebase Admin SDK** existente y un objeto privado en Cloud Storage. Una ruta del servidor permite leer la imagen **sólo si está referenciada en un producto publicado**; de otro modo responde 404. No se cambia automáticamente ninguna regla ni se crea un bucket.

Configurar la variable privada **`FIREBASE_STORAGE_BUCKET`**, con el identificador real del bucket de Firebase Storage. **No revelar su valor en documentación, código o chats.** El servicio debe contar con permisos apropiados para subir y leer archivos. Si falta configuración, la carga falla cerrada con `STORAGE_NOT_CONFIGURED`.

**Prevención de escrituras productivas desde Preview:** en `VERCEL_ENV=preview`, el endpoint de subida queda deshabilitado salvo que un administrador configure un bucket de prueba aislado y active explícitamente `ATHELIER_PREVIEW_UPLOADS_ENABLED=true` sólo para Preview. Verificar también que credenciales y reglas de entorno de Preview no apunten a recursos productivos antes de ejecutar pruebas de escritura.

No se verificaron los nombres/ámbitos efectivos de variables Vercel en este corte (acceso de lectura anteriormente devuelto como 403). **No afirmar que la subida ya funciona en el despliegue Preview/Production sin configurar y probar Storage.**

## Aceptación y pruebas

- Abrir un producto existente desde Administración, marcar la compra estándar, guardar, recargar; agregar sin adicionales al carrito desde catálogo.
- Precio base $280 + 7 opciones de $14 por unidad = $378 por pieza; cantidad 2 → $756 en catálogo y carrito.
- Cuando no está habilitada la venta estándar, la validación de grupos obligatorios continúa impidiendo añadir configuraciones incompletas.
- Crear varios grupos, subir/bajar, guardar, recargar, constatar que el catálogo respeta el mismo orden.
- Activar las tres secciones de fotos («Portada», «Contraportada», «Hojas interiores»), seleccionar imágenes y verificar que el carrito informa del almacenamiento local y no afirma haberlas enviado.
- Subir imagen principal con sesión administrativa en un entorno de prueba aislado, guardar un producto de prueba en ese entorno, publicar y comprobar acceso público a la imagen; verificar 404 para imagen de borrador.
- Probar en móvil, tableta y escritorio con sesión y datos de prueba propios del entorno de pruebas. No hacerlo con datos reales en producción.

**Riesgos conocidos:** Firebase Storage no aprovisionado; límite de carga y limpieza de imágenes antiguas por implementar; carga de fotos privadas al taller **no implementada** porque aún no hay órdenes; pruebas autenticadas con Firebase y visuales end-to-end pendientes hasta contar con ambiente de prueba y permisos.

## Gobierno

Este cambio debe entregarse mediante PR y Vercel Preview del SHA exacto. No fusionar ni publicar en producción sin aprobación técnicamente verificada de Alain; la rama `main` se observó sin protección técnica activa.
