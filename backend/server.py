from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import sqlite3
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

from routes.registration import router as registration_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite connection (simple, file-based storage for lightweight status data)
SQLITE_PATH = os.environ.get('SQLITE_PATH', str(ROOT_DIR / 'data' / 'tinyfaith.db'))


def _get_sqlite_connection() -> sqlite3.Connection:
    db_path = Path(SQLITE_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_sqlite() -> sqlite3.Connection:
    conn = _get_sqlite_connection()
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS status_checks (
            id TEXT PRIMARY KEY,
            client_name TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
        '''
    )
    conn.commit()
    return conn


sqlite_conn = _init_sqlite()

# Create the main app
app = FastAPI(title="Tiny Faith Songs Contest API", version="1.0.0")

# Health / status router under /api
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {
        "service": "Tiny Faith Songs Contest API",
        "version": "1.0.0",
        "endpoints": ["/api/register", "/api/health", "/api/status"],
    }


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    sqlite_conn.execute(
        'INSERT INTO status_checks (id, client_name, timestamp) VALUES (?, ?, ?)',
        (doc['id'], doc['client_name'], doc['timestamp']),
    )
    sqlite_conn.commit()
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = sqlite_conn.execute(
        'SELECT id, client_name, timestamp FROM status_checks ORDER BY timestamp DESC LIMIT 1000'
    ).fetchall()
    status_checks = [dict(row) for row in rows]
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Mount routers
app.include_router(api_router)
app.include_router(registration_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)
logger.info("Tiny Faith Songs API starting up")


@app.on_event("shutdown")
async def shutdown_db_client():
    sqlite_conn.close()
