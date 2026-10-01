# Convenciones de la API

## 1. Objetivo

Establecer las convenciones básicas para el diseño y desarrollo de la
API REST de la plataforma Viviendas León, definiendo reglas comunes para
rutas, métodos HTTP, solicitudes, respuestas, errores, validación,
paginación y comunicación con los módulos del backend.

## 2. Comunicación

La comunicación entre frontend y backend utilizará una API REST sobre
HTTP.

El formato principal de intercambio será JSON.

``` text
Frontend / PWA
       │
       │ HTTP + JSON
       ▼
    API REST
       │
       ▼
 Backend / Monolito modular
```

## 3. Versionado

Las rutas deberán incluir la versión:

``` text
/api/v1/
```

Ejemplos:

``` text
/api/v1/familias
/api/v1/huertos
/api/v1/cultivos
/api/v1/visitas
/api/v1/capacitaciones
/api/v1/reportes
```

## 4. Nombres de recursos

Los endpoints deberán representar recursos y utilizar nombres en plural.

Correcto:

``` text
/api/v1/familias
/api/v1/huertos
/api/v1/cultivos
/api/v1/visitas
/api/v1/capacitaciones
/api/v1/reportes
```

Evitar:

``` text
/api/v1/crearFamilia
/api/v1/obtenerHuertos
/api/v1/registrarVisita
```

Las operaciones se expresarán mediante métodos HTTP.

## 5. Métodos HTTP

  -----------------------------------------------------------------------
  Método                              Propósito
  ----------------------------------- -----------------------------------
  GET                                 Consultar uno o varios recursos

  POST                                Crear un recurso

  PUT                                 Reemplazar completamente un recurso

  PATCH                               Actualizar parcialmente un recurso

  DELETE                              Eliminar o desactivar un recurso
                                      según las reglas del dominio
  -----------------------------------------------------------------------

Ejemplos:

``` http
GET /api/v1/familias
GET /api/v1/familias/123
POST /api/v1/familias
PATCH /api/v1/familias/123
DELETE /api/v1/familias/123
```

## 6. Identificación de recursos

Los recursos individuales utilizarán un identificador único.

``` text
/api/v1/familias/{id}
```

Ejemplo:

``` text
/api/v1/familias/123
```

## 7. Parámetros de ruta

Los identificadores de recursos se utilizarán dentro de la ruta.

``` http
GET /api/v1/familias/123
```

Para recursos directamente relacionados podrá utilizarse una ruta
jerárquica:

``` http
GET /api/v1/familias/123/huertos
```

## 8. Parámetros de consulta

Los parámetros de consulta se utilizarán para filtros, ordenamiento y
paginación.

Ejemplo:

``` http
GET /api/v1/familias?comunidadId=10&estado=activa
```

## 9. Solicitudes JSON

Las solicitudes que envíen información utilizarán JSON cuando
corresponda.

``` json
{
  "nombre": "Familia de ejemplo",
  "comunidadId": 10,
  "programaId": 3
}
```

Las propiedades deberán mantener nombres consistentes.

## 10. Content-Type

Las solicitudes JSON deberán utilizar:

``` http
Content-Type: application/json
```

Las respuestas JSON deberán indicar el tipo de contenido
correspondiente.

## 11. Respuestas exitosas

### Recurso individual

``` json
{
  "data": {
    "id": 123,
    "nombre": "Familia de ejemplo"
  }
}
```

### Colección

``` json
{
  "data": [
    {
      "id": 123,
      "nombre": "Familia de ejemplo"
    }
  ]
}
```

## 12. Respuestas de error

``` json
{
  "error": {
    "code": "FAMILIA_NOT_FOUND",
    "message": "La familia solicitada no existe."
  }
}
```

### Error de validación

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos proporcionados no son válidos.",
    "details": [
      {
        "field": "nombre",
        "message": "El nombre es obligatorio."
      }
    ]
  }
}
```

## 13. Códigos HTTP

  Código   Uso
  -------- -------------------------------------------
  200      Operación procesada correctamente
  201      Recurso creado correctamente
  204      Operación procesada sin contenido
  400      Solicitud inválida
  401      Autenticación requerida o inválida
  403      Operación no permitida
  404      Recurso no encontrado
  409      Conflicto con el estado actual
  422      Datos que no cumplen reglas de validación
  500      Error interno del servidor

## 14. Validación

Los datos deberán validarse en el backend antes de ejecutar operaciones
de negocio.

El frontend podrá realizar validaciones iniciales, pero estas no
sustituyen las validaciones del servidor.

``` text
Frontend
   │
   │ Validación inicial
   ▼
API
   │
   │ Validación del backend
   ▼
