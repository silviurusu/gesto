from datetime import datetime
from django.core.files.move import file_move_safe
from django.shortcuts import render
from models import *
import csv
import sys,os

csv_path = 'd:/Dropbox/tmp/prospero/magazin1/'
saleFieldNames = ['code','name','dep','qty','price']

#import *.sale files from csv_path
#filename : locAALLZZOOMM.sale
#sale csv format is like saleFieldNames

def import_sales(request):
    files = os.listdir(csv_path)
    for file in files:
        filePath = os.path.join(csv_path, file)
        if os.path.isfile(filePath) and file.endswith("sale"):

            fileDate = datetime.strptime( file[3:15], '%y%m%d%H%M%S')
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

            moveToPath = os.path.join(csv_path, file[3:9])
            if not os.path.exists(moveToPath):
                os.makedirs(moveToPath)

            file_move_safe(filePath,  moveToPath + '/' + file)

    return render(request, 'vanzari.html')



