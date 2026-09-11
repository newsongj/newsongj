import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  INPUT_FIELD_LABELS,
  INPUT_FIELD_MULTILINE,
  InputFieldKey,
  MEMBER_FIELD_LABELS,
  MemberFieldKey,
  OpinionCompanion,
  OpinionReportRow,
  OpinionWriter,
} from '@/models/opinion.types';

// 소견서 인쇄(PDF) 레이아웃
//
// jspdf 같은 별도 라이브러리 대신 브라우저 인쇄를 사용한다.
//  - 한글 폰트를 번들에 임베딩할 필요가 없고
//  - 텍스트가 이미지로 래스터라이즈되지 않아 선택·검색이 가능하며
//  - 여러 건 출력 시 page-break 로 다중 페이지가 자동 처리된다.
// 사용자는 인쇄 대화상자에서 "PDF로 저장"을 선택해 파일로 받는다.
//
// ★ 1인 = 정확히 1페이지
//   페이지 높이를 A4 본문 높이로 고정하고, 전체소견·특별소견 박스가 남는 공간을
//   전부 차지하도록 flex 로 늘린다. 그래도 내용이 넘치면 인쇄 직전에 폰트 배율
//   (--op-scale)을 단계적으로 낮춰 한 장에 맞춘다. 자세한 내용은 fitToOnePage() 참고.

// ── 페이지 규격 ───────────────────────────────────────────────────────────────

/** A4 210mm − 좌우 여백 14mm×2 */
const PAGE_WIDTH_MM = 182;
/** A4 297mm − 상하 여백 14mm×2, 반올림 오차로 2페이지가 되지 않게 2mm 여유 */
const PAGE_HEIGHT_MM = 267;

const MIN_SCALE = 0.55;
const SCALE_STEP = 0.05;

// ── 값 포맷 ───────────────────────────────────────────────────────────────────

const DASH = '—';

/** 교적 자동 기입 항목의 표시값 — 상세 모달에서도 재사용 */
export const formatMemberField = (row: OpinionReportRow, key: MemberFieldKey): string => {
  switch (key) {
    case 'gyogu':            return row.gyogu != null ? `${row.gyogu}교구` : DASH;
    case 'team':             return row.team != null ? `${row.team}팀` : DASH;
    case 'group_no':         return row.group_no != null ? `${row.group_no}그룹` : DASH;
    case 'generation':       return row.generation != null ? `${row.generation}기` : DASH;
    case 'attendance_rate':  return row.attendance_rate != null ? `${row.attendance_rate}%` : DASH;
    case 'leader_names':     return row.leader_names.length > 0 ? row.leader_names.join(', ') : DASH;
    case 'name':             return row.name || DASH;
    case 'gender':           return row.gender ?? DASH;
    case 'birthdate':        return row.birthdate ?? DASH;
    case 'phone_number':     return row.phone_number ?? DASH;
    case 'member_type':      return row.member_type ?? DASH;
    case 'attendance_grade': return row.attendance_grade ?? DASH;
    case 'plt_status':       return row.plt_status ?? DASH;
    case 'school_work':      return row.school_work ?? DASH;
    case 'major':            return row.major ?? DASH;
    default:                 return DASH;
  }
};

