"""
Logger setup
"""

import logging

from app.configs import config


def setup_logger():
    logger = logging.getLogger(config.LOGGER)

    if not logger.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s: %(message)s"
        )

    return logger

