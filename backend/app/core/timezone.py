from datetime import datetime, date
from zoneinfo import ZoneInfo

_KST = ZoneInfo("Asia/Seoul")


def now_kst() -> datetime:
    """서울 기준 현재 datetime — naive (MariaDB DATETIME 저장용)"""
    return datetime.now(tz=_KST).replace(tzinfo=None)


def today_kst() -> date:
    """서울 기준 오늘 날짜"""
    return datetime.now(tz=_KST).date()
