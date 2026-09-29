from django.urls import include, path

from . import views

urlpatterns = [
    path("", views.getRoutes),
    path("rooms/", views.getRooms),
    path("rooms/<str:id>/", views.getRoom),
    path("app/", include("base.api.app_urls")),
]
