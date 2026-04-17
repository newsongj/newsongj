"""날짜 관련 순수 유틸 — 토요일 중심 계산"""
import datetime

SATURDAY = 5  # datetime.date.weekday() 기준


def first_saturday_on_or_after(d: datetime.date) -> datetime.date:
    return d + datetime.timedelta(days=(SATURDAY - d.weekday()) % 7)


def last_saturday_on_or_before(d: datetime.date) -> datetime.date:
    return d - datetime.timedelta(days=(d.weekday() - SATURDAY) % 7)


def saturdays_between(start: datetime.date, end: datetime.date) -> list[datetime.date]:
    """start <= d <= end 범위의 모든 토요일 리스트. end < start면 []."""
    if end < start:
        return []
    d = first_saturday_on_or_after(start)
    result: list[datetime.date] = []
    while d <= end:
        result.append(d)
        d += datetime.timedelta(days=7)
    return result


def nth_saturday_before(end: datetime.date, n: int) -> datetime.date:
    """end 또는 그 이전 토요일에서 n-1 주 더 거슬러 올라간 토요일."""
    last = last_saturday_on_or_before(end)
    return last - datetime.timedelta(weeks=n - 1)
