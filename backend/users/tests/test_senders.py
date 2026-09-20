from django.test import SimpleTestCase

from users.senders import SendError, get_push_provider, get_sms_provider
from users.senders.push import ConsolePushProvider
from users.senders.sms import ConsoleSmsProvider


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
