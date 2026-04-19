"""UserSessionRepositoryインターフェースのテスト"""

import inspect

import pytest

from app.domain.repositories.user_session_repository import IUserSessionRepository


class TestUserSessionRepositoryInterface:
    """IUserSessionRepositoryのテストクラス"""

    def test_is_abstract_class(self):
        """IUserSessionRepositoryが抽象クラスであることを確認"""
        assert inspect.isabstract(IUserSessionRepository)

    def test_has_required_methods(self):
        """必要なメソッドが定義されていることを確認"""
        for method_name in (
            'create',
            'find_by_token_hash',
            'find_active_by_token_hash',
            'revoke_by_token_hash',
            'revoke_all_by_user_id',
            'touch',
        ):
            assert hasattr(IUserSessionRepository, method_name)
            assert callable(getattr(IUserSessionRepository, method_name))

    def test_method_signatures(self):
        """メソッドのシグネチャを確認"""
        create_sig = inspect.signature(IUserSessionRepository.create)
        assert 'session' in create_sig.parameters

        find_any_sig = inspect.signature(IUserSessionRepository.find_by_token_hash)
        assert 'session_token_hash' in find_any_sig.parameters

        find_sig = inspect.signature(IUserSessionRepository.find_active_by_token_hash)
        assert 'session_token_hash' in find_sig.parameters
        assert 'now' in find_sig.parameters

        revoke_sig = inspect.signature(IUserSessionRepository.revoke_by_token_hash)
        assert 'session_token_hash' in revoke_sig.parameters
        assert 'revoked_at' in revoke_sig.parameters

        revoke_all_sig = inspect.signature(IUserSessionRepository.revoke_all_by_user_id)
        assert 'user_id' in revoke_all_sig.parameters
        assert 'revoked_at' in revoke_all_sig.parameters

        touch_sig = inspect.signature(IUserSessionRepository.touch)
        assert 'session_id' in touch_sig.parameters
        assert 'last_seen_at' in touch_sig.parameters
        assert 'expires_at' in touch_sig.parameters

    def test_cannot_instantiate_directly(self):
        """抽象クラスは直接インスタンス化できない"""
        with pytest.raises(TypeError):
            IUserSessionRepository()
