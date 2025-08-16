"""
Logger setup
"""

import logging

from app.configs import config


def setup_logger():
    return logging.getLogger(config.LOGGER)

