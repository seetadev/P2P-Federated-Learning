FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git gcc g++ libffi-dev && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.6.14

WORKDIR /app
COPY pyproject.toml ./
RUN uv sync --all-extras --no-dev

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .

EXPOSE 8000 9000

ENV PYTHONUNBUFFERED=1

CMD ["python", "p2p/runner.py"]
