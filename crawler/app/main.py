from app.config.logging import logger
from app.workers.rabbitmq_worker import run_worker


def main() -> None:
    logger.info("Starting crawler worker")
    run_worker()


if __name__ == "__main__":
    main()
