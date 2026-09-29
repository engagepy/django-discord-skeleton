from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from base.models import Message, Room, Topic, User

# The model's default avatar pointed at a file that only ever lived on S3; the frontend draws one instead.
DEFAULT_AVATAR = User._meta.get_field("avatar").default


# --- Original public API (/api/rooms/), unchanged -------------------------------------------------


class RoomSerializer(ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"


# --- The app's API (/api/app/) --------------------------------------------------------------------


def avatar_url(user):
    if not user.avatar or user.avatar.name == DEFAULT_AVATAR:
        return None
    return user.avatar.url


class UserSummarySerializer(ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "name", "avatar"]

    def get_avatar(self, user):
        return avatar_url(user)


class ProfileSerializer(UserSummarySerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "bio", "avatar"]


class MeSerializer(UserSummarySerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "email", "bio", "avatar"]


class UserUpdateSerializer(ModelSerializer):
    """The same four fields the old profile form edited."""

    avatar = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ["avatar", "name", "email", "bio"]


class TopicSerializer(ModelSerializer):
    room_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "name", "room_count"]


class RoomCardSerializer(ModelSerializer):
    host = UserSummarySerializer()
    topic = serializers.CharField(source="topic.name", default=None)
    participant_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = ["id", "name", "description", "host", "topic", "participant_count", "created", "updated"]


class MessageSerializer(ModelSerializer):
    user = UserSummarySerializer()
    room = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "body", "user", "room", "created"]

    def get_room(self, message):
        return {"id": message.room_id, "name": message.room.name}


class RoomDetailSerializer(RoomCardSerializer):
    participants = UserSummarySerializer(many=True)
    messages = serializers.SerializerMethodField()

    class Meta(RoomCardSerializer.Meta):
        fields = RoomCardSerializer.Meta.fields + ["participants", "messages"]

    def get_messages(self, room):
        # Oldest first, so the conversation reads top to bottom like a chat.
        messages = room.message_set.select_related("user", "room").order_by("created")
        return MessageSerializer(messages, many=True).data


class RoomWriteSerializer(serializers.Serializer):
    """Create and edit a room. The theme is typed freely and created if new, as before."""

    topic = serializers.CharField(max_length=200)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(allow_blank=True, required=False, default="")


class MessageWriteSerializer(serializers.Serializer):
    body = serializers.CharField()
