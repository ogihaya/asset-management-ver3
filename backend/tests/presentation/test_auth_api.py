"""Auth APIエンドポイントのテスト"""

from fastapi import status
from fastapi.testclient import TestClient


class TestAuthAPI:
    """Auth APIエンドポイントのテストクラス"""

    def test_login_success(self, test_client: TestClient):
        """ログイン成功のテスト"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'pass'}
        )

        # ステータスコードの確認
        assert response.status_code == status.HTTP_200_OK

        # レスポンスボディの確認
        data = response.json()
        assert 'message' in data
        assert data['message'] == 'ログイン成功'
        assert 'access_token' in data
        assert 'user_id' in data
        assert data['user_id'] == 1

        # Cookieが設定されているか確認
        assert 'access_token' in response.cookies
        assert response.cookies['access_token'] == data['access_token']

    def test_login_failure_wrong_credentials(self, test_client: TestClient):
        """ログイン失敗のテスト（認証情報が間違っている）"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'wrong_user', 'password': 'wrong_pass'}
        )

        # ステータスコードの確認
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # エラーメッセージの確認
        data = response.json()
        assert 'detail' in data
        assert 'ログインIDまたはパスワードが正しくありません' in data['detail']

        # Cookieが設定されていないことを確認
        assert 'access_token' not in response.cookies

    def test_login_failure_wrong_password(self, test_client: TestClient):
        """ログイン失敗のテスト（パスワードが間違っている）"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'wrong_pass'}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_failure_wrong_login_id(self, test_client: TestClient):
        """ログイン失敗のテスト（ログインIDが間違っている）"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'wrong_user', 'password': 'pass'}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_login_id(self, test_client: TestClient):
        """ログイン失敗のテスト（login_idが欠落）"""
        response = test_client.post('/auth/login', json={'password': 'pass'})

        # バリデーションエラー
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_password(self, test_client: TestClient):
        """ログイン失敗のテスト（passwordが欠落）"""
        response = test_client.post('/auth/login', json={'login_id': 'admin'})

        # バリデーションエラー
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_logout_success(self, test_client: TestClient):
        """ログアウト成功のテスト"""
        # まずログイン
        login_response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'pass'}
        )
        assert login_response.status_code == status.HTTP_200_OK

        # Cookieを取得
        cookies = login_response.cookies

        # ログアウト
        logout_response = test_client.post('/auth/logout', cookies=cookies)

        # ステータスコードの確認
        assert logout_response.status_code == status.HTTP_200_OK

        # レスポンスボディの確認
        data = logout_response.json()
        assert 'message' in data
        assert data['message'] == 'ログアウトしました'

    def test_logout_without_authentication(self, test_client: TestClient):
        """認証なしでログアウトを試みる"""
        # 認証が無効なので、ログアウトはできるはず（ENABLE_AUTH=falseの場合）
        response = test_client.post('/auth/logout')

        # 認証が無効な場合は成功する
        assert response.status_code == status.HTTP_200_OK

    def test_get_status_success(self, test_client: TestClient):
        """認証状態取得成功のテスト"""
        # まずログイン
        login_response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'pass'}
        )
        assert login_response.status_code == status.HTTP_200_OK

        # Cookieを取得
        cookies = login_response.cookies

        # 認証状態取得
        status_response = test_client.get('/auth/status', cookies=cookies)

        # ステータスコードの確認
        assert status_response.status_code == status.HTTP_200_OK

        # レスポンスボディの確認
        data = status_response.json()
        assert 'is_authenticated' in data
        assert data['is_authenticated'] is True
        assert 'user_id' in data

    def test_get_status_without_authentication(self, test_client: TestClient):
        """認証なしで認証状態取得を試みる"""
        # 認証が無効な場合は成功する（ENABLE_AUTH=falseの場合）
        response = test_client.get('/auth/status')

        # 認証が無効な場合は成功する
        assert response.status_code == status.HTTP_200_OK

    def test_cookie_properties(self, test_client: TestClient):
        """Cookieのプロパティを確認"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'pass'}
        )

        assert response.status_code == status.HTTP_200_OK

        # Set-Cookieヘッダーを確認
        set_cookie_header = response.headers.get('set-cookie')
        assert set_cookie_header is not None

        # HttpOnly, Secure, SameSite属性を確認
        assert 'HttpOnly' in set_cookie_header
        assert 'Secure' in set_cookie_header
        assert 'SameSite=lax' in set_cookie_header or 'SameSite=Lax' in set_cookie_header

    def test_login_response_structure(self, test_client: TestClient):
        """ログインレスポンスの構造を確認"""
        response = test_client.post(
            '/auth/login', json={'login_id': 'admin', 'password': 'pass'}
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()

        # 必須フィールドの確認
        assert isinstance(data['message'], str)
        assert isinstance(data['access_token'], str)
        assert isinstance(data['user_id'], int)

        # access_tokenが空でないことを確認
        assert len(data['access_token']) > 0
