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

