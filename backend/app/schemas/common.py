"""공통 Pydantic 스키마 — 도메인 무관하게 재사용되는 기반 모델"""
from pydantic import BaseModel


class PageMeta(BaseModel):
    current_page: int
    page_size: int
    total_items: int
