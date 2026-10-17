FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt requirements-ai.txt ./
ARG INSTALL_AI=true
RUN pip install --no-cache-dir -r requirements.txt && \
    if [ "$INSTALL_AI" = "true" ]; then pip install --no-cache-dir -r requirements-ai.txt; fi
COPY . .
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
