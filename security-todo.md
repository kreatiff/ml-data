# Security Analysis & To-Do List

## Project: Music League Search (Dupleighcates)
**Date:** Tuesday, March 17, 2026
**Auditor:** Gemini CLI (Security Auditor)

---

## 🚨 CRITICAL SEVERITY (Action Required Immediately)

### 1. Unauthenticated Edge Functions [FIXED]
- **Vulnerability:** The following Edge Functions lack any authentication checks, allowing anyone with the URL to invoke them:
    - `supabase/functions/create-playlist/index.ts`: Allows anyone to create Spotify playlists on the owner's account (using the stored refresh token).
    - `supabase/functions/enrich-songs/index.ts`: Allows anyone to trigger a mass metadata enrichment process, potentially abusing the Last.fm API and Supabase resources.
- **Impact:** Spotify account abuse/suspension, Last.fm API key revocation, Supabase resource exhaustion.
- **Fix:** Implement JWT verification in these functions using `auth.uid()` and ensure the caller is authorized.
- **Status:** ✅ Fixed (Added JWT verification and Admin role check for enrichment).

### 2. Insecure RLS Policies (Data Integrity & Abuse) [FIXED]
- **Vulnerability:** `public.created_playlists` has RLS enabled but the policies for `INSERT` and `UPDATE` are set to `true` (unconditional access).
- **Impact:** Anyone with the Supabase Anon key can spam the table with junk data or modify existing records.
- **Fix:** Restrict `INSERT` and `UPDATE` to authenticated users or admins.
- **Affected File:** `schema.sql`
- **Status:** ✅ Fixed (Policies restricted to authenticated users).

---

## 🔴 HIGH SEVERITY (Action Required Soon)

### 3. Insecure RLS Policies (Data Exposure) [FIXED]
- **Vulnerability:** `public.votes` allows `public read access` (SELECT `true`).
- **Impact:** All voting data (who voted for what) is exposed to anyone with the Anon key. This is likely sensitive data that should be protected.
- **Fix:** Restrict `SELECT` to authenticated users or implement more granular policies (e.g., users can only see their own votes until a round is closed).
- **Affected File:** `schema.sql`
- **Status:** ✅ Fixed (Policies restricted to authenticated users).

### 4. Secrets Exposure in Docker Image [FIXED]
- **Vulnerability:** `VITE_SPOTIFY_CLIENT_SECRET` (and other secrets) are passed as `ARG` and `ENV` in the `Dockerfile`.
- **Impact:** These secrets are baked into the Docker image layers and can be retrieved by anyone with access to the image. Furthermore, `SPOTIFY_CLIENT_SECRET` should NEVER be in a frontend build environment at all.
- **Fix:** 
    - Remove `VITE_SPOTIFY_CLIENT_SECRET` from `Dockerfile` and `docker-compose.yml` (it's not used in the frontend code).
    - Ensure only truly "public" (client-safe) variables are included in the build.
- **Affected Files:** `Dockerfile`, `docker-compose.yml`
- **Status:** ✅ Fixed (Removed unused client secret from build process).

---

## 🟡 MEDIUM SEVERITY (Planned Improvements)

### 5. Missing Security Headers
- **Vulnerability:** `nginx.conf` is missing critical security headers.
- **Fix:** Add the following headers to `nginx.conf`:
    - `Content-Security-Policy` (CSP)
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy`
- **Affected File:** `nginx.conf`
- **Status:** ❌ Open

### 6. Nginx Running as Root
- **Vulnerability:** The Docker image runs Nginx as the root user.
- **Impact:** If the Nginx process is compromised, the attacker has root access within the container.
- **Fix:** Use a non-root user in the `Dockerfile` to run the Nginx process.
- **Affected File:** `Dockerfile`
- **Status:** ❌ Open

### 7. Missing RLS on Derived Tables [FIXED]
- **Vulnerability:** `public.aggregate_votes` does not have RLS enabled.
- **Impact:** Inconsistency in security model; potential for future exposure if policies aren't explicitly denied.
- **Fix:** Enable RLS and define appropriate SELECT policies.
- **Affected File:** `schema.sql`
- **Status:** ✅ Fixed (RLS enabled with public read policy).

---

## 🟢 LOW SEVERITY (Best Practices)

### 8. Dependency Audit
- **Vulnerability:** Potential for outdated or vulnerable packages in `package.json`.
- **Fix:** Run `npm audit` and update dependencies regularly.
- **Affected File:** `package.json`
- **Status:** ❌ Open

### 9. Lack of Password Hashing/Salting for Access Code
- **Observation:** `verify-password` function checks a plain-text secret `ACCESS_PASSWORD`.
- **Fix:** While acceptable for a simple site-wide gate, consider a more robust auth flow if this becomes a production multi-user system.
- **Status:** ❌ Open

---

## Summary of Findings
| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2     | ✅ Fixed |
| High     | 2     | ✅ Fixed |
| Medium   | 3     | 🟡 1 Fixed, 2 Open |
| Low      | 2     | ❌ Open |
