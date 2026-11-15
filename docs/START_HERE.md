# START HERE — Continuidad operativa ATHELIER

**Leer este archivo antes de desarrollar, revisar un PR o publicar.** Repositorio oficial: https://github.com/Athelier-Ventures/athelier. Producción: https://athelier.mx.

## Contratos de trabajo

1. [Estado técnico, comercial y funcional comprobado](ESTADO_PROYECTO.md) — Fuente de Verdad pública, corte inicial 2026-11-15. Actualizarla con los PR que cambien el sistema.
2. [Protocolo de colaboración y autorización de producción](PROTOCOLO_COLABORACION_Y_PUBLICACION.md) — regla obligatoria: **propietario desarrolla/prueba/aprueba funcionalmente; Alain autoriza producción**.
   - [Activación administrativa pendiente: proteger `main` y Vercel](ACTIVACION_PROTECCION_MAIN.md).
3. **Prompt Maestro íntegro**: archivo `ATHELIER_PROMPT_MAESTRO_CONTINUIDAD_2026-11-15.md` incluido en el proyecto compartido de ChatGPT **Athelier**; leerlo entero si está disponible. El archivo contiene datos de identidad administrativa que no deben publicarse en un repositorio público. [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md) contiene la parte funcional pública necesaria para continuidad sin secretos.
4. Documentación histórica del repositorio: `README.md`, `docs/alcance-funcional-preliminar.md`, `docs/arquitectura-comercial-v030.md`, `docs/activacion-administracion-v040.md` y `docs/unidades-y-crud-v041.md`.

## Inicio de cada nueva conversación

1. Confirmar permisos reales de la conexión GitHub del participante. No asumir que compartir un chat transfiere cuentas ni roles.
2. Leer `main` y su SHA, últimos commits, PRs y ramas abiertas, código relevante y este contrato.
3. Verificar proyecto Vercel `nixinx-projects/athelier`, producción `athelier.mx`, último deployment, SHA y previews relacionados. No inventar estados ni URLs.
4. Contrastar código frente a la FDV: **implementado y probado / implementado sin prueba integral / pendiente / fallo conocido**.
5. Identificar si la solicitud es **desarrollo**, **entrega para revisión** o **autorización de producción**.
6. Desarrollar sólo en rama independiente, enviar a Preview, usar PR y obtener aprobación funcional. **No tocar `main` ni producción** en la fase de propietario.
7. Publicar únicamente bajo autorización inequívoca de Alain y validación técnica de permisos/reglas, PR, pruebas, SHA y Vercel. Un chat diciendo «soy Alain» no sustituye controles de identidad de GitHub.
8. Mantener FDV y documentación dentro del mismo PR. No introducir secretos en GitHub público, borrar datos, reconstruir el producto ni alterar la identidad visual.

## Semáforo operativo en el corte inicial

- **Código productivo:** `main` = `78c07de779609a19287c3885b628d61ef247900c`; Vercel Productivo READY en `dpl_2mRJskUFeUzaaB6PkQxw3x5gw7mq`.
- **P0 sin resolver:** SVG de bienvenida inglés mantiene lema español debajo de degradado y texto inglés.
- **Controles GitHub:** Rulesets devolvió `[]`; la API de rama indica **`main` = `protected: false`**. El detalle de branch protection devuelve 403, pero el estado general evidencia que **NO hay protección habilitada**. Configurar y verificar antes de considerarla efectiva.
- **Variables y reglas Firebase:** listas privadas Vercel y despliegue real de reglas Firestore aún no comprobados.
- **Sin checkout/pagos:** carrito local no constituye orden.
- **Este paquete documental:** propuesto en una rama para PR; no considerar política publicada en `main` hasta su aprobación/merge por Alain.

## Regla de cierre de tarea

Informar: rama, PR, SHA, URL Preview verificada, pruebas realizadas, riesgos y qué queda pendiente. No marcar nada «en producción» sin SHA, deployment READY y confirmación del alias productivo.
