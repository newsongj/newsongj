# Caddy로 HTTPS 붙이기 — 완전 초보용 설명서

> 목표: 지금 HTTP(80)로만 열려 있는 사이트를 **HTTPS(443)** 로 바꾸기.
> 방식: **Caddy**(무료 인증서 자동 발급·자동 갱신)를 기존 Nginx **앞**에 세운다.
> 핵심: **기존 nginx.conf·백엔드·DB는 한 줄도 안 고친다.** Caddy만 새로 추가한다.

---

## 0. 3줄 요약 (먼저 큰 그림)

1. Caddy라는 프로그램을 컨테이너 하나로 새로 띄운다.
2. Caddy가 바깥의 443(HTTPS)을 받아서 → 내부의 기존 Nginx(80)로 그대로 넘긴다.
3. 인증서 발급·갱신은 Caddy가 알아서 한다. 우리가 할 일은 **도메인 연결 + 방화벽 443 열기 + 설정 몇 줄**이 전부.

**간단하냐?** → 네. 개념은 "문지기 한 명 더 세우기"이고, 실제 작업은 파일 2개(`deploy.yml`, `Caddyfile`) 수정입니다.

---

## 1. 지금 구조 vs 바꾼 후 구조

### 지금 (HTTP만)

```
인터넷 ──▶ [Lightsail :80] ──▶ frontend 컨테이너 (Nginx)
                                     ├─ /admin   → 정적파일(관리자 React)
                                     ├─ /api     → backend:8000
                                     └─ /vehicle 등 → client-frontend:80
```

- 바깥에서 들어오는 문(포트)은 **80(HTTP)** 하나.
- `frontend`(Nginx) 컨테이너가 **호스트 80번을 직접 차지**하고 있음.

### 바꾼 후 (HTTPS)

```
인터넷 ──▶ [Lightsail :443 HTTPS] ──▶ caddy 컨테이너 (인증서 처리)
           [Lightsail :80  HTTP ] ──▶ caddy (→ 자동으로 443로 리다이렉트)
                                          │
                                          ▼ (내부망, 암호화 벗긴 평문)
                                     frontend 컨테이너 (Nginx)  ← 기존 그대로
                                          ├─ /admin
                                          ├─ /api → backend
                                          └─ /vehicle 등 → client-frontend
```

**바뀌는 것은 딱 하나**: 바깥 문을 이제 **Caddy가 지킨다**. Nginx는 뒤로 한 칸 물러나 내부에서만 일한다(호스트 포트를 안 가짐).

> 왜 Nginx를 안 없애나? 지금 nginx.conf에 `/admin`, `/api`, `/vehicle`… 라우팅이 촘촘히 짜여 있음. 그걸 Caddy 문법으로 다시 옮기면 실수 날 위험이 있으니, **검증된 Nginx는 그대로 두고 TLS(암호화)만 Caddy에 맡기는** 게 가장 안전.

---

## 2. Caddy가 인증서를 자동으로 처리하는 원리 (안심용 이해)

1. Caddy를 켜면서 "이 도메인 담당이야"라고 알려줌 (`Caddyfile`에 도메인 1줄).
2. Caddy가 Let's Encrypt(무료 인증서 발급 기관)에 자동으로 요청.
3. Let's Encrypt가 "네가 진짜 그 도메인 주인 맞아?" 확인 →
   Caddy가 **포트 80/443으로 오는 검증 요청에 자동 응답**해서 증명.
4. 인증서 받아서 저장 → HTTPS 서비스 시작.
5. 만료(90일) 30일 전쯤 **Caddy가 알아서 갱신**. 사람이 할 일 없음.

> 그래서 **포트 80과 443 둘 다 열려 있어야** 함 (검증 통로). 80은 지금도 열려 있고, 443만 새로 열면 됨.

---

## 3. 준비물 (이건 코드 밖에서 먼저 해야 함)

### 3-1. 도메인 (필수)

- Let's Encrypt는 **IP 주소엔 인증서를 안 줌.** 반드시 도메인 필요 (예: `admin.example.com`).
- 이미 도메인 있으면 그걸 쓰고, 없으면 하나 등록해야 함 (가비아/Cloudflare/네임칩 등).

### 3-2. Lightsail 고정 IP (Static IP)