Lógica de negocio
   │
   ▼
Persistencia
```

## 15. Paginación

Las consultas que puedan devolver grandes cantidades de información
deberán permitir paginación.

``` http
GET /api/v1/familias?page=1&limit=20
```

Respuesta:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

  Parámetro   Descripción
  ----------- ------------------------------
  `page`      Número de página
  `limit`     Cantidad máxima de registros

## 16. Ordenamiento

Cuando corresponda, el ordenamiento se realizará mediante parámetros de
consulta.

``` http
GET /api/v1/familias?sort=nombre&order=asc
```

Los campos disponibles se definirán según cada recurso.

## 17. Filtros

Los filtros utilizarán parámetros de consulta.

``` http
GET /api/v1/familias?comunidadId=10&estado=activa
```

``` http
GET /api/v1/cultivos?familiaId=123&estado=activo
```

## 18. Separación de responsabilidades

El flujo de la API será:

``` text
HTTP Request
     │
     ▼
   Route
     │
     ▼
 Controller
     │
     ▼
  Service
     │
     ▼
   Prisma
     │
     ▼
 PostgreSQL
```

### Routes

Definen ruta, método HTTP y controlador.

### Controllers

Gestionan solicitud, parámetros, respuesta y errores esperados.

### Services

Gestionan reglas de negocio y operaciones del dominio.

### Prisma

Gestiona consultas y persistencia.

### PostgreSQL

Mantiene almacenamiento, relaciones e integridad de datos.

## 19. Endpoints por módulo

### Familias

``` text
/api/v1/familias
/api/v1/familias/{id}
```

### Gestión agrícola

``` text
/api/v1/huertos
/api/v1/huertos/{id}

/api/v1/cultivos
/api/v1/cultivos/{id}

/api/v1/produccion
/api/v1/produccion/{id}
```

### Visitas y asistencia técnica

``` text
/api/v1/visitas
/api/v1/visitas/{id}
```

### Capacitaciones

``` text
/api/v1/capacitaciones
/api/v1/capacitaciones/{id}
```

### Reportes

``` text
/api/v1/reportes
/api/v1/reportes/{id}
```

La lista representa una estructura inicial y podrá ampliarse conforme se
definan los recursos del modelo de datos.

## 20. Independencia entre módulos

Los endpoints de un módulo no deberán utilizarse para modificar
directamente información perteneciente a otro módulo.

Gestión agrícola administra cultivos:

``` text
Gestión agrícola
      │
      └── administra cultivos
```

Visitas podrá consultar información agrícola cuando sea necesario para
asistencia técnica, pero no administrará los cultivos.

Reportes consultará información:

``` text
Reportes
   │
   └── consulta información
```

Reportes no modificará directamente los registros pertenecientes a los
módulos operativos.

## 21. Funcionamiento offline

Las operaciones compatibles con funcionamiento offline podrán
almacenarse temporalmente en IndexedDB.

``` text
Frontend
   │
   ▼
IndexedDB
   │
   ▼
Pendiente de sincronización
```

Al recuperar conectividad:

``` text
Pendiente de sincronización
   │
   ▼
API REST
   │
   ▼
Backend
   │
   ▼
Módulo correspondiente
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

Los registros sincronizados deberán validarse antes de ser persistidos.

## 22. Convenciones de sincronización

Las operaciones de sincronización deberán:

-   Utilizar JSON.
-   Utilizar métodos HTTP apropiados.
-   Validar datos en el backend.
-   Devolver códigos HTTP consistentes.
-   Informar errores mediante la estructura definida.
-   Identificar claramente los registros procesados.
-   Permitir determinar si la operación fue procesada correctamente.

La estrategia detallada de resolución de conflictos se definirá durante
el diseño del mecanismo de sincronización.

## 23. Consistencia de nombres

Los nombres utilizados en rutas, parámetros, propiedades JSON, recursos,
respuestas y códigos de error deberán mantenerse consistentes.

Ejemplo:

``` text
familias
familiaId
```

Deberá evitarse utilizar nombres diferentes para representar el mismo
concepto.

## 24. Regla general

Todos los endpoints desarrollados deberán respetar como mínimo:

-   Versionado de API.
-   Nombres de recursos consistentes.
-   Uso apropiado de métodos HTTP.
-   Identificadores de recursos.
-   Formato JSON.
-   Códigos HTTP apropiados.
-   Estructura consistente de respuestas.
-   Estructura consistente de errores.
-   Validación en el backend.
-   Separación entre controladores y lógica de negocio.
-   Acceso a datos mediante Prisma.
-   Compatibilidad con el mecanismo de sincronización cuando
    corresponda.

Cualquier excepción deberá estar justificada y documentada.
