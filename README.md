# Online Equipment Borrowing and Return Monitoring System

A web-based information system for the College to manage the borrowing and returning of
laboratory and ICT equipment (laptops, projectors, cameras, microphones, routers, extension
cords, and other devices).

This project was created for **SAD – Laboratory Activity** by **Libres**.

- **Frontend:** HTML, CSS, JavaScript
- **Hosting:** GitHub Pages
- **Backend:** Supabase (PostgreSQL database + Authentication)
- **Library:** `@supabase/supabase-js` v2 (loaded from CDN)

---

## 1. Technology Stack & Architecture

```
INTERNET
   │
   ▼
 GitHub Pages  ───── HTML / CSS / JS
   │
   ▼
 Supabase JS (js/supabase.js)
   │
   ▼
 Supabase
  ├── Authentication (email/password)
  └── PostgreSQL Database
        ├── equipment
        └── borrow_transactions
```

---

## 2. Features (Mapped to Requirements)

| # | Module | What it does |
|---|--------|--------------|
| 1 | **User Authentication** | Login, logout, session management. Only authenticated users can manage records (BR-11). |
| 2 | **Dashboard** | Total equipment, available, borrowed, returned transactions, and overdue counts. |
| 3 | **Equipment Module** | Add (C), view (R), edit (U), delete (D) equipment records with confirmation. |
| 4 | **Borrowing Transaction Module** | Record borrowing, return equipment, view transactions. |
| 5 | **Overdue Detection** | Identifies overdue items (BR-09). |
| 6 | **Search & Filter** | Search equipment (name/code) and transactions (name/code/borrower); filter by availability and status. |

## 3. Business Rules Implemented

| ID | Rule | Where enforced |
|----|------|----------------|
| BR-01 | Equipment name cannot be empty. | `js/equipment.js` |
| BR-02 | Asset code must be unique. | `UNIQUE` constraint in DB + validation in `js/equipment.js` |
| BR-03 | Only available equipment may be borrowed. | `js/transactions.js` |
| BR-04 | Borrower name must be provided. | `js/transactions.js` |
| BR-05 | Due date cannot be earlier than the borrowing date. | `js/transactions.js` |
| BR-06 | Newly borrowed equipment receives `Borrowed` status. | `js/transactions.js` |
| BR-07 | Borrowed equipment becomes unavailable. | `js/transactions.js` |
| BR-08 | Returned equipment becomes available again. | `js/transactions.js` |
| BR-09 | Equipment past due date identified as `Overdue`. | `js/transactions.js` (`updateOverdueStatuses`) |
| BR-10 | Deletion requires user confirmation. | Confirm modal in `js/equipment.js` / `js/transactions.js` |
| BR-11 | Only authenticated users may manage records. | `requireAuth()` + Supabase RLS |
| BR-12 | A returned transaction cannot be returned a second time. | `js/transactions.js` |

---

## 4. Project Structure

```
SAD-EquipmentBorrowing-Libres/
│
├── index.html                 # Dashboard + Equipment + Transactions (single app page)
├── login.html                 # Login / Sign Up page
├── supabase-schema.sql        # Database tables + RLS + seed data (run in Supabase)
│
├── css/
│   └── style.css
│
├── js/
│   ├── supabase.js            # Supabase client init + placeholders (EDIT THIS)
│   ├── auth.js                # Login, logout, session management
│   ├── equipment.js           # Equipment CRUD + search/filter + dashboard stats
│   └── transactions.js        # Borrowing, return, overdue, search/filter
│
├── README.md
│
└── documentation/
    ├── use-case.svg           # Use case diagram (open in browser; export to PNG)
    └── erd.svg                # Entity relationship diagram
```

> To produce the required **PNG** files (`use-case.png`, `erd.png`), open each `.svg`
> in a browser and take a screenshot, or use an SVG-to-PNG converter, then save them
> inside `documentation/`.

---

## 5. Setup Guide (Supabase)

### Step 1 — Create a Supabase project
1. Go to https://app.supabase.com and log in.
2. Click **New Project** → pick a name (e.g., `equipment-borrowing-system`) and a password. Save the password.
3. Wait for the project to be provisioned.

### Step 2 — Enable Email Authentication
1. In your project, go to **Authentication → Sign In / Providers → Email**.
2. Make sure **Email** is enabled (**ON**).
3. **Important:** Under **Authentication → URL Configuration**, set the Site URL to
   `https://<your-username>.github.io/<your-repo-name>/` after deploying (or leave default while testing locally).
