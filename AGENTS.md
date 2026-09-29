# BaatCheet: instructions for coding agents

Read this before your first change. It is neat right now; break nothing.

## What it is

BaatCheet (baatcheet.app) is a small discussion board. People sign up (email verification required), start
**rooms** under a **theme**, reply in them, and have a profile with a picture and bio.

- **Backend:** Django 5.2 LTS, one app (`base`), django-allauth for accounts, Django REST framework for the API.
- **Frontend:** Vite + React + TypeScript in `frontend/`, built into `frontend/dist/` and served by Django.
- **Production:** one EC2 instance running nginx, gunicorn, PostgreSQL and the profile pictures on disk, deployed with
  [django-aws-deploy](https://github.com/engagepy/django-aws-deploy) (about $20/month). No RDS, no S3.

Names: a **theme** is the `Topic` model; a **room** is `Room`; a **reply** is `Message`. The UI uses theme/room/reply
everywhere. Keep it that way.

## Setup on a new machine

```bash
uv sync                                   # Python 3.12 + dependencies into .venv
(cd frontend && npm install && npm run build)
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver         # http://localhost:8000, serving the built frontend
```

For frontend work, run Vite alongside: `cd frontend && npm run dev`, then open http://localhost:5173. It proxies
`/api`, `/accounts`, `/admin`, `/media` and `/static` to Django on :8000, and hot-reloads.

Nothing needs a key locally: SQLite, emails print in the runserver terminal (sign-up links are there).

| Key (in `.env` locally, `/etc/baatcheet/env` on the server) | Without it |
|---|---|
| `DJANGO_DEBUG` | `true`: local mode. `false` requires the next three |
| `DJANGO_SECRET_KEY` | Production refuses to start |
| `DJANGO_ALLOWED_HOSTS` | Production answers 400 to every request |
| `POSTGRES_DB` (+ `POSTGRES_USER/PASSWORD/HOST/PORT` for a remote DB) | SQLite locally; production refuses to start |
| `DJANGO_MEDIA_ROOT` | Pictures go to `media/` in the repo folder |
| `EMAIL_*`, `DEFAULT_FROM_EMAIL` | Emails print to the console, so nobody can verify their address in production |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The "Sign in with Google" button is hidden |

`.sample-env` documents every key; the deploy tool copies it to the server as the starting env file.

## Commands

| Task | Command |
|---|---|
| Tests | `uv run pytest` |
| Lint + format | `uv run ruff check . && uv run ruff format .` |
| Frontend lint + build | `cd frontend && npx oxlint && npm run build` |
| Add a Python dependency | `uv add <pkg>`, then `uv export --no-hashes --no-dev --no-emit-project -o requirements.txt` (the server installs from `requirements.txt`; CI fails if it's stale) |
| Deploy | `ssh baatcheet "sudo baatcheet-deploy"` (pull, pip, npm build, migrate, collectstatic, check, reload) |
| Logs | `ssh baatcheet "journalctl -u gunicorn -f"` |

## Layout

```
baatcheet/        settings.py (env-driven), urls.py (+ media serving)
base/             models, views.py (serves the React app on the old URLs), urls.py
base/api/         views.py + urls.py: the original public read API (/api/, /api/rooms/…), unchanged
                  app_views.py + app_urls.py: the app's API under /api/app/, all sign-in required
templates/allauth/layouts/base.html   branded frame for every sign-in page
frontend/src/     main.tsx (router), routes.ts (every URL, once), api.ts (fetch + useApi),
                  components/, pages/, styles/tokens.css (design tokens for app AND sign-in pages)
frontend/public/  theme.js (day/dark choice, shared with sign-in pages), favicon.svg
```

## Rules that must not break

- **Old URLs keep working.** `/`, `/room/<id>/`, `/profile/<id>`, `/createroom/`, `/updateroom/<id>/`,
  `/deleteroom/<id>/`, `/deletemessage/<id>/`, `/updateuser/`, `/topics/`, `/activity/` are named Django routes that
  all serve the React app, and `frontend/src/routes.ts` defines the same patterns. Change both or neither.
  Trailing slashes are part of the contract.
- **The public API is frozen.** `GET /api/`, `/api/rooms/`, `/api/rooms/<id>/` are open to any origin, exactly as
  before. New endpoints go under `/api/app/`, which is same-origin only (`CORS_URLS_REGEX`).
- **The app API answers 401 when signed out** (not DRF's default 403). The frontend redirects on 401 and shows
  "not allowed" on 403. See `base/api/authentication.py`.
- **Sign-in stays server-rendered** (allauth). Style it through `templates/allauth/layouts/base.html` and
  `frontend/src/styles/auth.css`, not by copying allauth templates.
- **One source of design tokens:** `frontend/src/styles/tokens.css`. Every colour pair passes WCAG AA in both
  themes. Entrance animations move but never fade, so contrast holds on every frame.
- **Build output is never committed.** The server builds `frontend/` (django-aws-deploy `FRONTEND_DIR=frontend`).
- `manage.py check --deploy` must stay clean: `base/tests.py` runs it with production variables.

## Lessons from real runs

- **Django 3.2 → 5.2 was forced**: the server's Python 3.12 has no `distutils` (the old `models.py` imported it) and
  Pillow 8 won't build there. Migrations needed no changes (`makemigrations --check` is clean).
- **`useEffect(() => window.scrollTo(0, 0))` crashed every navigation** in Chrome (2026), because `scrollTo` now
  returns a Promise, and React calls whatever an effect returns as its cleanup. Always wrap effect bodies in braces.
- **react-router's `generatePath` drops trailing slashes** (`/room/8/` became `/room/8`). `routes.ts` builds URLs
  with a plain replace.
- **`runserver --noreload` caches `index.html`**: after `npm run build` the old page points at deleted hashed JS
  (blank page, 404 in the console). Restart the server; production reloads gunicorn on every deploy.
- **Uploads over 1 MB get a 413 from nginx** (django-aws-deploy's `client_max_body_size 1m`). The profile form checks
  size before sending.
- The old deployment kept static files and pictures on S3 and the database on RDS; the repo never held the old CSS
  or images. The React app replaced them; avatars without a picture are drawn as initials.

## Gotchas

- Don't mutate nested settings in tests (`settings.TEMPLATES[0]["DIRS"] = …` leaks into later tests); assign a new
  list.
- `User.email` is unique with `max_length=35` (from the original model). The profile form enforces it too.
- `DEFAULT_AVATAR` (`images/avatar.svg`) is the model default but the file doesn't exist; the API returns `null` and
  the frontend draws initials.
- The seed Site (id 1) is renamed to `baatcheet.app` / `BaatCheet` by migration `0002_site_name` only if it is still
  `example.com`.

## Extending

- **A new page:** add the pattern to `frontend/src/routes.ts` and `main.tsx`, and a named route to `base/urls.py`
  pointing at `views.app` (so a refresh on that URL works). Reuse `PageHead` with the page's main action top right.
- **A new API endpoint:** function view in `base/api/app_views.py` with `@permission_classes([IsAuthenticated])`,
  route in `app_urls.py`, test in `base/tests.py`.
- **A new model field:** edit `base/models.py`, `uv run python manage.py makemigrations`, expose it in
  `base/api/serializers.py`, add it to `frontend/src/types.ts`.
- **A new setting/key:** read it in `settings.py` with a safe local default, add it to `.sample-env` with a comment,
  and add a row to the key table above.
- **Deploying from scratch:** see README "Deploy".
