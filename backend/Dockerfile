# Use Miniconda as base image
#Commdands to run
#docker build -t backend .
#docker run -p 3050:3050 backend
FROM continuumio/miniconda3:latest

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy environment.yml and requirements.txt
COPY environment.yml .
# Use Miniconda as base image
FROM continuumio/miniconda3:latest

# Install system dependencies required for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements.txt
COPY requirements.txt .

# Create a fresh conda environment with just Python 3.9
RUN conda create -n apple_tensorflow python=3.9 -y

# Make RUN commands use the new environment
SHELL ["conda", "run", "-n", "apple_tensorflow", "/bin/bash", "-c"]

# Install pip packages from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files
COPY . .

# Expose the port used by Flask
EXPOSE 3050

# Run the Flask application using the conda environment
CMD ["conda", "run", "--no-capture-output", "-n", "apple_tensorflow", "python", "server.py"]