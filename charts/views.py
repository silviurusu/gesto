from django.contrib.auth.decorators import login_required
from django.core.files.move import file_move_safe
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import render
from django.core import serializers
from models import *
from charts import  tasks
import csv
import os


def sales(request):
    tasks.add.delay(2,3)
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
    if request.user.username == 'vlad':
        allowed = True


    if allowed:
        response = HttpResponse()
        url = '/protected/jsonSales.json' # this will obviously be different for every ressource
        # let nginx determine the correct content type
        response['Content-Type']="application/json"
        response['Content-Disposition']="attachment; filename='jsonSales.json'"
        response['X-Accel-Redirect'] = url
        return response

    return HttpResponseForbidden()