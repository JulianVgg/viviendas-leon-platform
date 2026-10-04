# Diagrama general del proceso de ViviendasLeón

## Objetivo

Documentar de forma visual el proceso general de ViviendasLeón, desde la convocatoria e incorporación de las familias hasta la formación, verificación técnica, implementación, seguimiento y producción.

## Diagrama
CODIGO FINAL DE MERMAID COMPLETO

flowchart TD

subgraph E1[" "]
direction TB

    T1["ETAPA 1. CONVOCATORIA Y SELECCIÓN"]

    A([INICIO]) --> B["COORDINACIÓN<br/>Planificar convocatoria"]
    B --> C["COORDINACIÓN<br/>Realizar convocatoria"]
    C --> D{"¿Cómo conoce el programa?"}
    D -->|Convocatoria| E["FAMILIA / PARTICIPANTE<br/>Manifiesta interés"]
    D -->|Recomendación| E
    E --> F["PERSONAL DE CAMPO<br/>Realizar primera visita"]
    F --> G["PERSONAL DE CAMPO<br/>Conocer situación de la familia"]

    T1 --> A
end


subgraph E2[" "]
direction LR

    T2["ETAPA 2. EVALUACIÓN INICIAL"]

    H["PERSONAL DE CAMPO<br/>Evaluar disponibilidad de terreno"]
    I["PERSONAL DE CAMPO<br/>Evaluar disponibilidad de agua"]
    J["PERSONAL DE CAMPO<br/>Revisar condiciones generales"]
    K{"¿Cumple condiciones iniciales?"}
    L["COORDINACIÓN<br/>Dar seguimiento o no incorporar"]
    M["COORDINACIÓN<br/>Aprobar incorporación"]
    N["PERSONAL DE CAMPO<br/>Definir espacio productivo"]
    O["PERSONAL DE CAMPO<br/>Campo abierto y/o macrotúnel"]

    T2 --> H
    H --> I --> J --> K
    K -->|No| L
    K -->|Sí| M --> N --> O
end

subgraph E3[" "]
direction TB

    T3["ETAPA 3. FORMACIÓN"]

    P["COORDINACIÓN<br/>Explicar cómo funciona el programa"]
    Q["FAMILIA / PARTICIPANTE<br/>Acordar día, hora y lugar para capacitaciones"]
    R["ADMINISTRACIÓN<br/>Registrar información del proceso"]
    S["FAMILIA / PARTICIPANTE<br/>Firmar convenio"]
    T["COORDINACIÓN<br/>Formalizar ingreso al proceso"]
    U["COORDINACIÓN<br/>Organizar capacitaciones"]
    V["PERSONAL DE CAMPO<br/>Realizar capacitación semanal"]
    W["FAMILIA / PARTICIPANTE<br/>Asistir al proceso de formación"]
    X["COORDINACIÓN<br/>Dar seguimiento a la formación<br/>(aprox. 6 meses)"]
    Y{"¿Completó la formación?"}

    T3 --> P
    P --> Q --> R --> S --> T --> U --> V --> W --> X --> Y
    Y -->|"No: Casos especiales donde coordinación tuvo que hacer excepción"| U
end

subgraph E4[" "]
direction TB

    T4["ETAPA 4. VERIFICACIÓN TÉCNICA"]

    Z["PERSONAL DE CAMPO<br/>Realizar visita técnica"]
    AA["PERSONAL DE CAMPO<br/>Revisar condiciones generales"]
    AB["PERSONAL DE CAMPO<br/>Realizar estudios correspondientes"]
    AC["PERSONAL DE CAMPO<br/>Definir distribución del área productiva"]

    T4 --> Z
    Z --> AA --> AB --> AC
end

subgraph E5[" "]
direction TB

    T5["ETAPA 5. IMPLEMENTACIÓN"]

    AJ["PERSONAL DE CAMPO<br/>Preparar terreno"]
    AK["PERSONAL DE CAMPO<br/>Construir macrotúnel"]
    AL["PERSONAL DE CAMPO<br/>Brindar orientaciones agrícolas"]
    AM["PERSONAL DE CAMPO<br/>Orientar sobre cómo sembrar"]
    AN["ADMINISTRACIÓN<br/>Registrar entrega de semillas e insumos"]
    AO["FAMILIA / PARTICIPANTE<br/>Realizar siembra"]
    AP["PERSONAL DE CAMPO<br/>Registrar cultivo inicial"]

    T5 --> AJ
    AK --> AJ
    AJ --> AL --> AM --> AN --> AO --> AP
