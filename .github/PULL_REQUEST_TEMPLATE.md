## ATHELIER — Entrega para revisión (NO autoriza producción)

**Leer antes de completar:** [START_HERE](../docs/START_HERE.md) · [Protocolo de colaboración](../docs/PROTOCOLO_COLABORACION_Y_PUBLICACION.md).

### Alcance y decisión funcional
- **Solicitante / responsable funcional:**
- **Descripción exacta del cambio:**
- **Solicitud de referencia / criterio de aceptación:**
- **Aprobación funcional del propietario:** [ ] Recibida  [ ] Pendiente
- **Entorno:** Preview (no producción)

### Identificación y evidencias
- **Rama:**
- **HEAD SHA exacto:**
- **Base SHA al crear el PR:**
- **URL Preview comprobada:**
- **Estado Vercel y SHA del Preview:**
- **Build/typecheck/otras pruebas ejecutadas (comandos y resultados):**
- **Pruebas visuales en móvil/tablet/desktop (evidencia o no ejecutadas):**

### Impacto, seguridad y compatibilidad
- **Archivos y funciones cambiadas:**
- **Impacto sobre funciones productivas existentes:**
- **Cambios a Firestore, migraciones, reglas, Auth, permisos o variables (sin valores secretos):**
- **Uso de recursos productivos desde Preview:** [ ] Descartado  [ ] No comprobado (bloquear pruebas con escrituras)
- **Cambios que requieren intervención manual antes del despliegue:**
- **Riesgos, limitaciones y plan de reversión:**
- **FDV `docs/ESTADO_PROYECTO.md` actualizada si cambia el estado funcional:** [ ] Sí  [ ] No aplica

### Lista de control
- [ ] Cambios limitados a la rama; ningún commit directo en `main`.
- [ ] PR apunta a `main`.
- [ ] Sin datos ficticios productivos ni secretos en código/documentación.
- [ ] Último SHA del PR coincide con SHA de Preview validado.
- [ ] Se revisaron controles de acceso y efectos en los tres negocios cuando correspondía.
- [ ] No se fusionó, no se hizo deploy productivo y auto-merge permanece deshabilitado.
- [ ] La revisión de Alain y controles técnicos GitHub/Vercel son obligatorios antes de publicar.

### Estado de entrega
**[ ] EN DESARROLLO / [ ] LISTO PARA REVISIÓN DE PRODUCCIÓN — Pendiente de autorización de Alain**

> Una aprobación funcional, un comentario o una solicitud desde la cuenta del propietario NO autoriza merge ni publicación. La autorización de Alain debe comprobarse con identidad/permiso verificado y el SHA exacto; detener la publicación ante cualquier bloqueo.
