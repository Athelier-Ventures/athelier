# ATHELIER — Centro de notificaciones (base sin proveedores externos)

Fecha: 2026-11-22 · Rama `feat/admin-request-notifications-20261122`

## Implementado

- El Administrador autenticado muestra una **campanita** con el contador de solicitudes realmente recibidas y aún no revisadas, junto a «Cerrar sesión».
- Al abrir «Solicitudes», el propietario puede consultar el detalle y pulsar «Marcar como revisada». **Abrir la bandeja o descargar fotografías no marca automáticamente como revisada**.
- El contador se actualiza al iniciar sesión y cada 60 segundos cuando el panel está visible; se sincroniza entre dispositivos mediante Firestore. No se requiere Firestore Realtime para este alcance.
- Sólo se cuentan documentos de `customer_requests` con `status: "received"` y sin `reviewedAt`. Las solicitudes en fase `uploading` o expiradas no disparan alertas.
- `PATCH /api/admin/customer-requests/[id]/review`: restringido a Firebase Admin + lista de correos autorizados, transaccional e idempotente; registra `reviewedAt`, `reviewedBy` y una entrada de auditoría sin datos de contacto.
- Al completar una solicitud, la misma transacción que establece `status:"received"` crea un evento en `customer_request_notification_outbox/{requestId}`. Su `deliveryEnabled` es **false**, con estados `awaiting_provider_configuration` por canal. Ningún correo ni WhatsApp se envía todavía.
- Plantillas puras en `src/lib/request-notification-templates.ts` para correo del propietario, confirmación al cliente y variables mínimas de aviso WhatsApp. No incluyen fotografías, archivos, enlaces de descarga, credenciales ni datos personales en el WhatsApp.

## Pendiente para habilitar canales externos

**Correo:** elegir un proveedor transaccional (por ejemplo Resend), verificar el dominio, configurar remitente validado, destinatario(s) del propietario y las credenciales como variables privadas Vercel; implementar un despachador idempotente con reintentos, manejo de errores y estados enviados/fallidos; enviar confirmación al cliente sólo cuando proporcionó correo y haya consentido su tratamiento.

**WhatsApp:** configurar WhatsApp Business Platform o proveedor compatible, número/cuenta del negocio, token secreto, destinatario del propietario, consentimiento para recibir avisos y plantillas de utilidad aprobadas cuando se requiera; implementar un despachador idempotente con límites y tratamiento de errores. La notificación debe ser un aviso con referencia y total estimado, no el contenido privado de las fotografías.

Las credenciales nunca deben guardarse en GitHub ni compartirse por el chat.

## Validaciones de aceptación

1. Iniciar sesión con un propietario autorizado; al entrar, la campanita refleja las solicitudes `received` sin `reviewedAt`.
2. Entrar a «Solicitudes» sin pulsar «Marcar como revisada»: el contador no disminuye.
3. Marcar una solicitud revisada: cambia etiqueta y contador, sin modificar precio, fotografías ni estado comercial `received`. Si se repite en otro dispositivo, se mantiene consistente.
4. Una solicitud incompleta (`uploading`) no aparece en la campanita ni genera evento.
5. Al completar una solicitud de prueba, se crea exactamente un evento de outbox con `deliveryEnabled:false`. No se envía ningún mensaje.
6. Sin sesión administrativa válida, el endpoint de marcar revisada responde 401/403; no hay API pública para revisar solicitudes.
7. Confirmar que el catálogo, carrito, Firebase Storage, checkout inexistente y costos históricos siguen intactos.

**Pruebas manuales con cuenta real y datos de prueba:** requieren sesión autorizada y pruebas en Preview aislado o ejecución controlada en producción. El build/Preview por sí solos no sustituyen esas pruebas.

**Límites:** la lista administrativa recupera las 100 solicitudes más recientes; la campanita refleja las no revisadas dentro de esa ventana, no un conteo histórico global. Antes de mayor escala se debe agregar paginación o contador agregado fiable. Sin activación de proveedor externo, los eventos permanecen pendientes: **no afirmar que el propietario o el cliente reciben correos o WhatsApp**.

## Gobierno del despliegue

Esta rama sirve para revisión y Preview. Fusionar a `main` y publicar en `athelier.mx` sólo conforme al protocolo de aprobación de producción de ATHELIER. No se modifica configuración de Firestore, Storage, variables Vercel o proveedores externos.
