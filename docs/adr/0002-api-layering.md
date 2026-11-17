# 0002. API layering and auth

Status: accepted (structure revised to layer-first folders)

## Decision

The API is organised by layer, one folder each, with one job per file. A feature adds one file to each folder, named alike (`Routes/auth.ts`, `Controllers/auth.ts`, `Services/auth.ts`).

```
Backend/src/
  Configs/       env.ts (validated environment), db.ts (Mongo connection). Future: cloudinary.ts
  Models/        Mongoose schemas only
  Repositories/  Data access. Return plain records, never Mongoose documents
  Services/      Business rules. No Express types, no Mongoose
  Controllers/   HTTP only: read the request, call a service, shape the response
  Routes/        URL wiring. index.ts mounts everything under /api/v1
  Middlewares/   auth, validate, error, rateLimit
  Utils/         errors (AppError), asyncHandler, logger
  Types.ts       Shared server types (UserRecord, SessionRecord, AuthResult ...)
  Tests/         Supertest and unit tests
  app.ts         Builds the Express app (no listen, so tests can import it)
  server.ts      Connects the database, listens, handles shutdown
```

Dependency direction is one way: Routes, then Controllers, then Services, then Repositories, then Models. A lower layer never imports a higher one. Input is validated with zod schemas shared from `@selah/domain`, so the browser and the API agree on rules.

## Auth

Bcrypt password hashes, 15 minute JWT access tokens, and opaque rotating refresh tokens in an httpOnly cookie. Only the SHA-256 of a refresh token is stored. Each sign in has a token family. Presenting a token that was already used revokes the whole family, which contains theft of a refresh token. Login runs a dummy hash comparison for unknown emails so response time does not reveal which emails exist.

## Consequences

Services are unit testable without HTTP or a database. Swapping Mongo for something else touches Repositories and Models only.
