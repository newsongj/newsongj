from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "deploy skip 오류 수정 test"}
