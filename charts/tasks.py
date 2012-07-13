from celery.utils.log import get_task_logger
import celery
from django.utils.timezone import now

@celery.task()
def add(x, y):
    logger = add.get_task_logger(__name__)
    logger.info('%s:::Adding %s + %s' % (now(), x, y))
    return x + y