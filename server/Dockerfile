FROM golang:1.24.3-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/map-server ./cmd/server

FROM alpine:3.22

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /out/map-server /app/map-server

USER app

EXPOSE 8088

CMD ["/app/map-server"]
