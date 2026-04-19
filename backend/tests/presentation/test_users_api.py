"""Users APIエンドポイントのテスト"""

from datetime import UTC, datetime, timedelta

from fastapi import status
from fastapi.testclient import TestClient

from app.infrastructure.db.models.user_model import UserModel
from app.infrastructure.db.models.user_session_model import UserSessionModel
from app.infrastructure.security.session_token_service_impl import SessionTokenServiceImpl


class TestUsersAPI:
    """Users APIエンドポイントのテストクラス"""

    def test_get_me_success(self, auth_test_client: TestClient):
        """認証済みユーザーの最小プロフィールを返す"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'users-api-me@example.com', 'password': 'Passw0rd'},
        )
        auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'users-api-me@example.com', 'password': 'Passw0rd'},
        )

        response = auth_test_client.get('/api/v1/users/me')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['data']['email'] == 'users-api-me@example.com'
        assert data['meta'] == {}

    def test_get_me_without_authentication_returns_unauthorized(
        self, auth_test_client: TestClient
    ):
        """未認証の me は UNAUTHORIZED"""
        response = auth_test_client.get('/api/v1/users/me')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'UNAUTHORIZED'

    def test_get_me_expired_session_returns_session_expired(
        self, auth_test_client: TestClient, db_session
    ):
        """期限切れセッションの me は SESSION_EXPIRED"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'users-api-expired-me@example.com', 'password': 'Passw0rd'},
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={
                'email': 'users-api-expired-me@example.com',
                'password': 'Passw0rd',
            },
        )
        raw_token = login_response.cookies['asset_management_session']
        token_hash = SessionTokenServiceImpl().hash_token(raw_token)

        session_model = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert session_model is not None
        session_model.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db_session.commit()

        response = auth_test_client.get('/api/v1/users/me')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'SESSION_EXPIRED'
        assert 'asset_management_session=' in response.headers['set-cookie']

    def test_delete_me_success(self, auth_test_client: TestClient, db_session):
        """アカウント削除で論理削除と全セッション失効を行う"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'users-api-delete-me@example.com', 'password': 'Passw0rd'},
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={
                'email': 'users-api-delete-me@example.com',
                'password': 'Passw0rd',
            },
        )
        raw_token = login_response.cookies['asset_management_session']
        token_hash = SessionTokenServiceImpl().hash_token(raw_token)

        user_model = (
            db_session.query(UserModel)
            .filter(UserModel.email == 'users-api-delete-me@example.com')
            .first()
        )
        assert user_model is not None
        second_session = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='second-session-hash',
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db_session.add(second_session)
        db_session.commit()

        response = auth_test_client.delete('/api/v1/users/me')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['data']['deleted'] is True
        assert data['meta']['message'] == 'アカウントを削除しました。'

        db_session.refresh(user_model)
        assert user_model.deleted_at is not None

        first_session = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert first_session is not None
        db_session.refresh(first_session)
        db_session.refresh(second_session)
        assert first_session.revoked_at is not None
        assert second_session.revoked_at is not None
        assert 'asset_management_session=' in response.headers['set-cookie']

        auth_test_client.cookies.set(
            'asset_management_session',
            raw_token,
            domain='testserver',
            path='/',
        )
        status_response = auth_test_client.get('/api/v1/auth/status')
        assert status_response.status_code == status.HTTP_200_OK
        assert status_response.json()['data']['authenticated'] is False

    def test_delete_me_without_authentication_returns_unauthorized(
        self, auth_test_client: TestClient
    ):
        """未認証の delete me は UNAUTHORIZED"""
        response = auth_test_client.delete('/api/v1/users/me')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'UNAUTHORIZED'

    def test_delete_me_expired_session_returns_session_expired(
        self, auth_test_client: TestClient, db_session
    ):
        """期限切れセッションの delete me は SESSION_EXPIRED"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={
                'email': 'users-api-expired-delete@example.com',
                'password': 'Passw0rd',
            },
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={
                'email': 'users-api-expired-delete@example.com',
                'password': 'Passw0rd',
            },
        )
        raw_token = login_response.cookies['asset_management_session']
        token_hash = SessionTokenServiceImpl().hash_token(raw_token)

        session_model = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert session_model is not None
        session_model.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db_session.commit()

        response = auth_test_client.delete('/api/v1/users/me')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'SESSION_EXPIRED'
        assert 'asset_management_session=' in response.headers['set-cookie']
