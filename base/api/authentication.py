from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """Session auth that answers 401, not 403, when nobody is signed in.

    The React app sends the browser to the sign-in page on a 401, and shows "not allowed" on a 403,
    so the two must differ. DRF only sends 401 when the scheme names a WWW-Authenticate challenge.
    """

    def authenticate_header(self, request):
        return "Session"
