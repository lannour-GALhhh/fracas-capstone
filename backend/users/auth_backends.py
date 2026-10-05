from django.contrib.auth.backends import ModelBackend


class ActivatedModelBackend(ModelBackend):
    """Reject accounts that haven't completed activation.

    Failing here (rather than in a view) makes a pending account indistinguishable
    from a wrong username/password everywhere credentials are checked — JWT login,
    djoser, the Django admin — so the response never reveals that the account exists.
    """

    def user_can_authenticate(self, user):
        return super().user_can_authenticate(user) and user.is_activated
