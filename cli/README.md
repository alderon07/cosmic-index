# cosmic-index CLI

Go-based CLI for Cosmic Index API (`/api/v1/*`).

## Install (local development)

```bash
cd cli
go build ./cmd/cosmic-index
./cosmic-index version
```

## Usage

### Search

```bash
cosmic-index search exoplanets -q kepler --limit 12
cosmic-index search stars -q kepler --sort planets
cosmic-index search small-bodies -q apophis --neo
cosmic-index close-approaches --limit 10
cosmic-index fireballs --req-loc --sort energy -n 20
cosmic-index apod
```

### Get details

```bash
cosmic-index get exoplanets "PSR B1257+12 b"
cosmic-index get stars "Kepler-22"
cosmic-index get small-bodies "99942 Apophis"
```

### APOD

```bash
cosmic-index apod --date 2026-01-01
cosmic-index apod --full-text
```

### Output modes

```bash
cosmic-index --output table search exoplanets -q kepler
cosmic-index --output json search exoplanets -q kepler
# alias:
cosmic-index --json get exoplanets "Kepler-22 b"
```

`table` output is intended for humans. Use `json` for scripts.

### Base URL

By default, the CLI uses `https://cosmic-index.vercel.app`.

Override with flag:

```bash
cosmic-index --base-url http://localhost:3000 search stars -q kepler
```

Or env var:

```bash
COSMIC_INDEX_BASE_URL=http://localhost:3000 cosmic-index search stars -q kepler
```

## Flags

Global flags:

- `--base-url`
- `--timeout` (default `35s`)
- `-o, --output table|json`
- `--json` (alias for `--output json`)
- `--debug`

Event command notes:

- `close-approaches --order` requires `--sort`
- `fireballs --order` requires `--sort`
- `table` output truncates APOD explanation by default; use `--full-text` to show full text

## Command aliases

- `search`: `find`, `list`
- `get`: `show`, `info`
- `exoplanets`: `exo`, `exoplanet`
- `stars`: `star`
- `small-bodies`: `sb`, `small-body`, `smallbodies`

## Tooling

Pin `oapi-codegen` in module tools:

```bash
cd cli
go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
```

Code generation integration can target `../public/openapi.json` in a follow-up once the desired generated surface is finalized.
