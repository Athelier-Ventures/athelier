# ATHELIER — Estado de proyecto y Fuente de Verdad pública

**Corte funcional comprobado:** 2026-11-15. **Propósito:** orientación técnica segura entre chats y cuentas. **Naturaleza:** documento de estado; verificar siempre GitHub, Vercel y Firebase en tiempo real antes de declarar logros. No reproducir aquí listas de cuentas administradoras ni secretos del Prompt Maestro privado.

## 1. Identidad e infraestructura

- **Emprendimiento:** ATHELIER Ventures; artículos artesanales y personalizados bajo pedido para México.
- **Tres líneas en una sola plataforma:** Dulce Tentación (repostería), Manchas y Trazos (personalizaciones), Eco en Tinta (fotografía y recuerdos impresos de imágenes proporcionadas por el cliente, no sesiones fotográficas).
- **Única base de código:** https://github.com/Athelier-Ventures/athelier, rama productiva `main`. No separar en tres repositorios ni duplicar motores.
- **Producción:** proyecto Vercel `athelier` del equipo `nixinx-projects`; dominio https://athelier.mx.
- **Firebase:** proyecto `athelier-ventures`; Google Auth y Firestore previstos/conectados por SDK servidor y cliente.
- **Idioma:** español México predeterminado con selector ES/EN persistente. Nombres de las tres marcas no se traducen.
- **Moneda exclusiva:** MXN, importes comerciales finales incluyen IVA cuando corresponda. No sumar automáticamente 16 % a precios ya publicados.
- **Lema de la marca en español:** «Tu historia hecha presente, única como tú». Traducción acordada: «Your story made tangible, as unique as you.»

## 2. Código y deployment observado

| Elemento | Estado comprobado |
| --- | --- |
| `main` HEAD al corte | `78c07de779609a19287c3885b628d61ef247900c` |
| Integración funcional más reciente | PR #5, «V0.5 immersive landing, bilingual navigation and IVA-inclusive costing», fusionado |
| Vercel Production | `dpl_2mRJskUFeUzaaB6PkQxw3x5gw7mq`, estado `READY` para el mismo SHA |
| Alias | `athelier.mx` asociado al deployment anterior |
| `package.json` y título del README | aún `0.4.1`, desfasados respecto al conjunto de cambios V0.5 |
| Variables privadas Vercel | **NO verificadas:** consulta de lista devolvió 403 |
| Firebase Console / reglas publicadas | **NO verificadas** desde esta sesión |
| Pruebas end-to-end de operaciones reales | **NO ejecutadas** en este corte |

Las líneas anteriores son una **fotografía histórica**, no autorización para suponer que continúan iguales en un chat posterior.

## 3. Arquitectura vigente

- Stack de código: Next.js `^16.0.0`, React `^19.2.0`, TypeScript `^5.9.0`, Firebase Web SDK `^12.5.0`, Firebase Admin `^13.5.0`, Zod `^4.1.12`. Hosting Next.js en Vercel. PWA web con manifest y service worker; no hay publicación nativa confirmada.
- Frontend `src/app/page.tsx`, `src/app/globals.css`: bienvenida a pantalla completa; transición con wheel/touch/teclado; tres paneles verticales en vista ancha y tres bandas horizontales en móvil.
- Línea pública: `src/app/colecciones/[linea]/`, catálogo `src/app/api/catalog/[linea]/route.ts`, navegación bilingüe y productos filtrados por publicación.
- Carrito global: `src/app/carrito/page.tsx` y `src/lib/cart-client.ts`. Persistencia local `localStorage`; permite agregar/quitar configuraciones y mostrar precios, **NO** crea órdenes ni realiza pagos.
- Admin: `src/app/admin/page.tsx`, `src/app/api/admin/[resource]/route.ts`, sesión `src/app/api/admin/session/route.ts`, validación Zod, Firebase Admin y auditoría.
- Dominio: `src/lib/commerce.ts` (costos, BOM base, configurador y precios); `src/lib/iva.ts` (IVA dentro del importe bruto, opciones estándar / tasa cero / exento).
- Seguridad: `src/lib/admin-server.ts` verifica token Firebase, email verificado y allowlist **privada** de administradores; `firestore.rules` en GitHub deniega todas las lecturas/escrituras directas del navegador. Se requiere verificar su publicación efectiva en Firebase.
- PWA: `public/sw.js` cachea shell público; revisar invalidación cuando cambien artes. No cachear datos privados ni fotos de clientes.

## 4. Modelo de negocio: separar costos de precios

### Catálogo interno de insumos y costos

Proveedores → unidades base y derivadas con equivalencia → insumos → presentaciones de compra → compras históricas → costo unitario ponderado por periodo. Los materiales se asocian a productos mediante BOM; pertenecer a una línea **no** implica consumo automático en todos sus productos.

- Compras: proveedor, fecha, presentación, cantidad, ámbito del precio (`wholePurchase` o `perPackage`), tratamiento IVA y snapshots de conversión.
- Compras inmutables mediante CRUD ordinario; ninguna actualización retroactiva silenciosa.
- Costo ponderado por unidades adquiridas; **no** equivale a inventario, existencias reales, FIFO o control de consumos.
- Captura de gasto real pagado, con IVA incluido cuando aplica: `base = redondear(gross / 1.16)` y `IVA = gross - base`; tasa cero y exento requieren tratamiento distinto. No reescribir compras con modelos históricos diferentes sin validar compatibilidad.

