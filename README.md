![BaatCheet](https://user-images.githubusercontent.com/42845567/201497019-2dd93260-117d-4237-99ab-975e3fe21d4a.png)

# BaatCheet

Themed discussion rooms, live at [baatcheet.app](https://baatcheet.app). A Django backend, a Vite + React frontend,
and the whole thing on one small EC2 instance.

- **Rooms under themes:** start one, edit or delete what you host, search by theme, name or description
- **Replies:** chat-style threads; replying makes you a participant
- **Profiles:** picture, name, bio, rooms hosted, latest replies
- **Accounts:** sign up with email verification, sign in by username or email, password reset, optional Google
- **A landing page** that introduces BaatCheet to visitors, and branded emails
- **Discord-style app with a CRED-style finish**: a theme rail, `# room` channels, chat threads, a quick switcher
  (`/` or ⌘K), NeoPOP buttons; dark by default, day mode one click away; works on phones
- **A public read API:** `GET /api/rooms/` and `/api/rooms/<id>/`

## Quick start

Needs [uv](https://docs.astral.sh/uv/) and Node.js 22+.

```bash
git clone https://github.com/engagepy/django-discord-skeleton.git baatcheet && cd baatcheet
uv sync
(cd frontend && npm install && npm run build)
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver
```

Open http://localhost:8000 and sign up. The verification link prints in the terminal running the server.

Working on the frontend? Keep `runserver` going and also run `cd frontend && npm run dev`, then use
http://localhost:5173 for instant reloads.

No keys are needed locally. Every setting is listed, with what happens without it, in [`.sample-env`](.sample-env)
and in the table in [AGENTS.md](AGENTS.md#setup-on-a-new-machine).

## How it fits together

```
Browser ──HTTPS──▶ nginx ──▶ gunicorn ──▶ Django ──▶ PostgreSQL (same instance)
                     │                      ├─ /            React app (frontend/dist/index.html)
                     │                      ├─ /api/app/    JSON API the app uses (sign-in required)
                     │                      ├─ /api/        original public read API
                     │                      ├─ /accounts/   sign-in pages (django-allauth)
                     │                      └─ /media/      profile pictures from disk
                     └─ /static/  built JS/CSS, cached for a year
```

Every address from the original app still works (`/room/3/`, `/profile/5`, `/createroom/`, …), so old links and
bookmarks land in the right place.

## Deploy

Uses [django-aws-deploy](https://github.com/engagepy/django-aws-deploy): one instance, about $20/month, where the
old setup used RDS and S3.

```bash
git clone https://github.com/engagepy/django-aws-deploy.git && cd django-aws-deploy
cp deploy.conf.example deploy.conf
```

Set these in `deploy.conf`:

```bash
PROJECT=baatcheet
DOMAIN=baatcheet.app
REPO=git@github.com:engagepy/django-discord-skeleton.git
WSGI_MODULE=baatcheet.wsgi
FRONTEND_DIR=frontend          # the server builds the React app on every deploy
APP_REPO_PATH=../baatcheet     # your local checkout, for the preflight checks
AWS_PROFILE=indiapolls         # it shares the indiapolls instance…
HOST_ON=indiapolls             # …so no new instance, just its own user, database, service and site
CERT_EMAIL=info@astratechz.com
```

Then `./launch.sh --check-only`, and `./launch.sh`. After that, every deploy is:

```bash
ssh baatcheet "sudo baatcheet-deploy"
```

### Bringing over data from the old RDS/S3 setup (optional)

The models and migrations are the same as before, so the old database restores as-is and upgrades itself on the
next deploy.

1. Dump the old database from anywhere that can reach RDS:
   `pg_dump --format=custom --no-owner --no-acl -h <rds-endpoint> -U BaatCheet mydb > old.dump`
2. Copy it up and restore it into a fresh, empty database (the new one only holds the admin user so far):
   ```bash
   scp old.dump baatcheet:/tmp/
   ssh baatcheet "sudo systemctl stop gunicorn && sudo -u postgres dropdb baatcheet \
     && sudo -u postgres createdb --owner baatcheet baatcheet \
     && sudo -u baatcheet pg_restore --no-owner --no-acl -d baatcheet /tmp/old.dump"
   ```
3. Copy profile pictures from the bucket: `aws s3 sync s3://<bucket>/uploads/ ./uploads/`, then
   `rsync -a uploads/ baatcheet:/tmp/uploads/ && ssh baatcheet "sudo -u baatcheet mkdir -p /srv/baatcheet/media && sudo cp -r /tmp/uploads /srv/baatcheet/media/ && sudo chown -R baatcheet: /srv/baatcheet/media"`
4. `ssh baatcheet "sudo baatcheet-deploy"` to run the new migrations.

When the site is confirmed working, stop the RDS instance and empty the bucket so they stop billing.

## Development

```bash
uv run pytest                                   # backend tests
uv run ruff check . && uv run ruff format .     # lint + format
cd frontend && npx oxlint && npm run build      # frontend lint + build
```

CI runs all of this on every pull request. Agents and contributors: start with [AGENTS.md](AGENTS.md).
