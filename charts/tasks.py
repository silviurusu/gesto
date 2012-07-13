from celery.task import task
from celery.utils.log import get_task_logger
from django.utils.timezone import now

logger = get_task_logger(__name__)


@task
def add(x, y):
    logger.info('%s:::Adding %s + %s' % (now(), x, y))
    return x + y