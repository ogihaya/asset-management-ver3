"""pytest共通設定とフィクスチャ"""

import os
from collections.abc import Generator
from unittest.mock import MagicMock

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.infrastructure.db.models  # noqa: F401
from app.application.interfaces.security_service import ISecurityService
from app.domain.repositories.user_repository import IUserRepository
from app.infrastructure.db.models.base import Base


def _ensure_test_settings_env() -> None:
    """テストに必要な最低限の設定値を環境変数へ投入"""
    os.environ.setdefault('POSTGRES_USER', 'test_user')
    os.environ.setdefault('POSTGRES_PASSWORD', 'test_password')
    os.environ.setdefault('POSTGRES_DB', 'test_db')
    os.environ.setdefault('POSTGRES_HOST', 'localhost')
    os.environ.setdefault('POSTGRES_PORT', '5432')

    if not os.getenv('JWT_PRIVATE_KEY') or not os.getenv('JWT_PUBLIC_KEY'):
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = private_key.public_key()

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        os.environ['JWT_PRIVATE_KEY'] = private_pem.decode('utf-8').replace('\n', '\\n')
        os.environ['JWT_PUBLIC_KEY'] = public_pem.decode('utf-8').replace('\n', '\\n')


_ensure_test_settings_env()


@pytest.fixture(scope='session')
def test_db_engine():
    """テスト用DBエンジン（環境変数に応じてSQLiteまたはPostgreSQL）"""
    # CI環境ではDATABASE_URLを使用、ローカルではSQLiteインメモリ
    database_url = os.getenv('DATABASE_URL', 'sqlite:///:memory:')

    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope='function')
def clean_database(test_db_engine) -> Generator[None, None, None]:
    """各テスト前後でテーブル内容を初期化する"""
    with test_db_engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())

    yield

    with test_db_engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


@pytest.fixture(scope='function')
def session_factory(clean_database, test_db_engine):
    """テスト用セッションファクトリ"""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_db_engine)


@pytest.fixture(scope='function')
def db_session(session_factory) -> Generator[Session, None, None]:
    """テスト用DBセッション（各テストで独立）"""
    session = session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope='function')
def fresh_db_session(session_factory):
    """必要なタイミングで新しいDBセッションを作る"""
    sessions: list[Session] = []

    def _create() -> Session:
        session = session_factory()
        sessions.append(session)
        return session

    yield _create

    for session in reversed(sessions):
        session.rollback()
        session.close()


@pytest.fixture
def mock_user_repository() -> MagicMock:
    """モックUserRepository"""
    mock_repo = MagicMock(spec=IUserRepository)
    return mock_repo


@pytest.fixture
def mock_security_service() -> MagicMock:
    """モックSecurityService"""
    mock_service = MagicMock(spec=ISecurityService)
    return mock_service


@pytest.fixture(scope='module')
def test_client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient"""
    previous_enable_auth = os.environ.get('ENABLE_AUTH')

    # テスト用に認証を無効化
    os.environ['ENABLE_AUTH'] = 'false'
    _ensure_test_settings_env()

    # get_settings()のキャッシュをクリア
    from app.config import get_settings

    get_settings.cache_clear()

    from app.main import app

    with TestClient(app) as client:
        yield client

    if previous_enable_auth is None:
        os.environ.pop('ENABLE_AUTH', None)
    else:
        os.environ['ENABLE_AUTH'] = previous_enable_auth

    # テスト後にキャッシュをクリア
    get_settings.cache_clear()


@pytest.fixture(scope='function')
def auth_test_client(session_factory) -> Generator[TestClient, None, None]:
    """認証有効状態の FastAPI TestClient"""
    previous_enable_auth = os.environ.get('ENABLE_AUTH')
    previous_stage = os.environ.get('STAGE')

    os.environ['ENABLE_AUTH'] = 'true'
    # 認証系テストは HTTP の TestClient を使うため、Secure Cookie を無効にしたい。
    # CI では親環境が STAGE=test でも、この fixture 内だけ development に固定する。
    os.environ['STAGE'] = 'development'
    _ensure_test_settings_env()

    from app.config import get_settings

    get_settings.cache_clear()

    from app.infrastructure.db.session import get_db
    from app.main import app

    def override_get_db():
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()

    if previous_enable_auth is None:
        os.environ.pop('ENABLE_AUTH', None)
    else:
        os.environ['ENABLE_AUTH'] = previous_enable_auth

    if previous_stage is None:
        os.environ.pop('STAGE', None)
    else:
        os.environ['STAGE'] = previous_stage

    get_settings.cache_clear()
