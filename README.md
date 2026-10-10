# Secure Notes Backend

Secure note-taking REST API with JWT auth and role-based access control.

## Stack

Node.js + Express, MongoDB Atlas + Mongoose, bcryptjs, jsonwebtoken, zod, helmet, cors, express-rate-limit.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` keys: `MONGO_URI` (Atlas URI with `/secure-notes-db`), `JWT_SECRET`, `PORT=5000`, `FRONTEND_URL=http://localhost:5173`.

Health: `GET /health` returns `{ status: "ok" }`.

## Endpoints

Prefix `/api`. Lists return `{ items, pagination: { page, limit, total, totalPages } }`, `limit` capped at 100.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register as User (role forced, interests normalized) |
| POST | `/auth/login` | Public | Login, returns `{ token, user }` (rate-limited) |
| GET | `/auth/me` | Auth | Own safe profile, no passwordHash |
| POST | `/notes` | Auth | Create own note, owner from JWT |
| GET | `/notes?page=1&limit=10` | Auth | List own notes, newest first |
| GET | `/notes/:id` | Owner | Read own note, else 404 |
| PATCH | `/notes/:id` | Owner | Update own note, empty body 400 |
| DELETE | `/notes/:id` | Owner | Delete own note |
| POST | `/posts` | Auth | Create a post as self |
| GET | `/admin/users` | Admin | List users, newest first |
| POST | `/admin/users` | Admin | Create User or Admin |
| PATCH | `/admin/users/:id` | Admin | Update name/interests/role |
| DELETE | `/admin/users/:id` | Admin | Delete user + their notes + posts |
| GET | `/admin/notes` | Admin | List all notes with owner populated |
| GET | `/admin/users-by-interest` | Admin | Users grouped by interest (one aggregate) |
| GET | `/users/:id/posts` | Public | One user's posts via `$lookup` (one aggregate) |

Invalid ObjectId returns 400, missing/inaccessible resource returns 404, missing token 401, non-admin 403.

## Admin creation

Public registration always creates `role: "User"`. To make an admin for demo:

1. Register normally, then in Atlas set that user's `role` to `"Admin"`.
2. Login again to get an admin JWT.
3. Or use `POST /api/admin/users` with an existing admin token and `"role": "Admin"`.

## Roles and ownership

- User: CRUD only notes where `note.userId` equals JWT id. Queries use `findOne({ _id, userId })`, so another user's id returns 404. Users never see others' notes in list.
- Admin: everything a user can do via own routes, plus user management and `GET /admin/notes` for all notes.
- Note/post owner always comes from `req.user.id`, never from request body.

## Indexes

Only indexes strictly required by list/read queries, all declared with `schema.index()`:

| Collection | Index | Supports |
|---|---|---|
| users | `{ email: 1 }` unique | Login lookup, duplicate-email constraint |
| users | `{ createdAt: -1, _id: -1 }` | Admin user list sorted newest first |
| notes | `{ userId: 1, createdAt: -1, _id: -1 }` | Own-notes list filtered by owner, sorted, paginated |
| posts | `{ userId: 1, createdAt: -1, _id: -1 }` | `$lookup` match on author + newest-first sort |

No `_id` index added (automatic). No `interests` index: grouping all interests scans the relevant docs anyway and no required filter benefits. All list sorts use exactly `createdAt: -1, _id: -1` with `_id` tie-breaker for deterministic pagination.

## Aggregations

Posts live in a separate `posts` collection (`userId` ref) in addition to notes, to satisfy the task's `$lookup` requirement.

Interest grouping (`GET /api/admin/users-by-interest`): exactly one `User.aggregate()` call, no `find`/`countDocuments` in the handler. Pipeline: `$unwind interests` (users with no interests appear in no group) → `$group` by interest collecting safe `{ id, name, email }` + count → `$sort { _id: 1 }` → `$facet` into paginated `items` plus `total` in the same execution.

User posts (`GET /api/users/:id/posts`): exactly one `User.aggregate()` with a `$lookup` stage. Pipeline: `$match { _id }` → `$lookup { from: "posts", let: { uid: "$_id" }, pipeline: [ $match $expr userId, $sort, $facet(items/total) ], as: "postData" }` → `$project`. Validates ObjectId (400) and returns 404 for missing user.

## Pagination

Shared `getPagination()`: defaults `page=1, limit=10`, rejects negatives by normalizing, caps `limit` at 100, `skip = (page-1)*limit`. Ordinary lists use `find().sort().skip().limit()` plus `countDocuments()`; aggregation endpoints compute items and total inside the single pipeline via `$facet`.

## Tests

Manual verification with curl covering: register/login/me, duplicate email, wrong password, missing token, owner CRUD, cross-user 404, admin 403 vs 200, pagination pages differ and limit cap, interest grouping, `$lookup` posts, invalid id 400, missing user 404. Test data is cleaned from Atlas after each run.

## Demo accounts (live testing)

Live frontend: `https://secure-notes-frontend.pages.dev/`

Use these demo-only accounts to log in and test (passwords are test-only, delete/rotate after interview):

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Sara Admin | sara.admin@test.com | Pass1234 |
| User | Arif Hossain | arif@test.com | Pass1234 |
| User | Nabila Rahman | nabila@test.com | Pass1234 |

Admin can manage users and view all notes/interests; normal users can only manage their own notes.

## Live URLs

- Backend API: https://secure-notes-backend-yyo2.onrender.com
- Frontend: https://secure-notes-frontend.pages.dev/

## Limitations

- `skip/limit` pagination (fine at this scale; cursor pagination for millions of docs).
- Short-lived bearer JWT only, no refresh tokens or revocation list.
- Role changes take effect on next login (role is in the JWT).
