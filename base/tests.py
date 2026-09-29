import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart

from base.models import Message, Room, Topic, User

pytestmark = pytest.mark.django_db

ROOT = Path(__file__).resolve().parent.parent
# A 1x1 transparent GIF, enough for Pillow to accept it as an image.
TINY_GIF = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"


def make_user(username):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="pw-12345-xyz"
    )


@pytest.fixture
def alice():
    return make_user("alice")


@pytest.fixture
def bob():
    return make_user("bob")


@pytest.fixture
def room(alice):
    return Room.objects.create(
        host=alice, topic=Topic.objects.create(name="Python"), name="Django tips", description="Share them"
    )


def client_for(user):
    client = Client(enforce_csrf_checks=False)
    client.force_login(user)
    return client


# --- Pages: the original addresses still work ------------------------------------------------------

OLD_PAGES = [
    "/",
    "/room/1/",
    "/profile/1",
    "/createroom/",
    "/updateroom/1/",
    "/deleteroom/1/",
    "/deletemessage/1/",
    "/updateuser/",
    "/topics/",
    "/activity/",
]


@pytest.mark.parametrize("url", OLD_PAGES)
def test_old_pages_need_sign_in(client, url):
    response = client.get(url)
    assert response.status_code == 302
    assert response["Location"].startswith("/accounts/login/?next=")


@pytest.mark.parametrize("url", OLD_PAGES)
def test_old_pages_serve_the_react_app(alice, url, settings, tmp_path):
    (tmp_path / "index.html").write_text('<div id="root"></div>')
    settings.TEMPLATES = [{**settings.TEMPLATES[0], "DIRS": [tmp_path]}]
    response = client_for(alice).get(url)
    assert response.status_code == 200
    assert b'<div id="root"></div>' in response.content
    assert "csrftoken" in response.cookies  # the app sends it back on every change


def test_sign_in_pages_render(client):
    for url in ["/accounts/login/", "/accounts/signup/", "/accounts/password/reset/"]:
        response = client.get(url)
        assert response.status_code == 200, url
        assert b"BaatCheet" in response.content


# --- The original public API is unchanged ---------------------------------------------------------


def test_public_api_unchanged(client, room):
    assert client.get("/api/").json() == ["GET /api", "GET /api/rooms", "GET /api/rooms/:id"]
    rooms = client.get("/api/rooms/").json()
    assert rooms[0]["name"] == "Django tips" and rooms[0]["host"] == room.host_id
    assert client.get(f"/api/rooms/{room.id}/").json()["description"] == "Share them"


def test_public_api_allows_other_origins(client, room):
    response = client.get("/api/rooms/", HTTP_ORIGIN="https://elsewhere.example")
    assert response["Access-Control-Allow-Origin"] == "*"


def test_app_api_is_not_cross_origin(alice):
    response = client_for(alice).get("/api/app/me/", HTTP_ORIGIN="https://elsewhere.example")
    assert "Access-Control-Allow-Origin" not in response


# --- The app's API --------------------------------------------------------------------------------


def test_app_api_answers_401_when_signed_out(client):
    # Regression: DRF's plain SessionAuthentication answers 403, which the app reads as "not allowed"
    # instead of sending the user to sign in.
    assert client.get("/api/app/home/").status_code == 401


def test_home_search_matches_theme_name_and_description(alice, room):
    Room.objects.create(host=alice, topic=Topic.objects.create(name="Music"), name="Jazz")
    api = client_for(alice)
    assert api.get("/api/app/home/").json()["room_count"] == 2
    for q in ["pyth", "tips", "share"]:
        data = api.get("/api/app/home/", {"q": q}).json()
        assert [r["name"] for r in data["rooms"]] == ["Django tips"], q


def test_home_activity_is_the_latest_six_in_matching_themes(alice, room):
    for i in range(8):
        Message.objects.create(user=alice, room=room, body=f"reply {i}")
    data = client_for(alice).get("/api/app/home/").json()
    assert len(data["activity"]) == 6
    assert data["activity"][0]["body"] == "reply 7"
    assert client_for(alice).get("/api/app/home/", {"q": "music"}).json()["activity"] == []


def test_create_room_makes_a_new_theme_when_needed(alice):
    response = client_for(alice).post(
        "/api/app/rooms/",
        {"topic": "Rust", "name": "Borrowing", "description": ""},
        content_type="application/json",
    )
    assert response.status_code == 201
    room = Room.objects.get(id=response.json()["id"])
    assert (room.host, room.topic.name, room.name) == (alice, "Rust", "Borrowing")


def test_only_the_host_can_edit_or_delete_a_room(room, bob):
    api = client_for(bob)
    body = {"topic": "X", "name": "Hijacked"}
    assert api.patch(f"/api/app/rooms/{room.id}/", body, content_type="application/json").status_code == 403
    assert api.delete(f"/api/app/rooms/{room.id}/").status_code == 403
    room.refresh_from_db()
    assert room.name == "Django tips"


