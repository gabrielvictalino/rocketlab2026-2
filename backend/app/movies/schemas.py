from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Genre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class PersonInput(BaseModel):
    nome_pessoa: Name
    tipo_pessoa: Literal["Ator", "Diretor", "Roteirista"]


class MovieInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    titulo: Title
    ano_lancamento: int = Field(ge=1888, le=2200)
    diretores: list[Name] = Field(min_length=1, max_length=30)
    generos: list[Genre] = Field(min_length=1, max_length=30)
    sinopse: str = Field(min_length=1, max_length=4000)
    produtoras: list[Name] = Field(default_factory=list, max_length=50)
    pessoas: list[PersonInput] = Field(default_factory=list, max_length=300)
    data_lancamento: date | None = None
    duracao_minutos: int | None = Field(default=None, ge=1, le=10000)
    status_filme: str | None = Field(default=None, max_length=50)
    url_poster: HttpUrl | None = None
    url_backdrop: HttpUrl | None = None

    @model_validator(mode="after")
    def consistent_date(self):
        for url in (self.url_poster, self.url_backdrop):
            if url is not None and len(str(url)) > 2048:
                raise ValueError("URLs devem ter no máximo 2048 caracteres.")
        if self.data_lancamento and self.data_lancamento.year != self.ano_lancamento:
            raise ValueError("A data e o ano de lançamento devem corresponder.")
        return self


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    nome: str = Field(min_length=1, max_length=120)
    nota: float = Field(ge=0, le=10, allow_inf_nan=False)
    comentario: str = Field(min_length=1, max_length=4000)


class ReviewOutput(ReviewInput):
    model_config = ConfigDict(from_attributes=True)
    sk_movie_review_id: str
    sk_movie_id: str
    created_at: datetime
