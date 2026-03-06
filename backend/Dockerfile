FROM python:3.11-slim
WORKDIR /app
# 1번 검증: 폴더 안에 'requirements.txt' 파일이 실제로 있나요?
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# 2번 검증: 실행 파일명이 'main.py'이고, 그 안에 'app = FastAPI()'라고 되어 있나요?
# 만약 파일명이 api.py라면 "api:app"으로 고쳐야 합니다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]