end

subgraph E6[" "]
direction LR

    T6["ETAPA 6. SEGUIMIENTO Y PRODUCCIÓN"]

    AQ["PERSONAL DE CAMPO<br/>Realizar visitas y asistencia técnica"]
    AR["PERSONAL DE CAMPO<br/>Evaluar estado del cultivo"]
    AS{"¿Hay problemas en el cultivo?"}
    AT["PERSONAL DE CAMPO<br/>Identificar plagas, enfermedades u otros problemas"]
    AU["PERSONAL DE CAMPO<br/>Definir orientación o tratamiento"]
    AV["FAMILIA / PARTICIPANTE<br/>Aplicar recomendaciones"]
    AW["FAMILIA / PARTICIPANTE<br/>Continuar manejo del cultivo"]
    AX["PERSONAL DE CAMPO<br/>Estimar producción"]
    AY["FAMILIA / PARTICIPANTE<br/>Realizar cosecha"]
    AZ["PERSONAL DE CAMPO<br/>Registrar producción"]
    BA{"¿Existe excedente?"}
    BB["FAMILIA / PARTICIPANTE<br/>Consumo familiar"]
    BC["FAMILIA / PARTICIPANTE<br/>Venta / comercialización"]
    BD["PERSONAL DE CAMPO<br/>Registrar ventas"]
    BE["COORDINACIÓN<br/>Revisar seguimiento y resultados"]
    BF["ADMINISTRACIÓN<br/>Consolidar información"]
    BG["DIRECCIÓN OPERATIVA<br/>Consultar indicadores y reportes"]
    BH["AUDITORÍA<br/>Verificar trazabilidad de operaciones"]
    BI["COORDINACIÓN<br/>Planificar seguimiento continuo"]

    T6 --> AQ
    AQ --> AR --> AS
    AS -->|Sí| AT --> AU --> AV --> AQ
    AS -->|No| AW --> AX --> AY --> AZ --> BA
    BA -->|No| BB --> BE
    BA -->|Sí| BC --> BD --> BE
    BE --> BF --> BG --> BH --> BI
    BI -. Nuevo seguimiento .-> AQ
end

G --> H
O --> P
Y -->|Sí| Z
AC --> AJ
AC --> AK
AP --> AQ

style E1 fill:#EAF3FF,stroke:#1565C0,stroke-width:2px
style E2 fill:#EDF7ED,stroke:#2E7D32,stroke-width:2px
style E3 fill:#FFF4E5,stroke:#EF6C00,stroke-width:2px
style E4 fill:#F3EAFE,stroke:#7B1FA2,stroke-width:2px
style E5 fill:#FFFCE8,stroke:#F9A825,stroke-width:2px
style E6 fill:#E8F8F7,stroke:#00796B,stroke-width:2px


classDef inicio fill:#263238,color:#ffffff,stroke:#000000,stroke-width:2px
classDef decision fill:#FFF8E1,color:#000000,stroke:#F57F17,stroke-width:2px
classDef tituloEtapa fill:#0D47A1,color:#FFFFFF,stroke:#082B61,stroke-width:2px
classDef coord fill:#BBDEFB,color:#000000,stroke:#1565C0,stroke-width:1.5px
classDef campo fill:#C8E6C9,color:#000000,stroke:#2E7D32,stroke-width:1.5px
classDef admin fill:#FFF9C4,color:#000000,stroke:#F9A825,stroke-width:1.5px
classDef direccion fill:#FFCDD2,color:#000000,stroke:#C62828,stroke-width:1.5px
classDef auditoria fill:#D1C4E9,color:#000000,stroke:#4527A0,stroke-width:1.5px
classDef familia fill:#F5F5F5,color:#000000,stroke:#616161,stroke-width:1.5px
classDef cierre fill:#ECEFF1,color:#000000,stroke:#455A64,stroke-width:1.5px


class A inicio
class D,K,Y,AS,BA decision
class T1,T2,T3,T4,T5,T6 tituloEtapa
class B,C,M,P,T,U,X,BE,BI coord
class F,G,H,I,J,N,O,V,Z,AA,AB,AC,AJ,AK,AL,AM,AP,AQ,AR,AT,AU,AX,AZ,BD campo
class R,AN,BF admin
class BG direccion
class BH auditoria
class E,Q,S,W,AO,AV,AW,AY,BB,BC familia
class L cierre