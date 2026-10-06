# Sprint Planning — Sprint 2

## 1. Información general

**Proyecto:** Plataforma Viviendas León  
**Sprint:** Sprint 2  
**Periodo:** 3 al 17 de octubre de 2026  
**Duración:** 2 semanas  
**Equipo:** Julián Vásquez, Luis de León y Ricardo Calderón  

---

## 2. Sprint Goal

Entregar el primer incremento funcional de la plataforma Viviendas León,
permitiendo autenticar y autorizar usuarios, gestionar información de
familias beneficiarias, registrar actividades de seguimiento mediante
visitas y capacitaciones, y establecer el funcionamiento base necesario
para operar ante conectividad limitada.

---

## 3. Capacidad de referencia

Durante el Sprint 1 se obtuvo:

- Velocity observada: **92 SP**
- Story Points comprometidos: **92 SP**
- Story Points completados: **92 SP**
- Cumplimiento: **100 %**

La Velocity del Sprint 1 se utiliza únicamente como una referencia
inicial, debido a que una parte importante del trabajo realizado
correspondió a análisis, documentación, arquitectura, diseño y
persistencia.

El Sprint 2 representa la primera iteración con una carga significativa
de desarrollo funcional, integración frontend/backend y pruebas.

---

## 4. Criterios utilizados para seleccionar el Sprint Backlog

Los elementos fueron seleccionados considerando:

- prioridad dentro del MVP;
- dependencias técnicas y funcionales;
- valor entregado a Viviendas León;
- criterios de aceptación definidos;
- Story Points acordados por el equipo;
- disponibilidad de los integrantes;
- Definition of Ready;
- relación directa con el Sprint Goal.

---

## 5. Sprint Backlog comprometido

### 5.1 PWA, funcionamiento offline y sincronización

| Issue | Priority | Estimate | Responsable |
|---|---|---:|---|
| OFF-01 — Configurar plataforma como PWA instalable | P0 | 3 | Ricardo |
| OFF-02 — Consultar información esencial sin conexión | P0 | 5 | Julián |
| OFF-03 — Registrar información sin conexión | P0 | 5 | Luis |
| OFF-04 — Gestionar cola de operaciones pendientes | P0 | 5 | Julián |
| OFF-05 — Detectar pérdida y recuperación de conectividad | P0 | 5 | Ricardo |
| OFF-06 — Sincronizar información pendiente | P0 | 5 | Luis |
| OFF-07 — Validar flujo online → offline → online | P0 | 3 | Ricardo |

**Subtotal Offline: 31 SP**

---

### 5.2 Autenticación, usuarios, roles y permisos

| Issue | Priority | Estimate | Responsable |
|---|---|---:|---|
| AUTH-01 — Definir matriz de roles y permisos | P0 | 2 | Luis |
| AUTH-02 — Iniciar sesión en la plataforma | P0 | 5 | Julián |
| AUTH-03 — Cerrar sesión de forma segura | P1 | 3 | Ricardo |
| AUTH-04 — Administrar usuarios | P0 | 2 | Ricardo |
| AUTH-05 — Activar y desactivar usuarios | P1 | 2 | Julián |
| AUTH-06 — Restringir operaciones según rol | P0 | 3 | Luis |

**Subtotal Auth: 17 SP**

---

### 5.3 Familias, beneficiarios y programas

| Issue | Priority | Estimate | Responsable |
|---|---|---:|---|
| FAM-01 — Consultar listado de familias | P0 | 3 | Ricardo |
| FAM-02 — Registrar una nueva familia | P0 | 5 | Julián |
| FAM-03 — Editar información de una familia | P0 | 3 | Luis |
| FAM-04 — Consultar expediente de una familia | P0 | 2 | Ricardo |
| FAM-05 — Administrar integrantes de una familia | P0 | 5 | Julián |
| FAM-06 — Administrar comunidades | P0 | 5 | Luis |
| PROG-01 — Administrar programas de Viviendas León | P1 | 5 | Luis |
| PROG-02 — Asociar una familia a un programa | P0 | 3 | Julián |
| PROG-03 — Consultar historial de participación | P1 | 3 | Ricardo |

**Subtotal Familias y Programas: 34 SP**

---

### 5.4 Visitas, asistencia técnica y capacitaciones

| Issue | Priority | Estimate | Responsable |
|---|---|---:|---|
| VIS-01 — Registrar visita a una familia | P0 | 5 | Luis |
| VIS-02 — Registrar observaciones y recomendaciones | P0 | 5 | Julián |
| VIS-03 — Adjuntar evidencia a una visita | P1 | 5 | Ricardo |
| VIS-04 — Registrar y consultar seguimientos pendientes | P0 | 5 | Julián |
| VIS-05 — Consultar historial de visitas | P1 | 3 | Ricardo |
| CAP-01 — Registrar capacitación | P0 | 5 | Luis |
| CAP-02 — Registrar participantes y asistencia | P0 | 5 | Luis |
| CAP-03 — Registrar evidencia y seguimiento de capacitación | P1 | 5 | Ricardo |

