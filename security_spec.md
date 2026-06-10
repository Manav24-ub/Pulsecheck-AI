# Target Security Specification: PulseCheck AI

This document establishes the security specifications, data invariants, and access patterns to protect user health and diagnostic reports.

## 1. Data Invariants

1. **User Ownership Isolation**: Users must only read or write to their own session documents (`/users/{userId}/sessions/{sessionId}`). Nobody else is permitted to see these diagnostic sessions.
2. **Strict Structure**: Biomarker results must be typed consistently and follow standard expected ranges.
3. **No Self-Assigned Privileges**: No user is permitted to elevate themselves to a higher profile role.
4. **Time Invariant validation**: All timestamp entries (`createdAt`) must exactly align with `request.time`.

---

## 2. The Dirty Dozen Payloads

Below are the 12 rogue payloads designed to probe update gaps, identity bypasses, and type poisoning in PulseCheck AI. Our ruleset guarantees that all of these are rejected with `PERMISSION_DENIED`:

### Rogue Payload 1: PII Cross-Snooping (Identity Theft)
*Authenticated user attempts to read another user's sessions.*
* **Operation**: `GET /users/victimUser123/sessions/session789`
* **Requester**: `auth.uid = "attackerUser456"`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 2: Ghost Field Pollution (Schema Shadowing)
*Attempting to write non-schema fields into the session document.*
* **Operation**: `CREATE /users/attackerUser456/sessions/session1` with custom `isAdmin: true` injection.
* **Payload**: Includes `{ "title": "...", "isAdmin": true, "ghostKey": "malicious" }`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 3: Spoofed Timestamp Creation (Temporal Poisoning)
*Attempting to forge a creation date in the past.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Payload**: `{ "createdAt": "2020-01-01T00:00:00Z" }` (instead of `request.time`)
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 4: Invalid Enum Injection (Risk Level Spoofing)
*Injecting custom text into structured enum states.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Payload**: `{ "triageStatus": "CRITICAL_SIGHTING_DANGER" }` (Only `GREEN`, `YELLOW`, `RED` allowed)
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 5: Unauthenticated Writing (Access Control Leak)
*Unauthenticated visitor attempts to write a session.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Requester**: `auth = null`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 6: Biomarker Array Poisoning (Denial of Wallet)
*Injecting standard key values with massive 2MB strings to trigger storage exhaustion.*
* **Operation**: `UPDATE /users/user123/sessions/session1`
* **Payload**: `{ "biomarkers": [{ "name": "VeryLongSling...", "value": "...2MB String..." }] }`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 7: Verification Bypass (Email Verification Spoof)
*Authenticated user with unverified email attempts to write data when verification is mandatory.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Requester**: `auth.token.email_verified = false`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 8: Immutable Field Rewrite (Creation Forgery)
*Attacking existing report creation metadata on update.*
* **Operation**: `UPDATE /users/user123/sessions/session1`
* **Payload**: `{ "date": "1990-01-01" }`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 9: Empty Session Poisoning (Null Value Insertion)
*Attempting to insert a session missing standard required fields.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Payload**: `{ "title": "empty" }` (missing `patientName`, `biomarkers`, etc.)
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 10: Sibling Document Modification (Unauthorized Updates)
*User attempting to write to a sister subcollection node belonging to someone else.*
* **Operation**: `UPDATE /users/victimUser123/sessions/session789`
* **Requester**: `auth.uid = "attackerUser456"`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 11: Malicious Regex ID Pollution (Resource Ingestion Hijack)
*Creating doc ID with invalid junk characters (e.g., `%23%24`) to trigger database indexes exhaustion.*
* **Operation**: `CREATE /users/user123/sessions/invalid#$ID`
* **Expected Result**: **REJECTED (403)**

### Rogue Payload 12: Invalid Value Type Injection (Type Safety Pollution)
*Writing a boolean true value into an expected number age field.*
* **Operation**: `CREATE /users/user123/sessions/session1`
* **Payload**: `{ "age": "sixty-eight" }` or `{ "age": true }`
* **Expected Result**: **REJECTED (403)**

---

## 3. The Test Runner Reference

These tests can be simulated directly on rules deploying via `deploy_firebase` verifying the absolute rejection of these twelve rogue scenarios.
