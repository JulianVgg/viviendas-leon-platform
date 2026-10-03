# Estructura del frontend

## 1. Objetivo

Definir la organización técnica del frontend de la plataforma Viviendas León, estableciendo la separación de responsabilidades entre la interfaz de usuario, los módulos funcionales, la comunicación con el backend, el almacenamiento local y el mecanismo de sincronización.

## 2. Tecnologías

El frontend utilizará el siguiente stack tecnológico:

- React.
- TypeScript.
- Vite.
- IndexedDB.
- Dexie.js.

La aplicación será desarrollada como una PWA para permitir su utilización desde computadoras y dispositivos móviles y soportar las funcionalidades diseñadas para trabajar durante interrupciones temporales de conectividad.

La interfaz visual se desarrollará tomando como base la plantilla seleccionada para el proyecto. La plantilla proporcionará la estructura visual y los componentes generales, mientras que sobre ella se incorporarán los módulos y servicios específicos de Viviendas León.

## 3. Estructura general

La estructura propuesta para el frontend tomando en cuenta el adaptar la plantilla a elegir seria:

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── modules/
│   │   ├── familias/
│   │   ├── agricultura/
│   │   ├── visitas/
│   │   ├── capacitaciones/
│   │   └── reportes/
│   ├── services/
│   ├── storage/
│   ├── sync/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── public/
└── package.json