4. Optional: under **Authentication → Sign In / Providers → Email**, turn **OFF**
   "Confirm email" so accounts work immediately. (If you keep it ON, users must click the
   confirmation link in their inbox before they can log in.)

### Step 3 — Create the database tables
1. Open **SQL Editor → New query**.
2. Copy everything from **`supabase-schema.sql`** and paste it in.
3. Click **Run**.
4. You should see `equipment`, `borrow_transactions`, and the RLS policies created.

Optional: uncomment the seed `INSERT` statements at the bottom of the file and run again
to load 10 sample equipment records.

### Step 4 — Get your API keys and configure the app
1. Go to **Settings → API**.
2. Copy the **Project URL** (looks like `https://abcdefghijklmn.supa.co`).
3. Copy the **anon public** key (a long string starting with `eyJhbGciOi...`).
4. Open **`js/supabase.js`** and replace the two placeholders:

```js
const SUPABASE_URL = "https://abcdefghijklmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

### Step 5 — Create a user account
1. Open `login.html` locally (or on your deployed site).
2. Click **Sign Up** and register with any email + password (at least 6 characters).
3. If "Confirm email" is ON, click the confirmation link sent to that email.
4. Log in.

> The anon key is safe to include in client code because **Row Level Security (RLS)**
> stops anonymous users from reading or writing the tables — only signed-in users
> (`auth.uid() IS NOT NULL`) are allowed.

---

## 6. Local Testing

You can serve the site with XAMPP (place the folder under `htdocs` and visit
`http://localhost/<folder>/login.html`) or with any static server.

Open DevTools (F12) → **Console** to check that the message
`Supabase client initialized.` appears.

---

## 7. Deploying to GitHub Pages

1. Create a new **public repository** on GitHub, e.g. `SAD-EquipmentBorrowing-Libres`.
2. In the repository, go to **Settings → Pages → Branch** → select `main` / `master` → **Save**.
3. Upload the project files (or push via Git):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Equipment Borrowing System"
   git branch -M main
   git remote add origin https://github.com/<your-username>/SAD-EquipmentBorrowing-Libres.git
   git push -u origin main
   ```
4. Your site will be live at:
   `https://<your-username>.github.io/SAD-EquipmentBorrowing-Libres/`
5. Update the Supabase **Site URL** to that address (Authentication → URL Configuration).
6. Visit the site → Log in → use the system.

---

## 8. Functional Testing Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Log in with wrong password | Error message; no access to dashboard |
| 2 | Log in with correct credentials | Redirected to dashboard |
| 3 | Logout | Returns to login page; going back requires login again |
| 4 | Add Equipment | New row appears; counts update on dashboard |
| 5 | Add Equipment with empty name | Blocked (BR-01) |
| 6 | Add Equipment with duplicate asset code | Blocked (BR-02) |
| 7 | Edit equipment name/code/condition | Row updates |
| 8 | Delete equipment | Confirmation modal required (BR-10) |
| 9 | Record borrowing for available item | Status = Borrowed; availability = Borrowed (BR-06/07) |
| 10 | Record borrowing for borrowed item | Blocked (BR-03) |
| 11 | Record borrowing with due date before borrowed date | Blocked (BR-05) |
| 12 | Record borrowing without borrower name | Blocked (BR-04) |
| 13 | Return equipment | Date returned set; status = Returned; availability = Available (BR-08) |
| 14 | Return the same transaction again | Return button no longer shown (BR-12) |
| 15 | Set a due date in the past | Transaction shows Overdue (BR-09) |
| 16 | Search by equipment name / asset code / borrower | Only matching rows appear |
| 17 | Filter by availability / status | Only matching rows appear |
| 18 | Access records while logged out | Redirected to login (BR-11, RLS) |

---

## 9. Learning Outcomes Covered

Learners are expected to demonstrate:
1. Problem analysis for the manual borrowing process ✔
2. Actors, requirements, data entities, business rules ✔ (`documentation/`)
3. Use case model and ERD ✔ (`documentation/use-case.svg`, `documentation/erd.svg`)
4. Relational database in Supabase ✔ (`supabase-schema.sql`)
5. CRUD operations with JavaScript ✔
6. Data validation and business rules ✔ (BR-01 to BR-12)
7. Authentication ✔ (Supabase Auth)
8. Search and filtering ✔
9. GitHub for source-code management ✔
10. Online deployment via GitHub Pages ✔
11. Functional testing ✔ (Section 8)
12. Relating features to requirements ✔ (Section 2)

---

## 10. Authors & Credits

- **[Libres]** – analysis, design, development, and deployment.
- Built with [Supabase](https://supabase.com) and hosted on [GitHub Pages](https://pages.github.com).