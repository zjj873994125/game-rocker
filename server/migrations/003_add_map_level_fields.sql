-- 地图增加关卡序号和主题。它们是地图元数据，用于列表、编辑器筛选和后续多关卡流程。
SET @has_level_no := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND COLUMN_NAME = 'level_no'
);
SET @sql := IF(
  @has_level_no = 0,
  'ALTER TABLE maps ADD COLUMN level_no INT NOT NULL DEFAULT 1 COMMENT ''关卡序号，例如 1 第一关、2 第二关'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_level_theme := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND COLUMN_NAME = 'level_theme'
);
SET @sql := IF(
  @has_level_theme = 0,
  'ALTER TABLE maps ADD COLUMN level_theme VARCHAR(40) NOT NULL DEFAULT ''graveyard'' COMMENT ''关卡主题：graveyard 墓地，mini_market 便利店'' AFTER level_no',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_level_no_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND INDEX_NAME = 'idx_maps_level_no'
);
SET @sql := IF(
  @has_level_no_index = 0,
  'ALTER TABLE maps ADD KEY idx_maps_level_no (level_no)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_level_theme_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND INDEX_NAME = 'idx_maps_level_theme'
);
SET @sql := IF(
  @has_level_theme_index = 0,
  'ALTER TABLE maps ADD KEY idx_maps_level_theme (level_theme)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 旧便利店地图按资源前缀或地图 key 回填成第二关，其他旧地图保持第一关墓地。
UPDATE maps
SET
  level_no = 2,
  level_theme = 'mini_market'
WHERE map_key LIKE '%mini-market%'
   OR JSON_SEARCH(config, 'one', 'mini-market:%', NULL, '$.props[*].assetId') IS NOT NULL;

UPDATE maps
SET
  level_no = 1,
  level_theme = 'graveyard'
WHERE level_theme = ''
   OR level_theme IS NULL;
