from celery.utils.log import get_task_logger
from django.core.files.move import file_move_safe
from django.utils.timezone import now
from datetime import datetime
from models import *
from settings import CSV_PATH
import celery
import csv
import os

saleFieldNames = ['code','name','dep','qty','price']

logger = get_task_logger(__name__)

#import *.sale files from csv_path
#filename : locAALLZZOOMM.sale
#sale csv format is like saleFieldNames
@celery.task()
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

            moveToPath = os.path.join(CSV_PATH, file[0:3], file[3:5], file[5:7], file[7:9])
            if not os.path.exists(moveToPath):
                os.makedirs(moveToPath)
            #TODO:handle existing file
            file_move_safe(filePath,  moveToPath + '/' + file)

    #return 'import'


@celery.task()
def add(x, y):
    logger.info('%s:::Adding %s + %s' % (now(), x, y))
    return x + y