- 안 해뒀다면 **먼저 고정 IP를 할당**하세요. 안 그러면 인스턴스 재시작 때 IP가 바뀌어서 도메인 연결이 끊깁니다.
- Lightsail 콘솔 → Networking → Create static IP → 인스턴스에 attach.

### 3-3. DNS A 레코드

- 도메인 관리 페이지에서 **A 레코드**를 만들어 위 고정 IP를 가리키게 함.
  ```
  admin.example.com   A   →   <Lightsail 고정 IP>
  ```
- 반영에 몇 분~수십 분 걸림. `nslookup admin.example.com` 으로 IP가 맞게 나오는지 확인.

### 3-4. Lightsail 방화벽에서 443 열기 (매우 중요, 자주 빠뜨림)

- Lightsail은 **자체 방화벽**이 있어서 여기서 443을 안 열면 컨테이너를 아무리 잘 띄워도 바깥에서 접속 불가.
- Lightsail 콘솔 → 인스턴스 → **Networking** 탭 → **IPv4 Firewall** →
  - **Add rule**: Application `HTTPS`, Protocol `TCP`, Port `443` 추가.
  - 80은 이미 열려 있을 것(확인만).

> 참고: 서버 안의 OS 방화벽(firewalld 등)이 아니라 **Lightsail 콘솔의 방화벽**이 실질 관문입니다. 여기부터 확인하세요.

---

## 4. 실제 수정 — 파일이 "어디에 있는지"부터 정확히

> ⚠️ **가장 중요한 함정**: 이 프로젝트의 **실서버 docker-compose.yml은 리포에 있는 그 파일이 아닙니다.**
> 배포 시 `.github/workflows/deploy.yml` 안에서 **heredoc(`COMPOSEOF ... COMPOSEOF`)으로 서버에 새로 써집니다.**
> 즉, 리포 루트의 `docker-compose.yml`은 **로컬 개발용**이고, 실서버에 반영하려면 **`deploy.yml`을 고쳐야** 합니다.

정리:

| 파일 | 정체 | HTTPS 위해 고쳐야 하나? |
|------|------|----------------------|
| 리포 루트 `docker-compose.yml` | 로컬 개발용 (내 맥에서 테스트) | 로컬에서 테스트할 거면 (선택) |
| `.github/workflows/deploy.yml` 안의 heredoc | **실서버가 실제로 쓰는 compose** | **✅ 반드시** |
| `frontend/nginx.conf` | Nginx 라우팅 | ❌ 손 안 댐 |
| `backend/**` | 백엔드 | ❌ 손 안 댐 |

---

## 5. 수정 내용 (실서버 = `deploy.yml`)

`deploy.yml`에서 두 가지를 바꿉니다.

### 5-1. Caddyfile을 서버에 써주는 heredoc 추가

`deploy.yml`의 `script:` 안, `.env`를 쓰는 heredoc 근처에 **Caddyfile 생성 블록**을 추가합니다.

```bash
# ~/newsongj/Caddyfile 생성
cat > ~/newsongj/Caddyfile << 'CADDYEOF'
admin.example.com {
    reverse_proxy frontend:80
}
CADDYEOF
```

- `admin.example.com` → **본인 도메인으로 교체.**
- 내용은 딱 이거면 됨. "이 도메인 오면 내부 frontend(Nginx) 80으로 넘겨라." 나머지 라우팅(`/api` 등)은 Nginx가 이미 함.
- `reverse_proxy`는 원래 `Host` 헤더와 `X-Forwarded-Proto: https`를 자동으로 뒤에 전달함 → Nginx의 `$host` 로직, 백엔드의 https 인식이 정상 동작.

### 5-2. compose heredoc(`COMPOSEOF`)에 caddy 서비스 추가 + frontend 포트 회수

기존 `COMPOSEOF ... COMPOSEOF` 안을 이렇게 바꿉니다. (**굵은 주석**이 바뀌는 부분)

```yaml
services:
  mariadb:
    # ... 기존 그대로, 손 안 댐 ...

  backend:
    # ... 기존 그대로 ...

  client-frontend:
    # ... 기존 그대로 ...

  frontend:
    image: ${DOCKERHUB_USERNAME}/newsongj-front
    restart: unless-stopped
    # ▼▼▼ ports 줄을 삭제한다 (호스트 80을 Caddy에게 넘김) ▼▼▼
    # ports:
    #   - "80:80"
    depends_on:
      - backend
      - client-frontend

  # ▼▼▼ 새로 추가하는 서비스 ▼▼▼
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"       # HTTP (인증서 검증 + HTTPS로 리다이렉트)
      - "443:443"     # HTTPS
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro   # 위에서 만든 설정
      - caddy_data:/data       # ★ 발급받은 인증서 저장 (반드시 영구 보관)
      - caddy_config:/config
    depends_on:
      - frontend

volumes:
  db_data:
  caddy_data:      # ▼ 추가
  caddy_config:    # ▼ 추가

networks:
  default:
    name: newsongj-network
```

