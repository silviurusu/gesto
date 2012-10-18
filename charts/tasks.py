from celery.utils.log import get_task_logger
from django.core.files.move import file_move_safe
from datetime import datetime, timedelta
from local_settings import IMPORT_PATH, PROTECTEDFILES_DIR, BACKUP_PATH
from models import *
import celery
import csv
import os

saleFieldNames = ['code','name','dep','qty','price']

logger = get_task_logger(__name__)

def sales_custom_sql(company_id):
    from django.db import connection, transaction
    cursor = connection.cursor()

    today = datetime.datetime.now()
    int1 = today - timedelta(days=30)
    int2 = today + timedelta(days=1)
    s1 = datetime.datetime.strftime(int1.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")
    s2 = datetime.datetime.strftime(int2.replace(hour=0, minute=0, second=0),"%Y-%m-%d %M:%H:%S")

    cursor.execute('SELECT  charts_operationitems.price as price, charts_operationitems.qty as qty, charts_location.code as location, charts_product.name as product, charts_category.name as category, charts_operation.operation_at as at, charts_operation.id as id \
                                        FROM charts_operationitems ,  charts_operation ,  charts_product ,  charts_location, charts_category \
                                        WHERE  `operation_at` <  "'+s2+'" \
                                        AND `operation_at` >  "'+s1+'" \
                                        AND charts_operation.id = charts_operationitems.operation_id \
                                        AND charts_operationitems.product_id = charts_product.id \
                                        AND charts_location.id = location_id \
                                        AND charts_location.company_id = "'+str(company_id)+'" \
                                        AND charts_product.category_id = charts_category.id ')
    rows = cursor.fetchall()

    return rows


#import *.sale files from IMPORT_PATH
#filename : locAALLZZOOMM.sale
#sale csv format is like saleFieldNames
@celery.task()
def csv_to_sales():
    for company in Company.objects.filter(active=True):
        path = os.path.join(IMPORT_PATH, company.name, 'sales')
        files = os.listdir(path)
        count = 0
        for file in files:
            filePath = os.path.join(path, file)
            if os.path.isfile(filePath) and file.endswith("sale"):

                fileDate = datetime.datetime.strptime( file[3:13], '%y%m%d%H%M')
                operationType = OperationType.objects.get(name = 'sale')
                location, created = Location.objects.get_or_create(code = file[:3], company = company)
                sale = Operation.objects.create(type = operationType,
                    location = location,
                    operation_at = fileDate)

                with open(filePath) as f:
                #                dataReader = csv.reader(f, delimiter=',', quotechar='"')
                    dataReader = csv.DictReader(f, fieldnames=saleFieldNames, delimiter=',', quotechar='"')
                    for row in dataReader:

                        saleItem = OperationItems()
                        category, created = Category.objects.get_or_create(name = row['dep'], company = company)
                        product, created = Product.objects.get_or_create( code = row['code'], name = row['name'], category = category )

                        saleItem.operation = sale
                        saleItem.product = product
                        saleItem.qty = row['qty']
                        saleItem.price = row['price']

                        saleItem.save()

                moveToPath = os.path.join(BACKUP_PATH, company.name, file[0:3], file[3:5], file[5:7], file[7:9])
                if not os.path.exists(moveToPath):
                    os.makedirs(moveToPath)
                #TODO:handle existing file
                file_move_safe(filePath,  moveToPath + '/' + file)
                count += 1
        logger.info('Imported %s sales, to %s' % ( count, company.name ))
    return 'import done'


@celery.task()
def sales_to_json():
    for company in Company.objects.filter(active=True):
        print company.name
        sales = sales_custom_sql(company.id)
        print len(sales)
        filePath = os.path.join(PROTECTEDFILES_DIR, company.name, '', 'sales.csv')
        fieldnames = ['price','qty','location','product','category','at','id']
        with open(filePath,'wb') as f:
            dw = csv.writer(f, delimiter=',')
            dw.writerow(fieldnames)
            for row in sales:
                dw.writerow(row)

        logger.info('Exported '+company.name+' sales')
    return 'Exported '+company.name+' sales, done!'


