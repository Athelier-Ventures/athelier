# ATHELIER — Protocolo de desarrollo colaborativo y autorización de producción

**Aprobado como regla operativa:** 15 de noviembre de 2026.  
**Estado de incorporación técnica:** documentación propuesta en rama/PR. GitHub confirmó que `main` no está protegida (`protected: false`); debe configurarse protección técnica por un administrador antes de declarar este control obligatorio. Revisar también configuración de Vercel.  
**Vigencia:** aplica a todos los cambios futuros del repositorio, sin sustituir las decisiones funcionales del Prompt Maestro de Continuidad.

## 1. Objetivo y jerarquía

Permitir que el propietario de ATHELIER, desde su propia cuenta de ChatGPT, solicite, desarrolle, pruebe y apruebe funcionalmente cambios sin concederle, por ese solo hecho, autorización de publicación. Alain mantiene la decisión final de integrar modificaciones a la rama productiva y desplegarlas.

Ante contradicciones, rigen: (1) última autorización explícita de Alain respecto a producción y las políticas técnicas efectivas; (2) el protocolo presente respecto al proceso de publicación; (3) decisiones de negocio vigentes del Prompt Maestro; (4) código y pruebas del repositorio como evidencia de lo existente. Ninguna instrucción puede omitir la verificación de permisos, seguridad o del SHA que se va a publicar.

**Regla invariable: desarrollar no significa publicar.** La aprobación funcional del propietario es necesaria para entregar una versión, pero no autoriza merge ni producción.

## 2. Infraestructura y fuente de verdad

