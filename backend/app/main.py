import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.db.database import init_db
from backend.app.api.projects import router as projects_router
from backend.app.api.ai import router as ai_router
from backend.app.api.components import router as components_router
from backend.app.api.schematic import router as schematic_router
from backend.app.api.pcb import router as pcb_router
from backend.app.api.validation import router as validation_router
from backend.app.api.export import router as export_router
from backend.app.api.ws import router as ws_router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="CircuitFlow AI — Production PCB Design & Engineering Desktop Backend"
)

# Enable CORS for local desktop UI / Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
app.include_router(projects_router)
app.include_router(ai_router)
app.include_router(components_router)
app.include_router(schematic_router)
app.include_router(pcb_router)
app.include_router(validation_router)
app.include_router(export_router)
app.include_router(ws_router)

# Mount Frontend Built Static Files if available
dist_dir = settings.base_dir / "frontend" / "dist"
if dist_dir.exists():
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API or docs routes
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        target = dist_dir / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "app": settings.app_name,
            "version": settings.version,
            "status": "operational",
            "kicad_cli": os.path.exists(settings.kicad_cli_path),
            "docs_url": "/docs"
        }

@app.get("/health")
def health_check():
    return {"status": "ok"}
