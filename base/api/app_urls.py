from django.urls import path

from . import app_views

urlpatterns = [
    path("me/", app_views.me),
    path("home/", app_views.home),
    path("topics/", app_views.topics),
    path("activity/", app_views.activity),
    path("rooms/", app_views.create_room),
    path("rooms/<int:id>/", app_views.room),
    path("rooms/<int:id>/messages/", app_views.post_message),
    path("messages/<int:id>/", app_views.delete_message),
    path("users/<int:id>/", app_views.profile),
]
