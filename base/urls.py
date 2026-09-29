from django.urls import include, path

from . import views

# The same addresses as the original server-rendered app, so old links and bookmarks keep working.
# Each one now serves the React app, which routes on the same paths (frontend/src/routes.ts).
urlpatterns = [
    path("accounts/", include("allauth.urls")),
    path("", views.home, name="home"),
    path("room/<str:id>/", views.app, name="room"),
    path("profile/<str:id>", views.app, name="userprofile"),
    path("createroom/", views.app, name="createroom"),
    path("updateroom/<str:id>/", views.app, name="updateroom"),
    path("deleteroom/<str:id>/", views.app, name="deleteroom"),
    path("deletemessage/<str:id>/", views.app, name="deletemessage"),
    path("updateuser/", views.app, name="updateuser"),
    path("topics/", views.app, name="topics"),
    path("activity/", views.app, name="activity"),
]
