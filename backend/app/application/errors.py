class AppError(Exception):
    """アプリケーション共通例外"""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        details: dict | None = None,
        clear_auth_cookie: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.clear_auth_cookie = clear_auth_cookie
