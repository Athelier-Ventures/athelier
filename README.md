# Athelier — V0.5 funcional (package.json aún 0.4.1)

**Continuidad y autorizaciones:** lee primero [START_HERE](docs/START_HERE.md), [Fuente de Verdad pública](docs/ESTADO_PROYECTO.md) y [Protocolo de colaboración y publicación](docs/PROTOCOLO_COLABORACION_Y_PUBLICACION.md). El propietario desarrolla mediante rama y Preview; sólo Alain puede autorizar la fusión y publicación, sujeto a controles técnicos verificados. **La protección obligatoria de `main` aún debe configurarse/verificarse en GitHub.**

PWA mobile-first para México (**MXN / es-MX**), con tres líneas de negocio: **Dulce Tentación**, **Manchas y Trazos** y **Eco en Tinta**.

## Experiencia pública
- Portada con imagen de marca aprobada.
- Laptop: tres paneles verticales animados de derecha a izquierda.
- Celular: tres bandas horizontales.
- Una colección por negocio: `/colecciones/reposteria`, `/colecciones/personalizaciones`, `/colecciones/fotografia`.
- Los productos publicados se leen a través de la API pública, sin revelar costos, proveedores ni materiales.
- Cada producto ofrece sólo las opciones definidas por el propietario, con precio adicional fijo o por unidad.
- `/carrito`: carrito **único entre las tres marcas**, almacenado localmente. No permite checkout/pago hasta que exista backend de pedidos con revalidación de precios.

## Administración
La ruta protegida es **`/admin`**. Autenticación Google + autorización en API del servidor (Firebase Admin SDK, token verificado, email verificado y allowlist privada en Vercel).

Módulos implementados:
1. **Proveedores**: alta y activación/desactivación.
2. **Insumos**: maestro con unidad base y uso en una o varias líneas. Costo unitario ponderado histórico, con rango de fechas.
3. **Presentaciones**: relación con insumo y unidades por paquete.
4. **Compras**: proveedor, fecha, presentación, cantidad, costo e impuesto, importes por compra o por paquete; registro histórico **inmutable**.
5. **Productos**: precio base, borrador/publicado/archivado, publicaciones en varias líneas, variantes obligatorias/opcionales, precio por opción y por unidad, materiales base y edición posterior.

El modelo de precios usa centavos enteros MXN, independientes del costo del material. La API valida entrada y deja rastro de auditoría de altas y cambios.

## Activación obligatoria (seguridad)
**Antes de usar datos reales**, seguir `docs/activacion-administracion-v040.md`:
- Instalar `firestore.rules` (denegar accesos de clientes).
- Activar Firebase Authentication con Google y el dominio autorizado.
- Configurar variables públicas Firebase Web y privadas del Admin SDK en Vercel.
- Definir la lista vigente de administradores **exclusivamente como variable privada**, sin publicarla en GitHub.
- Confirmar reglas mediante `ATHELIER_FIRESTORE_RULES_CONFIRMED=true` **solo después de aplicarlas**.
- Volver a desplegar después de configurar variables. Sin estas verificaciones la API responde 503 por diseño, no otorga acceso administrativo.

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Variables documentadas en `.env.example`. **Nunca** guardar secretos en GitHub o en imágenes. Firebase Admin SDK debe tener acceso a Firestore y Auth para servir las APIs.

## No implementado todavía
Checkout, pedidos reales, pasarela de pagos, inventario con salidas/existencias, costos por materiales específicos de cada opción, carga segura de imágenes, reportes contables auditados, seguimiento de fabricación, galerías NFC protegidas y empaquetado nativo Android/iOS.

La PWA web tiene manifest, iconos y service worker. No hay datos comerciales ficticios.

Arquitectura: `docs/arquitectura-comercial-v030.md`. Configuración: `docs/activacion-administracion-v040.md`.

## V0.4.1 — Unidades configurables y operaciones CRUD

- El catálogo de **unidades** admite unidades base y derivadas con equivalencia: hoja, paquete de 100 hojas, caja de 12 piezas, etc.
- Los insumos nuevos pueden seleccionar una unidad base creada por el propietario; las presentaciones de compra utilizan una conversión compatible.
- La API valida la equivalencia y guarda un snapshot de la conversión para cada compra; los costos históricos no cambian al editar presentaciones.
- Proveedores, unidades, insumos, presentaciones y productos: crear, consultar, editar, activar/desactivar y eliminación segura cuando no existen referencias. Productos publicados deben archivarse antes de retirarlos. Las compras **no se editan ni eliminan**.
- Todo funciona en MXN, bajo acceso administrativo ya configurado. Sin datos ficticios.
- Manual completo: [Unidades y CRUD V0.4.1](docs/unidades-y-crud-v041.md).
