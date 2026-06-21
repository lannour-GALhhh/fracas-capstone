from django.db import models

# Create your models here.

# Add each user regitration
class User(models.Model):
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)

    phone_number = models.CharField(max_length=15)
    email = models.CharField(max_length=255, blank=True, null=True)