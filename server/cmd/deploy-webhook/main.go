package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

type deployResponse struct {
	Status string `json:"status"`
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
}

func main() {
	addr := getenv("DEPLOY_WEBHOOK_ADDR", ":9099")
	password := os.Getenv("DEPLOY_PASSWORD")
	script := getenv("DEPLOY_SCRIPT", "./scripts/deploy-from-ghcr.sh")

	if strings.TrimSpace(password) == "" {
		log.Fatal("DEPLOY_PASSWORD is required")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/deploy", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, deployResponse{
				Status: "error",
				Error:  "method not allowed",
			})
			return
		}

		if r.URL.Query().Get("password") != password {
			writeJSON(w, http.StatusUnauthorized, deployResponse{
				Status: "error",
				Error:  "unauthorized",
			})
			return
		}

		// 部署脚本在宿主机执行，负责 git pull 和 docker compose 更新；这里不把 Docker socket 暴露给业务容器。
		cmd := exec.Command(script)
		cmd.Env = os.Environ()
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("deploy failed: %v\n%s", err, output)
			writeJSON(w, http.StatusInternalServerError, deployResponse{
				Status: "error",
				Output: string(output),
				Error:  err.Error(),
			})
			return
		}

		writeJSON(w, http.StatusOK, deployResponse{
			Status: "ok",
			Output: string(output),
		})
	})

	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("deploy webhook listening on %s, script: %s", addr, script)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload deployResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write response failed: %v", err)
	}
}

func getenv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}
