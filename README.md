# 🌌 Cosmic Index

A rweb encyclopedia for exploring cosmic objects beyond our solar system. Browse and search through thousands of confirmed exoplanets from NASA's Exoplanet Archive and over a million asteroids and comets from JPL's Small-Body Database.

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

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- [just](https://github.com/casey/just) (optional) – command runner; run `just` to see all tasks
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

4. Run the development server:

```bash
just dev
# or: bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

Run `just` (or `just --list`) to see all available commands (dev, build, lint, ingest, etc.).

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

## 🔌 API Endpoints

### Exoplanets

- `GET /api/exoplanets` - List exoplanets with filtering and pagination

  - Query parameters:
    - `query` - Search by name
    - `discoveryMethod` - Filter by discovery method
    - `yearFrom` / `yearTo` - Filter by discovery year range
    - `hasRadius` / `hasMass` - Filter by data availability
    - `page` - Page number (default: 1)
    - `limit` - Results per page (default: 20, max: 100)

- `GET /api/exoplanets/[id]` - Get detailed exoplanet information

### Small Bodies

- `GET /api/small-bodies` - List small bodies with filtering and pagination

  - Query parameters:
    - `query` - Search by name or designation (regex pattern)
    - `kind` - Filter by type: `asteroid` or `comet`
    - `neo` - Filter Near-Earth Objects (boolean)
    - `pha` - Filter Potentially Hazardous Asteroids (boolean)
    - `page` - Page number (default: 1)
    - `limit` - Results per page (default: 20, max: 100)

- `GET /api/small-bodies/[id]` - Get detailed small body information

## 🎨 Design System

The project features a custom retrofuturistic design system with:

- **Color Palette**: Primary, secondary, accent, and radium-teal colors
- **Typography**: Custom display font with Nixie-style numbers
- **Effects**: Scanlines, bezels, glow effects, and animated starfields
- **Components**: Card-based layouts with hover states and transitions

## 🧪 Development

### Commands (just)

Run `just` to list all recipes. Common ones:

- `just dev` - Start development server with Turbopack
- `just build` - Build for production
- `just start` - Start production server
- `just lint` - Run ESLint
- `just sbdb-diag` - Run JPL SBDB diagnostic
- `just ingest-stars` / `just ingest-exoplanets` - Ingest data into Turso (requires TURSO\_\* in .env.local)
- `just ingest-stars-reset` / `just ingest-exoplanets-reset` - Reset checkpoint and re-ingest
- `just ingest-all` - Ingest stars then exoplanets (full reset + ingest)

Without just, use `bun run <script>` (e.g. `bun run dev`, `bun run ingest:stars`).

### Testing

Integration tests are available in `src/lib/__tests__/`:

- `nasa-exoplanet.test.ts` - NASA Exoplanet Archive integration tests
- `jpl-sbdb.integration.test.ts` - JPL Small-Body Database integration tests

## 🚢 Deployment

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables if using Redis caching
4. Deploy!

The project is optimized for Vercel's platform and works out of the box.

## 🙏 Acknowledgments

- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) for exoplanet data
- [JPL Small-Body Database](https://ssd.jpl.nasa.gov/) for small body data
- Built with [Next.js](https://nextjs.org/) and [React](https://react.dev/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Explore the cosmos** 🌟
