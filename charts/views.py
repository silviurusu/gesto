from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers
from django.db.models.aggregates import Sum
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render
from models import *
import logging, json
logger = logging.getLogger(__name__)

saleFieldNames = ['code','name','dep','qty','price']

@login_required
def home(request, template):

    count = 0
    start_date = datetime.datetime.now().replace(hour=0, minute=0, second=0)
    end_date = datetime.datetime.now().replace(hour=23, minute=59, second=59)

    locations = Location.objects.filter(company = request.user.profile.company)
    for location in locations:
        if location.operations.filter(operation_at__range=(start_date, end_date)).count() > 0:
            count += 1

    num_customers = Operation.objects.filter(location_id__in = locations, operation_at__gte=start_date).count()
    num_products = Operation.objects.filter(location_id__in = locations, operation_at__gte=start_date).aggregate(num_prods = Sum('items__qty'))

    return render(request, 'home.html', {'count':count, 'num_products': num_products['num_prods'], 'num_customers': num_customers})

@csrf_exempt
def importSale(request):
    
    return HttpResponse(json.dumps(json.loads(request.body)))


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

    if request.user.profile.company.active:
        query = request.GET.get('query')
    #    check for empty query
    #    not case sensitive cases
    #    sanitize?

        products = Product.objects.filter(category__company = request.user.profile.company).filter(name__istartswith=query)
        products = serializers.serialize('json', products, fields=('name'))

        return HttpResponse(products, mimetype="application/json")

    return HttpResponseForbidden()