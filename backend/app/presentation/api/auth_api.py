from fastapi import APIRouter, Depends, Response, status

from app.application.schemas.auth_schemas import (
    AuthSessionContextDTO,
    AuthSessionPolicyDTO,
    LoginInputDTO,
    SignupInputDTO,
)
from app.application.use_cases.auth_usecase import AuthUsecase
from app.di.auth import (
    get_auth_session_context,
    get_auth_session_policy,
    get_auth_usecase,
)
from app.presentation.api.auth_cookie import clear_auth_cookie, set_auth_cookie
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
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> SignupResponse:
    """サインアップエンドポイント"""
    output_dto = auth_usecase.signup(
        SignupInputDTO(email=request.email, password=request.password)
    )

    return SignupResponse(
        data={'user_id': output_dto.user_id, 'email': output_dto.email},
        meta=MessageMeta(message=output_dto.message),
    )


@router.post('/login', response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    request: LoginRequest,
    response: Response,
    auth_session_policy: AuthSessionPolicyDTO = Depends(get_auth_session_policy),
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> LoginResponse:
    input_dto = LoginInputDTO(email=request.email, password=request.password)
    output_dto = auth_usecase.login(input_dto)
    set_auth_cookie(response, output_dto.session_token, auth_session_policy)

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
    auth_session_policy: AuthSessionPolicyDTO = Depends(get_auth_session_policy),
    session_context: AuthSessionContextDTO = Depends(get_auth_session_context),
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> LogoutResponse:
    """ログアウトエンドポイント"""
    output_dto = auth_usecase.logout(session_context.session_token_hash)
    clear_auth_cookie(response, auth_session_policy)

    return LogoutResponse(
        data=LogoutData(logged_out=output_dto.logged_out),
        meta=MessageMeta(message=output_dto.message),
    )


@router.get('/status', response_model=StatusResponse, status_code=status.HTTP_200_OK)
def get_status(
    session_context: AuthSessionContextDTO = Depends(get_auth_session_context),
    auth_usecase: AuthUsecase = Depends(get_auth_usecase),
) -> StatusResponse:
    """認証状態取得エンドポイント"""
    output_dto = auth_usecase.get_auth_status(session_context)

    user = None
    if output_dto.user is not None:
        user = AuthUserResponse(id=output_dto.user.id, email=output_dto.user.email)

    return StatusResponse(
        data=StatusData(authenticated=output_dto.authenticated, user=user)
    )
