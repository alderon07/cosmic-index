# 🌌 Cosmic Index

A web encyclopedia for exploring cosmic objects and events beyond Earth. Browse and search exoplanets, stars, small bodies, close approaches, fireballs, and space weather data from NASA/JPL sources.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19.2-blue?logo=react)

## ✨ Features

### Exoplanets

- **5,000+ confirmed exoplanets** from NASA's Exoplanet Archive
- Search by name or designation
- Filter by discovery method, discovery year, and physical properties
- View detailed information including orbital period, radius, mass, distance, and equilibrium temperature
- Multiple discovery methods: Transit, Radial Velocity, Imaging, Microlensing, and more

### Small Bodies

- **1,000,000+ asteroids and comets** from JPL's Small-Body Database
- Search asteroids and comets by name or designation
- Filter by type (asteroid/comet), Near-Earth Object (NEO) status, and Potentially Hazardous Asteroid (PHA) classification
- Track orbit classifications: Amor, Apollo, Aten, Atira, Main Belt, Trans-Neptunian, and more
- View physical properties including diameter and absolute magnitude

### Space Weather

- Space weather event feed from NASA DONKI
- Event types: `FLR`, `CME`, `GST`, `IPS`, `HSS`, `SEP`
- Separate DONKI notifications feed with API-backed pagination
- Notifications window is constrained to DONKI's 30-day request limit
- Full notification text supports markdown rendering in expanded view

### General Features

- 🎨 **Retrofuturistic UI** with scanlines, bezels, and glow effects
- 🔍 **Advanced search and filtering** capabilities
- 📄 **Pagination** for efficient browsing of large datasets
- 💾 **Redis caching** for improved performance (optional, via Upstash)
- 📱 **Responsive design** for all device sizes
- ⚡ **Fast API responses** with rate limiting and timeout handling

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.1](https://nextjs.org/) with App Router
- **Language**: TypeScript 5.0
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS 4 with custom retrofuturistic theme
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Validation**: Zod
- **Caching**: Upstash Redis (optional)
- **Runtime**: Bun (or Node.js)

## 📊 Data Sources

### NASA Exoplanet Archive

- **API**: [NASA Exoplanet Archive TAP Service](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html)
- **Data**: Confirmed exoplanets with physical and orbital properties
- **Update Frequency**: Daily

### JPL Small-Body Database

- **API**: [JPL Small-Body Database Query API](https://ssd-api.jpl.nasa.gov/doc/sbdb.html)
- **Data**: Asteroids, comets, and other small solar system bodies
- **Update Frequency**: Regular updates from JPL

### NASA DONKI (Space Weather)

- **API**: [NASA DONKI](https://api.nasa.gov/)
- **Data**: Solar flares, CMEs, geomagnetic storms, interplanetary shocks, high-speed streams, SEP events, and notifications
- **Note**: Notifications are limited by DONKI to a 30-day query range

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- [mise](https://mise.jdx.dev/) (optional but recommended) – runtime and task runner; run `mise tasks` to see all tasks
- Optional: Upstash Redis account for caching

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cosmic-index.git
cd cosmic-index
```

2. Install dependencies:

```bash
bun install
```

3. (Optional) Set up environment variables:

```bash
cp .env.example .env.local
```

Add your Upstash Redis credentials if you want to enable caching:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

Optional NASA/DONKI configuration:

```env
NASA_API_KEY=your_nasa_api_key
```

4. Run the development server:

```bash
mise run dev
# or: bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

Run `mise tasks` to see all available commands (dev, build, lint, ingest, etc.).

## 📁 Project Structure

```
cosmic-index/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── exoplanets/     # Exoplanet API endpoints
│   │   │   └── small-bodies/   # Small body API endpoints
│   │   ├── exoplanets/         # Exoplanet pages
│   │   └── small-bodies/       # Small body pages
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── filter-panel.tsx    # Filtering interface
│   │   ├── object-card.tsx     # Object display cards
│   │   ├── object-detail.tsx   # Detailed object view
│   │   ├── pagination.tsx      # Pagination controls
│   │   └── search-bar.tsx      # Search input
│   └── lib/                    # Core libraries
│       ├── nasa-exoplanet.ts   # NASA Exoplanet Archive client
│       ├── jpl-sbdb.ts         # JPL Small-Body Database client
│       ├── cache.ts            # Redis caching utilities
│       ├── rate-limit.ts       # Rate limiting
│       ├── types.ts            # TypeScript types and schemas
│       └── utils.ts            # Utility functions
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

## 🎨 Design System

The project features a custom retrofuturistic design system with:

- **Color Palette**: Primary, secondary, accent, and radium-teal colors
- **Typography**: Custom display font with Nixie-style numbers
- **Effects**: Scanlines, bezels, glow effects, and animated starfields
- **Components**: Card-based layouts with hover states and transitions

## 🧪 Development

### Commands (mise)

Run `mise tasks` to list all tasks. Common ones:

- `mise run dev` - Start development server with Turbopack
- `mise run build` - Build for production
- `mise run start` - Start production server
- `mise run lint` - Run ESLint
- `mise run sbdb-diag` - Run JPL SBDB diagnostic
- `mise run ingest-stars` / `mise run ingest-exoplanets` - Ingest data into Turso (requires TURSO\_\* in .env.local)
- `mise run ingest-stars-reset` / `mise run ingest-exoplanets-reset` - Reset checkpoint and re-ingest
- `mise run ingest-all` - Ingest stars then exoplanets (full reset + ingest)
- `mise run cli-build` / `mise run cli-test` - Build or test CLI

Without mise, use `bun run <script>` (e.g. `bun run dev`, `bun run ingest:stars`) and run CLI commands directly under `cli/`.

### Testing

Integration tests are available in `src/lib/__tests__/`:

- `nasa-exoplanet.test.ts` - NASA Exoplanet Archive integration tests
- `jpl-sbdb.integration.test.ts` - JPL Small-Body Database integration tests

## 🙏 Acknowledgments

- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) for exoplanet data
- [JPL Small-Body Database](https://ssd.jpl.nasa.gov/) for small body data
- Built with [Next.js](https://nextjs.org/) and [React](https://react.dev/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Explore the cosmos** 🌟
