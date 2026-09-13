# Current Design — J1BP (Splitbills)

## Overview

J1BP is a Vue 3 single-page app for splitting a shared bill between people. It runs almost entirely client-side: a user enters people and food items, the app computes per-person shares and least-transaction settlements locally, and the result can be shared either as a self-contained encoded URL or via a Firestore document. A secondary feature lets a signed-in user photograph a receipt: the app writes the image straight into Firebase Realtime Database, and a script that runs **outside this repo** watches that database, extracts the line items, and writes them back to the same entry — the SPA is simply notified of that update via Firebase's SDK and prefills the bill.

**Stack**: Vue 3 (Composition API) + Vite + Vuetify 3 + Pinia + vue-router (memory history). Deployed to Vercel as a pure static site (no Vercel functions). Cloud persistence via Firebase Firestore (bill sharing) and Firebase Realtime Database (receipt scanning), with Firebase Authentication (Google OAuth) identifying the user for the receipt flow.

## Module / component diagram

```mermaid
graph TD
    subgraph Browser [Browser - Vue SPA]
        Router[router.js]
        Home[Home.vue]
        Details[Details.vue]
        Store[store.js - Pinia]
        Calc[utils/calculate.js]
        Auth[auth.js - Firebase Auth]
        FirebaseClient[firebase.js]
    end

    Firestore[(Firebase Firestore)]
    RTDB[(Firebase Realtime Database)]
    ExtScript[[External extraction script - outside this repo]]

    Router --> Home
    Router --> Details
    Home --> Store
    Home --> FirebaseClient
    Details --> Store
    Details --> Calc
    Details --> Auth
    Details --> FirebaseClient
    FirebaseClient --> Firestore
    FirebaseClient --> RTDB
    ExtScript -. "reads pending receipts, writes back extracted items" .-> RTDB
```

## State ownership

Pinia (`store.js`) holds only bootstrap/config state set once when entering `Details.vue`: `iCountPersons`, `fGST`, `fSVC`, `data`, `iViewMode`, `fullpath`, `showSVCGST`. It is **not** where the live, editable bill lives. `Details.vue` seeds a local `arrPersons` ref from `store.data` (or builds defaults from `iCountPersons`) on mount, and all subsequent editing — names, food items, costs, per-item share checkboxes — happens on that local state. Derived values (item totals, pairwise payments, least-transaction settlement) are `computed()` from `arrPersons` via pure functions in `utils/calculate.js`, which has no Vue or store dependency and is unit-tested independently (`calculate.spec.js`).

## How the pieces interact

```mermaid
graph LR
    User((User))

    subgraph SPA [Vue SPA]
        AuthMod[Auth<br/>sign in]
        DetailsMod[Details.vue<br/>edit bill · scan receipt · share bill]
        HomeMod[Home.vue<br/>open a shared link]
    end

    FirestoreDB[(Firestore<br/>stores & reads shared bill copies)]
    RTDB[(Realtime Database<br/>stores pending receipts & their extracted items)]
    ExtScript[[External script<br/>outside this repo<br/>watches for pending receipts, writes extracted items]]

    User -- "signs in with Google" --> AuthMod
    AuthMod -- "identifies the user" --> DetailsMod
    User -- "clicks share" --> DetailsMod
    DetailsMod -- "saves a shareable copy of the bill" --> FirestoreDB
    HomeMod -- "loads a bill from a shared link" --> FirestoreDB
    User -- "selects a receipt photo" --> DetailsMod
    DetailsMod -- "writes the receipt image as a pending entry" --> RTDB
    RTDB -- "entry is visible to" --> ExtScript
    ExtScript -- "writes the extracted items back" --> RTDB
    RTDB -- "pushes the update as an event" --> DetailsMod
    DetailsMod -- "prefills the bill with the items" --> User
```

In plain terms: the SPA never talks to the extraction logic directly. It drops the receipt into Realtime Database and simply listens for that same record to change; whatever process fills in the answer — the external script — is decoupled from the app entirely, as long as it honors the entry shape below. The "scan receipt" control itself is only shown once signed in — there is no receipt feature at all while signed out. And since the external script might never respond, the SPA gives up and shows an error after a couple of minutes of waiting, rather than waiting forever.

### Realtime Database entry contract (`receipts/{uid}/{pushId}`)

The boundary the external script must honor is documented as a single source of truth in [`receipt-schema.md`](./receipt-schema.md) (field table + TypeScript type) — check both the SPA code and the external script against that file whenever either changes.

## Routes

| Path | View | Purpose |
|---|---|---|
| `/` | `Home.vue` | Entry point: setup form, or resolves `?data=`/`?share=` links into store state |
| `/details` | `Details.vue` | Main working view: edit bill, view totals/settlements, share, scan receipt |
