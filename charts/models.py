from django.contrib.auth.models import User
from django.db import models

from userena.models import *


class UserProfile(UserenaBaseProfile):
    user = models.OneToOneField(User,
        unique=True,
        verbose_name='user',
        related_name='profile')
    company = models.ForeignKey('Company', related_name='user_profiles')

class Company(models.Model):
    name = models.CharField(max_length = 50)
    vat = models.CharField(max_length = 12)
    no = models.CharField(max_length = 20)
    active = models.BooleanField(default = True)
    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    def __unicode__(self):
        return u"%s" % self.name


class Category (models.Model):
    name = models.CharField(max_length=50)
    company = models.ForeignKey(Company, null=False, related_name ='categories')

class Product (models.Model):
    code = models.CharField(max_length = 10)
    name = models.CharField(max_length = 50)
    category = models.ForeignKey(Category, default=1)
    qty = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    def __unicode__(self):
        return u"%s" % self.name

class OperationType(models.Model):
    name = models.CharField(max_length=50)


class Operation (models.Model):
    type = models.ForeignKey(OperationType)
    location = models.ForeignKey('Location', null=False, related_name='operations')
    operation_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

class OperationItems (models.Model):
    operation = models.ForeignKey(Operation,  null=False, related_name = 'items')
    product = models.ForeignKey(Product,  null=False, related_name = '+')
    qty = models.DecimalField(null=False, max_digits=5, decimal_places=2)
    price = models.DecimalField(null=False, max_digits=5, decimal_places=2)

class Location (models.Model):
    name = models.CharField(max_length=50, null=True)
    code = models.CharField(max_length=3)
    company = models.ForeignKey(Company, null=False, related_name ='locations')

    def __unicode__(self):
        return u"%s" % self.name

class Stock(models.Model):
    location = models.ForeignKey(Location)
    product = models.ForeignKey(Product)
    qty = models.DecimalField(null=False, max_digits=5, decimal_places=2)