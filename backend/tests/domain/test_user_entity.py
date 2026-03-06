"""Userエンティティのテスト"""

import pytest
from pydantic import ValidationError

from app.domain.entities.user import User


class TestUserEntity:
    """Userエンティティのテストクラス"""

    def test_create_user_with_all_fields(self):
        """全フィールドを指定してUserを作成"""
        user = User(
            id=1,
            login_id='test_user',
            password='hashed_password',
            email='test@example.com',
            name='Test User',
        )

        assert user.id == 1
        assert user.login_id == 'test_user'
        assert user.password == 'hashed_password'
        assert user.email == 'test@example.com'
        assert user.name == 'Test User'

    def test_create_user_with_required_fields_only(self):
        """必須フィールドのみでUserを作成"""
        user = User(id=1, login_id='test_user', password='hashed_password')

        assert user.id == 1
        assert user.login_id == 'test_user'
        assert user.password == 'hashed_password'
        assert user.email is None
        assert user.name is None

    def test_create_user_without_id_raises_error(self):
        """IDなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(login_id='test_user', password='hashed_password')

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('id',) for error in errors)

    def test_create_user_without_login_id_raises_error(self):
        """login_idなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(id=1, password='hashed_password')

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('login_id',) for error in errors)

    def test_create_user_without_password_raises_error(self):
        """passwordなしでUserを作成するとエラー"""
        with pytest.raises(ValidationError) as exc_info:
            User(id=1, login_id='test_user')

        errors = exc_info.value.errors()
        assert any(error['loc'] == ('password',) for error in errors)

    def test_user_from_attributes_config(self):
        """from_attributes設定が有効であることを確認"""
        # SQLAlchemyモデル風のオブジェクトを作成
        class MockDBModel:
            def __init__(self):
                self.id = 1
                self.login_id = 'test_user'
                self.password = 'hashed_password'
                self.email = 'test@example.com'
                self.name = 'Test User'

        mock_db_obj = MockDBModel()

        # from_attributesがTrueなので、オブジェクトの属性から作成可能
        user = User.model_validate(mock_db_obj)

        assert user.id == 1
        assert user.login_id == 'test_user'
        assert user.password == 'hashed_password'
        assert user.email == 'test@example.com'
        assert user.name == 'Test User'

    def test_user_dict_conversion(self):
        """Userを辞書に変換できる"""
        user = User(
            id=1,
            login_id='test_user',
            password='hashed_password',
            email='test@example.com',
            name='Test User',
        )

        user_dict = user.model_dump()

        assert user_dict == {
            'id': 1,
            'login_id': 'test_user',
            'password': 'hashed_password',
            'email': 'test@example.com',
            'name': 'Test User',
        }

    def test_user_json_conversion(self):
        """UserをJSONに変換できる"""
        user = User(
            id=1,
            login_id='test_user',
            password='hashed_password',
            email='test@example.com',
            name='Test User',
        )

        user_json = user.model_dump_json()

        assert isinstance(user_json, str)
        assert '"id":1' in user_json or '"id": 1' in user_json
        assert '"login_id":"test_user"' in user_json or '"login_id": "test_user"' in user_json
