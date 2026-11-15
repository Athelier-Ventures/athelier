# Athelier

**V0.3.0 — Experiencia de marcas y base de arquitectura comercial**

Athelier es una PWA de Next.js, preparada para web y móvil. La bienvenida conserva la imagen frontal aprobada y el lema **«Tu historia hecha presente, única como tú»**.

## Inicio y navegación
- En laptop: después de la bienvenida aparecen **tres paneles verticales**, un tercio del viewport cada uno, con fotografías, divisiones y animación sutil de derecha a izquierda.
- En móvil: tres **bandas horizontales** (Dulce Tentación, Manchas y Trazos, Eco en Tinta) en ese orden.
- Cada panel dirige a /colecciones/reposteria, /colecciones/personalizaciones o /colecciones/fotografia.
- La portada mantiene alternancia ES/EN; las páginas de colección son españolas por ahora.
- Respeta `prefers-reduced-motion` y la navegación accesible con teclado.

## Modelo comercial
La versión introduce `src/lib/commerce.ts` como primer dominio tipado, con cálculos puros de compras, costos históricos ponderados, materiales y precios configurados. El modelo mantiene **separados** catálogo de insumos, constructor de productos y publicación por línea. Detalles y siguientes etapas en [docs/arquitectura-comercial-v030.md](docs/arquitectura-comercial-v030.md).

**No hay todavía** escrituras de insumos o productos, cuentas habilitadas, permisos administrativos, carrito transaccional, checkout ni pedidos reales. Las páginas de colección son de presentación y no muestran precios ficticios.

## Activos y PWA
- Portada española: `public/athelier-hero.svg`, contenedor de la imagen original de alta resolución.
- Logotipo trazado transparente: `public/logo-athelier.svg`.
- Fotografías de colecciones: referencias editoriales de Unsplash bajo su licencia, no fotos oficiales de producto.
- Manifest, iconos y service worker con caché de shell; no está empaquetada para App Store ni Google Play.

## Desarrollo
```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Proyecto de Vercel `athelier`, vinculado a la rama `main` del repositorio `Athelier-Ventures/athelier`. No colocar correos de superadministradores, secretos ni datos de prueba en frontend o documentación pública.
