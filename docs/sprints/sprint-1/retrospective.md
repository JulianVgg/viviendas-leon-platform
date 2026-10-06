# Sprint Retrospective — Sprint 1

## 1. Información general

**Proyecto:** Plataforma Viviendas León
**Sprint:** Sprint 1
**Periodo:** 23 de septiembre al 3 de octubre de 2026
**Equipo:** Julián Vásquez, Luis de León y Ricardo Calderón


## 2. Objetivo de la retrospectiva

Analizar la forma de trabajo utilizada durante el Sprint 1, identificar
prácticas que funcionaron correctamente, detectar dificultades y acordar
acciones concretas de mejora para el Sprint 2.


## 3. Resultado general del Sprint

El Sprint 1 finalizó con todos los elementos comprometidos en estado
`Done`.

Se completaron 22 elementos ejecutables correspondientes a
requerimientos, arquitectura, interfaz y base de datos.

### Métricas

| Métrica | Resultado |
|---|---:|
| Story Points comprometidos | 92 SP |
| Story Points completados | 92 SP |
| Velocity observada | 92 SP |
| Cumplimiento | 100 % |
| Issues completados | 22 |


## 4. ¿Qué funcionó bien?

- Se logró estructurar el Product Backlog mediante épicas y sub-issues.
- Los Issues contaron con objetivos y criterios de aceptación.
- Se utilizaron Story Points para estimar el esfuerzo relativo.
- Se establecieron prioridades mediante P0, P1 y P2.
- Se distribuyó trabajo entre los integrantes del equipo.
- Se utilizó revisión mediante Pull Requests.
- Los cambios fueron revisados por otro integrante antes de considerarse terminados.
- Se configuraron automatizaciones dentro de GitHub Projects.
- Se estableció un flujo de trabajo mediante los estados:
  `Backlog → Ready → In Progress → In Review → Testing → Done`.
- Se completaron las bases técnicas necesarias para iniciar el desarrollo funcional.
- La división de elementos grandes en sub-issues permitió visualizar mejor el avance.
- GitHub Projects permitió centralizar planificación, seguimiento y desarrollo.

---

## 5. ¿Qué dificultades se encontraron?

- Al inicio algunos Issues representaban actividades demasiado grandes y funcionaban realmente como épicas.
- Fue necesario reorganizar el Product Backlog durante el Sprint.
- Algunas épicas tenían Story Points asignados además de sus sub-issues, lo que podía duplicar las estimaciones.
- Inicialmente se utilizaron demasiados elementos con prioridad P0.
- Algunos Issues tuvieron más de un responsable, dificultando identificar al encargado principal.
- Algunos Pull Requests fueron agregados al Project como elementos independientes.
- En algunos casos el Pull Request fue relacionado con el Issue después de realizar el merge.
- Esto provocó que algunas automatizaciones de estados no se ejecutaran en el orden esperado.
- Fue necesario comprender mejor la diferencia entre Issue, épica, sub-issue y Pull Request.
- Algunos elementos, como UI, resultaron demasiado grandes y tuvieron que dividirse.
- Las estimaciones fueron realizadas mientras el equipo todavía estaba aprendiendo a utilizar Story Points.

---

## 6. ¿Qué debemos dejar de hacer? — STOP

Durante el Sprint 2 el equipo evitará:

- Asignar Story Points directamente a las épicas.
- Utilizar una épica como una única tarea de desarrollo.
- Crear Issues demasiado grandes con estimaciones superiores a 8 puntos.
- Marcar todos los elementos como P0.
- Tener múltiples responsables principales para el mismo Issue sin necesidad.
- Crear un nuevo Issue para representar un Pull Request.
- Realizar merge antes de relacionar correctamente el PR con su Issue.
- Iniciar demasiados Issues simultáneamente.
- Considerar un trabajo terminado únicamente porque el código funciona localmente.
- Mover elementos a `Done` sin verificar sus criterios de aceptación.

---

## 7. ¿Qué debemos comenzar a hacer? — START

A partir del Sprint 2 el equipo comenzará a:

