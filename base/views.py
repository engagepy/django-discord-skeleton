from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render
from django.template import TemplateDoesNotExist
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Message, Room, Topic

MISSING_BUILD = (
    "The frontend isn't built yet. Run: cd frontend && npm install && npm run build "
    "(or use the Vite dev server on http://localhost:5173 while developing)."
)


@ensure_csrf_cookie
def react_app(request, **kwargs):
    try:
        return render(request, "index.html")
    except TemplateDoesNotExist:
        return HttpResponse(MISSING_BUILD, status=503, content_type="text/plain")


# Every page of the app is the React app, and needs a signed-in user (sign-in stays server-side).
app = login_required(react_app)


def home(request):
    """/ introduces BaatCheet to visitors; signed-in people get the app itself."""
    if request.user.is_authenticated:
        return react_app(request)
    stats = {
        "rooms": Room.objects.count(),
        "themes": Topic.objects.count(),
        "replies": Message.objects.count(),
    }
    return render(request, "landing.html", {"stats": stats})
