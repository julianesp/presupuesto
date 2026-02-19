from pydantic import BaseModel


class ConfigUpdate(BaseModel):
    vigencia: str | None = None
    institucion: str | None = None
    nit_institucion: str | None = None
    rector: str | None = None
    tesorero: str | None = None
    codigo_dane: str | None = None


class ConfigResponse(BaseModel):
    vigencia: str = ""
    institucion: str = ""
    nit_institucion: str = ""
    rector: str = ""
    tesorero: str = ""
    mes_actual: str = "1"
    codigo_dane: str = ""