**바뀐 것 3가지가 전부:**
1. `frontend`에서 `ports: - "80:80"` **삭제** (호스트 포트를 Caddy에 양보).
2. `caddy` 서비스 **추가** (80·443을 차지).
3. `volumes:`에 `caddy_data`, `caddy_config` **추가**.

> `caddy_data`가 인증서를 담습니다. **이게 없으면 배포할 때마다 인증서를 새로 발급** → Let's Encrypt 주간 발급 한도(도메인당 5회/주)에 걸려 갑자기 HTTPS가 막힐 수 있음. 그래서 **named volume(`caddy_data`)로 영구 보관**이 필수입니다. (아래 6-4 참고)

### 5-3. (선택) https URL 반영

`deploy.yml`이 서버에 써주는 `.env`의 `FRONTEND_URL` / `BACKEND_URL`이 `http://...`로 돼 있고, 백엔드가 이걸 CORS 허용이나 링크 생성에 쓴다면 GitHub Secrets 값을 `https://admin.example.com` 형태로 바꿔주세요. (안 쓰면 무시)

---

## 6. 기존 환경과 충돌·관계 — 면밀 점검

### 6-1. Docker 포트 충돌 (제일 흔한 실수)

- 한 호스트 포트는 **컨테이너 하나만** 쓸 수 있음.
- `frontend`의 `ports: "80:80"`를 **안 지우고** caddy에도 `80:80`을 주면
  → `Bind for 0.0.0.0:80 failed: port is already allocated` 에러로 안 뜸.
- **반드시 frontend의 호스트 포트 바인딩을 지워야 함** (5-2 참고). 지워도 Nginx는 컨테이너 내부에서 여전히 80을 듣고 있고, Caddy가 내부망으로 `frontend:80`에 접속하므로 문제없음.

### 6-2. Nginx와의 관계

- **nginx.conf 수정 0.** Nginx는 자기가 HTTPS 뒤에 있는지도 모르고 평소처럼 80에서 평문을 받음.
- Caddy ↔ Nginx 사이는 **내부 도커 네트워크(`newsongj-network`)** 안이라 평문이어도 안전(외부 노출 없음).
- Caddy는 컨테이너 이름 `frontend`로 접속함 → 같은 compose·같은 네트워크라 이름 해석 자동으로 됨.

### 6-3. Lightsail과의 관계

- Lightsail **콘솔 방화벽에서 443 열기**가 실질 관문 (3-4). 이거 안 하면 컨테이너 정상이어도 접속 불가.
- 고정 IP 미할당 시 재시작마다 IP 변동 → 도메인 깨짐 (3-2).
- Lightsail 인스턴스 자체는 건드릴 것 없음. 전부 컨테이너 레벨.

### 6-4. CI/CD 재배포와 인증서 보존 (중요)

배포 스크립트 마지막이 이렇게 돌아감:
```
docker-compose pull      # 새 이미지 받기
docker-compose up -d     # 갈아끼우기
docker image prune -f    # 안 쓰는 이미지 정리
```
- `up -d`는 **named volume을 유지**함 → `caddy_data`(인증서) 안 지워짐. ✅
- `docker image prune -f`는 **이미지만** 지움. **볼륨은 안 건드림.** ✅
- 즉 **재배포해도 인증서는 그대로 재사용** → 매번 재발급 안 함. 안심.
- (주의: 누군가 `docker-compose down -v` 또는 `docker volume rm`을 수동 실행하면 인증서 삭제됨. 그럴 일은 배포 스크립트에 없음.)

### 6-5. Let's Encrypt 발급 한도

- 같은 도메인 인증서는 **주당 5회**까지 발급 가능.
- 정상 운영(볼륨 보존)하면 처음 1회 발급 후 갱신뿐이라 절대 안 걸림.
- 설정 만지며 **컨테이너를 껐다켰다 반복**하면 발급 시도가 쌓일 수 있으니, 테스트는 아래 7-2의 **staging 모드**로.

