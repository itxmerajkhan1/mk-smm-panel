# Security Specification for SMM Panel Firestore Rules

## 1. Data Invariants

* **Identity Bounds**: A user profile or wallet can only be created/modified by its rightful owner or an authenticated admin. Users cannot modify their own roles or balances directly from client SDKs.
* **Wallet Balance Safety**: Users can never set their own wallet balances to an arbitrary amount via direct client SDK writes. All updates to `balance` or other financial counters are strictly checked or managed via backend transactions and admin overrides.
* **Order Integrity**: A service order cannot exist without a valid `serviceId` and `userId`. A standard user cannot change an order's status to `completed` or modify pricing details.
* **Provider Integration Safety**: Non-admin clients must be completely denied access (both read and write) to `/providers/{providerId}` and `/passwords_legacy/{userId}` collections to prevent SMM API keys and internal credentials from leaking.
* **Catalog Open Access**: Any online visitor can read `/services` and `/categories` catalogs, but only verified administrators can register, modify, or delete them.
* **PII Isolation**: Reading private user profiles containing Personally Identifiable Information (PII) like `email` is strictly prohibited for non-owning authenticated users.

---

## 2. The "Dirty Dozen" Payloads (Malicious Writes)

Here are the 12 targeted attack payloads designed to test key validation boundaries. In our final security rules, all of these attempts must return `PERMISSION_DENIED`.

### Payload 1: Admin Role Hijack (Identity Spoof)
* **Goal**: A regular user tries to write a profile document setting their own role to `admin`.
* **Collection**: `/users/attacker_uid`
```json
{
  "id": "attacker_uid",
  "username": "attacker",
  "email": "attacker@gmail.com",
  "role": "admin",
  "balance": 0.0,
  "status": "active",
  "apiKey": "attacker_api_key",
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 2: Balance Injection (Denial of Wallet / Theft)
* **Goal**: A regular user tries to update their own client profile to inject $10,000 balance.
* **Collection**: `/users/attacker_uid`
```json
{
  "id": "attacker_uid",
  "username": "attacker",
  "email": "attacker@gmail.com",
  "role": "user",
  "balance": 10000.0,
  "status": "active",
  "apiKey": "attacker_api_key",
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 3: Direct Core Wallet Modification
* **Goal**: A regular user tries to write directly to their `wallets` document to set PKR balance to 1,000,000.
* **Collection**: `/wallets/attacker_uid`
```json
{
  "id": "attacker_uid",
  "userId": "attacker_uid",
  "USD": 10000.0,
  "PKR": 1000000.0,
  "EUR": 10000.0,
  "GBP": 10000.0,
  "updatedAt": "2026-06-04T08:00:00Z"
}
```

### Payload 4: Arbitrary Provider Creation (API Poisoning)
* **Goal**: An unauthenticated user or normal user attempts to save a fake provider linked to a malicious backend.
* **Collection**: `/providers/malicious_prov`
```json
{
  "id": "malicious_prov",
  "name": "Hacker Provider",
  "apiType": "smm",
  "url": "https://malicious-smm-stealer.com/v2",
  "apiKey": "stolen_key",
  "balance": 9999.0,
  "active": true,
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 5: SMM Reseller Price Dumping (Service Tampering)
* **Goal**: A normal user tries to update an active service's rate to $0.0001 (allowing them to order unlimited social signals for free).
* **Collection**: `/services/service_xyz`
```json
{
  "id": "service_xyz",
  "category": "Instagram - Likes",
  "name": "Cheap Instagram Likes",
  "rate": 0.0001,
  "min": 10,
  "max": 10000,
  "active": true,
  "description": "Exploited cheap likes"
}
```

### Payload 6: Ticket Spoofing (Falsification of Ownership)
* **Goal**: User `victim_uid` files a ticket, and user `attacker_uid` attempts to hijack it by modifying its subject or status.
* **Collection**: `/tickets/ticket_123` (owned by `victim_uid`)
```json
{
  "subject": "HIJACKED SUBJECT",
  "message": "Attacker replaced the message body",
  "status": "closed"
}
```

### Payload 7: Fake Transaction Log Ledger Loading
* **Goal**: A user tries to log a fake completed deposit of $5,000 on their own account.
* **Collection**: `/transactions/tx_fake_999`
```json
{
  "userId": "attacker_uid",
  "amount": 5000.0,
  "method": "Stripe",
  "status": "completed",
  "type": "deposit",
  "senderDetails": "Fake stripes authorization",
  "id": "tx_fake_999",
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 8: Order Charge Shortcutting
* **Goal**: User attempts to place a custom order of 1,000,000 views but sets the `charge` directly to $0.01 in the document.
* **Collection**: `/orders/order_tamper`
```json
{
  "userId": "attacker_uid",
  "serviceId": "s3_9nzx0",
  "link": "https://tiktok.com/@attacker",
  "quantity": 1000000,
  "charge": 0.01,
  "id": "order_tamper",
  "status": "pending",
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 9: Client-Side Global Panel Setting Infiltration
* **Goal**: Standard client tries to toggle `maintenanceMode` to true or set `minDeposit` to $0.
* **Collection**: `/settings/panel_config`
```json
{
  "panelName": "Hacked Panel",
  "currency": "USD",
  "maintenanceMode": true,
  "minDeposit": 0,
  "maxDeposit": 999999
}
```

### Payload 10: Anonymous Or Non-Verified Notification Poison
* **Goal**: An unauthenticated user tries to broadcast a fake update alert to all wallets or a specific profile.
* **Collection**: `/notifications/notif_malicious`
```json
{
  "userId": "victim_uid",
  "title": "Hacked System Alert",
  "message": "Send cash directly to hacker",
  "read": false,
  "createdAt": "2026-06-04T08:00:00Z"
}
```

### Payload 11: Stealing Legacy Cached Passwords
* **Goal**: A regular user tries to read `/passwords_legacy/{userId}` records to steal plaintext password keys.
* **Collection**: `/passwords_legacy/victim_uid`
```json
// Any attempt to read must return PERMISSION_DENIED
```

### Payload 12: Injecting Rogue Fields (Shadow Write)
* **Goal**: A user tries to create an order document with correct fields but registers a rogue field like `"isVerifiedForFreeBonus": true`.
* **Collection**: `/orders/order_rogue`
```json
{
  "userId": "attacker_uid",
  "serviceId": "s1_fyh5k",
  "link": "https://instagram.com/attack",
  "quantity": 100,
  "charge": 1.5,
  "status": "pending",
  "createdAt": "2026-06-04T08:00:00Z",
  "isVerifiedForFreeBonus": true
}
```

---

## 3. Test Runner Context

These cases are tested by running validation asserts simulating unauthenticated, standard users, and authorized administrators. Any mismatch returns `PERMISSION_DENIED` immediately.
