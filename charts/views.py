from django.contrib.auth.decorators import login_required
from django.core.files.move import file_move_safe
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render
from django.core import serializers
import monthdelta
from local_settings import CSV_PATH, PROTECTEDFILES_DIR
from models import *
from charts import  tasks
import csv
import os
saleFieldNames = ['code','name','dep','qty','price']

def csv_to_sales(request):
    files = os.listdir(CSV_PATH)
    count = 0
    for file in files:
        filePath = os.path.join(CSV_PATH, file)
        if os.path.isfile(filePath) and file.endswith("sale"):

            fileDate = datetime.datetime.strptime( file[3:13], '%y%m%d%H%M')
            operationType = OperationType.objects.get(name = 'sale')
            gestiune, created = Gestiune.objects.get_or_create(name = file[:3])
            sale = Operation.objects.create(type = operationType,
                gestiune = gestiune,
                operation_at = fileDate)

            with open(filePath) as f:
            #                dataReader = csv.reader(f, delimiter=',', quotechar='"')
                dataReader = csv.DictReader(f, fieldnames=saleFieldNames, delimiter=',', quotechar='"')
                for row in dataReader:

                    saleItem = OperationItems()
                    dep, created = Category.objects.get_or_create(name = row['dep'])
                    product, created = Product.objects.get_or_create( code = row['code'], name = row['name'], dep = dep )

                    saleItem.operation = sale
                    saleItem.product = product
                    saleItem.qty = row['qty']
                    saleItem.price = row['price']

                    saleItem.save()

            moveToPath = os.path.join(CSV_PATH, file[0:3], file[3:5], file[5:7], file[7:9])
            if not os.path.exists(moveToPath):
                os.makedirs(moveToPath)
                #TODO:handle existing file
            file_move_safe(filePath,  moveToPath + '/' + file)
            count += 1
#    logger.info('Imported %s sales' % count )
    return render(request, 'vanzari.html')

def my_custom_sql():
    from django.db import connection, transaction
    cursor = connection.cursor()

    today = datetime.datetime.now()
    int1 = today - monthdelta.MonthDelta(1)
    int2 = today + monthdelta.MonthDelta(1)
    s1 = datetime.datetime.strftime(int1.replace(day=1, hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")
    s2 = datetime.datetime.strftime(int2.replace(day=1, hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")

    cursor.execute('SELECT  charts_operationitems.price as price, charts_operationitems.qty as qty, charts_gestiune.name as gestiune, charts_product.name as product, charts_operation.operation_at as at, charts_operation.id as id \
                                        FROM charts_operationitems ,  charts_operation ,  charts_product ,  charts_gestiune \
                                        WHERE  `operation_at` < "'+s2+'" \
                                        AND `operation_at` > "'+s1+'" \
                                        AND charts_operation.id = charts_operationitems.operation_id \
                                        AND charts_operationitems.product_id = charts_product.id \
                                        AND charts_gestiune.id = gestiune_id')
    rows = cursor.fetchall()

    return rows

def sales_to_json(request):
    sales = my_custom_sql()
    print len(sales)
    filePath = os.path.join('c:/Python27/Scripts/dashboard/protected', '', 'sales.csv')
    fieldnames = ['price','qty','gestiune','product','at','id']
    with open(filePath,'wb') as f:
        dw = csv.writer(f, delimiter=',')
        dw.writerow(fieldnames)
        for row in sales:
            dw.writerow(row)

    return render(request, 'vanzari.html')
#    return HttpResponse(data, mimetype="text/html")

@login_required
def nginx_accel(request):
    '''
    default django view, where id is an argument that identifies
    the ressource to be protected
    '''
    allowed = False

    # do your permission things here, and set allowed to True if applicable
    if request.user.email == 'a@a.com':
        allowed = True


    if allowed:
        response = HttpResponse()
        url = '/protected/sales.csv' # this will obviously be different for every ressource
        # let nginx determine the correct content type
        response['Content-Type']="application/json"
        response['Content-Disposition']="attachment; filename='sales.csv'"
        response['X-Accel-Redirect'] = url
        return response

    return HttpResponseForbidden()