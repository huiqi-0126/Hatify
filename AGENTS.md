# Hatify AI Studio Agent Guidelines

Welcome to the Hatify repository. This project is an AI-powered custom hat design studio built with React, Vite, Express, and SQLite.

## 🛠 Project Infrastructure

### Build & Development Commands
- **Development**: `npm run dev` (Runs `tsx server.ts` which handles both the Express API and Vite middleware)
- **Build**: `npm run build` (Compiles the frontend into `dist/`)
- **Lint**: `npm run lint` (Currently runs `tsc --noEmit` for type checking)
- **Clean**: `npm run clean` (Removes `dist/`)

### Test Commands
> [!NOTE]
> Testing is not currently set up in this repository. If adding tests, please use **Vitest** for frontend components to match the Vite ecosystem.

## 🎨 Code Style & Conventions

### Architecture
- **Monorepo-lite**: Frontend and Backend coexist in the same root.
- **Frontend**: Located in `src/`. Uses React 19 and functional components.
- **Backend**: `server.ts` is the entry point. Uses Express and `better-sqlite3`.
- **Styling**: Tailwind CSS 4.0. Components use utility classes directly.
- **State Management**: React `useState`/`useEffect`. No external store (Redux/Zustand) is currently used.

### TypeScript Usage
- **Strict Mode**: Maintain full type safety.
- **No-Gos**: Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- **Definition Style**: Prefer `interface` for object shapes and `type` for unions/aliases.

- **Path Aliases**: `@/*` is mapped to `./*` (root directory) in `tsconfig.json` and `vite.config.ts`.
### Naming Conventions
- **Components**: PascalCase (e.g., `PreviewSection.tsx`).
- **Files/Variables/Functions**: camelCase (e.g., `useTranslation.ts`, `setView`).
- **CSS Classes**: Tailwind utility classes (avoid custom CSS where possible).

### Internationalization (i18n)
- **Tool**: `i18next` with `react-i18next`.
- **Configuration**: `src/i18n.ts`.
- **Usage**: Always use the `useTranslation` hook. Do not hardcode strings in components.
- **Structure**: All translations are currently embedded in `src/i18n.ts` under the `resources` object.

### Error Handling
- **Frontend**: Use try-catch blocks for async operations (e.g., API calls). Display user-friendly errors using state.
- **Backend**: Use try-catch in route handlers and return appropriate HTTP status codes (400, 500) with JSON error messages.

## 🚀 Deployment & Environment
- **Environment Variables**: Managed via `.env` files. `GEMINI_API_KEY` is required for AI features and is injected into the frontend via Vite's `define` config.
- **Database**: `inquiries.db` (SQLite) is used for storing customer inquiries.
- **3D Previews**: Interfaces with an external AI API (`ai.dreambrand.studio`).

## 🤖 Agent-Specific Rules
- When adding new components, place them in `src/components/`.
- When adding new translations, update `src/i18n.ts` and ensure all supported languages are updated (en, zh, zh-HK, ja, ko, es, fr, de).
- Always run `npm run lint` before completing a task to ensure type correctness.
