"""Userエンティティのテスト"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.entities.user import User

TEST_PASSWORD_HASH = 'test_hash_value'


class TestUserEntity:
    """Userエンティティのテストクラス"""

    def test_create_user_with_all_fields(self):
        """全フィールドを指定してUserを作成"""
        deleted_at = datetime(2026, 4, 10, 12, 0, tzinfo=UTC)
        user = User(
            id=1,
            email='test@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User',
            deleted_at=deleted_at,
        )

        assert user.id == 1
        assert user.email == 'test@example.com'
        assert user.password_hash == TEST_PASSWORD_HASH
        assert user.name == 'Test User'
        assert user.deleted_at == deleted_at

    def test_create_user_with_required_fields_only(self):
        """必須フィールドのみでUserを作成"""
        user = User(id=1, email='test@example.com', password_hash=TEST_PASSWORD_HASH)

        assert user.id == 1
        assert user.email == 'test@example.com'
        assert user.password_hash == TEST_PASSWORD_HASH
        assert user.name is None
        assert user.deleted_at is None

    def test_create_user_without_id_raises_error(self):
        """IDなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(email='test@example.com', password_hash=TEST_PASSWORD_HASH)

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('id',) for error in errors)

    def test_create_user_without_email_raises_error(self):
        """emailなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(id=1, password_hash=TEST_PASSWORD_HASH)

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('email',) for error in errors)

    def test_create_user_without_password_hash_raises_error(self):
        """password_hashなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(id=1, email='test@example.com')

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('password_hash',) for error in errors)

    def test_user_from_attributes_config(self):
        """from_attributes設定が有効であることを確認"""

        # SQLAlchemyモデル風のオブジェクトを作成
        class MockDBModel:
            def __init__(self):
                self.id = 1
                self.email = 'test@example.com'
                self.password_hash = TEST_PASSWORD_HASH
                self.name = 'Test User'
                self.deleted_at = None

        mock_db_obj = MockDBModel()

        # from_attributesがTrueなので、オブジェクトの属性から作成可能
        user = User.model_validate(mock_db_obj)

        assert user.id == 1
        assert user.email == 'test@example.com'
        assert user.password_hash == TEST_PASSWORD_HASH
        assert user.name == 'Test User'
        assert user.deleted_at is None

    def test_user_dict_conversion(self):
        """Userを辞書に変換できる"""
        user = User(
            id=1,
            email='test@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User',
        )

        user_dict = user.model_dump()

        assert user_dict == {
            'id': 1,
            'email': 'test@example.com',
            'password_hash': TEST_PASSWORD_HASH,
            'name': 'Test User',
            'deleted_at': None,
        }

    def test_user_json_conversion(self):
        """UserをJSONに変換できる"""
        user = User(
            id=1,
            email='test@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User',
        )

        user_json = user.model_dump_json()

        assert isinstance(user_json, str)
        assert '"id":1' in user_json or '"id": 1' in user_json
        assert (
            '"email":"test@example.com"' in user_json
            or '"email": "test@example.com"' in user_json
        )
