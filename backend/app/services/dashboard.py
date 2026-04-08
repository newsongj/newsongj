"""대시보드 비즈니스 로직 — 집계 결과를 응답 스키마로 변환"""
from sqlalchemy.orm import Session
from app.crud.dashboard import get_kpi_stats
from app.schemas.dashboard import KpiResponse, AttendanceStats, GenStats, TopReason


def _empty_gen_stats(end_date) -> list[GenStats]:
    gen_curr = end_date.year - 1980
    return [
        GenStats(gen=gen_curr - 1, present=0, total=0),
        GenStats(gen=gen_curr,     present=0, total=0),
    ]


def build_kpi_response(
    db: Session,
    start_date,
    end_date,
    gyogu_no: int | None,
    team_no,
    is_imwondan: bool,
) -> KpiResponse:
    stats = get_kpi_stats(db, start_date, end_date, gyogu_no, team_no, is_imwondan)

    if stats is None:
        return KpiResponse(
            all=AttendanceStats(present=0, total=0),
            by_gen=_empty_gen_stats(end_date),
            top_reason=None,
        )

    n = stats["n"]

    top = stats["reason_counter"].most_common(1)
    top_reason = TopReason(reason=top[0][0], count=top[0][1]) if top else None

    return KpiResponse(
        all=AttendanceStats(
            present=round(stats["total_present"] / n),
            total=round(stats["total_members"] / n),
        ),
        by_gen=[
            GenStats(
                gen=stats["gen_prev"],
                present=round(stats["gen_stats"][stats["gen_prev"]]["present"] / n),
                total=round(stats["gen_stats"][stats["gen_prev"]]["total"] / n),
            ),
            GenStats(
                gen=stats["gen_curr"],
                present=round(stats["gen_stats"][stats["gen_curr"]]["present"] / n),
                total=round(stats["gen_stats"][stats["gen_curr"]]["total"] / n),
            ),
        ],
        top_reason=top_reason,
    )
