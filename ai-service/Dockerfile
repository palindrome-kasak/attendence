FROM mambaorg/micromamba:1.5.10

WORKDIR /app

COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml /tmp/environment.yml

RUN micromamba install -y -n base -f /tmp/environment.yml && \
    micromamba clean --all --yes

COPY main.py .

ENV MAMBA_DOCKERFILE_ACTIVATE=1

EXPOSE 8001

CMD ["sh", "-c", "/opt/conda/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
