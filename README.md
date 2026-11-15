# Athelier

Versión de bienvenida **V0.1.2** — PWA móvil-first, responsive y bilingüe.

## Pantalla principal

La portada en español muestra **la imagen frontal de Athelier aprobada**. Está incorporada en `public/athelier-hero.svg` como un SVG autocontenido que incluye el archivo JPEG de alta calidad. **No es una vectorización de la fotografía**: es un contenedor escalable con el recurso original embebido, para garantizar que se despliegue completo en GitHub/Vercel sin archivos adicionales. Diseño adaptado a portrait y landscape mediante `object-fit: contain`.

- Español de México es el idioma inicial.
- El selector ES / EN permite alternar al diseño de bienvenida en inglés.
- El logotipo sin fondo se encuentra en `public/logo-athelier.svg`: trazos vectoriales independientes del fondo, monocromo color cobre, adecuados para redimensionar. Es un trazado desde la fotografía, no el original editable de la marca.
- Si no se puede cargar la fotografía, la página usa el logotipo vectorial como respaldo.

## PWA

Contiene manifest, iconos iniciales, metadatos Apple y service worker con caché de la portada para uso sin conexión después de una visita. **La PWA aún no está publicada como aplicación nativa en App Store o Google Play**.

## Desarrollo local

```bash
npm install
npm run dev
```

## Publicación

Vercel conecta automáticamente la rama `main` del repositorio `Athelier-Ventures/athelier`. Next.js genera el build de producción. Firebase se configuró para uso futuro; la V0 no requiere lectura o escritura de datos.

### Próximas fases

Catálogo, configurador de productos, cotizaciones y pagos se diseñarán después de aprobar la portada, sin alterar los módulos actuales (aún no existen).
