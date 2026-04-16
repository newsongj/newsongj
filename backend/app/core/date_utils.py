"""날짜 관련 순수 유틸 — 토요일 중심 계산"""
import datetime

SATURDAY = 5  # datetime.date.weekday() 기준


def first_saturday_on_or_after(d: datetime.date) -> datetime.date:
    return d + datetime.timedelta(days=(SATURDAY - d.weekday()) % 7)


def last_saturday_on_or_before(d: datetime.date) -> datetime.date:
    return d - datetime.timedelta(days=(d.weekday() - SATURDAY) % 7)


def count_saturdays_between(start: datetime.date, end: datetime.date) -> int:
    """start <= d <= end 범위 내 토요일 수. end < start면 0."""
    if end < start:
        return 0
    first = first_saturday_on_or_after(start)
    if first > end:
        return 0
    return (end - first).days // 7 + 1


def nth_saturday_before(end: datetime.date, n: int) -> datetime.date:
    """end 또는 그 이전 토요일에서 n-1 주 더 거슬러 올라간 토요일."""
    last = last_saturday_on_or_before(end)
    return last - datetime.timedelta(weeks=n - 1)
