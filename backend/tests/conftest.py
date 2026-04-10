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
def db_session(test_db_engine) -> Generator[Session, None, None]:
    """テスト用DBセッション（各テストで独立）"""
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_db_engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
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
    # テスト用に認証を無効化
    os.environ['ENABLE_AUTH'] = 'false'
    _ensure_test_settings_env()

    # get_settings()のキャッシュをクリア
    from app.config import get_settings

    get_settings.cache_clear()

    from app.main import app

    with TestClient(app) as client:
        yield client

    # テスト後にキャッシュをクリア
    get_settings.cache_clear()
