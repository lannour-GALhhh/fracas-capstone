from unittest import mock

import requests
from django.test import SimpleTestCase

from users.senders import SendError, get_push_provider, get_sms_provider
from users.senders.push import ConsolePushProvider
from users.senders.sms import ConsoleSmsProvider, UniSmsProvider


class ProviderRegistryTests(SimpleTestCase):
    def test_defaults_are_console(self):
        self.assertIsInstance(get_sms_provider(), ConsoleSmsProvider)
        self.assertIsInstance(get_push_provider(), ConsolePushProvider)

    def test_explicit_selection(self):
        self.assertIsInstance(get_sms_provider("console"), ConsoleSmsProvider)

    def test_unknown_provider_raises(self):
        with self.assertRaises(SendError):
            get_sms_provider("nope")
        with self.assertRaises(SendError):
            get_push_provider("nope")


class UniSmsProviderTests(SimpleTestCase):
    def setUp(self):
        env = {"UNISMS_API_KEY": "sk_test", "UNISMS_SENDER_ID": "FRACAS"}
        patcher = mock.patch("users.senders.sms.config", side_effect=lambda k, **_: env[k])
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_registered(self):
        self.assertIsInstance(get_sms_provider("unisms"), UniSmsProvider)

    @mock.patch("users.senders.sms.requests.post")
    def test_send_posts_basic_auth_json(self, post):
        UniSmsProvider().send("+639123456789", "hi")
        _, kwargs = post.call_args
        self.assertEqual(
            kwargs["json"],
            {"recipient": "+639123456789", "content": "hi", "sender_id": "FRACAS"},
        )
        self.assertEqual(kwargs["auth"], ("sk_test", ""))
        post.return_value.raise_for_status.assert_called_once()

    @mock.patch("users.senders.sms.requests.post", side_effect=requests.ConnectionError("down"))
    def test_failure_raises_send_error(self, _post):
        with self.assertRaises(SendError):
            UniSmsProvider().send("+639123456789", "hi")
