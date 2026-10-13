CREATE TABLE "offline_demo_note" (
  "operation_id" UUID PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_demo_note_kind_check" CHECK ("kind" = 'demo.field-note.create')
);
