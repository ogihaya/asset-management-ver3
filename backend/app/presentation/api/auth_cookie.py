from fastapi import Response

from app.application.schemas.auth_schemas import AuthSessionPolicyDTO


def set_auth_cookie(
    response: Response, raw_token: str, policy: AuthSessionPolicyDTO
) -> None:
    """認証Cookieを設定する"""
    response.set_cookie(
        key=policy.cookie_name,
        value=raw_token,
        httponly=True,
        secure=policy.secure_cookie,
        samesite='lax',
        path='/',
        max_age=policy.session_expiration_days * 24 * 60 * 60,
    )


def clear_auth_cookie(response: Response, policy: AuthSessionPolicyDTO) -> None:
    """認証Cookieを削除する"""
    response.delete_cookie(
        key=policy.cookie_name,
        path='/',
        secure=policy.secure_cookie,
        samesite='lax',
    )
