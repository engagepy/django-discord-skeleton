import os

# Tests never read a developer's .env: these win because load_dotenv() doesn't override variables
# that are already set. Local defaults: SQLite, DEBUG on, no Google sign-in.
for key in [
    "DJANGO_DEBUG",
    "POSTGRES_DB",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "DJANGO_MEDIA_ROOT",
    "EMAIL_BACKEND",
    "EMAIL_HOST_USER",
    "EMAIL_HOST_PASSWORD",
    "DJANGO_ALLOWED_HOSTS",
]:
    os.environ[key] = ""
os.environ["DJANGO_DEBUG"] = "true"
