"""SessionTokenServiceImplのテスト"""

from app.infrastructure.security.session_token_service_impl import (
    SessionTokenServiceImpl,
)


class TestSessionTokenServiceImpl:
    """SessionTokenServiceImplのテストクラス"""

    def test_generate_token_returns_non_empty_string(self):
        """トークンを生成できる"""
        service = SessionTokenServiceImpl()

        token = service.generate_token()

        assert isinstance(token, str)
        assert token

    def test_generate_token_returns_different_tokens_each_time(self):
        """毎回異なるトークンが生成される"""
        service = SessionTokenServiceImpl()

        token1 = service.generate_token()
        token2 = service.generate_token()

        assert token1 != token2

    def test_hash_token_returns_deterministic_hash(self):
        """同じトークンから同じハッシュを生成する"""
        service = SessionTokenServiceImpl()
        raw_token = 'same-token'

        hashed_token1 = service.hash_token(raw_token)
        hashed_token2 = service.hash_token(raw_token)

        assert hashed_token1 == hashed_token2

    def test_hash_token_does_not_return_raw_token(self):
        """ハッシュ値は平文トークンと異なる"""
        service = SessionTokenServiceImpl()
        raw_token = 'plain-session-token'

        hashed_token = service.hash_token(raw_token)

        assert hashed_token != raw_token
