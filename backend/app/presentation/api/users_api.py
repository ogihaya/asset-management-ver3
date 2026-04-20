from fastapi import APIRouter, Depends, Response, status

from app.application.schemas.auth_schemas import AuthSessionPolicyDTO, CurrentUserDTO
from app.application.use_cases.user_account_usecase import UserAccountUsecase
from app.di.auth import (
    get_auth_session_policy,
    get_current_auth_user,
    get_user_account_usecase,
)
from app.presentation.api.auth_cookie import clear_auth_cookie
from app.presentation.schemas.auth_schemas import EmptyMeta, MessageMeta
from app.presentation.schemas.user_schemas import DeleteMeResponse, UserMeResponse

router = APIRouter(prefix='/users', tags=['ユーザー'])


@router.get('/me', response_model=UserMeResponse, status_code=status.HTTP_200_OK)
def get_me(
    current_user: CurrentUserDTO = Depends(get_current_auth_user),
    user_account_usecase: UserAccountUsecase = Depends(get_user_account_usecase),
) -> UserMeResponse:
    """現在ユーザー取得エンドポイント"""
    output_dto = user_account_usecase.get_me(current_user.id)
    return UserMeResponse(
        data={'id': output_dto.id, 'email': output_dto.email},
        meta=EmptyMeta(),
    )


@router.delete('/me', response_model=DeleteMeResponse, status_code=status.HTTP_200_OK)
def delete_me(
    response: Response,
    auth_session_policy: AuthSessionPolicyDTO = Depends(get_auth_session_policy),
    current_user: CurrentUserDTO = Depends(get_current_auth_user),
    user_account_usecase: UserAccountUsecase = Depends(get_user_account_usecase),
) -> DeleteMeResponse:
    """アカウント削除エンドポイント"""
    output_dto = user_account_usecase.delete_me(current_user.id)
    clear_auth_cookie(response, auth_session_policy)

    return DeleteMeResponse(
        data={'deleted': output_dto.deleted},
        meta=MessageMeta(message=output_dto.message),
    )
