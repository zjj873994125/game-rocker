package config

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	HTTP     HTTPConfig
	Storage  StorageConfig
	Database DatabaseConfig
	Auth     AuthConfig
}

type HTTPConfig struct {
	Addr string
}

type StorageConfig struct {
	MapDataDir string
}

type DatabaseConfig struct {
	Enabled         bool
	Driver          string
	Host            string
	Port            int
	Name            string
	User            string
	Password        string
	Charset         string
	ParseTime       bool
	Location        string
	MaxIdleConns    int
	MaxOpenConns    int
	ConnMaxLifetime string
}

type AuthConfig struct {
	TokenSecret string
	TokenTTL    string
}

func Load() Config {
	loadLocalEnv("configs/database.local.env")

	return Config{
		HTTP: HTTPConfig{
			Addr: getenv("ADDR", ":8088"),
		},
		Storage: StorageConfig{
			// 第一版仍然使用本地 JSON 文件，后续接数据库时只替换存储实现。
			MapDataDir: getenv("MAP_DATA_DIR", "data"),
		},
		Database: DatabaseConfig{
			Enabled:         getenvBool("DB_ENABLED", false),
			Driver:          getenv("DB_DRIVER", "mysql"),
			Host:            getenv("DB_HOST", "127.0.0.1"),
			Port:            getenvInt("DB_PORT", 3306),
			Name:            getenv("DB_NAME", "zjj_game"),
			User:            getenv("DB_USER", "root"),
			Password:        getenv("DB_PASSWORD", ""),
			Charset:         getenv("DB_CHARSET", "utf8mb4"),
			ParseTime:       getenvBool("DB_PARSE_TIME", true),
			Location:        getenv("DB_LOC", "Local"),
			MaxIdleConns:    getenvInt("DB_MAX_IDLE_CONNS", 10),
			MaxOpenConns:    getenvInt("DB_MAX_OPEN_CONNS", 50),
			ConnMaxLifetime: getenv("DB_CONN_MAX_LIFETIME", "1h"),
		},
		Auth: AuthConfig{
			TokenSecret: getenv("AUTH_TOKEN_SECRET", "dev-only-change-me"),
			TokenTTL:    getenv("AUTH_TOKEN_TTL", "168h"),
		},
	}
}

func loadLocalEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		if key == "" || os.Getenv(key) != "" {
			continue
		}

		// 本地配置只补充缺失的环境变量，手动 export 的值优先级更高。
		_ = os.Setenv(key, strings.Trim(strings.TrimSpace(value), `"'`))
	}
}

func (c DatabaseConfig) DSN() string {
	query := url.Values{}
	query.Set("charset", c.Charset)
	query.Set("parseTime", strconv.FormatBool(c.ParseTime))
	query.Set("loc", c.Location)

	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?%s", c.User, c.Password, c.Host, c.Port, c.Name, query.Encode())
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func getenvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getenvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}
