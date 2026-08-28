import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./mospi_airfare.db"
    SCRAPE_SCHEDULE_CRON: str = "0 2 * * *"
    DEFAULT_HORIZONS: Union[str, List[int]] = [1, 7, 15, 30, 45]
    DEFAULT_ROUTES: Union[str, List[str]] = [
        "DEL-BOM",
        "BLR-DEL",
        "HYD-MAA",
        "DEL-MAA",
        "BOM-BLR",
        "DEL-CCU"
    ]
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    @property
    def horizons_list(self) -> List[int]:
        if isinstance(self.DEFAULT_HORIZONS, list):
            return [int(x) for x in self.DEFAULT_HORIZONS]
        if isinstance(self.DEFAULT_HORIZONS, str):
            val = self.DEFAULT_HORIZONS.strip()
            if val.startswith("["):
                return json.loads(val)
            return [int(x.strip()) for x in val.split(",") if x.strip()]
        return [1, 7, 15, 30, 45]

    @property
    def routes_list(self) -> List[str]:
        if isinstance(self.DEFAULT_ROUTES, list):
            return [str(x) for x in self.DEFAULT_ROUTES]
        if isinstance(self.DEFAULT_ROUTES, str):
            val = self.DEFAULT_ROUTES.strip()
            if val.startswith("["):
                return json.loads(val)
            return [x.strip() for x in val.split(",") if x.strip()]
        return ["DEL-BOM", "BLR-DEL", "HYD-MAA", "DEL-MAA", "BOM-BLR", "DEL-CCU"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
