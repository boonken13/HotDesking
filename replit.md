# HotDesk - Office Desk Booking System

## Overview

HotDesk is a full-stack office desk booking application that allows employees to reserve hot desks through an interactive floor plan. The system supports daily bookings with AM/PM time slots, long-term reservations, and provides admin capabilities for seat and booking management. Built with React frontend, Express backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Component Structure**: Feature-based organization with shared UI components in `client/src/components/ui/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api/` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared types, `shared/models/auth.ts` for auth models
- **Migration Strategy**: Drizzle Kit with `db:push` command for schema synchronization

### Key Design Patterns
- **Shared Types**: Schema definitions in `/shared/` are used by both frontend and backend
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Auth Separation**: Authentication logic isolated in `server/replit_integrations/auth/`
- **Role-Based Access**: User roles (employee/admin) stored separately from user records

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend hot reloading
- **Production**: esbuild bundles server code, Vite builds client to `dist/public`
- **Script**: Custom build script in `script/build.ts` handles full production build

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Required Environment Variables**: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`

### UI Components
- **shadcn/ui**: Comprehensive component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled component primitives
- **Lucide React**: Icon library

### Data Handling
- **Zod**: Schema validation for API requests
- **drizzle-zod**: Generates Zod schemas from Drizzle table definitions
- **date-fns**: Date manipulation utilities

### Session Storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Sessions Table**: Required `sessions` table managed by Drizzle schema