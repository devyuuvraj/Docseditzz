<div align="center">

# 📄 DOCSEDITZ

**The all-in-one AI document workspace** — edit PDFs like a pro, convert anything to anything,
summarize with AI, chat with your documents, and share securely.

React · Vite · Tailwind CSS v4 · Framer Motion · Redux Toolkit · React Query · Fabric.js · PDF.js
Node.js · Express · MongoDB Atlas · Mongoose · Cloudinary · OpenAI · JWT · Google OAuth

</div>

---

## ✨ Features

| Area | What you get |
|---|---|
| **Advanced PDF Editor** | Draw, highlight, underline, strike, erase, text, sticky notes, shapes, arrows, images, signatures, watermarks. Move/resize/rotate/duplicate objects, layer ordering, undo/redo, zoom, per-page annotations, version history, flattened PDF export. |
| **Images → PDF** | Multi-upload, drag-and-drop reorder, rotate, compress, A4/Letter/Legal, portrait/landscape, margins, quality, page numbers, watermark. |
| **Word → PDF** | DOC, DOCX, XLS(X), PPT(X), HTML, TXT via LibreOffice (Docker-bundled) with a text-based fallback. |
| **PDF → Word** | Structured DOCX with headings/paragraphs/page breaks + OCR fallback for scanned PDFs. |
| **Pro PDF tools** | Merge, split, compress (3 levels), rotate, extract/delete/reorder pages, protect (AES), unlock, watermark, page numbers, header/footer, PDF→images, extract embedded images, extract text. |
| **OCR** | 16 languages via Tesseract — for images and scanned PDFs. |
| **Search in PDF** | Server-side full-text search with per-page matches and highlighted context. |
| **AI (OpenAI)** | Summaries (short/medium/detailed/bullets/chapter-wise), keywords/dates/numbers/people extraction, flashcards, quizzes, explain/rewrite/translate/grammar/simplify/expand, professional/academic/legal/medical tones, **Chat with PDF**. |
| **Image Studio** | Crop (aspect presets), rotate, flip, zoom, brightness, contrast, export PNG/JPG/WEBP. |
| **File manager** | Folders, favorites, trash + restore, rename, duplicate, search, sort, pagination, storage quota, chunked uploads for big files, download history, version history. |
| **Sharing** | Public/private links, password protection, expiry dates, QR codes, view counter, revoke. |
| **Auth** | JWT (access + rotating refresh cookie), Google OAuth, email OTP verification, forgot/reset password, role-based access. |
| **Admin panel** | KPIs, signup/activity charts, user management (roles, plans, deactivate), all documents, audit logs, subscriptions + MRR. |
| **UX** | Glassmorphism UI, dark/light mode, Framer Motion animations, loading skeletons, toasts, keyboard shortcuts, fully responsive. |

## 🗂 Project structure

```
docseditz/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── app/                # Redux store
│   │   ├── components/         # ui/, layout/, landing/, files/, tools/, admin/, upload/
│   │   ├── features/           # Redux slices (auth, theme)
│   │   ├── hooks/              # useToolJob, useDebounce, useKeyboardShortcuts
│   │   ├── lib/                # axios, pdf.js setup, utils
│   │   ├── pages/              # Landing, auth/, tools/, admin/, Dashboard, MyFiles…
│   │   └── services/           # API service modules
│   ├── Dockerfile
│   └── nginx.conf
├── server/                     # Express API (MVC)
│   ├── src/
│   │   ├── config/             # env, db, cloudinary
│   │   ├── controllers/        # auth, user, document, folder, tools, ai, admin…
│   │   ├── middleware/         # auth, validate, error, rateLimiter, upload
│   │   ├── models/             # User, Document, Folder, Activity, Subscription, ShareLink, Setting
│   │   ├── routes/             # /api/v1/*
│   │   ├── services/           # pdf, convert, ocr, ai, text, email, storage
│   │   ├── validators/         # express-validator chains
│   │   ├── utils/              # ApiError, tokens, asyncHandler
│   │   └── scripts/            # seedAdmin
│   └── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md
```

## 🚀 Quick start (local development)

### Prerequisites
- **Node.js 18+**
- A **MongoDB Atlas** cluster (or local MongoDB)
- A **Cloudinary** account (free tier is fine)
- An **OpenAI API key** (for AI features)
- *(Optional)* **LibreOffice** installed locally for Office→PDF conversion
  (`winget install TheDocumentFoundation.LibreOffice` / `brew install libreoffice` / `apt install libreoffice`).
  Not needed if you run via Docker.

