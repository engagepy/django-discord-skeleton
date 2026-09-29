from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render
from django.template import TemplateDoesNotExist
from django.views.decorators.csrf import ensure_csrf_cookie

MISSING_BUILD = (
    "The frontend isn't built yet. Run: cd frontend && npm install && npm run build "
    "(or use the Vite dev server on http://localhost:5173 while developing)."
)


@login_required
@ensure_csrf_cookie
def app(request, **kwargs):
    """Every page is the React app. Signing in (and the redirect to it) still happens server-side."""
    try:
        return render(request, "index.html")
    except TemplateDoesNotExist:
        return HttpResponse(MISSING_BUILD, status=503, content_type="text/plain")
