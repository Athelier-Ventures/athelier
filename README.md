# Athelier

**Versión 0.0.2** — pantalla de bienvenida, preparada para deploy en Vercel.

- **Español por defecto (es-MX)**, con selector accesible ES / EN. El idioma inglés se puede activar en la esquina superior derecha; recargar restablece español como idioma predeterminado.
- **Mobile-first**: una sola pantalla con ilustración responsive para móviles, tablets y laptops, tanto en orientación vertical como horizontal.
- Sin catálogo, formularios, cuentas, pagos, base de datos ni solicitudes de datos. Firebase no está conectado todavía.
- Los gráficos de bienvenida son recursos SVG locales provisionales; no requieren secretos ni servicios externos.

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue

En Vercel, importa [Athelier-Ventures/athelier](https://github.com/Athelier-Ventures/athelier), selecciona **Next.js**, Root Directory `./` y Production Branch `main`. No se necesitan variables de Firebase para V0; aunque las hayas configurado, la pantalla no las usa.

## Alcance

La identidad visual es provisional y puede sustituirse sin alterar la estructura. El comercio y la persistencia se diseñarán a partir de una V1 futura.
