import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root@localhost/warehouse_db"
    SECRET_KEY: str = "supersecret_warehouse_key_12345!@#$"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 360
    
    # Static Uploads directory
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
