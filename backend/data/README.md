# Dados

`demo/` contém **8 filmes fictícios** e 16 avaliações.
São exclusivamente exemplos para avaliar a implementação, não os dados oficiais da atividade.

Após `alembic upgrade head`, no diretório `backend/`:

```sh
python -m app.scripts.seed ../data/demo
```

Caso use outra origem, ajuste as URLs no CSV antes da carga.

Coloque os CSVs oficiais em `data/diamond/` (ignorado pelo Git) e execute:

```sh
python -m app.scripts.seed ../data/diamond
```

Use bancos separados para dados de demonstração e oficiais se não desejar misturá-los;
a carga faz upsert e nunca remove registros ausentes dos arquivos.
