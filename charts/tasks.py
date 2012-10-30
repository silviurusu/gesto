from collections import OrderedDict
from celery.utils.log import get_task_logger
from django.core.exceptions import MultipleObjectsReturned
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
        path = os.path.join(IMPORT_PATH, company.name.lower(), 'sales')
        files = os.listdir(path)
        count = 0
        for file in files:
            filePath = os.path.join(path, file)

            backupFolder = os.path.join(BACKUP_PATH, company.name.lower(), file[0:3], file[3:5], file[5:7], file[7:9])
            if not os.path.exists(backupFolder):
                os.makedirs(backupFolder)
            duplicateFolder = os.path.join(BACKUP_PATH, 'duplicates', company.name.lower(), file[0:3], file[3:5], file[5:7], file[7:9])
            if not os.path.exists(duplicateFolder):
                os.makedirs(duplicateFolder)

            if os.path.exists(os.path.join(backupFolder, file)):
                file_move_safe(filePath,  duplicateFolder + '/' + file)
            elif os.path.isfile(filePath) and file.endswith("sale"):
                try:
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
                            try:
                                product, created = Product.objects.get_or_create( code = row['code'], name = row['name'], category = category )
                            except MultipleObjectsReturned:
                                #get duplicates, remove reference from OperationItems and delete them
                                productIds = Product.objects.filter(code = row['code'], name = row['name'], category = category ).values_list('id', flat=True).order_by('id')
                                logger.info('======removing product ids: %s ...' % str(productIds))
                                for id in productIds[1:]:
                                    for o in OperationItems.objects.filter(product_id = id):
                                        o.product_id = productIds[0]
                                        o.save()
                                    Product.objects.get(id = id).delete()

                            saleItem.operation = sale
                            saleItem.product = product
                            saleItem.qty = row['qty']
                            saleItem.price = row['price']

                            saleItem.save()

                    #TODO:handle existing file
                    file_move_safe(filePath,  backupFolder + '/' + file)
                    count += 1
                except Exception as e:
                    logger.info('Error type: %s == with arg: %s == Error: %s == filePath: %s ==' % (type(e), e.args, e, filePath ))
                    moveToPath = os.path.join(BACKUP_PATH, 'errors', company.name.lower(), file[0:3], file[3:5], file[5:7])
                    if not os.path.exists(moveToPath):
                        os.makedirs(moveToPath)
                    file_move_safe(filePath, moveToPath  + '/' + file)
        logger.info('Imported %s sales, to %s' % ( count, company.name ))
    return 'import done'


@celery.task()
def sales_to_json():
    for company in Company.objects.filter(active=True):
        print company.name
        sales = sales_custom_sql(company.id)
        print len(sales)
        filePath = os.path.join(PROTECTEDFILES_DIR, company.name.lower(), '', 'sales.csv')
        fieldnames = ['price','qty','location','product','category','at','id']
        if not os.path.exists(os.path.split(filePath)[0]):
            os.makedirs(os.path.split(filePath)[0])
        with open(filePath,'wb') as f:
            dw = csv.writer(f, delimiter=',')
            dw.writerow(fieldnames)
            for row in sales:
                dw.writerow(row)

        logger.info('Exported '+company.name+' sales')
    return 'Exported '+company.name+' sales, done!'


def dashsales_custom_sql(company_id):
    from django.db import connection, transaction
    cursor = connection.cursor()

    today = datetime.datetime.now()
    int1 = today - timedelta(days=90)
    int2 = today
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

@celery.task()
def dashsales_to_json():

    for company in Company.objects.filter(active=True):
        filePath = os.path.join(PROTECTEDFILES_DIR, company.name.lower(), '', 'homesales.csv')
        if not os.path.exists(os.path.split(filePath)[0]):
            os.makedirs(os.path.split(filePath)[0])

        fieldnames = ['date']
        for location in Location.objects.filter(company = company):
            fieldnames.append(location.code)

        sales = dashsales_custom_sql(company.id)
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

    return 'Exported dashsales, done!'