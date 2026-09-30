# A.G.T.N. Bandara — FR12–FR19 — Authentication & Security Management

Owner header added twice in `auth.routes.js`: above `POST /login` and above `POST /logout`.
The `POST /register` block above login belongs to Weerasingha, and `POST /change-password`
between login and logout isn't part of your FR range (headed separately in the original
"Beyond FR1–35" list) — left unmarked.

| File | Your part |
|---|---|
| `auth.routes.js` | `POST /login` (lockout, status gates) + `POST /logout` — FR12–FR16, FR19 |
| `auth.js` | `requireAuth` — session refresh + 30-min timeout — FR17, FR18 |

**Reminder:** the form says FR11–19; FR11 (Record a Single Sale) is sales work, filed under
Athukorala instead — flag this on the form.

Git branch suggestion: `bandara-agtn-fr12-19`
