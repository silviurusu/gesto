from celery.utils.log import get_task_logger
import celery
from django.utils.timezone import now

logger = get_task_logger(__name__)

@celery.task()
def add(x, y):
    #logger = add.get_logger(logfile="thefootask.log")
    logger.info('%s:::Adding %s + %s' % (now(), x, y))
    print('ll000000000000000000000ging=====================================================')
    return x + y
