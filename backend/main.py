from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "deploy 효율화 testㅁㅁㅁㅁㅂ"}
