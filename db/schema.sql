-- Stars table: indexed cache of host stars from NASA Exoplanet Archive
CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY,              -- slug (URL-safe identifier)
  hostname TEXT NOT NULL UNIQUE,    -- upstream canonical identifier

  spectral_type TEXT,
  spectral_class TEXT,              -- derived O/B/A/F/G/K/M/Unknown

  star_temp_k REAL,
  star_mass_solar REAL,
  star_radius_solar REAL,
  star_luminosity_log REAL,
  metallicity_feh REAL,
  age_gyr REAL,

  distance_parsecs REAL,
  vmag REAL,
  kmag REAL,
  ra_deg REAL,
  dec_deg REAL,

  stars_in_system INTEGER,
  planets_in_system INTEGER,
  planet_count INTEGER NOT NULL DEFAULT 0,

  updated_at_index TEXT NOT NULL,       -- when we last ingested this row
  source_snapshot_at TEXT               -- optional: upstream data timestamp
);

-- Checkpoint table for resumable ingestion
CREATE TABLE IF NOT EXISTS ingestion_state (
  id TEXT PRIMARY KEY DEFAULT 'stars',
  last_hostname TEXT,
  last_run_at TEXT,
  rows_ingested INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stars_hostname ON stars(hostname);
CREATE INDEX IF NOT EXISTS idx_stars_spectral_class ON stars(spectral_class);
CREATE INDEX IF NOT EXISTS idx_stars_planet_count ON stars(planet_count);
CREATE INDEX IF NOT EXISTS idx_stars_distance ON stars(distance_parsecs);
CREATE INDEX IF NOT EXISTS idx_stars_vmag ON stars(vmag);

-- Exoplanets table: indexed cache of exoplanets from NASA Exoplanet Archive
CREATE TABLE IF NOT EXISTS exoplanets (
  id TEXT PRIMARY KEY,                -- URL-safe slug
  pl_name TEXT NOT NULL UNIQUE,       -- canonical identifier
  pl_name_lower TEXT NOT NULL,        -- lowercased for stable keyset pagination

  hostname TEXT NOT NULL,             -- host star name
  discovery_method TEXT,
  disc_facility TEXT,                 -- matches NASA column name exactly
  disc_year INTEGER,

  orbital_period_days REAL,
  radius_earth REAL,
  mass_earth REAL,
  equilibrium_temp_k REAL,

  distance_parsecs REAL,
  stars_in_system INTEGER,
  planets_in_system INTEGER,

  st_spectype TEXT,
  st_teff REAL,
  st_mass REAL,
  st_rad REAL,
  st_lum REAL,

  ra_deg REAL,
  dec_deg REAL,

  updated_at_index TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exoplanets_hostname ON exoplanets(hostname);
CREATE INDEX IF NOT EXISTS idx_exoplanets_pl_name ON exoplanets(pl_name);
CREATE INDEX IF NOT EXISTS idx_exoplanets_pl_name_lower ON exoplanets(pl_name_lower);
CREATE INDEX IF NOT EXISTS idx_exoplanets_discovery_method ON exoplanets(discovery_method);
CREATE INDEX IF NOT EXISTS idx_exoplanets_disc_year ON exoplanets(disc_year);
CREATE INDEX IF NOT EXISTS idx_exoplanets_distance ON exoplanets(distance_parsecs);
CREATE INDEX IF NOT EXISTS idx_exoplanets_radius ON exoplanets(radius_earth);

-- Composite index for common filter+sort pattern
CREATE INDEX IF NOT EXISTS idx_exoplanets_method_year ON exoplanets(discovery_method, disc_year DESC);

-- FTS5 virtual table for fast full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS exoplanets_fts USING fts5(
  pl_name,
  hostname,
  discovery_method,
  content='exoplanets',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with main table
CREATE TRIGGER IF NOT EXISTS exoplanets_fts_insert AFTER INSERT ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(rowid, pl_name, hostname, discovery_method)
  VALUES (NEW.rowid, NEW.pl_name, NEW.hostname, NEW.discovery_method);
END;

CREATE TRIGGER IF NOT EXISTS exoplanets_fts_delete AFTER DELETE ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(exoplanets_fts, rowid, pl_name, hostname, discovery_method)
  VALUES ('delete', OLD.rowid, OLD.pl_name, OLD.hostname, OLD.discovery_method);
END;

CREATE TRIGGER IF NOT EXISTS exoplanets_fts_update AFTER UPDATE ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(exoplanets_fts, rowid, pl_name, hostname, discovery_method)
  VALUES ('delete', OLD.rowid, OLD.pl_name, OLD.hostname, OLD.discovery_method);
  INSERT INTO exoplanets_fts(rowid, pl_name, hostname, discovery_method)
  VALUES (NEW.rowid, NEW.pl_name, NEW.hostname, NEW.discovery_method);
END;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Small Bodies table: indexed cache from JPL SBDB Query API
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS small_bodies (
  rowid INTEGER PRIMARY KEY,        -- Explicit rowid for FTS content sync
  spkid TEXT NOT NULL UNIQUE,       -- JPL SPK-ID: stable numeric identity (upsert key)
  id TEXT NOT NULL UNIQUE,          -- URL-safe slug

  designation TEXT NOT NULL,        -- JPL pdes: "433", "C/2020 F3"
  display_name TEXT NOT NULL,       -- "Eros", "NEOWISE"
  full_name TEXT,                   -- "433 Eros", "C/2020 F3 (NEOWISE)"
  name_sort TEXT NOT NULL,          -- Sortable name (e.g., "eros" not "(433) eros")

  body_kind TEXT NOT NULL,          -- "asteroid" | "comet"
  orbit_class TEXT,                 -- "AMO", "APO", "MBA", "JFC", etc.

  is_neo INTEGER NOT NULL DEFAULT 0,
  is_pha INTEGER NOT NULL DEFAULT 0,

  diameter_km REAL,
  absolute_magnitude REAL,          -- H value

  updated_at TEXT NOT NULL
);

-- Case-insensitive uniqueness via index (not column collation)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sb_designation_nocase
ON small_bodies(designation COLLATE NOCASE);

-- Indexes for filter columns
CREATE INDEX IF NOT EXISTS idx_sb_id ON small_bodies(id);
CREATE INDEX IF NOT EXISTS idx_sb_body_kind ON small_bodies(body_kind);
CREATE INDEX IF NOT EXISTS idx_sb_orbit_class ON small_bodies(orbit_class);
CREATE INDEX IF NOT EXISTS idx_sb_is_neo ON small_bodies(is_neo);
CREATE INDEX IF NOT EXISTS idx_sb_is_pha ON small_bodies(is_pha);
CREATE INDEX IF NOT EXISTS idx_sb_diameter ON small_bodies(diameter_km);
CREATE INDEX IF NOT EXISTS idx_sb_h ON small_bodies(absolute_magnitude);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_sb_kind_class ON small_bodies(body_kind, orbit_class);
CREATE INDEX IF NOT EXISTS idx_sb_neo_pha ON small_bodies(is_neo, is_pha);

-- Default sort index (enables seek pagination later)
CREATE INDEX IF NOT EXISTS idx_sb_name_sort_rowid ON small_bodies(name_sort, rowid);

-- FTS5 for text search (external content, uses rowid)
CREATE VIRTUAL TABLE IF NOT EXISTS small_bodies_fts USING fts5(
  designation, display_name, full_name,
  content='small_bodies', content_rowid='rowid'
);

-- FTS sync triggers (minimal form: delete by rowid only)
CREATE TRIGGER IF NOT EXISTS sb_fts_insert AFTER INSERT ON small_bodies BEGIN
  INSERT INTO small_bodies_fts(rowid, designation, display_name, full_name)
  VALUES (NEW.rowid, NEW.designation, NEW.display_name, NEW.full_name);
END;

CREATE TRIGGER IF NOT EXISTS sb_fts_delete AFTER DELETE ON small_bodies BEGIN
  INSERT INTO small_bodies_fts(small_bodies_fts, rowid) VALUES('delete', OLD.rowid);
END;

CREATE TRIGGER IF NOT EXISTS sb_fts_update AFTER UPDATE ON small_bodies BEGIN
  INSERT INTO small_bodies_fts(small_bodies_fts, rowid) VALUES('delete', OLD.rowid);
  INSERT INTO small_bodies_fts(rowid, designation, display_name, full_name)
  VALUES (NEW.rowid, NEW.designation, NEW.display_name, NEW.full_name);
END;

-- Ingestion state (checkpoint in DB, not file)
CREATE TABLE IF NOT EXISTS ingest_state (
  name TEXT PRIMARY KEY,
  last_offset INTEGER NOT NULL DEFAULT 0,
  rows_ingested INTEGER NOT NULL DEFAULT 0,
  last_batch_duration_ms INTEGER,
  last_total_observed INTEGER,
  last_error TEXT,
  updated_at TEXT NOT NULL
);
