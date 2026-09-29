"""
BaatCheet settings.

One file for both places: locally it runs with no environment variables at all (SQLite, console email,
DEBUG on), and in production it is driven entirely by /etc/baatcheet/env, which the django-aws-deploy
bootstrap writes from .sample-env. Every variable is documented in .sample-env.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Local convenience only: the server passes variables through systemd, not a .env file.
load_dotenv(BASE_DIR / ".env")


# --- Core -----------------------------------------------------------------------------------------

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

# The insecure fallback only exists for local development; with DEBUG off a real key is required.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-local-development-only" if DEBUG else "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false.")

ALLOWED_HOSTS = [host for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if host]
if DEBUG:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1"]
CSRF_TRUSTED_ORIGINS = [f"https://{host}" for host in ALLOWED_HOSTS]


# --- Applications ---------------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "base.apps.BaseConfig",
    "rest_framework",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
]

AUTH_USER_MODEL = "base.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "baatcheet.urls"

# The built React app lives in frontend/dist: its index.html is a template, its assets are static files.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", FRONTEND_DIST],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "baatcheet.wsgi.application"


# --- Database -------------------------------------------------------------------------------------

# Local development uses SQLite. POSTGRES_DB switches to PostgreSQL, which production requires.
# Blank user/password/host means the local socket as the app's own system user (peer authentication),
# which is how the single-instance server is set up.

if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ.get("POSTGRES_USER", ""),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", ""),
            "PORT": os.environ.get("POSTGRES_PORT", ""),
            "CONN_MAX_AGE": 60,
            "CONN_HEALTH_CHECKS": True,
        }
    }
elif DEBUG:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
else:
    raise ImproperlyConfigured("POSTGRES_DB must be set when DJANGO_DEBUG is false.")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --- Passwords ------------------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --- Internationalisation -------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# --- Static and media files -----------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # `collectstatic` target; nginx serves it in production
STATICFILES_DIRS = [FRONTEND_DIST] if FRONTEND_DIST.exists() else []

# Profile pictures live on the instance's disk. Django serves them (see baatcheet/urls.py): they are
# small, and it keeps nginx exactly as django-aws-deploy writes it.
MEDIA_URL = "media/"
MEDIA_ROOT = Path(os.environ.get("DJANGO_MEDIA_ROOT", BASE_DIR / "media"))


# --- Email ----------------------------------------------------------------------------------------

# With nothing set, development prints emails in the runserver terminal.
# setup_ses.sh fills these in on the server for AWS SES.

EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_TIMEOUT = 10  # stops a stuck mail server from hanging a request
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "BaatCheet <no-reply@baatcheet.app>")


# --- Accounts (django-allauth) --------------------------------------------------------------------

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    # Needed to log in by username in Django admin, regardless of allauth
    "django.contrib.auth.backends.ModelBackend",
    # allauth-specific methods, such as login by email
    "allauth.account.auth_backends.AuthenticationBackend",
]

ACCOUNT_LOGIN_METHODS = {"username", "email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_EMAIL_SUBJECT_PREFIX = ""  # subjects already say BaatCheet (templates/account/email/)
ACCOUNT_LOGOUT_REDIRECT_URL = "/"
# gunicorn listens on a unix socket, so REMOTE_ADDR is empty and allauth must read the client's IP from the
# X-Forwarded-For header nginx adds. Without this, allauth refuses every sign-in ("Unable to determine client IP").
ALLAUTH_TRUSTED_PROXY_COUNT = 1
LOGIN_REDIRECT_URL = "/"

# Google sign-in turns on when both values are set; the button stays hidden otherwise.
if os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"):
    SOCIALACCOUNT_PROVIDERS = {
        "google": {
            "APPS": [
                {
                    "client_id": os.environ["GOOGLE_CLIENT_ID"],
                    "secret": os.environ["GOOGLE_CLIENT_SECRET"],
                }
            ],
            "SCOPE": ["profile", "email"],
        }
    }


# --- API ------------------------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["base.api.authentication.SessionAuthentication401"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]
    + (["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
}

# The original public read API (/api/rooms/) has always been open to other origins.
CORS_ALLOW_ALL_ORIGINS = True
CORS_URLS_REGEX = r"^/api/(?!app/).*$"


# --- Production hardening, on whenever DEBUG is off -----------------------------------------------

# nginx terminates HTTPS and sets X-Forwarded-Proto; gunicorn is only reachable through nginx.

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    ACCOUNT_DEFAULT_HTTP_PROTOCOL = "https"
    # Hashed file names let nginx cache static files for a year and still pick up every deploy.
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"},
    }
    # Warnings and errors (with tracebacks) go to stderr, where systemd's journal collects them.
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {"console": {"class": "logging.StreamHandler"}},
        "root": {"handlers": ["console"], "level": "WARNING"},
    }
