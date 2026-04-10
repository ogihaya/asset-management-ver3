import os
from logging.config import fileConfig

# Load environment variables
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

import app.infrastructure.db.models  # noqa: F401
from alembic import context
from app.infrastructure.db.models import Base

load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def get_database_url() -> str | None:
    """
    データベースURLを取得
    優先順位:
    1. DATABASE_URL 環境変数（ローカル開発用）
    2. 個別の環境変数から組み立て（ECS/Secrets Manager用）
    """
    # 1. DATABASE_URL が設定されていればそれを使用
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url

    # 2. 個別の環境変数から組み立て（ECS環境用）
    db_host = os.getenv('DB_HOST')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')

    if all([db_host, db_name, db_user, db_password]):
        return (
            f'postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
        )

    return None


database_url = get_database_url()
if database_url:
    config.set_main_option('sqlalchemy.url', database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )

    with context.begin_transaction():
        context.run_migrations()


# 基本的にはこの関数が実行される。
def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
