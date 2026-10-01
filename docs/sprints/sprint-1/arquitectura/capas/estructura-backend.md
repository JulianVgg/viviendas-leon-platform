

# Estructura del backend

## 1. Objetivo

Definir la organización técnica del backend de la plataforma Viviendas León, estableciendo la separación entre la API, los módulos de negocio, los servicios, los middlewares y el acceso a la base de datos.

## 2. Tecnologías

El backend utilizará el siguiente stack tecnológico:

- Node.js.
- Express.js.
- TypeScript.
- Prisma.
- PostgreSQL.

El backend seguirá un enfoque de monolito modular. Los módulos funcionales formarán parte de una misma aplicación, pero mantendrán responsabilidades y estructuras separadas.

## 3. Estructura general

La estructura inicial propuesta será:

```text
backend/
├── src/
│   ├── modules/
│   │   ├── familias/
│   │   ├── agricultura/
│   │   ├── visitas/
│   │   ├── capacitaciones/
│   │   └── reportes/
│   ├── middlewares/
│   ├── services/
│   ├── routes/
│   ├── utils/
│   └── app.ts
├── prisma/
│   └── schema.prisma
└── package.json


