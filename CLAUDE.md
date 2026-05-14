# CLAUDE.md — Wayside Garage POS

> Project-level configuration for Claude Code.
> Stack: .NET 9 Web API + Entity Framework Core 9 + SQLite + React 19 + Vite

---

## Project Overview

Point-of-sale system for Wayside Garage and Motor Spares.
Handles sales, inventory, customer returns, supplier returns, and purchase orders.

---

## Model Routing

| Task | Model |
|------|-------|
| New module design, architecture decisions | `opus` |
| Writing controllers, services | `sonnet` |
| Writing React components and pages | `sonnet` |
| EF Core migrations, DbContext changes | `sonnet` |
| Grepping for a symbol, checking file existence | `haiku` |

---

## Color Palette (match the logo — do not deviate)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-base` | `#08090f` | Page background |
| `--bg-surface` | `#0f1420` | Cards, panels |
| `--bg-elevated` | `#162035` | Modals, dropdowns |
| `--accent-primary` | `#1e6fd9` | Buttons, active states |
| `--accent-light` | `#4fa3e8` | Hover, highlights |
| `--text-primary` | `#e8edf5` | Main text |
| `--text-muted` | `#7a8fa8` | Labels, secondary |
| `--border` | `#1e3554` | Borders, dividers |
| `--success` | `#1a7a4a` | Confirmed/success states |
| `--danger` | `#8b2020` | Errors, low stock |
| `--warning` | `#7a5a10` | Warnings, credit alerts |

---

## Project Structure

```
wayside-garage-pos/
  WaysideGarage.API/          # ASP.NET Core 9 Web API
    Controllers/
    Program.cs
    appsettings.json              # Structure only — no secrets
    appsettings.Development.json  # NEVER committed — holds Jwt:Key
  WaysideGarage.Core/         # Models, DbContext, business logic
    Data/
      AppDbContext.cs
    Models/                   # One file per entity
  WaysideGarage.Client/       # React 19 SPA
    src/
      pages/                  # One folder per page, prefixed CSS
      components/             # Shared components
      api/
        client.js             # Central fetch wrapper — all HTTP goes here
```

---

## Build Phases (build in order, do not skip ahead)

```
Part 1 — Foundation          ✅ Done
Part 2 — Sales Terminal      ← Current
Part 3 — Returns
Part 4 — Purchase Orders
Part 5 — Full Inventory
Part 6 — Customers & Accounts
Part 7 — Reports & Dashboard
```

---

## Backend Standards

### Security — Non-Negotiable

- No secrets in source. `Jwt:Key` goes in `appsettings.Development.json` only (gitignored).
- Validate all input on every public endpoint before touching the DbContext.
- Use `SqlParameter` objects for any raw SQL — never string interpolation.
- Auth endpoints must enforce JWT expiry. Token contains UserId, Username, Role.

### EF Core

- Single `AppDbContext` — all entities in one context.
- Migrations named descriptively: `dotnet ef migrations add AddCustomerCreditLimit`
- Seed data lives in `OnModelCreating`, not in controllers or startup code.
- Never expose EF exception messages to the client.

### API Response Shape

All endpoints return:
```csharp
// Success
{ "success": true, "data": <payload> }

// Error
{ "success": false, "error": "<message>" }
```

### Stock Mutation Rules

- Any operation that changes `Part.StockQty` (sale, return, PO receive) must be a single
  transaction. Never update stock outside of a `using var tx = db.Database.BeginTransaction()`.
- Stock cannot go below zero. Check before committing.

### Return Rules

- Customer return: validate the original `SaleLineId` belongs to the customer's sale.
  Check qty returned does not exceed qty sold minus qty already returned on that line.
- Supplier return: validate `Part.StockQty >= qty` before decrementing.

### Credit Warning Rule

- At checkout, if customer `IsTradeAccount` and `Balance + saleTotal > CreditLimit`,
  return a `creditWarning: true` flag in the response. The cashier must confirm to proceed.
  Do not block the sale automatically.

---

## Frontend Standards

### HTTP

- All API calls go through `src/api/client.js`.
- Reads JWT from `localStorage`, attaches `Authorization: Bearer <token>`.
- On 401: clear token, redirect to `/login`.
- Never log the token to the console.

### Styling

- Use the colour tokens defined above — no hardcoded hex values in components.
- BEM-prefixed class names per page (`pos-`, `inv-`, `ret-`, `po-`, `cust-`, `rep-`).
- No inline styles except for truly dynamic values.

### Icons

- Use `lucide-react` only. Do not add Font Awesome or Hero Icons.

### State pattern for every data-fetching component

```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

- Loading → spinner, never blank screen.
- Error → user-readable message, full error to `console.error` only.
- Empty state is distinct from error state.

### No `console.log` in committed code.

---

## Commit Rules

- One commit per logical unit (endpoint, component, migration, bug fix).
- Never commit a broken build. Run `dotnet build` before committing backend changes.
- Never commit `appsettings.Development.json` or any `.env` file.

### Commit Message Format

```
<type>(<scope>): <short description>
```

Types: `feat`, `fix`, `refactor`, `chore`, `migration`
Scopes: `api`, `core`, `client`, `db`, `auth`, `pos`, `returns`, `inventory`

---

## What Claude Must Never Do

- Commit with a broken build.
- Store `Jwt:Key` in `appsettings.json` (committed file).
- Mutate `Part.StockQty` outside a database transaction.
- Allow stock to go negative.
- Return raw exception messages to the client.
- Add npm packages without noting them in the commit body.
- Add global CSS without explicit request.
- Leave `console.log` in committed code.
- Use hardcoded hex colours — always use the CSS token variables.