- Realizar Backlog Refinement antes del Sprint Planning.
- Revisar prioridad y Estimate antes de seleccionar un Issue para un Sprint.
- Dividir cualquier elemento estimado en más de 8 Story Points.
- Mantener un responsable principal por Issue.
- Vincular el Pull Request con el Issue antes de solicitar revisión o realizar merge.
- Mantener un máximo de una funcionalidad importante `In Progress` por integrante.
- Utilizar los criterios de aceptación como referencia durante Testing.
- Registrar dependencias entre Issues cuando existan.
- Revisar la capacidad del equipo antes de comprometer trabajo para un Sprint.
- Comparar puntos comprometidos contra puntos terminados al finalizar cada Sprint.
- Utilizar la Velocity histórica como referencia para futuros Sprint Planning.
- Revisar los elementos `Ready` antes de iniciar trabajo nuevo.

---

## 8. ¿Qué debemos continuar haciendo? — CONTINUE

El equipo continuará:

- Trabajando mediante Issues.
- Organizando funcionalidades mediante épicas y sub-issues.
- Utilizando GitHub Projects como herramienta principal de seguimiento.
- Realizando Pull Requests para integrar cambios.
- Solicitando revisión de otro integrante.
- Utilizando criterios de aceptación.
- Utilizando Story Points con la secuencia:
  `1, 2, 3, 5, 8`.
- Utilizando prioridades:
  `P0`, `P1` y `P2`.
- Documentando decisiones técnicas dentro del repositorio.
- Manteniendo el tablero actualizado durante el Sprint.
- Utilizando el flujo definido de estados.

---

## 9. Acciones de mejora para Sprint 2

Para evitar que la retrospectiva quede únicamente como observaciones, se
definen las siguientes acciones concretas.

### Acción 1 — Limitar trabajo en progreso

**Regla:**

Cada integrante tendrá como máximo una funcionalidad importante en
estado `In Progress`.

**Objetivo:**

Reducir trabajo iniciado pero no terminado.

---

### Acción 2 — Relacionar Issue y Pull Request correctamente

Antes de realizar merge, todo Pull Request deberá estar vinculado con su
Issue correspondiente.

**Flujo esperado:**

Issue
→ In Progress
→ Pull Request vinculado
→ In Review
→ Merge
→ Testing
→ Done

---

### Acción 3 — Refinar antes de desarrollar

Un Issue únicamente podrá pasar a `Ready` cuando tenga:

- objetivo entendido;
- criterios de aceptación;
- prioridad;
- Estimate;
- dependencias conocidas;
- tamaño suficientemente pequeño.

---

### Acción 4 — Un responsable principal por Issue

Cada Issue tendrá un único Assignee principal responsable de llevarlo
hasta su finalización.

Otros integrantes podrán participar como colaboradores o reviewers.

---

### Acción 5 — Mejorar la estimación

Los Story Points serán acordados por el equipo mediante estimación
conjunta.

Si existe una diferencia considerable entre las estimaciones propuestas,
el equipo discutirá los riesgos o complejidades identificadas antes de
establecer el valor definitivo.

---

## 10. Definition of Ready para Sprint 2

Un elemento se considera `Ready` cuando:

- [ ] Su objetivo está claramente definido.
- [ ] Posee criterios de aceptación.
- [ ] El equipo entiende qué debe desarrollarse.
- [ ] Tiene prioridad asignada.
- [ ] Tiene Estimate asignado.
- [ ] Sus dependencias principales son conocidas.
- [ ] Puede completarse dentro de un Sprint.
- [ ] Su tamaño no supera los 8 Story Points.
- [ ] No existe un bloqueo conocido que impida comenzar.

---

## 11. Definition of Done para Sprint 2

Un elemento podrá considerarse `Done` cuando:

- [ ] Cumple todos sus criterios de aceptación.
- [ ] La implementación necesaria está terminada.
- [ ] Las validaciones correspondientes están implementadas.
- [ ] Las pruebas necesarias fueron realizadas.
- [ ] No existen errores críticos conocidos.
- [ ] El Pull Request fue revisado y aprobado.
- [ ] Los cambios fueron integrados correctamente.
- [ ] El elemento pasó por Testing.
- [ ] La documentación necesaria fue actualizada.
- [ ] El Issue fue cerrado.

---

## 12. Compromiso de mejora

Para el Sprint 2 el equipo aplicará especialmente las siguientes tres
mejoras:

1. Limitar el trabajo simultáneo a una funcionalidad importante por persona.
2. Vincular correctamente cada Pull Request con su Issue antes del merge.
3. No incorporar elementos al Sprint sin haber realizado previamente su refinement.

Estas acciones serán revisadas nuevamente durante la retrospectiva del
Sprint 2 para determinar si mejoraron el flujo de trabajo.