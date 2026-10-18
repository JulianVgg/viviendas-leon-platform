-- VIS-04: Compromisos de alcance general vinculados a una visita.
CREATE TABLE "visita_seguimiento" (
 "id" UUID NOT NULL,
 "visita_origen_id" INTEGER NOT NULL,
 "texto" TEXT NOT NULL,
 "responsable" TEXT NOT NULL,
 "fecha_limite" DATE,
 "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
 "observacion_cierre" TEXT,
 "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "visita_seguimiento_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "visita_seguimiento_visita_origen_id_fkey" FOREIGN KEY ("visita_origen_id") REFERENCES "visita"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "visita_seguimiento_estado_check" CHECK ("estado" IN ('PENDIENTE', 'CUMPLIDO', 'NO_CUMPLIDO')),
 CONSTRAINT "visita_seguimiento_responsable_check" CHECK ("responsable" IN ('Familia', 'ONG'))
);
CREATE INDEX "visita_seguimiento_visita_origen_id_idx" ON "visita_seguimiento"("visita_origen_id");
CREATE INDEX "visita_seguimiento_estado_fecha_limite_idx" ON "visita_seguimiento"("estado", "fecha_limite");

-- Compatibilidad: compromisos de visitas anteriores guardados como JSON VIS-03.
-- Derivamos un UUID estable por (operación, posición) para conservar la identidad.
WITH legacy AS (
 SELECT vc.visita_id, vc.operation_id, e.element AS commitment, e.position - 1 AS position,
        md5(vc.operation_id::text || ':' || (e.position - 1)::text) AS hash
 FROM visita_captura vc,
 LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(vc.datos->'commitments') = 'array'
   THEN vc.datos->'commitments' ELSE '[]'::jsonb END) WITH ORDINALITY AS e(element,position)
), normalized AS (
 SELECT *,
   (substr(hash,1,8)||'-'||substr(hash,9,4)||'-4'||substr(hash,14,3)||'-8'||substr(hash,18,3)||'-'||substr(hash,21,12))::uuid AS stable_id
 FROM legacy
)
INSERT INTO visita_seguimiento (id, visita_origen_id, texto, responsable, fecha_limite, estado)
SELECT stable_id, visita_id, left(commitment->>'text',500), commitment->>'category',
  CASE WHEN commitment->>'due' ~ '^\d{4}-\d{2}-\d{2}$' THEN (commitment->>'due')::date ELSE NULL END,
  'PENDIENTE'
FROM normalized
WHERE coalesce(commitment->>'text','') <> ''
  AND commitment->>'category' IN ('Familia','ONG')
ON CONFLICT (id) DO NOTHING;
