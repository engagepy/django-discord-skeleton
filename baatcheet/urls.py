from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve


def media(request, path):
    """Profile pictures, from the instance's disk in every environment (see MEDIA_ROOT in settings)."""
    return serve(request, path, document_root=settings.MEDIA_ROOT)


urlpatterns = [
    path("", include("base.urls")),
    path("admin/", admin.site.urls),
    path("api/", include("base.api.urls")),
    re_path(r"^media/(?P<path>.*)$", media),
]
