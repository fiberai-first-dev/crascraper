import logging

def setup_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [CRAWLER] %(levelname)s %(message)s",
    )
    return logging.getLogger("crawler")


logger = setup_logging()
