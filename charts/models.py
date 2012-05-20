from django.contrib.auth.models import User
from django.db import models

from userena.models import UserenaLanguageBaseProfile


class Profile(UserenaLanguageBaseProfile):

    user = models.OneToOneField(User,
        unique=True,
        verbose_name='user',
        related_name='profile')


class Category (models.Model):

    name = models.CharField(max_length=50)

class Product (models.Model):

    code = models.CharField(max_length = 10)
    name = models.CharField(max_length = 50)
    qty = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

class OperationType(models.Model):
    name = models.CharField(max_length=50)


class Operation (models.Model):

    type = models.ForeignKey(OperationType)
    gestiune = models.ForeignKey('Gestiune')
    operation_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)



class OperationItems (models.Model):
    operation = models.ForeignKey(Operation,  null=False, related_name = 'items')
    product = models.ForeignKey(Product,  null=False, related_name = 'operations')
    qty = models.DecimalField(null=False, max_digits=5, decimal_places=2)
    price = models.DecimalField(null=False, max_digits=5, decimal_places=2)

class Gestiune (models.Model):
    name = models.CharField(max_length=50)

class Stoc(models.Model):

    gestiune = models.ForeignKey(Gestiune)
    product = models.ForeignKey(Product)
    qty = models.DecimalField(null=False, max_digits=5, decimal_places=2)