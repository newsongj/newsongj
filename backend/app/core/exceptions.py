"""도메인 예외 — 전역 핸들러가 (status_code, detail) → JSONResponse 로 변환.

api 라우터에서 try/except 없이 그대로 raise 가능. 핸들러는 core/middleware.py.
"""


class AppError(Exception):
    """모든 도메인 예외의 베이스. 핸들러가 이 타입 하나로 잡는다."""

    status_code: int = 500
    default_detail: str = "서버 오류가 발생했습니다."

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.default_detail
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = 404
    default_detail = "리소스를 찾을 수 없습니다."


class ConflictError(AppError):
    """리소스 상태 충돌 — 400으로 매핑."""
    status_code = 400
    default_detail = "요청을 처리할 수 없는 상태입니다."


# ── 도메인 예외 ────────────────────────────────
class MemberNotFoundError(NotFoundError):
    default_detail = "멤버를 찾을 수 없습니다."


class MemberAlreadyActiveError(ConflictError):
    default_detail = "삭제되지 않은 멤버입니다."


class InvalidMemberIdsError(NotFoundError):
    """존재하지 않거나 삭제된 멤버 ID 목록 포함."""

    def __init__(self, ids: list[int]):
        self.ids = ids
        super().__init__(f"존재하지 않거나 삭제된 멤버입니다: {ids}")


class InvalidEnrolledError(ConflictError):
    """등록일(enrolled_at)이 없거나 미래인 멤버 포함."""

    def __init__(self, ids: list[int]):
        self.ids = ids
        super().__init__(f"등록일이 없거나 미래인 멤버: {ids}")