### Catálogo comercial independiente

Producto con precio base **definido por propietario**, descripción, imagen, estado, líneas donde se publica, grupos de opciones y suplementos fijos o por cantidad. Fórmula: precio del producto configurado = precio base comercial + suplementos autorizados, sin añadir IVA al final del precio anunciado. El costo de BOM no establece automáticamente su precio público.

- Productos publicados exponen únicamente datos comerciales, jamás compras, proveedor, costos ni BOM.
- Clientes sólo pueden elegir opciones autorizadas; no diseñar recetas o procesos fuera del catálogo.
- Un producto puede publicarse en varias líneas y entrar al mismo carrito.

### Tres experiencias

1. **Dulce Tentación:** productos de repostería, empaques, complementos y variantes de catálogo; nunca opciones de receta libre.
2. **Manchas y Trazos:** libretas, agendas, tazas, termos y productos personalizables; opciones como páginas/hojas, acabados, secciones, imágenes y dedicatorias, con suplementos definidos por propietario.
3. **Eco en Tinta:** álbumes, portarretratos, pósters, recuerdos impresos y eventual NFC; el cliente proporciona fotos propias. La privacidad de imágenes y galerías NFC requerirá desarrollo independiente.

## 5. Clasificación de madurez

**Hay código implementado para:** landing, cambio de escenas, ES/EN, colecciones, catálogo público filtrado, carrito único local, acceso administrativo mediante Google/servidor, CRUD de proveedores/unidades/insumos/presentaciones/productos, alta y consulta de compras inmutables, equivalencias, cálculo de costos históricos y BOM base, precios comerciales configurables e IVA incluido.

**Aún necesita pruebas end-to-end:** credenciales y permisos reales de administradores, reglas Firestore desplegadas, CRUD sobre datos legítimos y casos borde, funcionalidad en dispositivos (mobile/tablet/desktop), caché de PWA, disponibilidad de catálogo con Firebase operativo.

**Pendiente de implementar:** checkout/cotizaciones formales, pedidos persistentes, pagos y confirmaciones; upload privado de archivos/fotos y galerías; BOM por variantes, mano de obra, gastos indirectos; inventario y producción/seguimiento; NFC privado; agente de compra IA; app nativa y tiendas.

## 6. Fallo P0 confirmado por inspección de fuente

La versión `public/athelier-hero-en.svg` **NO** es una imagen inglesa limpia. Contiene el **mismo JPEG base64 embebido** que `public/athelier-hero.svg`, con el lema español rasterizado; superpone una capa degradada y texto inglés mediante `<rect>` y `<text>`. Ello produce superposición/huella del texto original. `src/app/page.tsx` alterna ambos SVG según idioma; el selector no es el origen principal del fallo.

**Próxima corrección sugerida, sin autorización implícita:** producir artes realmente limpios ES/EN con identidad, logotipo, escala, florales y colorimetría preservados, eliminar huella española del inglés, probar responsive y versión de PWA, desplegar primero en rama/PR/Preview. No dar por corregido hasta verificar arte y deployment.

## 7. Gobierno y siguientes pasos

- El control operativo se rige por [PROTOCOLO_COLABORACION_Y_PUBLICACION.md](PROTOCOLO_COLABORACION_Y_PUBLICACION.md): desarrollo del propietario en ramas/Preview; publicación sólo tras autorización de Alain, identificación válida y reglas de GitHub/Vercel efectivamente configuradas.
- En el corte, GitHub Rulesets devolvió `[]` y la API de rama `main` informó **`protected: false`**. El subendpoint de detalles de protección devolvió 403. **La protección técnica NO está habilitada; debe configurarse y verificarse**. No prometer enforcement.
- Actualizar esta FDV **en el mismo PR** que modifique arquitectura, negocio, seguridad o estado verificado. Toda referencia a un commit es verificable y se sustituye sólo con evidencia posterior.

## 8. Documentación histórica, leer con atención

- `README.md` presenta base V0.4.1 aunque el PR #5 ya integra V0.5.
- `docs/alcance-funcional-preliminar.md` — antecedentes V0.2.
- `docs/arquitectura-comercial-v030.md` — antecedentes V0.3.
- `docs/activacion-administracion-v040.md` — antecedentes de activación; ciertos ejemplos fiscales anteriores NO prevalecen sobre IVA incluido.
- `docs/unidades-y-crud-v041.md` — catálogo de unidades/equivalencias e histórico.
- Archivo maestro original `ATHELIER_PROMPT_MAESTRO_CONTINUIDAD_2026-11-15.md` del **proyecto compartido ChatGPT Athelier**: contiene instrucciones funcionales adicionales y referencias administrativas que **no se deben copiar a GitHub público**. Consultarlo íntegramente cuando sea accesible. Este documento público permite continuar desde GitHub sin divulgar esas referencias.

**Principio:** el último código y despliegue comprobados prevalecen para describir lo implementado; una conversación o plan no constituye evidencia de ejecución.
