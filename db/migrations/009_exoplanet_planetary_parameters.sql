-- Preserve the self-consistent default NASA Planetary Systems parameter set,
-- including asymmetric uncertainties, upper/lower limits, and provenance.
ALTER TABLE exoplanets ADD COLUMN planetary_parameters_json TEXT;
