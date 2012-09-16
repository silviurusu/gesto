from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()
from django.contrib.auth.decorators import login_required
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'dashboard.views.home', name='home'),
    # url(r'^dashboard/', include('dashboard.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
    (r'^home/$', direct_to_template, { 'template': 'dashboard.html' }, 'homeurl'),
    (r'^vanzari/$', login_required(direct_to_template), { 'template': 'vanzari.html' }, 'vanzariurl'),
    (r'^stocuri/$', login_required(direct_to_template), { 'template': 'stocuri.html' }, 'stocuriurl'),
    (r'^import/$', 'charts.views.csv_to_sales'),
    (r'^export/$', 'charts.views.sales_to_json'),
    (r'^products/$', 'charts.views.productList'),
    (r'^json/$', 'charts.views.nginx_accel'),
    (r'^accounts/', include('userena.urls')),
)
