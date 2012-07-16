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





def sales(request):
    tasks.add.delay(2,3)
    return render(request, 'vanzari.html')
#    return HttpResponse(data, mimetype="text/html")

