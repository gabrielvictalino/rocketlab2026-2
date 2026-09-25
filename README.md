# Plano · RocketLab 2026.2

Sistema completo de catálogo e avaliação de filmes inspirado no Letterboxd, evoluindo
[a base original](https://github.com/Sophia-15/rocketlab2026-2) no commit
`05f7a505617ec8440e0705994b2f4f6946068164`. Preserva o esquema estrela, os modelos,
a convenção de constraints e a migração inicial.

**Stack:** Vite + React + TypeScript + TanStack Query; FastAPI, SQLAlchemy 2.0 async,
Alembic e SQLite. As avaliações usam **0–10**, inclusive zero e frações.

## Funcionalidades

- Catálogo paginado, busca por título e filtros combináveis de gênero, ano, produtora
  e nota mínima. A API também aceita nota máxima.
- Ficha com direção, elenco, roteiro, sinopse, produtoras, datas, duração,
  métricas financeiras e avaliações paginadas.
- Cadastro, edição e remoção com confirmação; avaliação com nota e resenha.
- Autenticação do administrador e proteção de todas as escritas no backend.
- Cache no frontend e invalidação em alterações; responsividade.
- Storybook, pytest, Vitest e comando único de verificação.
- Seed idempotente e transacional dos dez CSVs descritos.

## Executar com Docker

Instale e inicie o Docker Desktop com contêineres Linux e Docker Compose.
Execute os comandos abaixo na raiz do projeto. Python e Node locais não são
necessários para esta opção.

```powershell
Copy-Item .env.example .env
docker compose build
docker compose run --rm --no-deps backend python -m app.scripts.admin
```

No Linux/macOS, use `cp .env.example .env`. Se já existir `.env` na raiz,
adicione apenas as configurações que faltam. O comando interativo solicita a
senha e gera `ADMIN_PASSWORD_HASH` e `AUTH_SECRET`: copie as linhas para o `.env`
da raiz, mantendo as aspas simples do hash (ele contém caracteres `$`).
Este arquivo é separado de `backend/.env` e não entra nas imagens.

```sh
docker compose up -d --build
docker compose ps
```

Abra [o aplicativo](http://localhost:8080) e a
[documentação da API](http://localhost:8000/docs). As portas podem ser alteradas
com `WEB_PORT` e `API_PORT` no `.env` da raiz. Sem credenciais configuradas, o
catálogo continua público, mas login e escritas retornam 503.

O frontend é compilado pelo Vite e servido pelo Nginx, que encaminha `/api/`
para o backend. Rotas como `/filmes/novo` funcionam ao recarregar a página.
A API aplica `alembic upgrade head` antes de iniciar e executa como usuário
sem privilégios. O SQLite fica no volume `sqlite-data`, separado do banco local;
o frontend só inicia depois de a API passar na verificação de saúde.

Para importar os CSVs de demonstração incluídos em `backend/data`:

```sh
docker compose exec backend python -m app.scripts.seed /app/seed-data
```

Para usar outro lote, copie sua pasta para o contêiner e execute o seed:

```sh
docker compose cp ./meus-csvs backend:/tmp/meus-csvs
docker compose exec backend python -m app.scripts.seed /tmp/meus-csvs
```

O seed não é executado automaticamente. Sua reexecução é idempotente.
Após alterar as credenciais no `.env`, execute `docker compose up -d` novamente.

```sh
docker compose logs -f
docker compose down
```

`down` preserva o banco. **`docker compose down -v` apaga o volume e os dados.**
As portas estão limitadas ao computador local; esta configuração é para execução
local, sem publicação na internet.

## Pré-requisitos

Python **3.11+**, Node.js **22.18+ ou 24 LTS**, npm e Git.
Não é necessário um servidor de banco. No Windows, se `npm.ps1` for bloqueado,
use `npm.cmd`.

## Backend

### Ambiente e dependências

Na raiz do repositório:

```sh
cd backend
python -m venv .venv
```

Ative o ambiente:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```sh
# Linux/macOS
source .venv/bin/activate
```

Se a ativação estiver bloqueada, use `.\.venv\Scripts\python.exe` no lugar de
`python` no Windows.

```sh
python -m pip install -e ".[dev]"
```

### Configuração e login

Copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

No Linux/macOS, use `cp .env.example .env`. Gere as credenciais:

```sh
python -m app.scripts.admin
```

Informe uma senha com pelo menos 12 caracteres e copie as duas linhas geradas
para o `.env`, preservando as aspas simples do hash. O comando não persiste
a senha em texto. O `.env` é ignorado pelo Git.

| Variável | Padrão / finalidade |
| --- | --- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./rocketlab.db` |
| `BACKEND_CORS_ORIGINS` | Array JSON, `["http://localhost:5173"]` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | Hash gerado pelo comando |
| `AUTH_SECRET` | Segredo aleatório gerado pelo comando, mínimo 32 caracteres |
| `AUTH_TOKEN_TTL_SECONDS` | 3600 |
| `ENVIRONMENT` | `local` habilita log SQL; `development` reduz o ruído |
| `LOG_LEVEL` | `INFO` |

Execute os comandos do backend em `backend/`: o caminho SQLite é relativo ao
diretório de execução. Adicione `http://127.0.0.1:5173` ao array CORS se usar
esse endereço no navegador.

### Migrações

```sh
python -m alembic upgrade head
python -m alembic check
```

A revisão original `0001_initial_movie_schema` atende à implementação. Não houve
alteração estrutural: não foi criada uma revisão vazia. A aplicação e o seed não
criam tabelas, e os bancos de teste são criados exclusivamente pelo Alembic.
A convenção `NAMING_CONVENTION` de `app/db/base.py` foi preservada.

Para alterações futuras:

```sh
python -m alembic revision --autogenerate -m "descricao_da_alteracao"
# Revise o arquivo gerado antes de aplicar.
python -m alembic upgrade head
```

### Seed dos CSVs

Os CSVs oficiais são fornecidos separadamente. Coloque-os em `data/diamond/`
na raiz, ou informe outra pasta:

```sh
python -m app.scripts.seed ../data/diamond
```

Para experimentar sem os arquivos oficiais:

```sh
python -m app.scripts.seed ../data/demo
```

**A demonstração contém 8 filmes fictícios e 16 avaliações.**
Não corresponde aos dados oficiais.

A relação do enunciado contém dez arquivos, apesar de mencionar nove. A ordem é:

1. `dim_movies.csv`, `dim_genres.csv`, `dim_companies.csv`, `dim_people.csv`;
2. `bridge_movie_genre.csv`, `bridge_movie_company.csv`, `bridge_movie_person.csv`;
3. `fact_movies_performance.csv`;
4. `dim_reviews.csv`;
5. `movies_reviews.csv`, mapeado para `movie_reviews`.

Regras da carga:

- CSV UTF-8 com ou sem BOM, separador vírgula, cabeçalho igual aos campos da tabela.
  Textos que contêm vírgulas devem ser delimitados por aspas.
- Datas ISO `AAAA-MM-DD`, ponto decimal e chaves SHA-256 com 64 hexadecimais.
  Campos vazios/`null`/`none`/`nan` viram nulo somente quando a coluna permite.
- Upsert pelas chaves substitutas; pontes usam a chave composta. Reexecuções não
  duplicam registros. Dados ausentes do CSV não são excluídos.
- Uma transação para o lote inteiro: referências órfãs e valores inválidos abortam
  a carga, informando arquivo e linha, e revertem todos os arquivos.
- `created_at` é gerado pelo banco quando omitido e preservado na reexecução.
- O resumo é importado e depois **recalculado pelas avaliações individuais**.
  Filmes sem avaliações têm quantidade zero e média nula.
- `--allow-partial` aceita apenas os arquivos presentes, útil para receber primeiro
  as dimensões. Um resumo já gerado por uma carga parcial é atualizado por
  `sk_movie_id`, preservando sua chave.
- Colisões entre chaves diferentes com o mesmo nome único de dimensão são rejeitadas,
  sem remapear silenciosamente os vínculos.
- Para manter demonstração e dados oficiais separados, configure outro arquivo SQLite,
  migre-o e execute a carga correspondente.

### Subir a API

```sh
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentação em [localhost:8000/docs](http://localhost:8000/docs);
saúde em [localhost:8000/health](http://localhost:8000/health).

## Frontend

Em outro terminal, na raiz:

```sh
cd frontend
npm ci
```

Copie `.env.example` para `.env` (`Copy-Item` no PowerShell ou `cp` no Unix):

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
VITE_QUERY_STALE_TIME_MS=30000
```

```sh
npm run dev
```

Abra [localhost:5173](http://localhost:5173). O catálogo é público; a **Área admin**
permite entrar com as credenciais configuradas no backend.

```sh
npm run build
npm run preview
```

O preview de produção normalmente usa a porta 4173: adicione sua origem ao CORS
para acessar a API. As variáveis `VITE_*` são públicas e incorporadas no build.

## Storybook

```sh
cd frontend
npm run storybook
```

Abra [localhost:6006](http://localhost:6006). As histórias incluem catálogo vazio
e preenchido, ficha completa/sem avaliações, cadastro, edição, envio e erros dos
formulários. Usam os componentes reais com fixtures locais, sem exigir a API.

```sh
npm run build-storybook
```

Saída: `frontend/storybook-static/`.

## Testes e comando único

Após instalar as dependências dos dois projetos, na **raiz**:

```sh
python scripts/check.py
```

Para verificar somente o backend, usando seu ambiente virtual:

```sh
python scripts/check.py --backend-only
```

O comando cria uma pasta temporária exclusiva por execução para os bancos de
teste e a remove ao terminar, evitando conflitos de permissão com pastas antigas
do pytest no Windows. Não utiliza o banco local da aplicação.

O script encontra `backend/.venv` e executa Ruff, pytest, Vitest, TypeScript/build
Vite e build Storybook, interrompendo em qualquer falha. Os testes não alteram seu
banco local: usam bancos SQLite temporários, criados pelas migrações.

Em um ambiente restrito que impeça o esbuild de ler diretórios ancestrais, existe
`python scripts/check.py --restricted`: executa os mesmos testes, usa o carregador
nativo do Vite e compila somente a prévia do Storybook, sem sua interface de
navegação (manager). Este é um modo de diagnóstico explícito, não substitui a
verificação completa da interface do Storybook em um terminal sem essa restrição.

Comandos separados:

```sh
cd backend
python -m ruff check app tests
python -m pytest -q
```

```sh
cd frontend
npm test
npm run test:watch
npm run build
```

Cobertura funcional:

- Backend: testes originais, CRUD, associações, cascade, filtros,
  busca literal, paginação, médias, notas zero/dez, concorrência,
  login, assinatura e expiração, seed idempotente, rollback,
  carga parcial/completa, upgrade/downgrade e ausência de drift no schema.
- Frontend: catálogo, ficha, vazios, filtros/paginação,
  formulários, nota zero, autenticação, rotas protegidas, confirmação de exclusão
  e invalidação de cache.

## API

Prefixo: `/api/v1`. `id` é a chave `sk_movie_id`.

| Método | Caminho | Acesso |
| --- | --- | --- |
| POST | `/auth/login` | Público |
| GET | `/auth/me` | Administrador |
| GET | `/movies` | Público |
| GET | `/movies/filters` | Público |
| GET | `/movies/{id}` | Público |
| GET | `/movies/{id}/reviews` | Público, paginado |
| POST | `/movies` | Administrador |
| PUT | `/movies/{id}` | Administrador |
| DELETE | `/movies/{id}` | Administrador |
| POST | `/movies/{id}/reviews` | Administrador |

A listagem recebe `page` (1+), `page_size` (1–100; padrão 12), `q`,
`genero`, `ano`, `produtora`, `nota_min`, `nota_max` e
Retorna `items`, `total`, `page`, `page_size`,
`pages`. As avaliações usam página padrão de dez itens, com mais recentes primeiro.
Filmes sem avaliações não entram nos filtros de nota; zero é uma nota válida.

Exemplo de cadastro:

```json
{
  "titulo": "Meu filme",
  "ano_lancamento": 2026,
  "diretores": ["Nome da direção"],
  "generos": ["Drama"],
  "produtoras": ["Minha produtora"],
  "sinopse": "Uma história para compartilhar.",
  "pessoas": [{"nome_pessoa": "Nome do elenco", "tipo_pessoa": "Ator"}]
}
```

PUT substitui os dados editáveis; preserva a identidade do filme, avaliações e
métricas financeiras. A criação gera `sk_movie_id` SHA-256 e `id_filme`
com prefixo `local-`.

Login: `{"username":"admin","password":"sua senha"}`.
Use o `access_token` retornado no cabeçalho `Authorization: Bearer <token>`.
Avaliação: `{"nome":"Admin","nota":8.5,"comentario":"Minha resenha"}`.

## Decisões e limites

**Leitura pública, escrita protegida.** O catálogo não contém dados privados.
A API exige autenticação nas escritas independentemente dos controles visuais.

**Administrador único por configuração.** Não foi necessário adicionar tabelas de
usuários. Senhas usam PBKDF2-SHA256 com salt aleatório e 600 mil iterações. Tokens
próprios são assinados com HMAC-SHA256 e expiram; não são JWT. Sem hash/segredo
configurados, autenticação retorna 503. O token fica somente na memória: recarregar
exige novo login. Sair remove
o token do cliente; não há revogação individual no servidor. Trocar o segredo e
reiniciar invalida todos os tokens. Use HTTPS ao hospedar.

**Concorrência.** Escritas usam `BEGIN IMMEDIATE` no SQLite antes de ler e atualizar
o agregado. Avaliação e resumo são confirmados juntos. Chaves estrangeiras são
habilitadas por conexão. A exclusão em cascade remove fatos, resenhas e pontes,
preservando dimensões compartilhadas.

**Cache.** TanStack Query usa chaves com parâmetros completos, filme e página.
Todas as escritas invalidam o grupo `movies`, incluindo filtros e médias.
Não existe cache duplicado no backend. Escritas por outro cliente/seed aparecem
na próxima revalidação, ao retornar à janela ou atualizar a página.

**Limites.** A busca parcial escapa curingas e ignora caixa para ASCII no SQLite,
mas não normaliza acentos/Unicode. Métricas financeiras são
consultáveis, sem formulário de edição.
O seed privilegia atomicidade: cargas grandes ocupam o escritor SQLite durante
a transação.

## Estrutura

```text
backend/
  app/api/v1/        Routers e login
  app/core/          Settings, segurança e logging
  app/db/            Base e sessões async
  app/movies/        Modelos originais, schemas, serviço e router
  app/scripts/       Seed e configuração do administrador
  migrations/       Migração inicial original
  tests/            Testes em bancos temporários
frontend/
  .storybook/       Storybook
  src/components/   Componentes e histórias
  src/test/         Fixtures e testes
  public/            Arquivos públicos do frontend
data/demo/          Dez CSVs fictícios
scripts/check.py    Comando único de verificação
```

O histórico Git mantém a origem da base. Nenhuma publicação, push ou pull request
foi realizada; a entrega é local para sua avaliação.
