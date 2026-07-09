FROM mambaorg/micromamba:1.5.10

WORKDIR /app

COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml requirements-docker.txt /tmp/

RUN micromamba install -y -n base -f /tmp/environment.yml && \
    micromamba clean --all --yes && \
    /opt/conda/bin/pip install --no-cache-dir -r /tmp/requirements-docker.txt && \
    /opt/conda/bin/python -c "import pkg_resources; import face_recognition; print('face_recognition ready')"

COPY --chown=$MAMBA_USER:$MAMBA_USER main.py .

EXPOSE 8001

CMD ["sh", "-c", "/opt/conda/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
