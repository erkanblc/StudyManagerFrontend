# Study Manager — Architecture UML

Architecture diagrams for the **Study Manager** frontend (`StudyManagerFrontend`) and its integration with the Spring Boot backend.

Related docs: [README (EN)](README.md) · [README (TR)](README_TR.md) · [README (DE)](README_DE.md)

Diagrams use [Mermaid](https://mermaid.js.org/) (renders on GitHub / many Markdown viewers). PlantUML-style equivalents are noted where helpful.

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Component Diagram](#2-component-diagram)
3. [Frontend Layer Structure](#3-frontend-layer-structure)
4. [Routing & Access Control](#4-routing--access-control)
5. [Sequence: Login](#5-sequence-login)
6. [Sequence: Token Refresh](#6-sequence-token-refresh)
7. [Sequence: Study Timer Session](#7-sequence-study-timer-session)
8. [Sequence: Plan → Calendar](#8-sequence-plan--calendar)
9. [Domain Model (Frontend View)](#9-domain-model-frontend-view)
10. [Deployment](#10-deployment)
11. [API Module Map](#11-api-module-map)

---

## 1. System Context

```mermaid
C4Context
  title System Context — Study Manager

  Person(student, "Student", "Sets goals, plans, tracks study time")
  Person(admin, "Administrator", "Manages users, roles, approvals, settings")

  System_Boundary(sm, "Study Manager") {
    System(fe, "StudyManagerFrontend", "React 19 + Vite + MUI SPA")
    System(be, "StudyManagerBackend", "Spring Boot REST API + JWT")
  }

  SystemDb(db, "MySQL 8", "study_manager_db")

  Rel(student, fe, "Uses via browser")
  Rel(admin, fe, "Uses via browser")
  Rel(fe, be, "HTTPS / HTTP JSON", "/api/*")
  Rel(be, db, "JDBC / JPA")
```

If C4 rendering is unavailable, use this equivalent:

```mermaid
flowchart TB
  Student([Student])
  Admin([Administrator])
  FE[StudyManagerFrontend<br/>React + Vite + MUI]
  BE[StudyManagerBackend<br/>Spring Boot + JWT]
  DB[(MySQL 8)]

  Student --> FE
  Admin --> FE
  FE -->|"/api/*"| BE
  BE --> DB
```

---

## 2. Component Diagram

```mermaid
flowchart TB
  subgraph Browser["Browser"]
    subgraph FE["StudyManagerFrontend"]
      Pages["pages/<br/>Student + Admin"]
      Comp["components/<br/>Layout, Dialogs, Calendar"]
      Ctx["context/<br/>Auth · Data · Notification"]
      Hooks["hooks/<br/>useStudySessions · usePlanSessions · useMilestones"]
      ApiMod["api/<br/>auth · sessions · goals · …"]
      Utils["utils/<br/>authStorage · calendar · roles"]
      Client["api/client.js<br/>Axios + refresh interceptor"]
    end
  end

  subgraph Server["Backend Host"]
    BE["Spring Boot Controllers / Services / Repositories"]
    DB[(MySQL)]
  end

  Pages --> Comp
  Pages --> Ctx
  Pages --> Hooks
  Comp --> Ctx
  Hooks --> ApiMod
  Ctx --> ApiMod
  Ctx --> Utils
  ApiMod --> Client
  Client -->|"Vite proxy :5173 → :8080"| BE
  BE --> DB
```

### PlantUML equivalent (optional)

```plantuml
@startuml
skinparam componentStyle rectangle

package "Frontend" {
  [Pages] as Pages
  [Components] as Comp
  [Contexts] as Ctx
  [Hooks] as Hooks
  [API Modules] as Api
  [Axios Client] as Client
}

package "Backend" {
  [Controllers] as Ctrl
  [Services] as Svc
  [Repositories] as Repo
  database "MySQL" as DB
}

Pages --> Comp
Pages --> Ctx
Pages --> Hooks
Hooks --> Api
Ctx --> Api
Api --> Client
Client --> Ctrl : /api/*
Ctrl --> Svc
Svc --> Repo
Repo --> DB
@enduml
```

---

## 3. Frontend Layer Structure

```mermaid
flowchart TD
  main["main.jsx<br/>Theme · Router · Providers"]
  app["App.jsx<br/>Route tree"]

  subgraph providers ["Providers"]
    Auth["AuthProvider"]
    Data["DataProvider"]
    Notif["NotificationProvider<br/>(student routes)"]
  end

  subgraph guards ["Route Guards"]
    PR["ProtectedRoute"]
    AR["AdminRoute"]
  end

  subgraph layouts ["Layouts"]
    L["Layout"]
    AL["AdminLayout"]
  end

  main --> Auth --> Data --> app
  app --> PR --> Notif --> L
  app --> AR --> AL
```

Provider order (outer → inner): `BrowserRouter` → `ThemeProvider` → `AuthProvider` → `DataProvider` → `App`.

---

## 4. Routing & Access Control

```mermaid
stateDiagram-v2
  [*] --> Public: /login, /register

  Public --> CheckAuth: submit credentials
  CheckAuth --> StudentApp: roles include STUDENT (or non-admin)
  CheckAuth --> AdminApp: roles include ADMIN
  CheckAuth --> Public: failure

  StudentApp --> Dashboard: /
  StudentApp --> Goals: /goals
  StudentApp --> SixMonth: /six-month-plan
  StudentApp --> Monthly: /monthly-plan
  StudentApp --> Planning: /planning
  StudentApp --> Timer: /timer
  StudentApp --> History: /study-history
  StudentApp --> Progress: /progress

  AdminApp --> AdminDash: /admin
  AdminApp --> Users: /admin/users
  AdminApp --> Roles: /admin/roles
  AdminApp --> AdminGoals: /admin/goals
  AdminApp --> Settings: /admin/settings
  AdminApp --> LoginHist: /admin/login-history
  AdminApp --> Approvals: /admin/approvals
```

| Guard | File | Behavior |
|-------|------|----------|
| `ProtectedRoute` | `components/ProtectedRoute.jsx` | Requires authenticated user; non-admins use student shell |
| `AdminRoute` | `components/AdminRoute.jsx` | Requires `ADMIN` role |

---

## 5. Sequence: Login

```mermaid
sequenceDiagram
  actor U as User
  participant LP as LoginPage
  participant AC as AuthContext
  participant API as authApi / client
  participant BE as Backend /api/auth
  participant LS as localStorage

  U->>LP: email + password
  LP->>AC: login(email, password)
  AC->>API: POST /api/auth/login
  API->>BE: credentials
  BE-->>API: token, refreshToken, roles, …
  API-->>AC: AuthResponse
  AC->>LS: writeAuthUser(lm_auth_user)
  AC-->>LP: { success, isAdmin }
  alt isAdmin
    LP-->>U: navigate /admin
  else student
    LP-->>U: navigate /
  end
```

---

## 6. Sequence: Token Refresh

```mermaid
sequenceDiagram
  participant Page as Any authenticated page
  participant Client as api/client.js
  participant BE as Backend
  participant LS as localStorage

  Page->>Client: request with Bearer access token
  Client->>BE: /api/...
  BE-->>Client: 401 Unauthorized
  Client->>LS: getRefreshToken()
  Client->>BE: POST /api/auth/refresh
  alt refresh OK
    BE-->>Client: new token (+ refreshToken)
    Client->>LS: patchAuthTokens(...)
    Client->>BE: retry original request
    BE-->>Client: 200 + payload
    Client-->>Page: success
  else refresh fail
    Client->>LS: clearAuthStorage()
    Client-->>Page: redirect /login
  end
```

---

## 7. Sequence: Study Timer Session

```mermaid
sequenceDiagram
  actor S as Student
  participant Timer as StudyTimerPage
  participant Hook as useStudySessions
  participant API as sessionsApi
  participant BE as /api/sessions
  participant Stor as timerStorage

  S->>Timer: Start timer (optional plan)
  Timer->>Stor: persist heartbeat / interrupted state
  loop while running
    Timer->>Stor: heartbeat update
  end
  S->>Timer: Stop / complete
  Timer->>Hook: create / update session
  Hook->>API: POST/PUT /api/sessions
  API->>BE: session payload + JWT
  BE-->>API: saved StudySession
  API-->>Hook: session
  Hook-->>Timer: UI update (history / progress)
```

Interrupted sessions can be recovered via `InterruptedSessionDialog` using data from `timerStorage`.

---

## 8. Sequence: Plan → Calendar

```mermaid
sequenceDiagram
  actor S as Student
  participant Plan as PlanningPage
  participant Hook as usePlanSessions
  participant API as planSessionsApi
  participant BE as /api/plan-sessions
  participant Cal6 as SixMonthPlanPage
  participant CalM as MonthlyPlanPage

  S->>Plan: Create / edit plan
  Plan->>Hook: savePlanSession(...)
  Hook->>API: POST/PUT /api/plan-sessions
  API->>BE: PlanSession DTO
  BE-->>API: saved plan
  API-->>Hook: plan
  Note over Cal6,CalM: Same API data, different views
  Cal6->>Hook: load plans for range / goal filter
  CalM->>Hook: load plans for month
  Hook->>API: GET /api/plan-sessions
  API->>BE: query
  BE-->>Cal6: plans → calendar + Plans tab
  BE-->>CalM: plans → day cells
```

Milestones with due dates are loaded via `milestonesApi` / `useMilestones` and rendered as trophy markers on both calendars.

---

## 9. Domain Model (Frontend View)

Conceptual entities as consumed by the SPA (IDs and fields may mirror backend DTOs):

```mermaid
erDiagram
  USER ||--o{ GOAL : owns
  USER ||--o{ STUDY_SESSION : logs
  USER ||--o{ PLAN_SESSION : plans
  USER ||--o{ MILESTONE : has
  GOAL ||--o{ MILESTONE : "interim (max 5)"
  GOAL ||--o{ PLAN_SESSION : "optional link"
  PLAN_SESSION ||--o| STUDY_SESSION : "may start timer"

  USER {
    string id
    string email
    string[] roles
    string token
    string refreshToken
  }

  GOAL {
    string id
    string title
    number targetHours
    string status
    date startDate
    date endDate
  }

  MILESTONE {
    string id
    string title
    date dueDate
    boolean completed
    string goalId
  }

  PLAN_SESSION {
    string id
    string title
    datetime plannedStart
    datetime plannedEnd
    string status
    string goalId
  }

  STUDY_SESSION {
    string id
    datetime startedAt
    datetime endedAt
    number durationMinutes
    string notes
    string planSessionId
  }
```

---

## 10. Deployment

### Local development

```mermaid
flowchart LR
  subgraph DevMachine["Developer machine"]
    Vite["Vite Dev Server<br/>:5173"]
    Proxy["Proxy /api → 127.0.0.1:8080"]
    Spring["Spring Boot<br/>:8080"]
    MySQL["MySQL<br/>:3306"]
  end

  Browser["Browser"] --> Vite
  Vite --> Proxy --> Spring --> MySQL
```

### Production (typical)

```mermaid
flowchart LR
  Browser --> CDN["Static host / CDN<br/>built dist/"]
  Browser --> RP["Reverse proxy<br/>Nginx / API Gateway"]
  RP -->|"/api/*"| Spring["Spring Boot"]
  Spring --> MySQL[(MySQL)]
  CDN -.->|"same origin or CORS"| RP
```

Build artifact: `npm run build` → `dist/`.

---

## 11. API Module Map

| Frontend module | Primary backend prefix | Used by |
|-----------------|------------------------|---------|
| `api/authApi.js` | `/api/auth` | AuthContext, login/register |
| `api/sessionsApi.js` | `/api/sessions` | Timer, Study History, Progress |
| `api/goalsApi.js` | `/api/goals` | Goals, Dashboard, Progress |
| `api/milestonesApi.js` | `/api/milestones` | Monthly / 6-Month calendars |
| `api/planSessionsApi.js` | `/api/plan-sessions` | Planning, calendars |
| `api/settingsApi.js` | `/api/settings` | Timer limits, public settings |
| `api/adminApi.js` | `/api/admin/*` | Admin pages |

Shared HTTP behavior lives in `api/client.js` (base URL `''`, Bearer auth, 401 → refresh → retry).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| Context | Global React state / providers |
| Hook | Data-fetching / mutation helpers |
| Guard | Route-level authorization |
| Proxy | Dev-only Vite forward of `/api` |

For OpenAPI details, run the backend and open:

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
