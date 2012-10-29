from collections import OrderedDict
from datetime import timedelta
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.files.move import file_move_safe
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render, render_to_response
from local_settings import PROTECTEDFILES_DIR, BACKUP_PATH
from models import *
import csv
import os
saleFieldNames = ['code','name','dep','qty','price']

def sales(request, template):

    company = request.user.profile.company
    locations = Location.objects.filter(company = company)

    return render(request, 'vanzari.html', {'locations':locations})

def my_custom_sql(company_id):
    from django.db import connection, transaction
    cursor = connection.cursor()

    today = datetime.datetime.now()
    int1 = today - timedelta(days=90)
    int2 = today + timedelta(days=1)
    s1 = datetime.datetime.strftime(int1.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")
    s2 = datetime.datetime.strftime(int2.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")

    cursor.execute('SELECT charts_operation.operation_at as at, charts_location.code as location, SUM(charts_operationitems.price * charts_operationitems.qty) AS sum  \
                    FROM charts_operationitems ,  charts_operation ,  charts_product ,  charts_location, charts_category \
                    WHERE  `operation_at` <   "'+s2+'"\
                        AND `operation_at` >  "'+s1+'" \
                        AND charts_operation.id = charts_operationitems.operation_id \
                        AND charts_operationitems.product_id = charts_product.id \
                        AND charts_location.id = location_id \
                        AND charts_location.company_id = "'+str(company_id)+'"\
                        AND charts_product.category_id = charts_category.id \
                    GROUP BY day(at), location \
                    ORDER BY at')
    rows = cursor.fetchall()

    return rows

class AutoVivification(dict):
    """Implementation of perl's autovivification feature."""
    def __getitem__(self, item):
        try:
            return dict.__getitem__(self, item)
        except KeyError:
            value = self[item] = type(self)()
            return value


def str_or_zero(dict, field):
    return '{0:.0f}'.format(dict[field]) if field in dict else 0

def sales_to_json(request):

    for company in Company.objects.filter(active=True):
        filePath = os.path.join(PROTECTEDFILES_DIR, company.name.lower(), 'homesales.csv')
        if not os.path.exists(os.path.split(filePath)[0]):
            os.makedirs(os.path.split(filePath)[0])

        fieldnames = ['date']
        for location in Location.objects.filter(company = company):
            fieldnames.append(location.code)

        sales = my_custom_sql(company.id)
        pivot = AutoVivification()
        for row in sales:
            day = datetime.datetime.strftime(row[0],"%Y%m%d")
            pivot[day][row[1]]=row[2]
        pivot = OrderedDict(sorted(pivot.items(), key=lambda t: t[0]))
        with open(filePath,'wb') as f:
            dw = csv.writer(f, delimiter=',')
            dw.writerow(fieldnames)
            for k, v in pivot.items():
                dw.writerow([k] + [str_or_zero(v,field) for field in fieldnames[1:]])


    return render(request, 'dashboard.html')
#    return HttpResponse(data, mimetype="text/html")

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