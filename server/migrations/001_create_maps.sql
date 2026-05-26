-- 地图主表只保存当前有效配置，列表和编辑器读取都优先查这张表。
CREATE TABLE IF NOT EXISTS maps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  map_key VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  level_no INT NOT NULL DEFAULT 1 COMMENT '关卡序号，例如 1 第一关、2 第二关',
  level_theme VARCHAR(40) NOT NULL DEFAULT 'graveyard' COMMENT '关卡主题：graveyard 墓地，mini_market 便利店',
  required_kills INT NOT NULL DEFAULT 0,
  -- 第一版用 JSON 保留完整 GameMapConfig，后续有复杂查询需求再拆 props/colliders/doors 子表。
  config JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY idx_maps_map_key (map_key),
  KEY idx_maps_status (status),
  KEY idx_maps_level_no (level_no),
  KEY idx_maps_level_theme (level_theme)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 地图版本表按保存次数追加快照，用于历史查看和后续回滚。
CREATE TABLE IF NOT EXISTS map_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  map_id BIGINT UNSIGNED NOT NULL,
  map_key VARCHAR(100) NOT NULL,
  version INT NOT NULL,
  remark VARCHAR(255) NOT NULL DEFAULT '',
  -- 版本配置必须是完整快照，不能只存 diff，否则回滚和排查会依赖多条历史记录。
  config JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY idx_map_versions_map_id_version (map_id, version),
  KEY idx_map_versions_map_key (map_key),
  CONSTRAINT fk_map_versions_map_id
    FOREIGN KEY (map_id) REFERENCES maps(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
