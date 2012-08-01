from celery.utils.log import get_task_logger
from django.core.files.move import file_move_safe
from django.core import serializers
from datetime import datetime
from local_settings import CSV_PATH, PROTECTEDFILES_DIR
from models import *
import celery
import csv
import os

saleFieldNames = ['code','name','dep','qty','price']

logger = get_task_logger(__name__)

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
                                        WHERE  `operation_at` <  "'+s2+'" \
                                        AND `operation_at` >  "'+s1+'" \
                                        AND charts_operation.id = charts_operationitems.operation_id \
                                        AND charts_operationitems.product_id = charts_product.id \
                                        AND charts_gestiune.id = gestiune_id')
    rows = cursor.fetchall()

    return rows


#import *.sale files from csv_path
#filename : locAALLZZOOMM.sale
#sale csv format is like saleFieldNames
@celery.task()
def csv_to_sales():
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
    logger.info('Imported %s sales' % count )
    return 'import'


@celery.task()
def sales_to_json():
    sales = my_custom_sql()
    filePath = os.path.join(PROTECTEDFILES_DIR, '', 'sales.csv')
    fieldnames = ['price','qty','gestiune','product','at','id']
    with open(filePath,'wb') as f:
        dw = csv.writer(f, delimiter=',')
        dw.writerow(fieldnames)
        for row in sales:
            dw.writerow(row)

    logger.info('Exported sales')
    return 'export'


