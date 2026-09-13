# Receipt entry schema

This is the data contract for a single receipt entry in Firebase Realtime Database, at path `receipts/{uid}/{pushId}`. It is the boundary between this repo's SPA and the extraction script that lives outside this repo — both sides should be checked against this file whenever either one changes.

## Fields

| Field | Written by | Meaning |
|---|---|---|
| `email` | SPA | Signed-in user's email, for the script's own reference/logging |
| `image` | SPA | Base64 data URL of the resized receipt photo |
| `status` | SPA (`'pending'`) then external script (`'done'`) | Tells the SPA when extraction has finished |
| `createdAt` | SPA | Timestamp the entry was created |
| `items` | External script | `[{name, price}, ...]` extracted from the receipt |
| `doneAt` | External script | Timestamp the entry was completed; with `createdAt`, used to compute average inference time |

## TypeScript type

```ts
interface ReceiptEntry {
  email: string;
  image: string; // base64 data URL
  status: 'pending' | 'done';
  createdAt: number;
  items?: { name: string; price: number }[]; // absent until status = 'done'
  doneAt?: number; // absent until status = 'done'; createdAt→doneAt gives inference time
}
```

## Access

Realtime Database security rules restrict a client-SDK caller to reading/writing only the entry under their own `uid`. The external script is expected to use privileged (Admin SDK) access, which bypasses those rules.
