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
