"""Users APIエンドポイントのテスト"""

from fastapi import status
from fastapi.testclient import TestClient


class TestUsersAPI:
    """Users APIエンドポイントのテストクラス"""

    def test_get_me_placeholder(self, test_client: TestClient):
        """現在ユーザー取得は Part 1 では placeholder を返す"""
        response = test_client.get('/api/v1/users/me')

        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED

    def test_delete_me_placeholder(self, test_client: TestClient):
        """アカウント削除は Part 1 では placeholder を返す"""
        response = test_client.delete('/api/v1/users/me')

        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED
