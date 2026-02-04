# Cosmic Index – run `just` or `just --list` to see recipes
# Requires: just (https://github.com/casey/just), bun

# Show all recipes (default when you run `just` with no args)
[default]
list:
    just --list

# Start dev server (Turbopack, port 3000)
dev:
    bun run dev

# Production build
build:
    bun run build

# Start production server
start:
    bun run start

# Run ESLint
lint:
    bun run lint

# Run JPL SBDB API diagnostic
sbdb-diag:
    bun run sbdb:diag

# Ingest host stars into Turso
ingest-stars:
    bun run ingest:stars

# Reset checkpoint and ingest stars (fresh run)
ingest-stars-reset:
    bun run ingest:stars -- --reset
    bun run ingest:stars

# Ingest exoplanets into Turso
ingest-exoplanets:
    bun run ingest:exoplanets

# Reset and ingest exoplanets
ingest-exoplanets-reset:
    bun run ingest:exoplanets -- --reset
    bun run ingest:exoplanets

# Ingest small bodies into Turso (~30-60 minutes for 1M+ objects)
ingest-small-bodies:
    bun run ingest:small-bodies

# Reset checkpoint and ingest small bodies (fresh run)
ingest-small-bodies-reset:
    bun run ingest:small-bodies -- --reset
    bun run ingest:small-bodies

# Ingest stars then exoplanets (reset + ingest each). Needs TURSO_* in .env.local
ingest-all: ingest-stars-reset ingest-exoplanets-reset
