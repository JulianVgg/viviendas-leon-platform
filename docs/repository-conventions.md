# Convenciones del repositorio

Este documento define las convenciones de trabajo utilizadas en el repositorio de la plataforma de Viviendas León.

El objetivo es mantener una estructura uniforme durante el desarrollo y facilitar el trabajo colaborativo del equipo.

---

## 1. Rama principal

### `main`

`main` es la rama principal del proyecto.

Contiene la versión integrada y validada del sistema y funciona como punto de partida para las ramas asociadas a los issues.

No se debe desarrollar directamente sobre `main`.

Los cambios deben realizarse en ramas independientes y posteriormente integrarse mediante Pull Request.

---

## 2. Ramas de trabajo

Cada issue del proyecto debe desarrollarse en una rama independiente creada a partir de `main`.

Se utilizará principalmente la siguiente convención:

```text
issue-<identificador>-<descripcion>