from datetime import timedelta
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.files.move import file_move_safe
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render
from local_settings import CSV_PATH, PROTECTEDFILES_DIR
from models import *
import csv
import os
saleFieldNames = ['code','name','dep','qty','price']

def csv_to_sales(request):
    for company in Company.objects.filter(active=1):
        path = os.path.join(CSV_PATH, company.name, 'sales')
        files = os.listdir(path)
        count = 0
        for file in files:
            filePath = os.path.join(path, file)
            if os.path.isfile(filePath) and file.endswith("sale"):

                fileDate = datetime.datetime.strptime( file[3:13], '%y%m%d%H%M')
                operationType = OperationType.objects.get(name = 'sale')
                location, created = Location.objects.get_or_create(name = file[:3], company = company)
                sale = Operation.objects.create(type = operationType,
                    location = location,
                    operation_at = fileDate)

                with open(filePath) as f:
                #                dataReader = csv.reader(f, delimiter=',', quotechar='"')
                    rows = csv.DictReader(f, fieldnames=saleFieldNames, delimiter=',', quotechar='"')
                    for row in rows:

#                        saleItem = OperationItems()
                        dep, created = Category.objects.get_or_create(name=row['dep'], company=company)
                        product, created = Product.objects.get_or_create( code=row['code'], name=row['name'], dep=dep )

                        saleItem = OperationItems.objects.create(qty=row['qty'], price=row['price'], product=product, operation=sale)
#                        saleItem.operation = sale
#                        saleItem.product = product
#                        saleItem.qty = row['qty']
#                        saleItem.price = row['price']
#
#                        saleItem.save()

                moveToPath = os.path.join(os.path.split(CSV_PATH)[0], file[0:3], file[3:5], file[5:7], file[7:9])
                if not os.path.exists(moveToPath):
                    os.makedirs(moveToPath)
                    #TODO:handle existing file
                file_move_safe(filePath,  moveToPath + '/' + file)
                count += 1
#        logger.info('Imported %s sales' % count )
    return render(request, 'vanzari.html')

def my_custom_sql():
    from django.db import connection, transaction
    cursor = connection.cursor()

    today = datetime.datetime.now()
    int1 = today - timedelta(days=30)
    int2 = today + timedelta(days=1)
    s1 = datetime.datetime.strftime(int1.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")
    s2 = datetime.datetime.strftime(int2.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")

    cursor.execute('SELECT  charts_operationitems.price as price, charts_operationitems.qty as qty, charts_gestiune.name as gestiune, charts_product.name as product, charts_category.name as category, charts_operation.operation_at as at, charts_operation.id as id \
                                        FROM charts_operationitems ,  charts_operation ,  charts_product ,  charts_gestiune, charts_category \
                                        WHERE  `operation_at` < "'+s2+'" \
                                        AND `operation_at` > "'+s1+'" \
                                        AND charts_operation.id = charts_operationitems.operation_id \
                                        AND charts_operationitems.product_id = charts_product.id \
                                        AND charts_gestiune.id = gestiune_id \
                                        AND charts_product.dep_id = charts_category.id ')
    rows = cursor.fetchall()

    return rows

def sales_to_json(request):
    sales = my_custom_sql()
    print len(sales)
    filePath = os.path.join(PROTECTEDFILES_DIR, '', 'sales.csv')
    fieldnames = ['price','qty','gestiune','product','category','at','id']
    with open(filePath,'wb') as f:
        dw = csv.writer(f, delimiter=',')
        dw.writerow(fieldnames)
        for row in sales:
            dw.writerow(row)

    return render(request, 'vanzari.html')
#    return HttpResponse(data, mimetype="text/html")

@login_required
def nginx_accel(request):

    if request.user.profile.company.active:
        response = HttpResponse()
        url = '/protected/'+request.user.profile.company.name+'/sales.csv' # this will obviously be different for every ressource
        # let nginx determine the correct content type
        response['Content-Type']="application/json"
        response['Content-Disposition']="attachment; filename='sales.csv'"
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
    print query
    print products
    return HttpResponse(products, mimetype="application/json")