### 1. Clone & install

```bash
git clone <your-repo-url> docseditz
cd docseditz
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# Backend
cp server/.env.example server/.env      # then fill in values

# Frontend
cp client/.env.example client/.env      # set VITE_GOOGLE_CLIENT_ID
```

Key backend variables (see `server/.env.example` for all):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (OAuth 2.0 Web client) |
| `SMTP_HOST/PORT/USER/PASS` | SMTP for OTP & reset emails (Gmail app password, Resend, Mailtrap…) |
| `CLOUDINARY_*` | From your Cloudinary dashboard |
| `OPENAI_API_KEY` | From platform.openai.com |

### 3. Run

```bash
# Terminal 1 — API on :5000
cd server && npm run dev

# Terminal 2 — frontend on :5173 (proxies /api to :5000)
cd client && npm run dev
```

Open **http://localhost:5173** 🎉

### 4. Create an admin account

```bash
cd server
npm run seed:admin -- admin@docseditz.com StrongPass123 "Admin"
```

Log in with that account and the **Admin Panel** appears in the sidebar.

## 🐳 Docker

Everything (API + LibreOffice + frontend + MongoDB) in one command:

```bash
cp server/.env.example server/.env   # fill in Cloudinary/OpenAI/SMTP/Google/JWT values
docker compose up --build
```

- Frontend: **http://localhost:8080**
- API: **http://localhost:5000/api/v1/health**
- Uses the bundled MongoDB container by default; set `MONGODB_URI` in your shell or
  `server/.env` to use Atlas instead.

## 🔌 API overview (`/api/v1`)

| Group | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `verify-otp`, `resend-otp`, `login`, `google`, `forgot-password`, `reset-password`, `refresh`, `logout`, `GET /auth/me` |
| **Users** | `PATCH /users/me`, `me/password`, `me/preferences`, `GET me/storage`, `me/subscription`, `POST me/subscription` |
| **Documents** | CRUD + `upload`, `recent`, `download`, `duplicate`, `restore`, `permanent`, `version`, `restore-version`, `trash/empty` |
| **Uploads** | Chunked: `POST /uploads/init`, `/chunk`, `/complete` |
| **Folders** | `GET/POST /folders`, `PATCH/DELETE /folders/:id` |
| **Share** | `POST /share`, `GET /share/mine`, `DELETE /share/:id`, public `POST /share/:token/access`, `/download` |
| **Tools** | `images-to-pdf`, `convert-to-pdf`, `pdf-to-word`, `process-image`, `merge`, `split`, `compress`, `rotate`, `extract-pages`, `delete-pages`, `reorder-pages`, `protect`, `unlock`, `watermark`, `page-numbers`, `header-footer`, `pdf-to-images`, `extract-images`, `extract-text`, `ocr`, `search`, `txt-to-pdf`, `html-to-pdf` |
| **AI** | `summarize`, `insights`, `flashcards`, `quiz`, `transform`, `chat` |
| **Admin** | `stats`, `users`, `documents`, `logs`, `subscriptions` |
| **Activities** | `GET /activities`, `/activities/downloads` |

All endpoints return `{ success, message?, data? }`; errors include field-level `details`.

## 🔐 Security

- Helmet, CORS allow-list, `express-mongo-sanitize`
- Rate limiting: global + stricter limits on auth, OTP, AI and tool endpoints
- bcrypt (cost 12) password hashing, short-lived JWT access tokens + httpOnly rotating refresh cookie
- Token versioning invalidates sessions on password change/deactivation
- express-validator on every input, MIME allow-list + size caps on uploads
- No account enumeration on forgot-password; OTP attempt caps

## ⚡ Performance

- Route-level code splitting (`React.lazy`) + vendor chunking (pdf.js, fabric, framer-motion)
- React Query caching, pagination everywhere, debounced search
- gzip compression (API + nginx), long-cache immutable assets
- Loading skeletons for all data views; chunked uploads for large files

## 🧪 Default plans

| Plan | Price | Storage | AI/day |
|---|---|---|---|
| Free | $0 | 500MB | 10 |
| Pro | $9/mo | 10GB | 200 |
| Business | $29/mo | 50GB | 1000 |

Plan switching is wired end-to-end (models, API, UI). Hook up Stripe/Razorpay in
`server/src/controllers/user.controller.js → changePlan` when you're ready to charge.

## 📦 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step guides (Render/Railway/VPS + Vercel/Netlify, Atlas, Google OAuth setup, production checklist).

## 📄 License

MIT — build something great.
