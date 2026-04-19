import logging
import re
from datetime import UTC, datetime, timedelta

from app.application.errors import AppError
from app.application.interfaces.password_hash_service import IPasswordHashService
from app.application.interfaces.session_token_service import ISessionTokenService
from app.application.schemas.auth_schemas import (
    AuthSessionContextDTO,
    AuthSessionPolicyDTO,
    AuthUserDTO,
    LoginInputDTO,
    LoginOutputDTO,
    LogoutOutputDTO,
    SignupInputDTO,
    SignupOutputDTO,
    StatusOutputDTO,
)
from app.domain.entities.user import User
from app.domain.entities.user_session import UserSession
from app.domain.repositories.user_repository import IUserRepository
from app.domain.repositories.user_session_repository import IUserSessionRepository

logger = logging.getLogger(__name__)


class AuthUsecase:
    """認証ユースケース"""

    def __init__(
        self,
        user_repository: IUserRepository,
        user_session_repository: IUserSessionRepository,
        password_hash_service: IPasswordHashService,
        session_token_service: ISessionTokenService,
        auth_session_policy: AuthSessionPolicyDTO,
    ):
        self.user_repository = user_repository
        self.user_session_repository = user_session_repository
        self.password_hash_service = password_hash_service
        self.session_token_service = session_token_service
        self.auth_session_policy = auth_session_policy

    def signup(self, input_dto: SignupInputDTO) -> SignupOutputDTO:
        """サインアップ処理"""
        if (
            self.user_repository.get_by_email_including_deleted(input_dto.email)
            is not None
        ):
            raise AppError(
                code='DUPLICATE_NAME',
                message='このメールアドレスは既に使用されています。',
                status_code=409,
                details={'field': 'email'},
            )

        self._validate_email(input_dto.email)
        self._validate_password(input_dto.password)

        password_hash = self.password_hash_service.hash_password(input_dto.password)
        created_user = self.user_repository.create(
            User(
                id=0,
                email=input_dto.email,
                password_hash=password_hash,
                name=None,
                deleted_at=None,
            )
        )

        logger.info('サインアップ成功')
        return SignupOutputDTO(
            user_id=created_user.id,
            email=created_user.email,
            message='ユーザー登録が完了しました。',
        )

    def login(self, input_dto: LoginInputDTO) -> LoginOutputDTO:
        """ログイン処理"""
        user = self.user_repository.get_by_email(input_dto.email)
        if user is None or user.deleted_at is not None:
            raise AppError(
                code='UNAUTHORIZED',
                message='メールアドレスまたはパスワードが正しくありません。',
                status_code=401,
            )

        if not self.password_hash_service.verify_password(
            input_dto.password, user.password_hash
        ):
            raise AppError(
                code='UNAUTHORIZED',
                message='メールアドレスまたはパスワードが正しくありません。',
                status_code=401,
            )

        now = datetime.now(UTC)
        raw_token = self.session_token_service.generate_token()
        token_hash = self.session_token_service.hash_token(raw_token)
        expires_at = now + timedelta(
            days=self.auth_session_policy.session_expiration_days
        )

        self.user_session_repository.create(
            UserSession(
                user_id=user.id,
                session_token_hash=token_hash,
                expires_at=expires_at,
                last_seen_at=now,
            )
        )

        logger.info('ログイン成功')
        return LoginOutputDTO(
            user=AuthUserDTO(id=user.id, email=user.email),
            session_token=raw_token,
            session_expires_in_days=self.auth_session_policy.session_expiration_days,
            message='ログインしました。',
        )

    def logout(self, session_token_hash: str | None) -> LogoutOutputDTO:
        """ログアウト処理（Cookieはエンドポイント側で削除）"""
        if session_token_hash is not None:
            self.user_session_repository.revoke_by_token_hash(
                session_token_hash, revoked_at=datetime.now(UTC)
            )

        logger.info('ログアウト成功')
        return LogoutOutputDTO(logged_out=True, message='ログアウトしました。')

    def get_auth_status(self, context: AuthSessionContextDTO) -> StatusOutputDTO:
        """認証状態を取得"""
        if context.expired:
            raise AppError(
                code='SESSION_EXPIRED',
                message='セッションの有効期限が切れました。再度ログインしてください。',
                status_code=401,
                clear_auth_cookie=True,
            )

        if not context.authenticated or context.user_id is None:
            return StatusOutputDTO(authenticated=False, user=None)

        user = self.user_repository.get_by_id(context.user_id)
        if user is None:
            return StatusOutputDTO(authenticated=False, user=None)

        if context.session_id is not None and context.expires_at is not None:
            session = UserSession(
                id=context.session_id,
                user_id=context.user_id,
                session_token_hash=context.session_token_hash or '',
                expires_at=context.expires_at,
                last_seen_at=context.last_seen_at,
            )
            now = datetime.now(UTC)
            if session.should_refresh(
                now,
                refresh_interval_hours=self.auth_session_policy.session_refresh_interval_hours,
            ):
                self.user_session_repository.touch(
                    session_id=context.session_id,
                    last_seen_at=now,
                    expires_at=now
                    + timedelta(days=self.auth_session_policy.session_expiration_days),
                )

        return StatusOutputDTO(
            authenticated=True, user=AuthUserDTO(id=user.id, email=user.email)
        )

    def _validate_email(self, email: str) -> None:
        """メールアドレス形式を検証"""
        if not re.fullmatch(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            raise AppError(
                code='VALIDATION_ERROR',
                message='入力内容に誤りがあります。',
                status_code=422,
                details={'field': 'email'},
            )

    def _validate_password(self, password: str) -> None:
        """パスワード要件を検証"""
        has_min_length = len(password) >= 8
        has_alpha = any(char.isalpha() for char in password)
        has_digit = any(char.isdigit() for char in password)

        if not (has_min_length and has_alpha and has_digit):
            raise AppError(
                code='VALIDATION_ERROR',
                message='入力内容に誤りがあります。',
                status_code=422,
                details={'field': 'password'},
            )
