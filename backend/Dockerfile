# Use the official slim Python image for minimal size
FROM python:3.12-slim

# Install system dependencies and clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    git \
    libpq-dev \
    gcc \
    && apt-get autoremove -y && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install primary Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

RUN apt-get update -y
RUN apt-get install -y iputils-ping

# Set the working directory in the container
WORKDIR /app

# Copy and install Python dependencies first (leverage Docker caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 11441

# Command to run the application
# CMD ["uvicorn", "app.main:app", "--host", "${HOST}", "--port", "${PORT}"]
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:11441", "--workers", "2"]