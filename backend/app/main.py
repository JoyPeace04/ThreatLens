import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.api import api_router
from backend.app.models.case import Case
from backend.app.models.user import User, hash_password

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ThreatLens.Main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)

    # Seed initial cases and users if not present
    db = SessionLocal()
    try:
        # 1. Seed Cases
        if db.query(Case).count() == 0:
            logger.info("Seeding initial threat cases for hackathon demo...")
            case_1 = Case(
                id="c1a11111-0000-0000-0000-000000000001",
                title="Operation PhishShield: Russian Relay Syndicate",
                shared_indicator="185.220.101.5",
                indicator_type="IP",
                status="INVESTIGATING",
                notes="Coordinated credential-harvesting campaign utilizing Tor and bulletproof hosting in Moscow.",
            )
            case_2 = Case(
                id="c2b22222-0000-0000-0000-000000000002",
                title="Operation TypoTrap: Brand Typosquatting Group",
                shared_indicator="microsof1-online.net",
                indicator_type="DOMAIN",
                status="OPEN",
                notes="HR payroll spoofing campaign targeting corporate banking routing numbers.",
            )
            case_3 = Case(
                id="c3c33333-0000-0000-0000-000000000003",
                title="Operation PayPal Impersonation Ring",
                shared_indicator="paypa1-security.com",
                indicator_type="DOMAIN",
                status="OPEN",
                notes="Fake account suspension alerts targeting high-net-worth retail accounts.",
            )
            db.add_all([case_1, case_2, case_3])
            db.commit()
            logger.info("Initial cases successfully seeded.")

        # 2. Seed Default Users
        if db.query(User).count() == 0:
            logger.info("Seeding default analyst and admin accounts...")
            pwd_analyst, salt_analyst = hash_password("threatlens2026")
            user_analyst = User(
                id="u1111111-0000-0000-0000-000000000001",
                email="analyst@threatlens.io",
                hashed_password=pwd_analyst,
                salt=salt_analyst,
                full_name="Priya Sharma (Senior Analyst)",
                role="analyst",
            )

            pwd_admin, salt_admin = hash_password("admin2026")
            user_admin = User(
                id="u2222222-0000-0000-0000-000000000002",
                email="admin@threatlens.io",
                hashed_password=pwd_admin,
                salt=salt_admin,
                full_name="Dr. Rajesh Kumar (CERT-In Lead)",
                role="admin",
            )

            db.add_all([user_analyst, user_admin])
            db.commit()
            logger.info("Default users seeded: analyst@threatlens.io / threatlens2026, admin@threatlens.io / admin2026")
    except Exception as e:
        logger.warning(f"Error checking or seeding database records: {e}")
    finally:
        db.close()

    yield
    logger.info("ThreatLens backend shutting down.")

app = FastAPI(
    title="ThreatLens API",
    description="AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS. Local development is always supported; deployed frontends are
# supplied through CORS_ORIGINS (a comma-separated environment variable).
# Support both names used to reach Vite locally.  They are different browser
# origins, so allowing only ``localhost`` makes direct local API calls from
# ``127.0.0.1:5173`` fail as a generic "Failed to fetch" error.
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
if settings.CORS_ORIGINS:
    cors_origins.extend(
        origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": "ThreatLens Forensic Intelligence Platform",
        "version": "2.0.0",
        "docs_url": "/docs",
        "tagline": "Detect. Trace. Prove."
    }

@app.get("/api/health")
def health_status():
    return {
        "status": "online",
        "service": "ThreatLens Forensic Intelligence Platform",
        "version": "2.0.0",
    }