### 6-6. 백엔드/DB와의 관계

- 백엔드(8000)와 MariaDB는 **바깥으로 직접 노출 안 됨**(Nginx `/api` 프록시로만 접근). Caddy 도입과 무관, 손 안 댐.
- 백엔드가 프록시 뒤에 있음을 알아야 하는 경우(예: 절대 URL 생성) Caddy가 붙여주는 `X-Forwarded-Proto: https`를 참고. 대개 신경 쓸 것 없음.

---

## 7. 실행 순서 (체크리스트)

### 7-1. 배포 (실서버)

1. ✅ 도메인 A레코드 → 고정 IP (3-3), `nslookup`으로 확인
2. ✅ Lightsail 방화벽 443 열기 (3-4)
3. ✅ `deploy.yml`에 Caddyfile heredoc 추가 (5-1) — **도메인 교체**
4. ✅ `deploy.yml` compose heredoc 수정 (5-2) — frontend 포트 삭제 + caddy 추가 + volumes 추가
5. ✅ main 브랜치에 push → GitHub Actions가 자동 배포
6. ✅ 브라우저에서 `https://admin.example.com` 접속 → 자물쇠 확인
7. ✅ `http://admin.example.com` → 자동으로 https로 튀는지 확인

> 첫 배포 후 인증서 발급에 10~60초 걸릴 수 있음. 바로 안 되면 잠깐 기다렸다 새로고침.

### 7-2. (선택) 로컬에서 먼저 테스트

로컬 맥엔 공인 도메인이 없어 진짜 인증서는 못 받지만, Caddy가 **로컬용 자체 인증서**를 만들어 흐름은 확인 가능. 리포 `docker-compose.yml`에 위 caddy 서비스를 넣고, `Caddyfile`을 이렇게:
```
localhost {
    tls internal            # 로컬 자체서명 인증서
    reverse_proxy frontend:80
}
```
`docker-compose up` 후 `https://localhost` 접속 (브라우저 경고는 자체서명이라 정상, "계속" 누르면 됨).

발급 한도 걱정 없이 실서버 흐름을 예행하려면 Caddyfile에 staging(연습용 발급 서버) 지정도 가능:
```
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
admin.example.com {
    reverse_proxy frontend:80
}
```
(staging 인증서는 브라우저가 신뢰 안 함 — 흐름 검증용. 확정되면 이 블록 제거하고 정식 발급.)

---

## 8. 잘 됐는지 확인 / 문제 해결

### 확인
- 브라우저 자물쇠 → 인증서 발급자 `Let's Encrypt` 로 나오면 성공.
- 서버에서 로그: `docker-compose logs caddy` → `certificate obtained successfully` 비슷한 줄.

### 자주 겪는 증상

| 증상 | 원인 | 해결 |
|------|------|------|
| 사이트 자체가 안 열림 | 443 방화벽 안 열림 | Lightsail 콘솔 방화벽 443 (3-4) |
| `port is already allocated` | frontend `ports:80` 안 지움 | 5-2대로 삭제 |
| 인증서 발급 실패 로그 | 도메인이 이 IP를 안 가리킴 / 80 막힘 | A레코드·80 개방 재확인 |
| https는 되는데 화면 깨짐 | (드묾) 프록시 헤더 문제 | `reverse_proxy` 기본값이면 대개 정상, nginx `$host` 확인 |
| 배포 때마다 발급 시도 | `caddy_data` 볼륨 누락 | 5-2의 volumes 확인 |

---

## 9. 되돌리기 (Rollback)

문제 생기면 원상복구는 간단:
1. `deploy.yml`에서 caddy 서비스·Caddyfile heredoc·volumes 추가분 삭제.
2. `frontend`에 `ports: - "80:80"` 복구.
3. main에 push → 재배포.

기존 HTTP 구조로 즉시 원복됩니다. DB·백엔드·Nginx는 애초에 안 건드렸으니 데이터·기능 영향 없음.

---

## 10. 한 줄 결론

**작업량**: 파일 2곳(`deploy.yml`의 Caddyfile·compose heredoc) 수정 + Lightsail 443 개방 + 도메인 A레코드.
**리스크**: 낮음 (기존 Nginx/백엔드/DB 무수정, 되돌리기 쉬움).
**운영 부담**: 발급·갱신 전자동 → 사실상 0.
