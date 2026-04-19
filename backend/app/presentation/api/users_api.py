from fastapi import APIRouter, HTTPException, status

from app.presentation.schemas.user_schemas import DeleteMeResponse, UserMeResponse

router = APIRouter(prefix='/users', tags=['ユーザー'])


@router.get('/me', response_model=UserMeResponse, status_code=status.HTTP_200_OK)
def get_me() -> None:
    """現在ユーザー取得エンドポイント（Part 1 placeholder）"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Get current user is not implemented yet.',
    )


@router.delete('/me', response_model=DeleteMeResponse, status_code=status.HTTP_200_OK)
def delete_me() -> None:
    """アカウント削除エンドポイント（Part 1 placeholder）"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Delete current user is not implemented yet.',
    )
