# Athelier V0.4.0 — activación segura de la administración

La aplicación está diseñada para México y opera exclusivamente en MXN. La interfaz de administración vive en `/admin`.

**Seguridad por defecto:** todas las API de administración y catálogo permanecen bloqueadas con respuesta HTTP 503 hasta que Firebase Admin SDK y las reglas de Firestore se configuren y verifiquen. No establecer la variable de confirmación sin haber publicado las reglas.

## 1. Firebase Authentication
- Firebase Console > Athelier Ventures > Authentication > Sign-in method: habilitar **Google**.
- Authentication > Settings > Authorized domains: confirmar `athelier-nu.vercel.app` y el dominio de producción vigente; para desarrollo `localhost` según corresponda.
- El registro Google de cualquier otra cuenta **no concede** acceso administrativo. El servidor verifica el ID token, correo verificado y lista privada de administradores.

## 2. Firestore — imprescindible ANTES de habilitar
- Firebase Console > Firestore Database > Rules.
- Copiar exactamente el archivo `firestore.rules` de este repositorio y publicar. El archivo deniega todas las lecturas y escrituras **desde clientes** en Firestore.
- El acceso administrativo a datos y el catálogo público se servirán desde las API de Next.js con **Firebase Admin SDK** en Vercel, no desde el navegador. Las reglas de Firestore no limitan las operaciones del Admin SDK.
- Verificar efectivamente en las Rules y con una lectura de un cliente no autorizado que las operaciones directas reciben permiso denegado.
- Con reglas denegando todo, cualquier otro cliente que ya use esa misma base de Firestore dejará de funcionar; este proyecto debe ser independiente. Revisar esto antes de publicar las reglas.

## 3. Cuenta de servicio Firebase Admin
- Firebase Console > Project settings > Service accounts > Firebase Admin SDK > Generate new private key.
- Proteger el archivo JSON descargado. No subirlo a GitHub, no pegarlo en conversaciones ni compartirlo por correo.
- Abrir Vercel > Project `athelier` > Settings > Environment Variables. Agregar como **Sensitive**, tanto Production como Preview si se necesita:
  - `FIREBASE_PROJECT_ID`: ID del proyecto Firebase.
  - `FIREBASE_CLIENT_EMAIL`: `client_email` del JSON del servicio.
  - `FIREBASE_PRIVATE_KEY`: `private_key` completa del JSON, con encabezados BEGIN/END y saltos de línea (o secuencias `\\n`).
  - `ATHELIER_ADMIN_EMAILS`: los tres correos autorizados, separados por comas; **sin publicarlos en el repositorio**.
  - `ATHELIER_FIRESTORE_RULES_CONFIRMED`: `true` exclusivamente tras confirmar la instalación de las reglas.
- Confirmar que también existen `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` y `NEXT_PUBLIC_FIREBASE_APP_ID` del registro de Firebase Web.
- **Redeploy** del último commit de `main` tras cambios de variables: Vercel no las agrega retroactivamente a un despliegue anterior.

## 4. Verificaciones funcionales
1. Abrir `/admin` en una ventana privada, acceder con un correo autorizado: obtiene panel.
2. Abrir con otro correo Google: debe recibir **403 ACCES_DENIED**, sin leer catálogos.
3. Probar un navegador sin sesión: **401 LOGIN_REQUIRED** en `/api/admin/materials`.
4. Registrar proveedor, insumo, presentación y compra. Ejemplo: presentación de mil hojas, cinco paquetes, importe total de 100 MXN e impuesto de 15 MXN; comprobar costo unitario antes del impuesto: **0.02 MXN por hoja**.
5. Registrar nueva compra del mismo insumo a otro precio: el registro anterior permanece y el costo ponderado se actualiza.
6. Construir un producto con opciones comercializables (precio fijo o por unidad), materiales base y estado Borrador. No debe aparecer en el catálogo público.
7. Cambiar a Publicado. Verificar que aparece sólo en las líneas seleccionadas y que el comprador sólo ve su precio y opciones, nunca sus costos, BOM, proveedores, compras o UID administrativo.
8. Probar carrito global entre dos líneas. Checkout permanece inactivo hasta implementar pedidos y cobro con recálculo de precios en servidor.

## Límites deliberados de V0.4.0
- Los artículos del carrito se conservan en `localStorage` del navegador. **No** se acepta ni almacena ninguna orden real; no se admite pago.
- El cálculo del carrito es una cotización visual; el servidor debe validar y fijar los precios antes del checkout. No usar totales de navegador como fuente de verdad.
- El costo unitario ponderado actual usa compras históricas y sirve para planeación; no hay todavía control de existencias, salidas, lote FIFO ni costeo contable auditado.
- La lista de materiales inicial cubre el producto base. El consumo adicional por variante, desperdicio detallado y mano de obra quedan para evolución.
- Las imágenes de productos se asocian mediante URL HTTPS; la carga de archivos a Firebase Storage y sus reglas privadas quedan pendientes.
- La configuración pública de idioma ES/EN permanece en la portada; el panel administrativo de V0.4 es español.
- No registrar datos comerciales hasta haber terminado pruebas de seguridad y permisos.
