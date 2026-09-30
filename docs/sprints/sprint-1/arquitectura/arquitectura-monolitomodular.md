# Arquitectura técnica — Plataforma Viviendas León

## 1. Objetivo
Definir la arquitectura técnica base de la plataforma Viviendas León, sus componentes, responsabilidades, comunicación, módulos, estrategia PWA, funcionamiento offline, stack y estructura inicial.

## 2. Arquitectura general
La solución se implementará bajo un enfoque de **monolito modular**, donde
los componentes del backend se integrarán dentro de una aplicación centralizada,
pero estarán organizados en módulos independientes según las responsabilidades
funcionales del sistema.

Los módulos compartirán la misma aplicación y base de datos, manteniendo
separadas sus responsabilidades y dependencias internas. No se plantea una
arquitectura basada en microservicios para esta versión del proyecto.

> Esta decisión consolida la distribución de componentes ya definida en el anteproyecto: dispositivos → PWA → lógica del negocio → acceso a datos → PostgreSQL, complementada con almacenamiento local y sincronización.

## 3. Componentes

### Frontend / PWA
**React + TypeScript + Vite**

Responsabilidades:
- Interfaz, navegación y formularios.
- Validación inicial de datos.
- Presentación según permisos.
- Consumo de la API.
- Captura de datos durante interrupciones de conectividad.
- Gestión de registros pendientes y sincronización.

### Almacenamiento local
**IndexedDB + Dexie.js**

Conserva temporalmente registros capturados sin conexión y mantiene los registros pendientes de sincronización.

### Sincronización
Envía los registros pendientes al backend cuando se recupera la conectividad y actualiza el estado local después de una sincronización exitosa.

### Backend / API
**Node.js + Express.js + TypeScript**

Responsabilidades:
- API.
- Autenticación y autorización.
- Reglas de negocio.
- Validaciones.
- Procesamiento de operaciones.
- Acceso a PostgreSQL mediante Prisma.
- Auditoría.
- Procesamiento de sincronización.

### Acceso a datos
**Prisma**

Administra los modelos y la comunicación entre la lógica de negocio y PostgreSQL.

### Base de datos
**PostgreSQL**

Almacena persistentemente familias, beneficiarios, huertos, cultivos, visitas, capacitaciones, insumos, usuarios, permisos y auditoría.

### Archivos e infraestructura
Un servicio de almacenamiento de objetos conservará fotografías y documentos. La infraestructura en la nube alojará los servicios; Docker empaquetará los componentes y Nginx administrará el acceso.

## 4. Responsabilidades por capa

| Capa | Responsabilidad | Tecnologías |
|---|---|---|
| Presentación | Interfaz, formularios, navegación e indicadores | React, TypeScript, Vite |
| Cliente | Almacenamiento temporal y sincronización de información | IndexedDB, Dexie.js |
| Comunicación | Intercambio de información entre el cliente y el servidor | API REST |
| Aplicación / Backend | Lógica de negocio, autenticación, autorización, validación y coordinación de módulos | Node.js, Express.js, TypeScript |
| Módulos de negocio | Gestión de familias, agricultura, visitas, capacitaciones, reportes y usuarios | Node.js, Express.js, TypeScript |
| Persistencia | Acceso y administración de los datos mediante el ORM | Prisma |
| Base de datos | Almacenamiento y persistencia de la información institucional | PostgreSQL |
| Archivos | Almacenamiento de fotografías, documentos y evidencias | Almacenamiento de objetos |
| Infraestructura | Despliegue, acceso y ejecución de los componentes de la plataforma | Docker, Nginx, nube |

## 5. Módulos

- **Familias y beneficiarios:** familias, integrantes, comunidades, programas y estados.
- **Gestión agrícola:** huertos, cultivos, producción, ventas, problemas fitosanitarios, tratamientos e insumos.
- **Visitas, asistencia técnica y capacitaciones:** planificación, visitas, evaluaciones, recomendaciones, seguimientos y capacitaciones.
- **Reportes, indicadores y alertas:** reportes, indicadores, alertas, exportaciones y comparación de periodos.
- **Usuarios, roles, permisos y auditoría:** autenticación, autorización, usuarios, roles, permisos y trazabilidad.

El módulo de voluntariado queda fuera del alcance actual y no forma parte de esta arquitectura.

## 6. Flujo general de información

```text
Usuario
   │
   ▼
PWA / Frontend
   │
   ├── Con conexión ──────► API / Backend ──► Prisma ──► PostgreSQL
   │
   └── Sin conexión
          │
          ▼
     IndexedDB/Dexie
          │
          │ recuperación de conexión
          ▼
      Sincronización
          │
          ▼
      API / Backend
```

Las fotografías y documentos se gestionarán mediante el servicio de almacenamiento de objetos.

## 7. Estrategia PWA y offline

La plataforma será accesible desde computadoras y dispositivos móviles mediante una PWA. Se contemplan mecanismos de almacenamiento local para continuar la captura de información durante interrupciones temporales de Internet.

El funcionamiento offline se limita a las operaciones diseñadas para trabajar con almacenamiento local. Las funciones que dependan de información en tiempo real del servidor requerirán conectividad.

## 8. Autenticación y autorización

1. El usuario proporciona sus credenciales.
2. El backend valida la cuenta.
3. Se identifica el rol y sus permisos.
4. La aplicación habilita las funciones autorizadas.
5. El backend vuelve a validar las operaciones protegidas.
6. Las operaciones relevantes se registran en la bitácora.
7. El usuario puede cerrar sesión.

Roles:
- Trabajador de campo.
- Coordinación.
- Dirección operativa.
- Administración.
- Auditoría.

## 9. Stack tecnológico

| Área | Tecnología |
|---|---|
| Frontend | React + TypeScript |
| Build | Vite |
| PWA | Tecnologías web para aplicación progresiva |
| Almacenamiento local | IndexedDB + Dexie.js |
| Backend | Node.js + Express.js + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Gráficos | Recharts |
| Excel | ExcelJS |
| PDF | Puppeteer |
| Contenedores | Docker |
| Servidor/proxy | Nginx |
| Infraestructura | Nube |
| Diagramación | Lucidchart |

## 10. Estructura inicial propuesta

```text
viviendas-leon/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── modules/
│   │   │   ├── familias/
│   │   │   ├── agricultura/
│   │   │   ├── visitas/
│   │   │   ├── capacitaciones/
│   │   │   ├── reportes/
│   │   │   └── usuarios/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── sync/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middlewares/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── docs/
│   └── arquitectura/
├── docker/
├── .env.example
├── docker-compose.yml
└── README.md
```

La estructura anterior es una propuesta inicial de organización del código y podrá ajustarse durante la implementación.

## 11. Criterios de aceptación

| Criterio | Evidencia |
|---|---|
| Arquitectura general documentada | Sección 2 + `arquitectura-general.mmd` |
| Frontend identificado | Sección 3 |
| Backend identificado | Sección 3 |
| Base de datos identificada | Sección 3 |
| Módulos claramente separados | Sección 5 |
| Flujo general definido | Sección 6 |
| Estrategia PWA contemplada | Sección 7 |
| Funcionamiento offline contemplado | Secciones 3, 6 y 7 |
| Stack tecnológico documentado | Sección 9 |
| Estructura inicial definida | Sección 10 |
