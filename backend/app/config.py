import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "CircuitFlow AI"
    version: str = "1.0.0"
    debug: bool = True
    port: int = 8000
    host: str = "127.0.0.1"
    
    # Storage
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    data_dir: Path = base_dir / "data"
    projects_dir: Path = data_dir / "projects"
    exports_dir: Path = data_dir / "exports"
    db_path: Path = data_dir / "circuitflow.db"
    
    # KiCad paths
    kicad_cli_path: str = r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe"
    kicad_python_path: str = r"C:\Program Files\KiCad\10.0\bin\python.exe"
    kicad_symbols_dir: str = r"C:\Program Files\KiCad\10.0\share\kicad\symbols"
    kicad_footprints_dir: str = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
    kicad_3dmodels_dir: str = r"C:\Program Files\KiCad\10.0\share\kicad\3dmodels"
    
    # AI API keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

settings = Settings()

# Ensure directories exist
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.projects_dir.mkdir(parents=True, exist_ok=True)
settings.exports_dir.mkdir(parents=True, exist_ok=True)

