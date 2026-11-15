# ATHELIER — Activación técnica del control de publicación

**Estado comprobado 2026-11-15:** repo `Athelier-Ventures/athelier` accesible; GitHub devuelve `main.protected = false` y `GET /rulesets = []`. La API de detalles de protección devuelve 403 en esta integración. **El candado técnico todavía NO existe.**

Este documento guía a un administrador habilitado por Alain. **No configura por sí mismo ningún permiso.** No hacer cambios de producción ni de reglas Firebase al ejecutar esta lista.

## Paso 1 — Identidades y permisos

1. Alain debe confirmar personalmente el **usuario GitHub exacto** autorizado para revisar/publicar, sin inferirlo del chat. La cuenta conectada durante la redacción era `nixinxcom`; esto no demuestra por sí solo quién es su titular o que deba ser el aprobador.
2. Identificar el usuario GitHub del propietario. Concederle capacidad de crear ramas y PRs, pero sin bypass a la protección de `main`. Comprobar también membresías y acceso administrativo a Vercel.
3. Determinar cómo se registrará la aprobación de Alain: como review de CODEOWNER en GitHub o mediante el procedimiento de liberación administrado bajo una cuenta identificada. No permitir que el autor de un PR cuente como su propio revisor.

## Paso 2 — GitHub: proteger `main`

Con una cuenta administradora autorizada, abrir:
**https://github.com/Athelier-Ventures/athelier/settings/rules**

En **Rulesets → New branch ruleset** (o la sección de protección de rama equivalente disponible):

- Seleccionar el repositorio y la rama objetivo **sólo `main`**; activar el Ruleset (no dejarlo en modo evaluación).
- **Require a pull request before merging** y al menos **1 aprobación de revisión**.
- **Require review from Code Owners** únicamente cuando se haya creado `.github/CODEOWNERS` con el usuario autorizado de Alain verificado. No adivinar el nombre de usuario.
- **Dismiss stale pull request approvals when new commits are pushed** o equivalente, más resolución de conversaciones si se habilita.
- **Block force pushes** y **restrict deletions** de `main`.
- Restringir **bypass/administradores**. Nadie no autorizado debe poder hacer push directo o fusionar el PR obviando las aprobaciones. Si la cuenta administradora se reserva un bypass, limitarla estrictamente a quien Alain designe y auditarlo.
- Requerir checks de CI sólo si existen checks reales y estables; no inventar nombres ni bloquear el repositorio con checks inexistentes.
- Guardar, comprobar en Settings el Ruleset **Active** y releer GitHub para verificar `main.protected = true` y reglas efectivas.

**Nota sobre CODEOWNERS:** publicar la asociación a un *username* de GitHub designado es distinto de publicar correos privados; no colocar emails de administradores, tokens ni credenciales en este archivo. Un review genérico de «cualquier colaborador» no garantiza revisión de Alain.

## Paso 3 — Vercel: limitar producción

Abrir **https://vercel.com/nixinx-projects/athelier/settings/git** y verificar:

- Git vinculado a `Athelier-Ventures/athelier`.
- Production Branch = **`main`** y otras ramas sólo Preview.
- Preview con Deployment Protection adecuada. El último estado inspeccionado indica SSO habilitado para Preview; verificarlo nuevamente.
- Revisar quién puede promover, redeplegar o ejecutar despliegues manuales, hooks y CLI de producción: ningún mecanismo alternativo debe permitir publicar por encima de la autorización de Alain.
- Controlar permisos de Vercel por usuario/equipo y acceso a variables Production. No revelar sus valores.
- Previews deben usar recursos de prueba aislados o acceso seguro sólo lectura para evitar escritura de datos productivos.

**Importante:** GitHub Rulesets por sí solo no bloquea todos los posibles despliegues productivos fuera de un merge (por ejemplo promociones manuales/deploy hooks). Revisar las rutas alternativas en Vercel.

## Paso 4 — Verificación práctica y evidencia

1. Desde una cuenta de desarrollo sin privilegio de publicación, intentar **verificar la prohibición de push directo a `main`** usando una operación inocua o consultar reglas efectivas. No realizar commits de prueba en producción.
2. Abrir un PR documental a `main`, comprobar que no se puede fusionar sin la aprobación correcta y que no hay bypass.
3. Verificar que nuevo commit invalida aprobaciones anteriores según las reglas.
4. Confirmar que únicamente Alain o el mecanismo formal designado puede completar la liberación, y que Vercel Production se alimenta de `main`.
5. Registrar fecha, responsable administrativo, enlace o captura de reglas, resultados y bloqueos en la FDV; no registrar secretos.

## Criterio de terminación

La protección se considera **IMPLEMENTADA Y VERIFICADA** sólo cuando consten: `main.protected = true` o reglas equivalentes activas, PR y aprobación requerida por identidad designada, prohibición real de push directo y bypass no autorizado, control de despliegue productivo en Vercel y prueba de un PR no autorizado bloqueado.

**Hasta ese momento, el protocolo es vinculante como instrucción operativa, pero no garantiza impedir técnicamente un push o despliegue productivo.**
