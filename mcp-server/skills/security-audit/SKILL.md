---
name: security-audit
description: Performs a thorough security audit against established industry standards (OWASP Top 10 2021, OWASP API Security Top 10 2023, CWE taxonomy, GDPR, PCI-DSS). Use when reviewing for security vulnerabilities, hardening production systems, auditing auth/payment/database code, or conducting periodic security reviews. Works on git diffs, specific files, or an entire codebase.
---

# Security Audit

Audit code against established security standards and threat models. Every finding **must** cite the specific standard ID (OWASP, CWE, GDPR article, etc.) so the developer understands the authoritative source for each requirement. This skill is for security-specific review; for clean code and architecture concerns, use `best-practices-audit` instead.

## Scope

Determine what to audit based on user request and context:

- **Git diff mode** (default when no scope specified and changes exist): run `git diff` and `git diff --cached` to audit only changed/added code and its immediate context
- **File/directory mode**: audit the files or directories the user specifies
- **Full audit mode**: when the user asks for a full security review, scan all source code (skip vendor/node_modules/build artifacts); prioritize files touching auth, payments, database, and external integrations

Read all in-scope code before producing findings.

## Domains to Evaluate

Check each domain. Skip domains with no findings. See [REFERENCE.md](REFERENCE.md) for detailed definitions, standard IDs, and concrete examples.

### 1. Authentication & Session Management
*(OWASP A07:2021, CWE-287, CWE-384)*

- Using `getSession()` instead of server-side `getUser()` for auth decisions (JWT trusting without server validation)
- Missing token expiry enforcement; long-lived tokens without rotation
- Weak or missing logout (session not invalidated server-side)
- OAuth state parameter missing or not validated (CSRF on OAuth flows)
- Trusting client-provided user identity without server-side verification
- Credentials stored in localStorage instead of httpOnly cookies

### 2. Authorization & Access Control
*(OWASP A01:2021, OWASP API2:2023, CWE-284, CWE-639)*

- BOLA/IDOR: object IDs accepted from user input without ownership verification
- Missing Row-Level Security (RLS) policies on database tables
- Privilege escalation paths: routes or RPCs accessible to roles that shouldn't have access
- Broken function-level auth: admin/internal endpoints not restricted by role
- REVOKE gaps: functions or tables accessible to PUBLIC or anon when they shouldn't be
- Assuming the presence of a valid JWT implies authorization (JWT ≠ authz check)

### 3. Injection
*(OWASP A03:2021, CWE-89, CWE-79, CWE-77, CWE-94)*

- **SQL injection**: raw string interpolation in queries; use parameterized queries or an ORM
- **XSS**: unsanitized user content inserted into HTML; missing `Content-Security-Policy`
- **Command injection**: user input passed to shell commands, `exec()`, `eval()`, `Function()`
- **Template injection**: user-controlled strings rendered by a template engine
- **Schema pollution (PostgreSQL)**: SECURITY DEFINER functions without `SET search_path = ''`; attacker-controlled schemas prepended to search path

### 4. Cryptography & Secrets
*(OWASP A02:2021, CWE-327, CWE-798, CWE-312, CWE-321)*

- Hardcoded credentials, API keys, tokens, or secrets in source code or `.env.example`
- Secrets in environment variables loaded client-side (exposed in browser bundles)
- Weak hashing algorithms (MD5, SHA-1) used for security purposes
- Tokens or sensitive data stored in plaintext in the database instead of a secrets vault
- Missing HTTPS enforcement; secrets transmitted over HTTP
- JWT secrets that are short, guessable, or shared across environments

### 5. Input Validation & Output Encoding
*(CWE-20, CWE-116, CWE-601, OWASP A03:2021)*

- No schema validation (Zod, Yup, JSON Schema, etc.) at API boundaries
- Validation only on the client, not enforced on the server
- Missing length/range constraints on user-supplied strings (no `maxLength`, no `CHECK` constraint)
- Missing content-type validation on file uploads
- Open redirects: user-controlled URL passed directly to redirect without allowlist validation
- Missing `encodeURIComponent` on user data placed in URLs

### 6. API Security
*(OWASP API Top 10 2023)*

- **API1 — BOLA**: resources returned or modified by user-supplied ID without ownership check
- **API2 — Broken Auth**: unprotected endpoints, missing JWT verification, bearer token in URL
- **API3 — Broken Object Property Level Auth**: response includes fields (e.g. `role`, `coins`, `internal_id`) that the caller should not see
- **API4 — Unrestricted Resource Consumption**: no rate limiting, pagination, or request size limits
- **API5 — Broken Function Level Auth**: non-public actions (admin, delete, ban) not verified against caller's role
- **API7 — SSRF**: URL parameters or webhook URLs accepted from user input without allowlist validation
- **API8 — Security Misconfiguration**: permissive CORS (`*`), verbose error messages leaking stack traces or schema details, debug endpoints in production
- **API10 — Unsafe Consumption of APIs**: external API responses trusted without validation; webhooks not verified via HMAC signature

