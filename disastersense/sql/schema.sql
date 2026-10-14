-- DisasterSense reference schema (PostgreSQL 14+).
--
-- This mirrors the domain types in `src/types/domain.ts`. The demo runs against
-- the in-memory store in `src/lib/db/store.ts`; this file is the target schema
-- for swapping in a real PostgreSQL driver behind `src/lib/db/repository.ts`.
--
--   psql "$DATABASE_URL" -f sql/schema.sql

BEGIN;

-- ---------------------------------------------------------------- enums

CREATE TYPE disaster_type AS ENUM
  ('flood', 'fire', 'earthquake', 'cyclone', 'industrial', 'medical', 'other');

CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE report_kind AS ENUM ('incident', 'missing_person');

CREATE TYPE incident_status AS ENUM
  ('new', 'analyzing', 'awaiting_approval', 'dispatched', 'in_progress', 'resolved');

CREATE TYPE report_status AS ENUM ('received', 'processing', 'analyzed', 'failed');

CREATE TYPE agent_name AS ENUM
  ('intake', 'classification', 'geospatial', 'risk', 'resource', 'communication', 'report');

CREATE TYPE agent_status AS ENUM ('pending', 'running', 'completed', 'needs_review');

CREATE TYPE resource_type AS ENUM
  ('ambulance', 'fire_brigade', 'rescue_boat', 'medical_team', 'police_unit',
   'volunteers', 'relief_supplies', 'helicopter', 'shelter');

CREATE TYPE resource_availability AS ENUM ('available', 'deployed', 'maintenance');

CREATE TYPE user_role AS ENUM
  ('operator', 'authority', 'coordinator', 'field', 'citizen');

-- ---------------------------------------------------------------- users

CREATE TABLE users (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  role       user_role NOT NULL DEFAULT 'citizen',
  contact    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------ incident reports

CREATE TABLE incident_reports (
  id               text PRIMARY KEY,
  report_kind      report_kind NOT NULL DEFAULT 'incident',
  reporter_name    text NOT NULL,
  reporter_contact text NOT NULL DEFAULT '',
  disaster_type    disaster_type NOT NULL,
  description      text NOT NULL,
  address          text NOT NULL DEFAULT '',
  lat              double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng              double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  severity         severity NOT NULL,
  people_affected  integer NOT NULL DEFAULT 0 CHECK (people_affected >= 0),
  media_urls       text[] NOT NULL DEFAULT '{}',
  contact_number   text NOT NULL DEFAULT '',
  is_sos           boolean NOT NULL DEFAULT false,
  is_simulation    boolean NOT NULL DEFAULT false,
  status           report_status NOT NULL DEFAULT 'received',
  incident_id      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incident_reports_incident_id_idx ON incident_reports (incident_id);
CREATE INDEX incident_reports_created_at_idx ON incident_reports (created_at DESC);

-- ------------------------------------------------------------- incidents

CREATE TABLE incidents (
  id                      text PRIMARY KEY,
  report_kind             report_kind NOT NULL DEFAULT 'incident',
  title                   text NOT NULL,
  disaster_type           disaster_type NOT NULL,
  severity                severity NOT NULL,
  status                  incident_status NOT NULL DEFAULT 'new',
  lat                     double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng                     double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  zone_name               text NOT NULL DEFAULT '',
  address                 text NOT NULL DEFAULT '',
  people_affected         integer NOT NULL DEFAULT 0 CHECK (people_affected >= 0),
  is_simulation           boolean NOT NULL DEFAULT false,
  human_approval_required boolean NOT NULL DEFAULT false,
  approved_by             text,
  approved_at             timestamptz,
  assigned_teams          text[] NOT NULL DEFAULT '{}',

  -- Agent outputs. Kept as JSONB so each agent can evolve its output shape
  -- without a migration; move hot fields to columns if they need indexing.
  intake         jsonb,
  classification jsonb,
  geospatial     jsonb,
  risk           jsonb,
  resources      jsonb NOT NULL DEFAULT '[]',
  communication  jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_status_idx ON incidents (status);
CREATE INDEX incidents_severity_idx ON incidents (severity);
CREATE INDEX incidents_created_at_idx ON incidents (created_at DESC);

ALTER TABLE incident_reports
  ADD CONSTRAINT incident_reports_incident_id_fkey
  FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE SET NULL;

-- ------------------------------------------------------------- agent logs

CREATE TABLE agent_logs (
  id          text PRIMARY KEY,
  incident_id text NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  agent_name  agent_name NOT NULL,
  agent_label text NOT NULL,
  action      text NOT NULL,
  output      text NOT NULL DEFAULT '',
  status      agent_status NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_logs_incident_id_idx ON agent_logs (incident_id, created_at);
CREATE INDEX agent_logs_created_at_idx ON agent_logs (created_at DESC);

-- -------------------------------------------------------------- resources

CREATE TABLE resources (
  id                  text PRIMARY KEY,
  type                resource_type NOT NULL,
  label               text NOT NULL,
  quantity            integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  base_location       text NOT NULL DEFAULT '',
  base_lat            double precision NOT NULL,
  base_lng            double precision NOT NULL,
  availability        resource_availability NOT NULL DEFAULT 'available',
  assigned_incident_id text REFERENCES incidents (id) ON DELETE SET NULL,
  eta_minutes         integer NOT NULL DEFAULT 0
);

CREATE INDEX resources_type_availability_idx ON resources (type, availability);

-- --------------------------------------------------------------- clusters

CREATE TABLE clusters (
  id                    text PRIMARY KEY,
  area                  text NOT NULL,
  centroid_lat          double precision NOT NULL,
  centroid_lng          double precision NOT NULL,
  risk_level            severity NOT NULL,
  incident_ids          text[] NOT NULL DEFAULT '{}',
  recommended_resources jsonb NOT NULL DEFAULT '[]',
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------- situation reports

CREATE TABLE situation_reports (
  id                  text PRIMARY KEY,
  summary             text NOT NULL,
  active_incidents    integer NOT NULL DEFAULT 0,
  critical_incidents  integer NOT NULL DEFAULT 0,
  people_affected     integer NOT NULL DEFAULT 0,
  high_risk_zones     text[] NOT NULL DEFAULT '{}',
  deployed_resources  jsonb NOT NULL DEFAULT '[]',
  recommended_actions text[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX situation_reports_created_at_idx ON situation_reports (created_at DESC);

COMMIT;