/** 작성자 소속 표기 — 임원단 작성자도 교구/팀/그룹을 그대로 보여준다 */
export const formatWriterAffiliation = (w: OpinionWriter): string => {
  const parts = [
    w.gyogu != null ? `${w.gyogu}교구` : null,
    w.team != null ? `${w.team}팀` : null,
    w.group_no != null ? `${w.group_no}그룹` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : DASH;
};

/** 동반배치자 소속 표기 */
export const formatCompanionAffiliation = (c: OpinionCompanion): string => {
  const parts = [
    c.gyogu != null ? `${c.gyogu}교구` : null,
    c.team != null ? `${c.team}팀` : null,
    c.group_no != null ? `${c.group_no}그룹` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : DASH;
};

/** 작성자 직접 입력 항목의 표시값 */
export const formatInputField = (row: OpinionReportRow, key: InputFieldKey): string => {
  const value = row[key];
  return value != null && String(value).trim() !== '' ? String(value) : DASH;
};

// ── 인쇄 스타일 ───────────────────────────────────────────────────────────────

// 자식 요소는 전부 em 단위를 써서 --op-scale 한 값으로 페이지 전체가 축소되게 한다.
const PRINT_CSS = `
#opinion-print-portal {
  /* 화면에서는 보이지 않지만 레이아웃은 살아 있어야 높이 측정이 된다 */
  position: fixed;
  left: -10000px;
  top: 0;
  width: ${PAGE_WIDTH_MM}mm;
  background: #fff;
  z-index: -1;
}
@media print {
  /* 화면 UI는 모두 감추고 인쇄 영역만 남긴다 */
  body > *:not(#opinion-print-portal) { display: none !important; }
  #opinion-print-portal {
    position: static;
    left: 0;
    width: auto;
    z-index: auto;
  }
  @page { size: A4; margin: 14mm; }
  html, body { background: #fff !important; }
}
.op-page {
  box-sizing: border-box;
  height: ${PAGE_HEIGHT_MM}mm;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  break-after: page;
  font-family: 'Pretendard', 'Malgun Gothic', sans-serif;
  color: #111;
  font-size: calc(11pt * var(--op-scale, 1));
  line-height: 1.55;
}
.op-page:last-child { page-break-after: auto; break-after: auto; }

.op-head {
  flex: 0 0 auto;
  border-bottom: 2px solid #111;
  padding-bottom: 0.5em;
  margin-bottom: 0.8em;
}
.op-theme {
  font-size: 1.1em; font-weight: 700; color: #333;
  margin-bottom: 0.2em; word-break: keep-all;
}
.op-title { font-size: 1.55em; font-weight: 700; margin: 0; line-height: 1.3; }
.op-meta { font-size: 0.86em; color: #555; margin-top: 0.25em; }

.op-section-title {
  flex: 0 0 auto;
  font-size: 1.05em; font-weight: 700;
  margin: 0.8em 0 0.35em;
  padding-bottom: 0.2em; border-bottom: 1px solid #bbb;
}
.op-section-title:first-of-type { margin-top: 0; }

.op-grid {
  flex: 0 0 auto;
  display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid #ddd;
}
.op-cell {
  display: flex; gap: 0.5em;
  padding: 0.28em 0.4em; border-bottom: 1px solid #ddd;
  break-inside: avoid;
}
.op-label { flex: 0 0 7em; color: #555; font-size: 0.91em; }
.op-value { flex: 1; word-break: break-word; }

.op-row {
  flex: 0 0 auto;
  padding: 0.3em 0.4em; border-bottom: 1px solid #ddd;
  break-inside: avoid;
}
.op-row-label { color: #555; font-size: 0.91em; margin-bottom: 0.1em; }
.op-row-value { white-space: pre-wrap; word-break: break-word; }

/* 전체소견·특별소견 — 남는 공간을 전부 나눠 가진다 */
.op-longs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-top: 0.6em;
}
.op-long-item {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.op-longbox {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 0.5em;
  border: 1px solid #ddd; border-radius: 3px;
  white-space: pre-wrap; word-break: break-word;
}

.op-writers { flex: 0 0 auto; border-top: 1px solid #ddd; }
.op-writer-row {
  display: flex; gap: 0.6em; align-items: baseline;
  padding: 0.28em 0.4em; border-bottom: 1px solid #ddd;
  break-inside: avoid;
}
.op-writer-aff  { flex: 0 0 11em; }
.op-writer-role { flex: 0 0 4.5em; color: #555; font-size: 0.91em; }
.op-writer-name { flex: 0 0 5.5em; font-weight: 600; }
.op-writer-tel  { flex: 1; color: #555; }

.op-companions { flex: 0 0 auto; border-top: 1px solid #ddd; }
.op-companion-row {
  display: flex; gap: 0.6em; align-items: baseline;
  padding: 0.28em 0.4em; border-bottom: 1px solid #ddd;
  break-inside: avoid;
}
.op-companion-aff  { flex: 0 0 11em; }
.op-companion-name { flex: 1; font-weight: 600; }

.op-empty { color: #999; }
.op-foot {
  flex: 0 0 auto;
  margin-top: 0.7em; font-size: 0.82em; color: #777;
  display: flex; justify-content: space-between; gap: 1em;
}
`;

// ── 한 건 렌더 ────────────────────────────────────────────────────────────────

interface PageProps {
  row: OpinionReportRow;
  memberFields: MemberFieldKey[];
  inputFields: InputFieldKey[];
  /** 소견서 주제(표어) — 머리말 */
  theme?: string | null;
}

const OpinionPage: React.FC<PageProps> = ({ row, memberFields, inputFields, theme }) => {
  const shortInputs = inputFields.filter((k) => !INPUT_FIELD_MULTILINE.includes(k));
  const longInputs = inputFields.filter((k) => INPUT_FIELD_MULTILINE.includes(k));

  return (
    <div className="op-page">
      <div className="op-head">
        {theme && <div className="op-theme">{theme}</div>}
        <h1 className="op-title">{row.report_year}년 소견서 — {row.name}</h1>
        <div className="op-meta">
          {row.is_written
            ? `최종 수정 ${row.updated_at ? row.updated_at.slice(0, 10) : DASH}`
            : '미작성'}
        </div>
      </div>

      {memberFields.length > 0 && (
        <>
          <div className="op-section-title">교적 정보</div>
          <div className="op-grid">
            {memberFields.map((key) => (
              <div className="op-cell" key={key}>
                <span className="op-label">{MEMBER_FIELD_LABELS[key]}</span>
                <span className="op-value">{formatMemberField(row, key)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {inputFields.length > 0 && <div className="op-section-title">소견 내용</div>}

      {shortInputs.map((key) => {
        const value = formatInputField(row, key);
        return (
          <div className="op-row" key={key}>
            <div className="op-row-label">{INPUT_FIELD_LABELS[key]}</div>
            <div className={`op-row-value${value === DASH ? ' op-empty' : ''}`}>{value}</div>
          </div>
        );
      })}

      {/* 남는 세로 공간을 전부 차지 — 내용이 짧아도 칸이 크게 유지된다 */}
      <div className="op-longs">
        {longInputs.map((key) => {
          const value = formatInputField(row, key);
          return (
            <div className="op-long-item" key={key}>
              <div className="op-row-label">{INPUT_FIELD_LABELS[key]}</div>
              <div className={`op-longbox${value === DASH ? ' op-empty' : ''}`}>{value}</div>
            </div>
          );
        })}
      </div>

      {/* 작성자 — 소속 · 역할 · 이름 · 전화번호 */}
      <div className="op-section-title">작성자</div>
      {row.writers.length === 0 ? (
        <div className="op-row op-empty">지정된 작성자가 없습니다.</div>
      ) : (
        <div className="op-writers">
          {row.writers.map((w) => (
            <div className="op-writer-row" key={w.member_id}>
              <span className="op-writer-aff">{formatWriterAffiliation(w)}</span>
              <span className="op-writer-role">{w.role}</span>
              <span className="op-writer-name">{w.name}</span>
              <span className="op-writer-tel">{w.phone_number ?? DASH}</span>
            </div>
          ))}
        </div>
      )}

      {/* 동반배치자 — 팀배치에서 같은 팀에 묶인 인원 (작성자 페이지에는 미노출) */}
      {row.companions.length > 0 && (
        <>
          <div className="op-section-title">동반배치자</div>
          <div className="op-companions">
            {row.companions.map((c) => (
              <div className="op-companion-row" key={c.member_id}>
                <span className="op-companion-aff">{formatCompanionAffiliation(c)}</span>
                <span className="op-companion-name">{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="op-foot">
        <span>{[
          row.gyogu != null ? `${row.gyogu}교구` : null,
          row.team != null ? `${row.team}팀` : null,
          row.group_no != null ? `${row.group_no}그룹` : null,
        ].filter(Boolean).join(' ')}</span>
        <span>{row.report_year}년 소견서</span>
      </div>
    </div>
  );
};

// ── 1페이지 맞춤 ──────────────────────────────────────────────────────────────

/**
 * 페이지가 넘치면 폰트 배율을 한 단계씩 낮춰 A4 한 장에 맞춘다.
 *
 * 넘침 판정은 두 가지다.
 *   1) 페이지 자체가 넘침       — 교적 항목이 많아 고정 영역만으로 꽉 찬 경우
 *   2) 긴 소견 박스가 넘침      — flex 로 눌린 박스 안에서 텍스트가 잘리는 경우
 *
 * scrollHeight 를 읽는 시점에 강제로 리플로우가 일어나므로 별도 처리는 필요 없다.
 */
const fitToOnePage = (page: HTMLElement): void => {
  const overflows = (): boolean => {
    if (page.scrollHeight > page.clientHeight + 1) return true;
    const boxes = page.querySelectorAll<HTMLElement>('.op-longbox');
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].scrollHeight > boxes[i].clientHeight + 1) return true;
    }
    return false;
  };

  let scale = 1;
  page.style.setProperty('--op-scale', '1');

  while (scale > MIN_SCALE && overflows()) {
    scale = Math.round((scale - SCALE_STEP) * 100) / 100;
    page.style.setProperty('--op-scale', String(scale));
  }
};

// ── 인쇄 포털 ─────────────────────────────────────────────────────────────────

interface OpinionReportPrintProps {
  /** 비어 있으면 아무것도 렌더하지 않는다. 값이 채워지면 인쇄 대화상자를 띄운다. */
  rows: OpinionReportRow[];
  memberFields: MemberFieldKey[];
  inputFields: InputFieldKey[];
  /** 소견서 주제(표어) — 머리말 */
  theme?: string | null;
  /** 인쇄 대화상자가 닫힌 뒤 호출 — 반드시 안정된 참조(useCallback)를 넘길 것 */
  onDone: () => void;
}

const OpinionReportPrint: React.FC<OpinionReportPrintProps> = ({
  rows, memberFields, inputFields, theme, onDone,
}) => {
  useEffect(() => {
    if (rows.length === 0) return;

    // 브라우저는 인쇄 머리말에 document.title 을 자동으로 넣는다.
    // 그대로 두면 "NewsongJ Admin"(index.html 의 title)이 소견서에 찍히므로
    // 인쇄 동안만 제목을 바꿔치운다. 저장 시 기본 파일명도 이 값이 된다.
    const originalTitle = document.title;
    const printTitle = rows.length === 1
      ? `${rows[0].report_year}년 소견서 - ${rows[0].name}`
      : `${rows[0].report_year}년 소견서 (${rows.length}건)`;

    const restoreTitle = () => { document.title = originalTitle; };
    const handleAfterPrint = () => { restoreTitle(); onDone(); };
    window.addEventListener('afterprint', handleAfterPrint);

    // 포털이 그려진 뒤 페이지별로 배율을 맞추고 인쇄 대화상자를 띄운다
    const timer = window.setTimeout(() => {
      const root = document.getElementById('opinion-print-portal');
      if (root) {
        const pages = root.querySelectorAll<HTMLElement>('.op-page');
        pages.forEach(fitToOnePage);
      }
      document.title = printTitle;
      window.print();
    }, 120);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.clearTimeout(timer);
      restoreTitle();
    };
  }, [rows, onDone]);

  if (rows.length === 0) return null;

  return createPortal(
    <div id="opinion-print-portal">
      <style>{PRINT_CSS}</style>
      {rows.map((row) => (
        <OpinionPage
          key={row.member_id}
          row={row}
          memberFields={memberFields}
          inputFields={inputFields}
          theme={theme}
        />
      ))}
    </div>,
    document.body,
  );
};

export default OpinionReportPrint;
