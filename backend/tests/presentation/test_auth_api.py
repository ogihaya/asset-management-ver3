"""Auth APIエンドポイントのテスト"""

from fastapi import status
from fastapi.testclient import TestClient


class TestAuthAPI:
    """Auth APIエンドポイントのテストクラス"""

    def test_signup_placeholder(self, test_client: TestClient):
        """サインアップは Part 1 では placeholder を返す"""
        response = test_client.post(
            '/api/v1/auth/signup',
            json={'email': 'user@example.com', 'password': 'Passw0rd'},
        )

        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED

    def test_login_success(self, test_client: TestClient):
        """ログイン成功のテスト"""
        response = test_client.post(
            '/api/v1/auth/login',
            json={'email': 'admin@example.com', 'password': 'pass'},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data['data']['user']['id'] == 1
        assert data['data']['user']['email'] == 'admin@example.com'
        assert data['meta']['message'] == 'ログインしました。'
        assert data['meta']['session_expires_in_days'] == 30

        assert 'access_token' in response.cookies

    def test_login_failure_wrong_credentials(self, test_client: TestClient):
        """ログイン失敗のテスト"""
        response = test_client.post(
            '/api/v1/auth/login',
            json={'email': 'wrong@example.com', 'password': 'wrong_pass'},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        data = response.json()
        assert 'detail' in data
        assert 'メールアドレスまたはパスワードが正しくありません' in data['detail']
        assert 'access_token' not in response.cookies

    def test_login_missing_email(self, test_client: TestClient):
        """ログイン失敗のテスト（emailが欠落）"""
        response = test_client.post('/api/v1/auth/login', json={'password': 'pass'})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_logout_success(self, test_client: TestClient):
        """ログアウト成功のテスト"""
        response = test_client.post('/api/v1/auth/logout')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data['data']['logged_out'] is True
        assert data['meta']['message'] == 'ログアウトしました。'

    def test_get_status_without_authentication(self, test_client: TestClient):
        """認証なしの認証状態取得テスト"""
        response = test_client.get('/api/v1/auth/status')

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data['data']['authenticated'] is False
        assert data['data']['user'] is None
        assert data['meta'] == {}

    def test_cookie_properties(self, test_client: TestClient):
        """Cookieのプロパティを確認"""
        response = test_client.post(
            '/api/v1/auth/login',
            json={'email': 'admin@example.com', 'password': 'pass'},
        )

        assert response.status_code == status.HTTP_200_OK

        set_cookie_header = response.headers.get('set-cookie')
        assert set_cookie_header is not None
        assert 'HttpOnly' in set_cookie_header
        assert 'Secure' in set_cookie_header
        assert 'SameSite=lax' in set_cookie_header or 'SameSite=Lax' in set_cookie_header

    def test_old_auth_route_is_removed(self, test_client: TestClient):
        """旧 auth route が外れていることを確認"""
        response = test_client.post(
            '/auth/login',
            json={'email': 'admin@example.com', 'password': 'pass'},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
