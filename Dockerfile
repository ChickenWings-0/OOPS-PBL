# Dockerfile
# Builds the web server on Linux in two stages: one to compile, and one small
# image to run. The sample data is copied into the image, so every start of the
# container begins with the clean sample files. See WEB_PLAN.md section 10.

# Stage 1: compile. -O1 keeps memory use low while compiling the large headers.
FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY include/ include/
COPY src/ src/
COPY server/ server/
COPY third_party/ third_party/
RUN g++ -std=c++11 -O1 -Iinclude -Iserver -Ithird_party server/*.cpp src/*.cpp \
    -pthread -o attendance_server

# Stage 2: only what is needed to run.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /src/attendance_server .
COPY web/ web/
COPY data/ data/

# The server should not run as root, and it must be able to write to data/.
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

# TZ matters: without it "today" would be yesterday until 5:30 AM in India.
ENV HOST=0.0.0.0 PORT=10000 TZ=Asia/Kolkata
EXPOSE 10000
CMD ["./attendance_server"]
