# 백엔드

FastAPI / SQLAlchemy / MariaDB 기반 교적·출석·새가족·수련회 관리 API다.

| 위치 | 역할 |
|---|---|
| `app/main.py` | 앱 생성과 라우터 등록 |
| `app/api/v1/` | 교적·출석·메타·권한·수련회 HTTP API |
| `app/core/` | 설정, DB 세션, JWT, 시간 처리 |
| `app/models/`, `app/schemas/` | 저장 모델과 요청·응답 계약 |
| `app/services/`, `app/crud/` | 업무 처리와 DB 조회·저장 |
| `tests/` | 업무·인증·권한 회귀 검사 |
| `tools/verify_backend.py` | 로컬·CI 공통 격리 테스트 실행기 |

기존 URL prefix는 도메인마다 다르므로 `app/main.py`와 라우터 선언을 확인한다.
HTTP `/docs`, `/redoc`, `/openapi.json`은 현재 비활성이다.

## 주일보고 다운로드 시제품

출석 대시보드에서 주간·교구·팀을 선택하고 **주일보고 다운로드**를 누른다.
첫 시트 맨 아래 `E64`만 대시보드와 동일한 실제 출석 수이며, 나머지는 디자인용 가상 데이터다.
양식은 `app/assets/reports/sunday_report_v1.xlsx`에 있으며 생성 파일은 메모리에서 반환한다.
대시보드 메뉴 권한이 필요하다. 교구·팀 제한 계정은 자신의 범위와 일치하는 필터만
다운로드할 수 있고 구역·개인 범위는 아직 지원하지 않는다. 추가 라이브러리·Excel 설치는 필요 없다.

## 테스트

저장소 루트에서 실행한다. Python 3.10 이상으로 실행기를 시작할 수 있으며,
테스트 환경은 Python 3.11과 `requirements-dev.txt`를 사용한다.

```bash
python3 backend/tools/verify_backend.py
python3 backend/tools/verify_backend.py tests/test_member_bulk.py
python3 backend/tools/verify_backend.py -k newcomer
python3 backend/tools/verify_backend.py --runtime docker --database mariadb
```

기본 `auto`는 실행 중인 Docker에서 네트워크 없는 SQLite 테스트를 실행한다.
Docker를 사용할 수 없으면 macOS의 `sandbox-exec`와 `uv`로 임시 환경을 만들고
네트워크 접근을 차단한다. 런타임을 지정하려면 `--runtime docker` 또는 `--runtime sandbox`를 쓴다.
Docker 데몬이나 기존 Compose 서비스를 자동으로 시작하지 않는다.
테스트 컨테이너는 임시 소스 폴더 소유자의 UID/GID로 실행한다. 폴더의 `0700` 권한과
읽기 전용 마운트·Linux capability 제거를 유지하면서 CI에서도 소스를 읽을 수 있다.

앱·테스트·의존성 파일만 임시 복사하며 `.env`와 기존 DB 파일은 제외한다.
의존성 설치에는 네트워크가 필요할 수 있지만 앱 import는 격리 이후에만 수행한다.
fixture는 DB/JWT 설정을 테스트 값으로 덮고 테스트 엔진을 연결한 뒤 앱을 불러온다.
인증 우회 없이 실제 JWT를 검증하며, 필요한 메뉴와 소속 범위를 각 테스트에서 지정한다.

MariaDB 모드는 내부 전용 Docker 네트워크와 임시 DB를 사용한다. 호스트 포트나 기존 볼륨을
연결하지 않으며 종료 시 테스트 컨테이너·DB·네트워크를 정리한다. 의존성 이미지 캐시는 남을 수 있다.
SQLite 결과는 MariaDB의 ENUM·JSON·잠금·동시성 검증을 대신하지 않는다.

pytest 종료 코드를 그대로 전달하므로 테스트 실패나 빈 선택은 CI 실패가 된다.
환경 준비 실패는 미실행(종료 코드 2)로 표시하며, 격리 없는 실행으로 우회하지 않는다.
`xfail`/`skip`은 출력에서 별도로 확인한다. 수련회 소속 밖 저장 3건은 알려진 결함으로
strict xfail 처리되어 있다. 실제 무단 저장만 xfail로 인정하며, 다른 오류는 실패한다.
권한을 수정하면 해당 표시를 제거해야 한다.

## 서비스 실행 맥락

기존 루트 `docker-compose.yml`의 backend는 `backend/.env`로 서버 DB에 연결한다.
또한 `app.main`은 import 시점에 `create_all()`을 호출한다. 단순 테스트 목적으로 기존
Compose를 켜거나 앱을 직접 import하지 말고 위 실행기를 사용한다.
실제 개발 서버 실행에는 대상 DB가 개발용인지 먼저 확인해야 한다.
운영 배포 Compose는 `.github/workflows/deploy.yml`에서 생성한다.
