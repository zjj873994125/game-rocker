package database

import (
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"zjj-virtual-arcade-controller/server/internal/config"
	"zjj-virtual-arcade-controller/server/internal/domain"
)

func OpenMySQL(cfg config.DatabaseConfig) (*gorm.DB, error) {
	if cfg.Driver != "mysql" {
		return nil, fmt.Errorf("unsupported database driver: %s", cfg.Driver)
	}

	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{
		// 开发阶段先使用默认日志，后续接入统一 logger 后再替换。
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	lifetime, err := time.ParseDuration(cfg.ConnMaxLifetime)
	if err != nil {
		lifetime = time.Hour
	}

	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(lifetime)

	// GORM Open 只创建连接池，Ping 才能确认账号、网络和数据库都真实可用。
	if err := sqlDB.Ping(); err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&domain.Map{}, &domain.MapVersion{}); err != nil {
		return nil, err
	}

	return db, nil
}