def test_host_edits_and_deletes_a_room(room, alice):
    api = client_for(alice)
    body = {"topic": "Web", "name": "Renamed", "description": "New"}
    assert api.patch(f"/api/app/rooms/{room.id}/", body, content_type="application/json").status_code == 200
    room.refresh_from_db()
    assert (room.topic.name, room.name, room.description) == ("Web", "Renamed", "New")
    assert api.delete(f"/api/app/rooms/{room.id}/").status_code == 204
    assert not Room.objects.exists()


def test_replying_joins_the_room(room, bob):
    api = client_for(bob)
    response = api.post(
        f"/api/app/rooms/{room.id}/messages/", {"body": "hi"}, content_type="application/json"
    )
    assert response.status_code == 201
    detail = api.get(f"/api/app/rooms/{room.id}/").json()
    assert [p["username"] for p in detail["participants"]] == ["bob"]
    assert detail["participant_count"] == 1
    assert [m["body"] for m in detail["messages"]] == ["hi"]


def test_room_messages_read_oldest_first(room, alice):
    for body in ["first", "second"]:
        Message.objects.create(user=alice, room=room, body=body)
    messages = client_for(alice).get(f"/api/app/rooms/{room.id}/").json()["messages"]
    assert [m["body"] for m in messages] == ["first", "second"]


def test_only_the_author_deletes_a_reply(room, alice, bob):
    message = Message.objects.create(user=alice, room=room, body="mine")
    assert client_for(bob).delete(f"/api/app/messages/{message.id}/").status_code == 403
    assert client_for(alice).delete(f"/api/app/messages/{message.id}/").status_code == 204
    assert not Message.objects.exists()


def test_missing_things_are_404(alice):
    api = client_for(alice)
    assert api.get("/api/app/rooms/999/").status_code == 404
    assert api.get("/api/app/users/999/").status_code == 404


def test_topics_counts_and_search(alice, room):
    Topic.objects.create(name="Music")
    data = client_for(alice).get("/api/app/topics/", {"q": "py"}).json()
    assert data == {"topics": [{"id": room.topic_id, "name": "Python", "room_count": 1}], "total": 2}


def test_profile_lists_hosted_rooms_and_replies(alice, bob, room):
    Message.objects.create(user=alice, room=room, body="hello")
    data = client_for(bob).get(f"/api/app/users/{alice.id}/").json()
    assert data["user"]["username"] == "alice"
    assert "email" not in data["user"]  # other people's emails stay private
    assert [r["name"] for r in data["rooms"]] == ["Django tips"]
    assert [m["body"] for m in data["activity"]] == ["hello"]


def test_default_avatar_is_drawn_by_the_app(alice):
    assert client_for(alice).get("/api/app/me/").json()["avatar"] is None


def test_edit_profile_with_a_picture(alice, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    api = client_for(alice)
    picture = SimpleUploadedFile("me.gif", TINY_GIF, content_type="image/gif")
    body = encode_multipart(BOUNDARY, {"avatar": picture, "name": "Alice", "bio": "Hi"})
    response = api.patch("/api/app/me/", body, content_type=MULTIPART_CONTENT)
    assert response.status_code == 200, response.content
    me = response.json()
    assert (me["name"], me["bio"]) == ("Alice", "Hi")
    assert me["avatar"].startswith("/media/uploads/")
    assert api.get(me["avatar"]).status_code == 200  # served from disk by Django


def test_edit_profile_rejects_a_taken_email(alice, bob):
    response = client_for(bob).patch("/api/app/me/", {"email": alice.email}, content_type="application/json")
    assert response.status_code == 400
    assert "email" in response.json()


# --- Production settings --------------------------------------------------------------------------


def test_production_settings_pass_check_deploy():
    """The server runs `check --deploy` on every deploy; keep production settings clean."""
    env = {
        **os.environ,
        "DJANGO_DEBUG": "false",
        "DJANGO_SECRET_KEY": "x" * 60 + "-not-a-real-key-just-long-and-random-enough",
        "DJANGO_ALLOWED_HOSTS": "baatcheet.app,www.baatcheet.app",
        "POSTGRES_DB": "baatcheet",
    }
    result = subprocess.run(
        [sys.executable, "manage.py", "check", "--deploy", "--fail-level", "WARNING"],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_production_refuses_to_start_without_a_secret_key():
    env = {**os.environ, "DJANGO_DEBUG": "false", "DJANGO_SECRET_KEY": "", "POSTGRES_DB": "x"}
    result = subprocess.run(
        [sys.executable, "manage.py", "check"], cwd=ROOT, env=env, capture_output=True, text=True
    )
    assert result.returncode != 0
    assert "DJANGO_SECRET_KEY must be set" in result.stderr
