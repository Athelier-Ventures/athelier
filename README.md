# Athelier

**V0.1.0** — PWA mobile-first para iOS, Android, iPad y escritorio, sin comercio todavía.

- Idioma inicial `es-MX`, selector ES/EN.
- Una sola pantalla de bienvenida, responsive portrait / landscape.
- Manifest, iconos de instalación, Apple touch icon y service worker con navegación offline básica.
- No hay Firebase Auth, Firestore, Storage ni pagos activos.
- Mantener identidad visual y cambios de la app separados de NIXINX.

## Imagen de la marca (paso pendiente)

Para mostrar el arte original en alta resolución, guardar el archivo `athelier-hero.webp` en el directorio `public/` y subirlo a la rama `main`. El componente tiene un fallback temporal a las imágenes SVG existentes; no sustituir el arte original por una aproximación sin autorización.

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

Vercel con proyecto `athelier`, rama `main`, framework `Next.js`, root `./`.
La PWA requiere HTTPS (proporcionado por Vercel).
La distribución en App Store y Google Play requiere empaquetado, pruebas y procesos de publicación posteriores; una PWA web no equivale por sí sola a aplicaciones ya publicadas en las tiendas.
