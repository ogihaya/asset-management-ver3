from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings

settings = get_settings()

user = settings.postgres_user
password = settings.postgres_password
host = settings.postgres_host
port = settings.postgres_port
db_name = settings.postgres_db

# データベースのURLを設定
DATABASE_URI = f'postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}'

# エンジンの作成
engine = create_engine(DATABASE_URI, pool_size=10, max_overflow=20, echo=False)

# セッションの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