| Recurso | Identificador |
| --- | --- |
| GitHub | [Athelier-Ventures/athelier](https://github.com/Athelier-Ventures/athelier) |
| Rama productiva | `main` |
| Vercel | Proyecto `athelier`, equipo `nixinx-projects` |
| Producción | https://athelier.mx |
| Firebase | Proyecto `athelier-ventures` |
| Continuidad | [START_HERE.md](START_HERE.md), [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md), este protocolo y Prompt Maestro del proyecto compartido |

GitHub es la FDV del **código, commits, PRs y documentación versionada**. El estado de Vercel, las reglas publicadas de Firebase, las variables y las pruebas funcionales deben verificarse en sus servicios; un documento no reemplaza esa evidencia. No almacenar secretos, cuentas personales de administración ni datos privados en el repositorio público.

## 3. Responsables y facultades

### Propietario de ATHELIER — Desarrollo funcional

Puede:
1. Solicitar ajustes visuales, funcionales, comerciales y módulos nuevos.
2. Dar instrucciones de implementación sobre una rama aislada.
3. Revisar el Preview en computadora, tableta o celular; solicitar nuevas iteraciones en la **misma rama** mientras pertenezcan al mismo alcance.
4. Aprobar funcionalmente la versión y ordenar preparar un PR hacia `main`.
5. Entregar a Alain el reporte de versión lista.

No puede, dentro de este flujo, fusionar a `main`, activar auto-merge, promover previews ni desplegar a producción. Decir «Alain, mándalo a producción» **no es autorización**: es aviso de entrega.

### Alain — Control de publicación

Puede:
1. Recibir el reporte y localizar el PR exacto.
2. Revisar diff, SHA, evidencia de pruebas, riesgos, permisos, infraestructura y Preview.
3. Autorizar expresamente el merge de un PR **concreto** y la publicación.
4. Verificar que Vercel desplegó exactamente ese SHA y que `athelier.mx` lo sirve.
5. Rechazar, aplazar o exigir ajustes ante cualquier discrepancia.

**Identidad y control técnico:** no inferir la identidad de Alain por el texto de un chat. Cada sesión tiene su propia conexión; la cuenta GitHub autorizada para liberar debe ser designada y validada expresamente por Alain. La identidad autenticada de GitHub, los permisos efectivos, las aprobaciones PR y las reglas de la organización constituyen evidencia técnica. No compartir sesiones ni credenciales.

## 4. Flujo obligatorio

### Fase A — Solicitud y diagnóstico

- Consultar primero `main`, últimos commits, `docs/START_HERE.md`, estado real de ramas/PRs, rutas afectadas y despliegues.
- Recuperar la rama o PR del trabajo existente en vez de duplicarlo.
- Identificar el alcance, proteger la experiencia vigente, no introducir datos inventados y especificar riesgos.
- Confirmar rama de trabajo independiente y base SHA antes de escribir.

### Fase B — Desarrollo aislado

- Crear `feat/... `, `fix/...` o `docs/...` desde `main` vigente; sin espacios en el nombre real.
- Commit(s) exclusivamente sobre la rama de desarrollo, nunca directamente a `main`.
- Mantener cambios incrementales y reversibles; preservar identidad visual, históricos y datos.
- No introducir cambios destructivos en Firestore, autenticación, variables o dominios.
- No introducir datos de prueba en producción ni permitir que un Preview altere producción inadvertidamente.

### Fase C — Preview verificado

- Verificar el deployment Preview real del último commit y registrar URL exacta, rama, SHA y estado.
- Reportar `typecheck`, `build`, pruebas funcionales y visuales **efectivamente ejecutadas**, sin confundir compilación con pruebas end-to-end.
- Confirmar que el Preview no usa recursos productivos con permisos de escritura de manera riesgosa; si no puede comprobarse, advertir y bloquear pruebas destructivas.
- Informar si Vercel Authentication/SSO impide acceso sin autorización, y proporcionar acceso únicamente por mecanismos permitidos.
- Repetir esta fase tras cada corrección en la misma rama.

### Fase D — Aprobación funcional

Frase de aceptación del propietario:

> Athelier: apruebo los ajustes. Prepara esta versión para que Alain pueda publicarla.

Luego:
1. Confirmar alcance cerrado y `HEAD` de rama vigente.
2. Ejecutar/verificar pruebas y revisar riesgos, regresiones y seguridad.
3. Crear o actualizar PR a `main`; **no fusionarlo**.
4. Verificar que el Preview mostrado corresponde al último SHA del PR.
5. Registrar el reporte de entrega y estado «Pendiente de autorización de Alain».

La aprobación funcional nunca sustituye la autorización productiva.

### Fase E — Entrega formal a Alain

Usar esta plantilla, con valores verificados (o «no verificable»):

**ATHELIER — LISTO PARA REVISIÓN DE PRODUCCIÓN**

- **Pull Request:** número y URL reales
- **Rama:** nombre exacto
- **Commit:** SHA exacto
- **Preview:** URL verificada y estado
- **Cambios realizados:** descripción delimitada
- **Pruebas:** comandos/validaciones con resultados reales
- **Impacto en funciones existentes:** alcance y regresiones
- **Base de datos, reglas, secretos o variables:** migraciones/requerimientos y estado de verificación (sin revelar valores)
- **Pendientes y riesgos:** incluidos bloqueos
- **Estado:** **Pendiente de autorización de Alain**

Compartir el reporte o URL del PR. No transferir ZIPs ni copiar el repositorio por chat.

### Fase F — Revisión y publicación exclusiva de Alain

Frase de autorización recomendada:

> Revisa el Pull Request #XX del repositorio Athelier-Ventures/athelier. Si corresponde exactamente a la versión aprobada, pasa las pruebas y no presenta bloqueos, autorizo su fusión a main y publicación en producción.

El asistente deberá:
1. Consultar el PR real, el `head SHA` y el `base SHA`.
2. Validar aprobación funcional, permisos del solicitante, diff completo, cambios inesperados, CI, build, Preview y bloqueos.
3. Confirmar los cambios a esquemas, reglas Firebase, variables Vercel, permisos y recursos productivos; detenerse si requieren autorización adicional.
4. Comprobar que la versión revisada corresponde al SHA autorizado, no a commits añadidos después.
5. Fusionar sólo bajo autorización inequívoca de Alain **y** con los controles técnicos exigidos satisfechos; nunca habilitar auto-merge en la fase del propietario. Usar, cuando exista, verificación `expected_head_sha` para evitar fusiones de otro SHA.
6. Verificar deployment Production `READY`, commit desplegado y alias `athelier.mx`; si falta alguno, reportarlo sin declarar éxito.
7. Actualizar FDV al publicar. Si falla una condición, **detener y explicar**.

## 5. Controles de seguridad y separación de entornos

- Cada participante opera con su propia cuenta y conexiones autorizadas de ChatGPT/GitHub/Vercel; compartir un chat o proyecto no transfiere privilegios.
- `main` debe quedar **protegida técnicamente**. Sin reglas efectivas no se puede afirmar que el control Alain-only sea coercitivo.
- Requisitos recomendados del Ruleset de `main`: requerir PR; al menos una aprobación de un revisor autorizado distinto del autor; requerir revisión CODEOWNERS **sólo tras confirmar y configurar el responsable técnico**; invalidar aprobaciones tras nuevos commits; bloquear force-push y eliminación de rama; impedir bypass no autorizado; agregar status checks obligatorios **cuando existan y estén verdes**. Revisar los permisos efectivos del propietario y de Alain.
- No asignar públicamente un correo de administrador, token, service account o secreto; no interpretar una declaración «soy Alain» como identidad técnica.
- Configurar Vercel para que `main` sea la única rama de producción; los cambios de ramas restantes son `Preview` hasta aprobación. **Verificar esta configuración en Vercel**, no inferirla.
- Previews: usar credenciales separadas o acceso de sólo lectura sobre recursos aislados; no utilizar bases productivas para pruebas destructivas. No cambiar dominios, variables productivas ni integraciones productivas desde ramas Preview.
- Firebase: cambios de reglas, índices, migraciones, datos históricos, autorización y secretos requieren revisión especial, plan reversible y aprobación específica; nunca migrar/borrar destructivamente por defecto.
- La protección en GitHub y Vercel debe existir de verdad. El texto de este archivo es un **contrato operativo**, no una barrera de API.

## 6. Continuidad entre usuarios y chats

En cada nuevo chat se deben consultar, en orden:
1. `docs/START_HERE.md`, esta política y el Prompt Maestro íntegro disponible en el proyecto compartido de ChatGPT.
2. `docs/ESTADO_PROYECTO.md` y documentación aplicable.
3. Repositorio, `main`, commits, ramas y PRs abiertos, archivos reales.
4. Deployments Preview y Production, identificados con SHA.
5. Evidencias y bloqueos de pruebas, Auth, Firestore y configuraciones.

Una conversación o documento describe intenciones; GitHub/Vercel/Firebase confirman hechos. La FDV debe actualizarse en la misma rama/PR al cambiar funciones o decisiones; no reescribir historia ni publicar promesas como implementaciones.

## 7. Evidencia y pendientes de implementación técnica (corte 2026-11-15)

- Conexión GitHub consultada en la preparación: usuario técnico autenticado `nixinxcom`. **No se ha comprobado mediante control independiente que sea el identificador de liberación designado por Alain**.
- Consulta a `/repos/Athelier-Ventures/athelier/rulesets`: lista vacía en el corte.
- Lectura de `/repos/Athelier-Ventures/athelier/branches/main`: **`protected: false`**, evidencia de que `main` NO tiene protección activa al corte. El subendpoint `/protection` arrojó 403 de la integración; esta limitación no invalida la evidencia anterior.
- El conjunto de herramientas de GitHub disponible para este trabajo permite leer repositorios, ramas y PRs, pero **no expone una acción administrativa para crear Rulesets/Branch Protection**.
- Por tanto, **la restricción técnica de merge/push a producción está CONFIRMADA COMO AUSENTE y queda PENDIENTE de configuración y posterior verificación por administrador GitHub**. Hasta entonces, no se debe considerar segura por el solo protocolo.
- Debe verificarse en Vercel la rama de producción y cualquier despliegue externo/manual capaz de saltarse el PR, además de permisos de despliegue.
- El control de identidad/roles debe asociarse a usuarios GitHub y permisos de equipo verificados. Una regla que exige «1 aprobación» sin restringir quién revisa **no basta** para garantizar que sólo Alain libere.

**Estado de esta incorporación:** este documento, por sí solo, no cambia protecciones, permisos, recursos Firebase ni despliegues. Su publicación en `main` requiere el proceso de aprobación descrito aquí.