**Subtotal Visitas y Capacitaciones: 38 SP**

---

## 6. Total comprometido

| Área | Story Points |
|---|---:|
| Offline | 31 SP |
| Autenticación | 17 SP |
| Familias y programas | 34 SP |
| Visitas y capacitaciones | 38 SP |
| **TOTAL** | **120 SP** |

Por lo tanto, el equipo se compromete inicialmente con:

**120 Story Points**

Este valor será utilizado como línea base para calcular el cumplimiento y
la Velocity al finalizar el Sprint 2.

---

## 7. Riesgos identificados

- La cantidad comprometida supera la Velocity observada durante el Sprint 1.
- El Sprint 2 incorpora mayor cantidad de desarrollo funcional.
- Existe integración entre frontend, backend y base de datos.
- Autenticación y permisos afectan múltiples módulos.
- Familias constituye una dependencia para visitas y otros procesos.
- La sincronización offline presenta mayor incertidumbre técnica.
- Pueden surgir conflictos relacionados con operaciones realizadas sin conexión.
- La carga de trabajo debe mantenerse equilibrada entre los integrantes.
- Algunos elementos dependen de que otros Issues hayan sido terminados previamente.

---

## 8. Dependencias principales

Se reconoce la siguiente secuencia lógica general:

Autenticación y autorización
→ acceso seguro a módulos

Familias y comunidades
→ expediente base de beneficiarios

Familias
→ programas
→ visitas
→ capacitaciones

Funciones existentes
→ almacenamiento offline
→ sincronización
→ validación online/offline

Estas dependencias deberán considerarse al momento de seleccionar el
siguiente Issue en estado `Ready`.

---

## 9. Acuerdos del equipo

- Máximo una funcionalidad importante en `In Progress` por integrante.
- Cada Issue tendrá un responsable principal.
- Todo Pull Request deberá estar vinculado con su Issue antes de realizar el merge.
- Los Pull Requests deberán ser revisados por otro integrante.
- Ningún Issue será considerado `Done` sin pasar por `Testing`.
- Los criterios de aceptación serán utilizados durante las pruebas.
- No se modificarán los Story Points una vez iniciado el trabajo únicamente para ajustar las métricas.
- Los Issues bloqueados deberán identificarse y documentarse.
- El trabajo adicional solo podrá incorporarse si el Sprint Goal está asegurado.
- Los elementos no terminados al finalizar el Sprint no contabilizarán puntos dentro de la Velocity.

---

## 10. Flujo de trabajo

El equipo utilizará el siguiente flujo durante el Sprint:

Backlog
→ Ready
→ In Progress
→ In Review
→ Testing
→ Done

### Ready

El Issue se encuentra suficientemente refinado y puede comenzar a
trabajarse.

### In Progress

El responsable está desarrollando activamente el Issue.

### In Review

Existe un Pull Request vinculado y el trabajo se encuentra bajo revisión.

### Testing

El Pull Request fue aprobado e integrado y se están verificando los
criterios de aceptación.

### Done

Todos los criterios de aceptación y la Definition of Done fueron
satisfechos.

---

## 11. Definition of Ready

Un Issue podrá pasar a `Ready` cuando:

- [ ] El objetivo se encuentra claramente definido.
- [ ] Posee criterios de aceptación.
- [ ] Tiene prioridad asignada.
- [ ] Tiene Estimate asignado.
- [ ] Tiene un responsable principal.
- [ ] Sus dependencias principales son conocidas.
- [ ] Puede completarse dentro del Sprint.
- [ ] No existe un bloqueo conocido que impida iniciar.

---

## 12. Definition of Done

Un Issue podrá pasar a `Done` cuando:

- [ ] Cumple todos sus criterios de aceptación.
- [ ] La implementación está terminada.
- [ ] Frontend y backend están integrados cuando corresponda.
- [ ] Las validaciones necesarias están implementadas.
- [ ] Las pruebas correspondientes fueron ejecutadas.
- [ ] No existen errores críticos conocidos.
- [ ] El Pull Request fue revisado y aprobado.
- [ ] Los cambios fueron integrados correctamente.
- [ ] El Issue pasó por `Testing`.
- [ ] La documentación necesaria fue actualizada.
- [ ] El Issue fue cerrado.

---

## 13. Resultado esperado del Sprint

Al finalizar el Sprint 2 se espera disponer de un incremento funcional
que permita:

- controlar el acceso mediante autenticación y permisos;
- administrar información básica de usuarios;
- registrar y consultar familias beneficiarias;
- administrar integrantes, comunidades y programas;
- registrar visitas, observaciones y capacitaciones;
- mantener seguimiento de las actividades realizadas;
- contar con una base funcional PWA;
- registrar y sincronizar información en escenarios de conectividad
  limitada.

El resultado será evaluado durante el Sprint Review del Sprint 2.