import os
from dotenv import load_dotenv

load_dotenv()

# 앱 기본 설정
APP_TITLE = "newsongj API"
APP_VERSION = "1.0.0"

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY", "changeme")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간
