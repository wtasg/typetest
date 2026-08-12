# Security Audit & Vulnerability Remediation Plan

Target Application: [typetest](github.com/wtasg/typetest) (Go Backend & SolidJS Client)  
Date: August 12, 2026  
Scope: Server API endpoints ([server/](/server)), Client application ([client/](/client)), Data persistence & CORS configuration.

---

## 1. Overview & Security Assessment

A security evaluation of the Typetest codebase identified several vulnerabilities across CORS configuration, resource consumption (DoS vectors), input validation, database connection parameters, and client-side metric trust.

This audit plan documents all identified vulnerabilities, their severity ratings, affected code paths, and explicit technical remediation steps.

---

## 2. Vulnerability Findings Matrix

| ID | Title | Severity | CWE | Target File | Status |
| :--- | :--- | :---: | :---: | :--- | :---: |
| SEC-01 | Unrestricted CORS Policy (`Access-Control-Allow-Origin: *`) | High | CWE-942 | [router.go:11](/server/internal/api/router.go#L11) | Open |
| SEC-02 | Unbounded HTTP Request Body Size (OOM DoS) | High | CWE-400 | [health.go:28](/server/internal/api/health.go#L28) | Open |
| SEC-03 | Type-Unsafe Manual JSON Parsing in Backend | Medium | CWE-20 | [runs.go:104-125](/server/internal/api/runs.go#L104-L125) | Open |
| SEC-04 | Complete Lack of API Authentication & Access Control | Medium | CWE-306 | [router.go:23-34](/server/internal/api/router.go#L23-L34) | Open |
| SEC-05 | Implicit Trust of Client-Generated WPM & Keystroke Metrics | Medium | CWE-602 | [engine.ts](/client/src/typing/engine.ts) | Open |
| SEC-06 | Hardcoded Plaintext DB Connection (`sslmode=disable`) | Low | CWE-319 | [main.go:40](/server/cmd/server/main.go#L40) | Open |
| SEC-07 | LocalStorage Quota Exhaustion Risk | Low | CWE-400 | [localStorage.ts:33](/client/src/storage/localStorage.ts#L33) | Open |

---

## 3. Vulnerability Details & Remediation Specifications

### 3.1 SEC-01: Unrestricted CORS Policy (`Access-Control-Allow-Origin: *`)

- Location: [server/internal/api/router.go:11](/server/internal/api/router.go#L11)
- Vulnerability: The backend CORS middleware sets wildcard origins (`*`) for all API requests.
- Impact: Any malicious website visited by a user can send cross-origin requests to `http://localhost:30001` to read stored private source code, exfiltrate typing history, or issue `DELETE /api/sources/{id}`.
- Remediation:
  Replace wildcard CORS headers with origin validation against configured environment variables:

  ```go
  func cors(next http.Handler) http.Handler {
      return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
          allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
          if allowedOrigin == "" {
              allowedOrigin = "http://localhost:30002"
          }

          origin := r.Header.Get("Origin")
          if origin == allowedOrigin {
              w.Header().Set("Access-Control-Allow-Origin", origin)
          }

          w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
          w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
          if r.Method == http.MethodOptions {
              w.WriteHeader(http.StatusNoContent)
              return
          }
          next.ServeHTTP(w, r)
      })
  }
  ```

---

### 3.2 SEC-02: Unbounded HTTP Request Body Size (OOM DoS)

- Location: [server/internal/api/health.go:27-29](/server/internal/api/health.go#L27-L29)
- Vulnerability: `readJSON` reads `r.Body` directly via `json.NewDecoder(r.Body).Decode(v)` without limiting payload size.
- Impact: Attacker can issue multi-GB POST payloads to `/api/sources` or `/api/runs`, causing heap memory exhaustion and crashing the Go server process.
- Remediation: Enforce `http.MaxBytesReader` inside `readJSON`:

  ```go
  func readJSON(w http.ResponseWriter, r *http.Request, v any) error {
      r.Body = http.MaxBytesReader(w, r.Body, 5<<20) // 5MB limit
      return json.NewDecoder(r.Body).Decode(v)
  }
  ```

---

### 3.3 SEC-03: Type-Unsafe Manual JSON Parsing in Backend

- Location: [server/internal/api/runs.go:94-135](/server/internal/api/runs.go#L94-L135)
- Vulnerability: `createRun` manual parses `map[string]json.RawMessage` using string casts and `strings.Trim(...,`"`)`.
- Impact: If JSON objects/arrays are passed in string fields (e.g. `{"id": {"nested": 1}}`), string slicing produces invalid SQL values resulting in database driver errors or server panics.
- Remediation: Replace manual string parsing with Go struct unmarshaling using `incomingRun`:

  ```go
  var run incomingRun
  if err := readJSON(w, r, &run); err != nil {
      http.Error(w, "invalid request body", http.StatusBadRequest)
      return
  }
  ```

---

### 3.4 SEC-04: Complete Lack of API Authentication & Access Control

- Location: [server/internal/api/router.go:23-34](/server/internal/api/router.go#L23-L34)
- Vulnerability: API routes have no session validation or authorization checks.
- Impact: Any unauthenticated client can read, create, or delete resources.
- Remediation: Add authentication middleware (JWT / API Tokens) for mutation endpoints (`POST`, `DELETE`).

---

### 3.5 SEC-05: Implicit Trust of Client-Generated WPM & Keystroke Metrics

- Location: [client/src/state/typing.ts](/client/src/state/typing.ts) & [server/internal/api/runs.go](/server/internal/api/runs.go)
- Vulnerability: Server accepts client-calculated WPM metrics without server-side validation.
- Impact: Attackers can forge 1000+ WPM records into database reports via HTTP POST.
- Remediation: Validate submitted `events` timestamps and recalculate WPM/accuracy metrics on the server prior to database insertion.

---

### 3.6 SEC-06: Hardcoded Plaintext Database Connection (`sslmode=disable`)

- Location: [server/cmd/server/main.go:40](/server/cmd/server/main.go#L40)
- Vulnerability: `sslmode=disable` is hardcoded into `getDSN()`.
- Impact: Credentials and query data are transmitted in cleartext.
- Remediation: Support `DB_SSLMODE` environment variable:

  ```go
  sslmode := os.Getenv("DB_SSLMODE")
  if sslmode == "" {
      sslmode = "disable" // or "require" for production
  }
  ```

---

### 3.7 SEC-07: LocalStorage Quota Exhaustion Risk

- Location: [client/src/storage/localStorage.ts:33](/client/src/storage/localStorage.ts#L33)
- Vulnerability: Capping run summaries at 500 items in `localStorage` can hit browser 5MB storage limits.
- Impact: Silent write failures when quota is exceeded.
- Remediation: Cap `runSummaries` at 100 items or store summaries in IndexedDB.

---

## 4. Implementation Checklist

- [x] Update `router.go` to enforce restricted CORS origins via `ALLOWED_ORIGIN` (and restrict default fallback to localhost origins).
- [x] Add `http.MaxBytesReader` (5MB limit) to `readJSON` in `health.go` and handlers.
- [x] Refactor `createRun` in `runs.go` to unmarshal into strongly typed `incomingRun` struct.
- [x] Add `DB_SSLMODE` environment variable support in `cmd/server/main.go`.
- [x] Restrict client health check and API communication in `health.ts` & `client.ts` to `localhost` / `127.0.0.1` origins (disabling network/server calls when hosted on `github.io` or non-localhost origins).
- [x] Lower local storage summary limit to 100 entries.
