import os

import uvicorn
from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.application.errors import AppError
from app.config import get_settings
from app.infrastructure.logging.logging import setup_logging
from app.presentation.api.auth_api import router as auth_router
from app.presentation.api.users_api import router as users_router

# ロギングの設定を初期化
setup_logging()

# 環境変数から環境を取得（デフォルトはdevelopment）
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# FastAPI アプリケーションのインスタンスを作成
# 本番環境ではドキュメントを無効化しましょう
app = FastAPI(
    docs_url='/docs' if ENVIRONMENT != 'production' else None,
    redoc_url='/redoc' if ENVIRONMENT != 'production' else None,
    openapi_url='/openapi.json' if ENVIRONMENT != 'production' else None,
)

allowed_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    # ここに本番環境のドメインをデプロイ後追加する。
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=[
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS',
        'PATCH',
    ],  # 許可するHTTPメソッド
    allow_headers=['*'],  # 本番では必要なヘッダーのみ
    expose_headers=[
        'Content-Disposition',
        'X-Custom-Header',
    ],  # 例: クライアントに公開したいヘッダー
)

# API ルーターをアプリケーションに含める
api_v1_router = APIRouter(prefix='/api/v1')
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
app.include_router(api_v1_router)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    """アプリケーション例外を共通レスポンス形式へ変換"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
            }
        },
    )

    if exc.clear_auth_cookie:
        settings = get_settings()
        response.delete_cookie(
            key=settings.session_cookie_name,
            path='/',
            secure=settings.stage != 'development',
            samesite='lax',
        )

    return response


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    """FastAPI のバリデーション例外を共通レスポンス形式へ変換"""
    details: dict[str, object] = {'errors': exc.errors()}
    for error in exc.errors():
        loc = error.get('loc', ())
        if len(loc) >= 2 and loc[0] == 'body':
            details = {'field': loc[-1], 'errors': exc.errors()}
            break

    return JSONResponse(
        status_code=422,
        content={
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': '入力内容に誤りがあります。',
                'details': details,
            }
        },
    )


# ヘルスチェックエンドポイント（ALB/ECS用）
@app.get('/health')
async def health_check():
    """ヘルスチェック用エンドポイント"""
    return {'status': 'healthy'}


# static ディレクトリが存在する場合のみマウント
static_dir = 'app/static'
if os.path.exists(static_dir):
    app.mount('/static', StaticFiles(directory=static_dir), name='static')

# アプリケーションのエントリポイント
if __name__ == '__main__':
    # ファイルアップロード用のフォルダが存在しない場合は作成
    upload_folder = os.getenv('UPLOAD_FOLDER', 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        print(f'Created upload folder: {upload_folder}')  # フォルダ作成のログを追加

    print('FastAPI app starting on http://0.0.0.0:8000')
    uvicorn.run(app, host='0.0.0.0', port=8000, reload=True)