### 7. Database Security
*(CWE-250, CWE-284, PostgreSQL Security Best Practices)*

- Tables created without `ENABLE ROW LEVEL SECURITY`
- Missing `REVOKE EXECUTE` on SECURITY DEFINER functions from `PUBLIC`, `authenticated`, `anon`
- SECURITY DEFINER functions without `SET search_path = ''` (schema pollution vector)
- Missing `REVOKE TRUNCATE` on financial, audit, or compliance tables
- Overly permissive RLS policies (e.g., `USING (true)` on sensitive tables)
- Direct client-to-database connections bypassing application security layer
- Sensitive columns (tokens, PII) stored in plaintext instead of encrypted columns or vault references
- Missing `CHECK` constraints on financial columns (e.g., balance `>= 0`, amount sign validation)

### 8. Rate Limiting & Denial-of-Service
*(OWASP API4:2023, CWE-770, CWE-400)*

- No rate limiting on authentication endpoints (brute force enabler)
- No rate limiting on expensive operations (sync, export, AI calls, file uploads)
- Rate limits implemented in-memory per process/isolate (bypassed by horizontal scaling or redeployment)
- Missing request body size limits (memory exhaustion)
- Unbounded database queries without `LIMIT` clause (full table scan DoS)
- No backoff or circuit breaker for outbound calls to third-party services

### 9. Concurrency & Race Conditions
*(CWE-362, CWE-367 TOCTOU)*

- Check-then-act patterns on financial or inventory data without database-level locking
- Double-spend or double-grant risk: no idempotency key or `ON CONFLICT DO NOTHING` guard
- Missing advisory locks or `SELECT FOR UPDATE` on critical rows during multi-step transactions
- Non-atomic read-modify-write sequences on shared state (coin balance, stock count, etc.)
- Idempotency keys that can be `NULL` (treated as distinct by PostgreSQL UNIQUE, allowing bypass)

### 10. Financial & Transaction Integrity
*(PCI-DSS Req 6 & 10, CWE-362)*

- Client-side coin/credit/reward calculation (any value trusted from client is a vulnerability)
- Missing `CHECK` constraint on transaction amount sign (credits vs. debits not enforced at DB level)
- Coin or balance modification without an audit trail (append-only transaction log)
- Webhook events not deduplicated by a provider-assigned event ID (replay attack enabler)
- Webhook signature not verified (unauthenticated financial state changes)
- Deletion of financial transaction records (violates audit trail requirements; potential legal violation)
- Missing `NOT NULL` on idempotency key column for transaction tables

### 11. Security Logging & Monitoring
*(OWASP A09:2021, CWE-778, CWE-117)*

- Security-relevant events not logged (auth failures, permission denials, validation failures, HMAC failures)
- Log injection: unsanitized user input included directly in log messages
- Sensitive data (passwords, tokens, card numbers, PII) written to logs
- No structured logging — free-text logs that can't be queried or alerted on
- Missing correlation between security events and user/request IDs
- No alerting or anomaly detection on suspicious event patterns
- Logs stored in a volatile medium (in-memory, ephemeral filesystem) that survives restarts but not scaling events

### 12. Secrets & Environment Security
*(CWE-798, CWE-312, 12-Factor App)*

- Secrets committed to git (`.env`, private keys, API tokens in source files)
- Fallback to insecure defaults when env vars are absent (e.g., CORS origin falling back to `*`)
- Using the same secrets across development, staging, and production environments
- Secrets logged or included in error messages
- Client-side environment variables (prefixed `VITE_`, `NEXT_PUBLIC_`, etc.) containing server-side secrets
- Secrets passed as CLI arguments (visible in process list)

### 13. Data Privacy & Retention
*(GDPR Art. 5/17/25, CCPA, CWE-359)*

- PII stored longer than necessary (no retention policy or purge cron)
- No anonymization path for account deletion (right to erasure, GDPR Art. 17)
- PII in logs, error messages, or analytics events that shouldn't be there
- Missing `ON DELETE SET NULL` or equivalent for user-linked tables that must survive account deletion
- Financial records with FK `ON DELETE CASCADE` that would purge legally required audit evidence
- No consent record for data collection (GDPR Art. 6)
- User data returned in API responses without field-level access checks (over-fetching)

### 14. Security Misconfiguration
*(OWASP A05:2021, CWE-16)*

