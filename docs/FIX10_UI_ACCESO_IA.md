# FIX10 — Interfaz, acceso y análisis

## Cambios

- Auditoría ya no presenta «Vista general» duplicada. El enlace `/auditoria` sigue redirigiendo al control financiero o a la bitácora, según los permisos existentes.
- Textos internos retirados del expediente, Roles y permisos, y Mi perfil.
- Saludo por hora **de Guatemala**, independiente de la zona horaria del dispositivo.
- La gráfica del Dashboard ofrece kg y unidades. El backend conserva la unidad manojos para preservar registros históricos y reportes.
- Animación ligera para elegir y editar huertos; diálogos de usuarios con animación (incluida accesibilidad para movimiento reducido). Otras pantallas ya usaban `page-route-enter`.
- «Recuérdame» prolonga la sesión hasta **30 días** en vez de las 8 horas predeterminadas. Solo guarda el correo en localStorage, y utiliza una cookie **HttpOnly** para la sesión. **No guarda contraseñas** ni esquiva el cierre de sesión, la revocación o la revalidación de la API. Recomendado solo en dispositivos de confianza.
- El servidor genera la contraseña temporal al crear usuarios: se muestra en un campo inicialmente oculto, con botón para revelar/copiar. No se permite definir la contraseña de terceros desde la administración.
- La pantalla de primer acceso permite mostrar/ocultar contraseñas al establecerlas.
- La checklist de roles ahora incluye Calendario, Notificaciones, Municipios, Comunidades y permisos de edición de estas entidades. **No cambia automáticamente los permisos de los roles existentes**, porque conceder privilegios nuevos debe ser una decisión de Dirección.

## Análisis asistido con Gemini — opcional

El proveedor anterior (OpenAI) continúa siendo el predeterminado. Para probar Gemini en **variables del servicio API de Railway**:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=<su-clave-privada>
GEMINI_ANALYSIS_MODEL=gemini-2.5-flash-lite
```

La clave nunca debe definirse como `VITE_*`, ni subirse a Git. El análisis envía indicadores agregados y valida la respuesta de Gemini contra el mismo contrato de datos existente. Conserva el límite de solicitudes de la API y contabilización por usuario. **No se ha probado con credenciales reales** y los precios/cuotas pueden cambiar. Para datos institucionales use las condiciones de privacidad adecuadas; el nivel gratuito puede utilizar las solicitudes para mejorar productos de Google.

## WhatsApp

El recordatorio ya existente utiliza enlaces `wa.me` y requiere que la persona envíe el mensaje. El parche no activa envíos automáticos. Para automatizarlos de manera oficial se necesita WhatsApp Business Platform (Cloud API), número habilitado, plantillas y consentimiento del destinatario. No se debe automatizar un WhatsApp personal mediante herramientas no oficiales.

## Validación sugerida

1. Iniciar sesión sin «Recuérdame» y verificar cookie de 8 h; repetir marcándolo y verificar 30 días. Cerrar sesión debe invalidar ambas.
2. Verificar saludo en mañana, tarde y noche de Guatemala.
3. Abrir Auditoría y confirmar que no hay «Vista general».
4. Revisar Roles y permisos con las cuentas de Dirección y Auditor. **Verificar permisos antes de guardar**.
5. Registrar un usuario de prueba: ver/ocultar la contraseña temporal, primer acceso con contraseñas visibles u ocultas.
6. Abrir cada categoría de Huertos; comprobar animación y fluidez en Android.
7. Con Gemini configurado, generar análisis sin incluir datos personales; revisar cuotas y manejo de errores.
