# NeuroMind Admin and Doctor access

## Local Admin credentials

`npm run setup` creates a unique local Admin password and stores it only in
`backend/.env`. Use the values of `INITIAL_ADMIN_EMAIL` and
`INITIAL_ADMIN_PASSWORD` from that local file. They are intentionally not
embedded or autofilled in the frontend. Never commit or share `backend/.env`.

Initialize or repair the account:

```bash
npm run db:migrate
npm run db:admin
```

`npm run dev` now runs both operations automatically before starting the API
and frontend. With `AUTO_CREATE_INITIAL_ADMIN=true`, the database Admin record
is synchronized to the configured credentials, including an outdated password.

## Doctor flow

1. Open **Doctor** on the login page and select **Apply for Doctor Portal Access**.
2. Submit the doctor details and remember the entered email/password.
3. The account remains `PENDING` and cannot sign in yet.
4. Sign in through the **Admin** tab.
5. Open **Verify Doctors** and select **Approve & Activate**.
6. Sign out, select the **Doctor** tab, and use the registered doctor credentials.

The Doctor dashboard then loads assigned patients and reports. Patient records
are read through Doctor-authorized endpoints; the Doctor UI no longer calls a
Patient-only API.

## If login still fails

Run:

```bash
npm run doctor
npm run db:admin
npm run dev
```

Check that PostgreSQL is running and `DATABASE_URL` in `backend/.env` contains
the correct PostgreSQL password. Do not enter the PostgreSQL password into the
NeuroMind login screen.

To verify the complete Admin/Doctor authentication lifecycle against your real
local PostgreSQL database, run:

```bash
npm run test:auth
```
