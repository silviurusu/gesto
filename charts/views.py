from datetime import datetime
from django.core.files.move import file_move_safe
from django.http import HttpResponse
from django.shortcuts import render
from django.core import serializers
from models import *
from charts import  tasks
import csv
import os

#csv_path = 'd:/Dropbox/Shares/Prospero700/'
from settings import CSV_PATH

saleFieldNames = ['code','name','dep','qty','price']

#import *.sale files from csv_path
#filename : locAALLZZOOMM.sale
#sale csv format is like saleFieldNames

def csv_to_sales(request):
    files = os.listdir(CSV_PATH)
    for file in files:
        filePath = os.path.join(CSV_PATH, file)
        if os.path.isfile(filePath) and file.endswith("sale"):

            fileDate = datetime.strptime( file[3:13], '%y%m%d%H%M')
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

            moveToPath = os.path.join(CSV_PATH, file[3:9])
            if not os.path.exists(moveToPath):
                os.makedirs(moveToPath)
#            handle existing file
            file_move_safe(filePath,  moveToPath + '/' + file)

    return render(request, 'vanzari.html')

def sales_to_json(request):
#   magazin,datetime,nrfact,cod,denumire,cant,pret,valoare,categorie
    sales = OperationItems.objects.all()
    data = serializers.serialize('json', sales, relations={'operation':{
                                                                    'relations':('gestiune',)
                                                                },
                                                           'product':{'fields':('name',)}})
    print data
    filePath = os.path.join(CSV_PATH, 'jsonSales.json')
    print filePath
    f = open(filePath,'w')
    f.write(data)
    f.close()

    return render(request, 'vanzari.html')


def sales(request):
    tasks.add.delay(2,3)
    return render(request, 'vanzari.html')
#    return HttpResponse(data, mimetype="text/html")

