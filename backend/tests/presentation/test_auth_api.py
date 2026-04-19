"""Auth APIエンドポイントのテスト"""

from datetime import UTC, datetime, timedelta

from fastapi import status
from fastapi.testclient import TestClient

from app.infrastructure.db.models.user_session_model import UserSessionModel
from app.infrastructure.security.session_token_service_impl import SessionTokenServiceImpl

class TestAuthAPI:
    """Auth APIエンドポイントのテストクラス"""

    def test_signup_success(self, auth_test_client: TestClient):
        """サインアップ成功のテスト"""
        response = auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'user@example.com', 'password': 'Passw0rd'},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data['data']['user_id'] > 0
        assert data['data']['email'] == 'user@example.com'
        assert data['meta']['message'] == 'ユーザー登録が完了しました。'

    def test_signup_duplicate_email(self, auth_test_client: TestClient):
        """重複メールアドレスは拒否する"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'duplicate@example.com', 'password': 'Passw0rd'},
        )

        response = auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'duplicate@example.com', 'password': 'Passw0rd'},
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        data = response.json()
        assert data['error']['code'] == 'DUPLICATE_NAME'
        assert data['error']['details']['field'] == 'email'

    def test_signup_password_validation_error(self, auth_test_client: TestClient):
        """パスワード要件違反は VALIDATION_ERROR を返す"""
        response = auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'user@example.com', 'password': 'short'},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        data = response.json()
        assert data['error']['code'] == 'VALIDATION_ERROR'
        assert data['error']['details']['field'] == 'password'

    def test_login_success(self, auth_test_client: TestClient):
        """ログイン成功のテスト"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'login@example.com', 'password': 'Passw0rd'},
        )

        response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'login@example.com', 'password': 'Passw0rd'},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data['data']['user']['email'] == 'login@example.com'
        assert data['meta']['message'] == 'ログインしました。'
        assert data['meta']['session_expires_in_days'] == 30

        assert 'asset_management_session' in response.cookies
        assert 'access_token' not in response.cookies

    def test_login_failure_wrong_credentials(self, auth_test_client: TestClient):
        """ログイン失敗のテスト"""
        response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'wrong@example.com', 'password': 'wrong_pass'},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'UNAUTHORIZED'
        assert 'asset_management_session' not in response.cookies

    def test_status_without_authentication(self, auth_test_client: TestClient):
        """認証なしでは authenticated=false を返す"""
        response = auth_test_client.get('/api/v1/auth/status')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['data']['authenticated'] is False
        assert data['data']['user'] is None
        assert data['meta'] == {}

    def test_status_with_authenticated_session(self, auth_test_client: TestClient):
        """認証済みセッションでは authenticated=true を返す"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'status@example.com', 'password': 'Passw0rd'},
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'status@example.com', 'password': 'Passw0rd'},
        )
        auth_test_client.cookies.set(
            'asset_management_session',
            login_response.cookies['asset_management_session'],
            domain='testserver',
            path='/',
        )

        response = auth_test_client.get('/api/v1/auth/status')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['data']['authenticated'] is True
        assert data['data']['user']['email'] == 'status@example.com'

    def test_status_expired_session_returns_session_expired(
        self, auth_test_client: TestClient, db_session
    ):
        """期限切れセッションは SESSION_EXPIRED を返す"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'expired@example.com', 'password': 'Passw0rd'},
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'expired@example.com', 'password': 'Passw0rd'},
        )
        raw_token = login_response.cookies['asset_management_session']
        token_hash = SessionTokenServiceImpl().hash_token(raw_token)

        session_model = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert session_model is not None
        now = datetime.now(UTC)
        session_model.expires_at = now - timedelta(minutes=1)
        session_model.last_seen_at = now - timedelta(days=2)
        db_session.commit()

        response = auth_test_client.get('/api/v1/auth/status')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data['error']['code'] == 'SESSION_EXPIRED'
        set_cookie_header = response.headers.get('set-cookie')
        assert set_cookie_header is not None
        assert 'asset_management_session=' in set_cookie_header

    def test_logout_success_revokes_current_session(
        self, auth_test_client: TestClient, db_session
    ):
        """ログアウトで current session を失効する"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'logout@example.com', 'password': 'Passw0rd'},
        )
        login_response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'logout@example.com', 'password': 'Passw0rd'},
        )
        raw_token = login_response.cookies['asset_management_session']
        token_hash = SessionTokenServiceImpl().hash_token(raw_token)

        auth_test_client.cookies.set(
            'asset_management_session',
            raw_token,
            domain='testserver',
            path='/',
        )
        response = auth_test_client.post('/api/v1/auth/logout')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['data']['logged_out'] is True
        assert data['meta']['message'] == 'ログアウトしました。'

        session_model = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert session_model is not None
        assert session_model.revoked_at is not None

        set_cookie_header = response.headers.get('set-cookie')
        assert set_cookie_header is not None
        assert 'asset_management_session=' in set_cookie_header

    def test_cookie_properties(self, auth_test_client: TestClient):
        """Cookieのプロパティを確認"""
        auth_test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'cookie@example.com', 'password': 'Passw0rd'},
        )
        response = auth_test_client.post(
            '/api/v1/auth/login',
            json={'email': 'cookie@example.com', 'password': 'Passw0rd'},
        )

        assert response.status_code == status.HTTP_200_OK

        set_cookie_header = response.headers.get('set-cookie')
        assert set_cookie_header is not None
        assert 'asset_management_session=' in set_cookie_header
        assert 'HttpOnly' in set_cookie_header
        assert 'Secure' not in set_cookie_header
        assert 'SameSite=lax' in set_cookie_header or 'SameSite=Lax' in set_cookie_header

    def test_old_auth_route_is_removed(self, auth_test_client: TestClient):
        """旧 auth route が外れていることを確認"""
        response = auth_test_client.post(
            '/auth/login',
            json={'email': 'admin@example.com', 'password': 'pass'},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
