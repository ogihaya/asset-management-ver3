import logging
import sys
from pathlib import Path


def setup_logging():
    log_dir = Path(__file__).resolve().parent.parent.parent / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file_path = log_dir / 'app.log'

    logging.basicConfig(
        level=logging.DEBUG,
        # ファイル名・行番号・関数名まで表示して原因追跡を容易にする
        format='%(asctime)s [%(levelname)s] %(name)s %(pathname)s:%(lineno)d %(funcName)s: %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file_path),
        ],
    )