- Permissive CORS (`Access-Control-Allow-Origin: *` on authenticated endpoints)
- Missing `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` headers
- HTTP used instead of HTTPS; missing HSTS header
- Debug/development endpoints or verbose error responses in production
- Default credentials or example configurations deployed
- Database or storage buckets with public access that should be private
- Missing `SameSite` attribute on session cookies
- JWT verification disabled on functions that handle authenticated user data

### 15. Supply Chain & Dependency Security
*(OWASP A06:2021, CWE-1357)*

- Dependencies with known CVEs (run `npm audit`, `pip audit`, `bun audit`)
- Unpinned dependency versions (`*`, `latest`, `^` for production dependencies)
- Dependencies pulled from non-official registries without integrity hashing
- Dev dependencies installed in production containers
- Missing integrity subresource hashing on CDN-loaded scripts

### 16. TypeScript / JavaScript Specific
*(CWE-843 Type Confusion, CWE-915 Improperly Controlled Modification)*

- `as any` or `as unknown as T` casts that bypass type checking on externally-sourced data
- Prototype pollution: `Object.assign(target, userControlledObject)` or spread of unvalidated input onto objects
- `eval()`, `new Function()`, `setTimeout(string)`, or `innerHTML =` with user-controlled content
- `JSON.parse()` result used without validation (treat parsed JSON as `unknown`, not `any`)
- Arithmetic on `bigint` and `number` without explicit conversion (silent precision loss)
- Async functions missing `await` on promises that should be awaited (unhandled rejection, ordering bug)

## Static Analysis Tools

Before producing findings, **run available tools** on in-scope code. Incorporate tool output into your findings (cite the tool rule alongside the standard ID).

### npm / bun audit (dependency vulnerabilities)
```bash
npm audit --audit-level=moderate    # or: bun audit
```
Map findings to **OWASP A06:2021** and the specific CVE ID.

### ESLint with security plugins
```bash
# Check for eslint-plugin-security in devDependencies first
npx eslint --ext .ts,.tsx src/
```
Key rules to look for: `security/detect-object-injection`, `security/detect-non-literal-regexp`, `no-eval`, `no-implied-eval`.

### Semgrep (if available)
```bash
semgrep --config=p/owasp-top-ten .
semgrep --config=p/typescript .
```

### Ruff with Bandit rules (Python)
```bash
ruff check --select S .   # Bandit security rules
```

### How to use tool output
1. Map each tool finding to its security domain (e.g., a SQL injection ESLint rule → Domain 3: Injection).
2. Critical CVEs or injection/auth findings → **Critical**. Outdated deps with low-severity CVEs → **Warning** or **Suggestion**.
3. If a tool is not present or produces no findings, note "npm audit: clean" etc. in the Summary.

## Output Format

Group findings by severity. Each finding **must** name the specific standard violated.

```
## Critical
Violations that are directly exploitable or enable data theft, privilege escalation, or financial fraud.

### [DOMAIN] Brief title
**File**: `path/to/file.ts` (lines X–Y)
**Standard**: OWASP A01:2021 / CWE-639 — one-line description of what the standard requires.
**Violation**: What the code does wrong and the concrete attack scenario.
**Fix**: Specific, actionable code change or architectural remedy.

## High
Violations that create significant risk but require specific conditions or chaining to exploit.

(same structure)

## Medium
Defense-in-depth gaps, missing controls, or violations that increase attack surface.

(same structure)

## Low
Best-practice deviations, hardening opportunities, or compliance gaps unlikely to be directly exploited.

(same structure)

## Summary
- Total findings: N (X critical, Y high, Z medium, W low)
- Highest-risk area: name the domain with the most severe findings
- Key standards violated: list specific OWASP/CWE IDs
- Overall security posture: 1–2 sentence verdict
- Recommended immediate action: the single most urgent fix
```

## Rules

- **Cite the standard**: every finding must reference a specific standard ID (OWASP A-code, CWE-NNN, GDPR Art. N, PCI-DSS Req. N). This is the core value of this skill.
- **Model the attack**: every Critical or High finding must describe the realistic attack scenario, not just the code smell.
- **Be specific**: always cite file paths and line numbers.
- **Be actionable**: every finding must include a concrete fix — not "add validation" but "use a Zod schema on the request body and reject with 400 if it fails."
- **Severity by exploitability**: rate severity by real-world exploitability and impact, not theoretical worst-case.
- **Don't duplicate best-practices-audit**: focus on security vulnerabilities and compliance gaps. Architecture and clean code issues belong in the other skill.
- **No false positives over findings**: if something is ambiguous, note it as a question for the developer rather than flagging it as a violation.
- **Defense-in-depth counts**: a control missing a second layer of enforcement (e.g., RLS present but no CHECK constraint) is a Medium finding even if the first layer is sound.
