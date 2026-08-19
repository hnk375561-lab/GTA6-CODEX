# 🎮 GTA6-ZONA: The Ultimate Grand Theft Auto VI Encyclopedia

> **A comprehensive, multimedia-rich encyclopedia of Grand Theft Auto VI** with a curated database, high-resolution assets, editorial analysis, and community intelligence.

<div align="center">

![Last Update](https://img.shields.io/badge/last%20update-August%202026-blue)
![Status](https://img.shields.io/badge/status-active%20development-brightgreen)
![License](https://img.shields.io/badge/license-see%20LICENSE-lightgrey)
![Node](https://img.shields.io/badge/node-18%2B-green)

[🌐 Live Website](#) • [📚 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start) • [🤝 Contributing](#-contributing)

</div>

---

## 📖 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [📊 Current Content](#-current-content)
- [🏗️ Architecture](#-architecture)
- [🚀 Quick Start](#-quick-start)
- [📚 Documentation](#-documentation)
- [🛠️ Development](#-development)
- [📦 Content Structure](#-content-structure)
- [🔄 Workflows](#-workflows)
- [🤝 Contributing](#-contributing)
- [📋 Roadmap](#-roadmap)
- [🔗 Resources](#-resources)
- [❓ FAQ](#-faq)
- [📜 License](#-license)

---

## 🎯 Overview

**GTA6-ZONA** is a community-driven encyclopedia dedicated to documenting everything known about **Grand Theft Auto VI**. It combines a structured content database (vehicles, characters, locations, businesses, trailers, and more) with a modern web frontend, an image processing pipeline, and a set of integrity-verification scripts to keep the data trustworthy as new official information is released.

The project is built for two audiences:
- **Players and fans** looking for a reliable, well-organized reference.
- **Contributors and developers** who want to help expand and maintain the database.

---

## ✨ Features

**Content**
- ✅ Structured, evidence-sourced entries for vehicles, characters, locations, businesses, and trailers
- ✅ High-resolution images (WebP, 1600×900) for every documented entity
- ✅ Cross-referenced entity relationships (e.g. character ↔ vehicle ↔ location)

**Platform**
- ✅ Fast fuzzy search across the entire database
- ✅ SEO-optimized routes for every entity page
- ✅ Responsive design for desktop and mobile

**Data Quality**
- ✅ Evidence-level tagging (A/B/C/D) for every fact
- ✅ Primary source citation on every entry
- ✅ Automated integrity, relation, media, and SEO verification scripts

**Community**
- ✅ Clear contribution templates for new content
- ✅ Documented workflows for common tasks
- ✅ Transparent roadmap

---

## 📊 Current Content

| Category | Count | Status | Image Coverage |
|----------|-------|--------|-----------------|
| 🚗 **Vehicles** | **57** | 50% Complete | 19/57 real images (38 pending) |
| 📍 **Locations** | **32** | 40% Complete | Partial coverage, expanding |
| 👤 **Characters** | **18** | 55% Complete | Protagonists, antagonists, supporting cast |
| 🏢 **Businesses** | **24** | 35% Complete | Shops, tattoo parlors, services |
| 🎬 **Trailers** | **2** | 100% Complete | Official Rockstar trailers indexed |
| 🎮 **Other Content** | Multiple | In Progress | Weapons, gangs, radio stations |

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 3 + Typography Plugin |
| 3D Graphics | Three.js (r185) |
| Data Validation | Zod 4 |
| Search | Fuse.js 7 (fuzzy search) |
| Build | Turbopack (Next.js native) |
| Deployment | Vercel (optimized for Next.js) |

### Directory Structure

```
GTA6-ZONA/
├── 📁 public/
│   └── images/
│       └── entities/
│           ├── vehiculos/              # Vehicle images (WebP, 1600×900)
│           ├── personajes/             # Character portraits
│           ├── ubicaciones/            # Location screenshots
│           └── negocios/               # Business establishment photos
│
├── 📁 src/
│   ├── app/                            # Next.js app router
│   ├── components/                     # React components
│   ├── content/                        # Content database (JSON)
│   │   ├── vehiculos/                  # Vehicle JSON files
│   │   ├── personajes/                 # Character data
│   │   ├── ubicaciones/                # Location data
│   │   ├── negocios/                   # Business data
│   │   └── trailers/                   # Trailer index with timestamps
│   ├── lib/                            # Utilities & helpers
│   │   ├── images.ts                   # Image processing logic
│   │   ├── search.ts                   # Search functionality
│   │   └── relations.ts                # Entity relationship resolver
│   └── styles/                         # Global styles
│
├── 📁 scripts/
│   ├── process-images.mjs              # Image pipeline (resize, compress)
│   ├── verify-content-integrity.mjs    # Data validation
│   ├── verify-relations-integrity.mjs  # Cross-reference validation
│   ├── verify-media-integrity.mjs      # Image file validation
│   ├── verify-seo-routes.mjs           # SEO metadata verification
│   ├── verify-tailwind-config.mjs      # CSS utility validation
│   └── media-sync.mjs                  # Media synchronization
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 4+
- Git 2.30+
- ~1.2GB disk space

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/hnk375561-lab/GTA6-ZONA.git
cd GTA6-ZONA

# 2. Install dependencies
npm install

# 3. Verify installation
npm run type-check

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### First Commands

```bash
# 🔍 Verify all content integrity
npm run verify:content

# 📊 Check SEO metadata
npm run verify:seo

# 🔗 Validate entity relationships
npm run verify:relations

# 📸 Process & optimize new images
npm run process-images:apply

# 🏗️ Build for production
npm run build && npm start
```

---

## 📚 Documentation

- `CONTRIBUTING.md` — Guidelines for adding or editing content
- `TROUBLESHOOTING.md` — Common issues and fixes
- `src/content/*/template.json` — Templates for each content type

---

## 🛠️ Development

Recommended workflow while developing locally:

```bash
npm run dev            # Start dev server with hot reload
npm run type-check     # TypeScript validation
npm run lint           # Lint the codebase
npm run verify:content # Validate content database
```

---

## 📦 Content Structure

Every content entry is a JSON file following a consistent schema. Example (simplified):

```json
{
  "slug": "example-vehicle",
  "title": "Example Vehicle",
  "description": "Short description of the entity.",
  "evidenceLevel": "A",
  "primarySource": "https://source-url.example",
  "image": "example-vehicle.webp"
}
```

### Adding New Content?

Follow these templates:

- 🚗 New Vehicle: copy `src/content/vehiculos/template.json`
- 👤 New Character: copy `src/content/personajes/template.json`
- 📍 New Location: copy `src/content/ubicaciones/template.json`
- 🏢 New Business: copy `src/content/negocios/template.json`

All content requires:
- ✅ Slug (lowercase, hyphenated)
- ✅ Title & description
- ✅ Evidence level (A/B/C/D)
- ✅ Primary source citation
- ✅ Image (WebP, 1600×900)

---

## 🔄 Workflows

### Adding a New Vehicle

```bash
# 1. Create JSON file
cat > src/content/vehiculos/new-vehicle.json << 'EOF'
{ "slug": "new-vehicle", "title": "New Vehicle", "evidenceLevel": "B" }
EOF

# 2. Add image
cp new-vehicle.webp public/images/entities/vehiculos/

# 3. Verify
npm run verify:content

# 4. Preview
npm run dev
```

### Processing New Images

```bash
# 1. Add images
cp *.jpg incoming-images/vehiculos/

# 2. Run pipeline
npm run process-images:apply

# 3. Check output
ls -lh public/images/entities/vehiculos/*.webp

# 4. Commit
git add public/images/entities/vehiculos/
git commit -m "✨ Add vehicle images"
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a branch (`git checkout -b feature/my-contribution`)
3. Follow the content templates above
4. Run `npm run verify:content` before opening a PR
5. Open a Pull Request describing your changes

See `CONTRIBUTING.md` for full guidelines.

---

## 📋 Roadmap

### Phase 1: Foundation ✅ (August 2026)
- [x] Core Next.js setup
- [x] Content database structure
- [x] Image pipeline
- [x] Initial vehicle catalog (57)
- [x] Verification scripts

### Phase 2: Expansion 🚀 (August–September 2026)
- [ ] Complete vehicle images (38 pending)
- [ ] Expand character database (20+ total)
- [ ] Add weapon catalog (25+)
- [ ] Map & district details
- [ ] Business/service directory

### Phase 3: Enhancement 🎯 (September–October 2026)
- [ ] Advanced search filters
- [ ] Community submission review flow

### Phase 4: Polish ✨ (October–November 2026)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Full mobile QA

---

## 🔗 Resources

- Official GTA VI announcements — Rockstar Games
- Repository issue tracker — for bugs and content requests

---

## ❓ FAQ

**Q: Can I use this content in my project?**
A: Yes, with proper attribution to Rockstar Games and this repository.

**Q: How do I add new content?**
A: See `CONTRIBUTING.md` for detailed guidelines.

**Q: How often is content updated?**
A: Continuously, as new official information is released.

**Q: Can I deploy this myself?**
A: Yes — fork the repo and deploy to Vercel (recommended).

**Q: Are there known issues?**
A: Check `TROUBLESHOOTING.md` or open an issue.

---

## 📜 License

This project documents publicly available information about Grand Theft Auto VI. All trademarks, characters, and official media belong to Rockstar Games / Take-Two Interactive. Original code and curated content in this repository are provided under the license specified in `LICENSE`.
