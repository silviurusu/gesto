from django.contrib import admin
from charts.models import *

class CompanyAdmin(admin.ModelAdmin):
    pass

class ProductAdmin(admin.ModelAdmin):
    pass

class LocationAdmin(admin.ModelAdmin):
    pass

admin.site.register(Company, CompanyAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(Location, LocationAdmin)