from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "CI/CD 자동 배포 테스트"}
