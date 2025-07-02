# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WLBJ (物流报价系统) is a logistics quote comparison system built with a modern full-stack architecture. The project is a complete refactor (v3.0.0) of a previous system, implementing a layered architecture pattern and modern development practices.

**Key Features:**
- B2B logistics quote management platform
- Multi-role system (users, providers, admins)
- Real-time quote comparison
- Data export capabilities
- Comprehensive admin management

## Development Commands

### Backend Development
```bash
# Start development server
npm run dev

# Production start
npm start

# Database operations
npm run migrate:latest          # Run latest migrations
npm run migrate:rollback        # Rollback last migration
npm run migrate:make <name>     # Create new migration
npm run db:reset                # Reset database completely

# Testing
npm test                        # All tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:e2e               # End-to-end tests only
npm run test:security          # Security tests only
npm run test:coverage          # Generate coverage reports
npm run test:ci                # CI pipeline tests

# Code Quality
npm run lint                   # Check code style
npm run lint:fix              # Auto-fix code style issues
npm run format                # Format code with Prettier
npm run quality:validate      # Full quality check (lint + format + test)

# Build and validation
npm run build                 # Quality check + tests
npm run validate:config       # Validate environment configuration
```

### Frontend Development (in frontend/ directory)
```bash
cd frontend

# Development
npm run dev                   # Start dev server (http://localhost:5173)
npm run build                 # Production build
npm run preview               # Preview production build

# Code Quality
npm run lint                  # ESLint check
npm run lint:fix             # Auto-fix ESLint issues
npm run format               # Format with Prettier
npm run type-check           # TypeScript type checking

# Testing
npm run test                 # Run tests with Vitest
npm run test:run            # Run tests once
npm run test:ui             # Test UI
```

### Deployment
```bash
# Quick start scripts
./dev.sh                     # Start development environment
./start.sh                   # Start with options (development/production)
./backend.sh                 # Backend only
./frontend.sh                # Frontend only
./docker.sh                  # Docker deployment

# Deployment scripts
./scripts/deploy.sh production blue-green v3.0.0
./scripts/validate-production.sh
```

## Architecture Overview

### Backend Architecture (Node.js + Express)

The backend follows a **layered architecture pattern**:

```
Controller Layer (HTTP) → Service Layer (Business Logic) → Repository Layer (Data Access) → Database (SQLite/PostgreSQL)
```

**Key Directories:**
- `src/controllers/` - HTTP request handling, parameter validation
- `src/services/` - Business logic, transaction management  
- `src/repositories/` - Data access, database operations
- `src/middleware/` - Authentication, validation, security, error handling
- `src/routes/` - API route definitions
- `src/config/` - Environment and database configuration
- `src/utils/` - Utility functions and helpers

**Database:**
- Development/Test: SQLite3 with optimized pragmas
- Production: Supports both SQLite3 and PostgreSQL
- Migrations managed with Knex.js
- Database files in `data/` directory

### Frontend Architecture (React + TypeScript + Vite)

Modern React 18 application with TypeScript:

```
Components → Services → API → Backend
```

**Key Directories:**
- `frontend/src/components/` - React components organized by domain
  - `ui/` - Reusable UI components (Button, Card, Tabs)
  - `auth/` - Authentication components
  - `user/` - User portal components
  - `provider/` - Provider portal components
  - `admin/` - Admin panel components
  - `layout/` - Layout and navigation components
- `frontend/src/services/` - API services and business logic
- `frontend/src/types/` - TypeScript type definitions
- `frontend/src/hooks/` - Custom React hooks
- `frontend/src/router/` - React Router configuration with protected routes

**Build System:**
- Vite for fast development and optimized builds
- Code splitting by domain (admin, user, provider, components)
- TypeScript for type safety
- Tailwind CSS for styling

## Authentication & Security

**JWT-based authentication:**
- Access tokens (15min expiry) + Refresh tokens (7 days)
- Role-based access control (user, provider, admin)
- Token refresh mechanism implemented
- Protected routes in both frontend and backend

**Security features:**
- Password complexity requirements with bcrypt
- Input validation with Joi/express-validator
- Rate limiting on API endpoints
- Security headers with helmet
- CORS configuration

## Testing Strategy

**Test pyramid implementation:**
- **Unit Tests**: Service and Repository layers, utilities
- **Integration Tests**: API endpoints, middleware, full request flows  
- **E2E Tests**: Complete application workflows
- **Security Tests**: Authentication, authorization, input validation

**Test Configuration:**
- Backend: Jest with multiple configs for different test types
- Frontend: Vitest with React Testing Library
- Coverage target: 70%+ (currently achieved)

## Database Schema

**Core entities:**
- `users` - User accounts with role-based access
- `orders` - Shipping orders with logistics details
- `quotes` - Provider quotes for orders
- `providers` - Logistics service providers
- `admin_config` - System configuration
- `auth_logs` - Authentication audit trail

**Key relationships:**
- Users create Orders
- Providers submit Quotes for Orders
- Admins manage all entities

## Environment Configuration

**Required environment variables:**
```bash
NODE_ENV=development|production|test
PORT=3000
JWT_SECRET=<strong-secret-key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DB_CLIENT=sqlite3|postgresql
DB_FILENAME=./data/logistics.db  # For SQLite
# OR for PostgreSQL:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wlbj
DB_USER=username
DB_PASSWORD=password
```

## Development Guidelines

### Code Style
- ESLint + Prettier enforced
- TypeScript strict mode enabled
- Async/await pattern preferred over promises
- Error handling with custom error classes
- Logging with Winston (structured logging)

### Git Workflow
- Feature branches for new development
- Commit message format enforced
- Pre-commit hooks run quality checks
- Quality gates: lint + format + tests must pass

### Performance Considerations
- Database queries optimized with proper indexing
- Connection pooling configured
- Frontend code splitting implemented
- Build-time optimizations with Vite
- Caching strategies in place

## Troubleshooting

**Common issues:**
- Port conflicts: Check if 3000 (backend) or 5173 (frontend) are in use
- Database locks: Stop all processes before migrations
- Permission issues: Ensure proper file permissions for uploads/ and data/
- Build failures: Run `npm run type-check` to verify TypeScript issues

**Debugging:**
- Backend logs in `logs/` directory
- Use `DEBUG=*` environment variable for verbose logging
- Frontend: React DevTools + browser developer tools
- Database: Check `data/` directory for SQLite files

## Deployment Notes

**Production readiness checklist:**
- Environment variables properly configured
- Database migrations applied
- Security headers enabled
- Rate limiting configured
- Logging properly set up
- Health check endpoints working (`/health`, `/health/db`)

**Supported deployment methods:**
- Direct deployment with PM2
- Docker containerization (recommended)
- Blue-green deployment with zero downtime

The system is production-ready with comprehensive monitoring, logging, and error handling capabilities.