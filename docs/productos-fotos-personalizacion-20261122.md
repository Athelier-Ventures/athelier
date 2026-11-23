# ATHELIER — Personalización, fotografías y solicitudes privadas (22 nov 2026)

**Rama:** `feat/product-images-private-personalization-cart-20261122`. Pendiente de Vo.Bo. técnico sobre el commit final; NO hay autorización técnica verificada para fusionar a `main`.

## Funcionalidades

1. **Administrador → Productos:** adjuntar imagen principal JPG, PNG o WebP (máximo 3 MB por Vercel), manteniendo URL externa alternativa. Las imágenes se guardan en Firebase Storage privado y sólo se sirven por proxy cuando el producto está publicado. Requiere `FIREBASE_STORAGE_BUCKET` y permisos de la cuenta de servicio.
2. **Administrador → Personalización:** configurar secciones fotográficas (portada/contraportada/interiores, entre otras), límite de archivos por sección; botón «Permitir comprar producto estándar sin adicionales»; flechas Subir/Bajar ordenan grupos persistidos.
3. **Catálogo:** archivo JPG/PNG/WebP hasta 2 MB cada uno, por sección; nombre del archivo queda en el carrito local y el archivo en IndexedDB. Precio unitario y subtotal por cantidad se recalculan sin doble IVA.
4. **Carrito → Enviar solicitud al taller:** formulario de nombre, correo o WhatsApp, indicaciones y consentimiento. El cliente envía voluntariamente una solicitud con la configuración y las fotografías de forma privada. Esto **no es un checkout ni un pago**. Se registra la solicitud como "received" solamente después de que cada archivo esperado esté subido con éxito, y se devuelve número de referencia.
5. **Administrador → Solicitudes:** bandeja autenticada para consultar solicitudes recibidas y descargar archivos adjuntos privados.

### Comportamiento base/extra

Los productos existentes deben habilitar `allowBasePurchase` en el Administrador. Con la opción activa, permite comprar sin extras incluso si no se seleccionó ninguna alternativa; al elegir «Tipo de hojas» u otra configuración requerida no exenta, los grupos «Adicionales», «Secciones», «Extras» y «Complementos» pasan a ser opcionales sin afectar los grupos obligatorios restantes.

Ejemplo: libreta base $280 + siete discos rosa de $14 = $378/pieza; cantidad 2 = subtotal $756.

## Almacenamiento y seguridad

- La API `/api/customer-requests` vuelve a consultar en Firestore el producto publicado, sus alternativas y el precio, sin confiar en el precio enviado por el cliente.
- Las solicitudes se someten a límite por IP/fecha (5 por día), límite de tamaño, validación de formato y firma de sesión temporal de 1 hora.
- Máximo 20 imágenes por solicitud, 2 MB por archivo. Las imágenes se almacenan en `customer-requests/<requestId>/<photoId>`, no en colecciones públicas; sólo una ruta de admin autenticada permite descargarlas.
- No se enlazan fotos personales a la URL de catálogo ni se les proporciona URL pública. El proxy de imágenes de producto verifica estado published antes de servir los archivos correspondientes.
- Es necesario confirmar **reglas de acceso de Cloud Storage restrictivas** para impedir acceso directo público; el uso del Admin SDK por sí solo no garantiza que una regla del bucket sea privada.
- Las solicitudes incompletas expiran tras una hora. **Pendiente limpieza automática** de borradores/archivos huérfanos y política de retención de fotografías; implementar antes de escalar la operación.
- El formulario incluye consentimiento expreso y limita contactos a la necesidad operativa; no hay moderación ni publicaciones públicas de fotografías de clientes.

## Activación requerida antes de publicar

1. Comprobar que exista el bucket de Firebase Storage del proyecto correcto. Configurar la variable privada `FIREBASE_STORAGE_BUCKET` en Vercel, sin publicar su valor, y los permisos de servicio de leer/escribir objetos.
2. Verificar reglas privadas de Firebase Storage (acceso de client SDK denegado a objetos de solicitudes). No publicar información de clientes.
3. Separar PREVIEW de PRODUCTION: bloqueadas las escrituras en Preview a menos que exista bucket de prueba aislado y `ATHELIER_PREVIEW_UPLOADS_ENABLED=true`.
4. Probar sesión real de administrador, subir imagen de producto, publicar y verificar catálogo; enviar solicitud de prueba con imágenes desde catálogo/carrito, verificar bandeja y descarga. Probar cálculo y orden de grupos.
5. Verificar la identidad y atribución de la autorización de merge. GitHub `main` se observó previamente sin protección activa.

**Estado conocido:** compilación automatizada Vercel en la rama; las pruebas end-to-end que requieran Storage/Firebase y las reglas del bucket NO se han realizado ni deben declararse completas. No copiar ajustes de producción manualmente desde Preview.
