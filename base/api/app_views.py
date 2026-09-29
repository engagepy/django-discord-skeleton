"""
The JSON API behind the React app. Every endpoint needs a signed-in user, as every page did before,
and each one mirrors a view the server-rendered app used to have.
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from base.models import Message, Room, Topic, User

from .serializers import (
    MeSerializer,
    MessageSerializer,
    MessageWriteSerializer,
    ProfileSerializer,
    RoomCardSerializer,
    RoomDetailSerializer,
    RoomWriteSerializer,
    TopicSerializer,
    UserUpdateSerializer,
)

SIDEBAR_ACTIVITY = 6  # the "Recent Activity" column shows the latest six replies
ACTIVITY_PAGE = 100  # the full Activity page


def rooms_with_counts():
    return Room.objects.select_related("host", "topic").annotate(
        participant_count=Count("participants", distinct=True)
    )


def messages_with_rooms():
    return Message.objects.select_related("user", "room")


def not_allowed():
    raise PermissionDenied("Only its author can change this.")


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def me(request):
    """The signed-in user; PATCH edits avatar, name, email and bio (the old Edit Profile form)."""
    if request.method == "PATCH":
        form = UserUpdateSerializer(request.user, data=request.data, partial=True)
        form.is_valid(raise_exception=True)
        form.save()
    return Response(MeSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def home(request):
    """Rooms matching ?q= by theme, name or description, plus replies in matching themes."""
    q = request.GET.get("q", "")
    rooms = rooms_with_counts().filter(
        Q(topic__name__icontains=q) | Q(name__icontains=q) | Q(description__icontains=q)
    )
    activity = messages_with_rooms().filter(room__topic__name__icontains=q)[:SIDEBAR_ACTIVITY]
    return Response(
        {
            "rooms": RoomCardSerializer(rooms, many=True).data,
            "room_count": rooms.count(),
            "activity": MessageSerializer(activity, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def topics(request):
    """Themes matching ?q=, each with its room count, and the total number of themes."""
    q = request.GET.get("q", "")
    matching = Topic.objects.filter(name__icontains=q).annotate(room_count=Count("room")).order_by("id")
    return Response({"topics": TopicSerializer(matching, many=True).data, "total": Topic.objects.count()})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity(request):
    messages = messages_with_rooms()[:ACTIVITY_PAGE]
    return Response({"activity": MessageSerializer(messages, many=True).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_room(request):
    form = RoomWriteSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    topic, _ = Topic.objects.get_or_create(name=form.validated_data["topic"])
    room = Room.objects.create(
        host=request.user,
        topic=topic,
        name=form.validated_data["name"],
        description=form.validated_data["description"],
    )
    return Response({"id": room.id}, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def room(request, id):
    """A room with its conversation and participants. Only the host may edit or delete it."""
    room = get_object_or_404(rooms_with_counts(), id=id)

    if request.method == "GET":
        return Response(RoomDetailSerializer(room).data)
    if room.host != request.user:
        not_allowed()
    if request.method == "DELETE":
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    form = RoomWriteSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    room.topic, _ = Topic.objects.get_or_create(name=form.validated_data["topic"])
    room.name = form.validated_data["name"]
    room.description = form.validated_data["description"]
    room.save()
    return Response({"id": room.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def post_message(request, id):
    """Reply in a room; replying makes you a participant."""
    room = get_object_or_404(Room, id=id)
    form = MessageWriteSerializer(data=request.data)
    form.is_valid(raise_exception=True)
    message = Message.objects.create(user=request.user, room=room, body=form.validated_data["body"])
    room.participants.add(request.user)
    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_message(request, id):
    message = get_object_or_404(Message, id=id)
    if message.user != request.user:
        not_allowed()
    message.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request, id):
    """A user's profile: about, the rooms they host, and their latest replies."""
    user = get_object_or_404(User, id=id)
    return Response(
        {
            "user": ProfileSerializer(user).data,
            "rooms": RoomCardSerializer(rooms_with_counts().filter(host=user), many=True).data,
            "activity": MessageSerializer(
                messages_with_rooms().filter(user=user)[:SIDEBAR_ACTIVITY], many=True
            ).data,
        }
    )
