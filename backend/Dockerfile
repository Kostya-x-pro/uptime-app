FROM golang:1.24-alpine AS build

WORKDIR /src
COPY go.mod ./
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.22

RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /server /app/server
COPY migrations /app/migrations
USER appuser
EXPOSE 8080
ENV HTTP_ADDR=:8080
ENV MIGRATIONS_DIR=/app/migrations
ENTRYPOINT ["/app/server"]
