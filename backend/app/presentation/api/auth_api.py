from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.application.schemas.auth_schemas import CurrentUserDTO, LoginInputDTO
from app.application.use_cases.auth_usecase import AuthUsecase
from app.di.auth import get_auth_usecase, get_current_auth_user
from app.presentation.schemas.auth_schemas import (
    AuthUserResponse,
    LoginData,
    LoginRequest,
    LoginResponse,
    LogoutData,
    LogoutResponse,
    MessageMeta,
    SessionMeta,
    SignupRequest,
    SignupResponse,
    StatusData,
    StatusResponse,
)

router = APIRouter(prefix='/auth', tags=['認証'])


@router.post('/signup', response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(
    request: SignupRequest,
) -> None:
    """サインアップエンドポイント（Part 1 placeholder）"""
    _ = request
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Signup is not implemented yet.',
    )


@router.post('/login', response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    request: LoginRequest,
    response: Response,
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> LoginResponse:
    input_dto = LoginInputDTO(email=request.email, password=request.password)
    output_dto = auth_usecase.login(input_dto)

    # Part 1 では既存 PoC の cookie 実装を暫定利用する。
    response.set_cookie(
        key='access_token',
        value=output_dto.session_token,
        httponly=True,
        secure=True,
        samesite='lax',
        max_age=output_dto.session_expires_in_days * 24 * 60 * 60,
    )

    return LoginResponse(
        data=LoginData(
            user=AuthUserResponse(
                id=output_dto.user.id,
                email=output_dto.user.email,
            )
        ),
        meta=SessionMeta(
            message=output_dto.message,
            session_expires_in_days=output_dto.session_expires_in_days,
        ),
    )


@router.post('/logout', response_model=LogoutResponse, status_code=status.HTTP_200_OK)
def logout(
    response: Response,
    current_user: CurrentUserDTO = Depends(get_current_auth_user),
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> LogoutResponse:
    """ログアウトエンドポイント"""
    _ = current_user
    output_dto = auth_usecase.logout()

    response.delete_cookie(key='access_token')

    return LogoutResponse(
        data=LogoutData(logged_out=output_dto.logged_out),
        meta=MessageMeta(message=output_dto.message),
    )


@router.get('/status', response_model=StatusResponse, status_code=status.HTTP_200_OK)
def get_status(
    current_user: CurrentUserDTO = Depends(get_current_auth_user),
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> StatusResponse:
    """認証状態取得エンドポイント"""
    output_dto = auth_usecase.get_auth_status(user_id=current_user.id)

    user = None
    if output_dto.user is not None:
        user = AuthUserResponse(id=output_dto.user.id, email=output_dto.user.email)

    return StatusResponse(
        data=StatusData(authenticated=output_dto.authenticated, user=user)
    )
