from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render, render_to_response
from models import *

saleFieldNames = ['code','name','dep','qty','price']

@login_required
def sales(request, template):

    company = request.user.profile.company
    locations = Location.objects.filter(company = company)

    return render(request, 'vanzari.html', {'locations':locations})

@login_required
def nginx_accel_sales(request):

    if request.user.profile.company.active:
        response = HttpResponse()
        url = '/protected/'+request.user.profile.company.name.lower()+'/sales.csv' # this will obviously be different for every ressource
        # let nginx determine the correct content type
        response['Content-Type']="application/json"
        response['Content-Disposition']="attachment; filename='sales.csv'"
        response['X-Accel-Redirect'] = url
        return response

    return HttpResponseForbidden()

@login_required
def nginx_accel_homesales(request):

    if request.user.profile.company.active:
        response = HttpResponse()
        url = '/protected/'+request.user.profile.company.name.lower()+'/homesales.csv' # this will obviously be different for every ressource
        # let nginx determine the correct content type
        response['Content-Type']="application/json"
        response['Content-Disposition']="attachment; filename='homesales.csv'"
        response['X-Accel-Redirect'] = url
        return response

    return HttpResponseForbidden()

def productList(request):

    query = request.GET.get('query')
#    check for empty query
#    not case sensitive cases
#    sanitize?
    products = Product.objects.filter(name__istartswith=query)
    products = serializers.serialize('json', products, fields=('name'))

    return HttpResponse(products, mimetype="application/json")