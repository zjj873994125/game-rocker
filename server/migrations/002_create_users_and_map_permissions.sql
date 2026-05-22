-- 用户表保存后台账号。密码只保存 bcrypt hash，不能保存明文密码。
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户 ID',
  phone VARCHAR(20) NOT NULL COMMENT '手机号，登录账号，唯一',
  nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  role VARCHAR(30) NOT NULL DEFAULT 'user' COMMENT '角色：user 普通用户，super_admin 超管',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态：active 正常，disabled 禁用',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY idx_users_phone (phone),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账号表';

-- 地图增加创建者和编辑范围。edit_mode=private 时，只有创建者和超管可以编辑。
SET @has_owner_user_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND COLUMN_NAME = 'owner_user_id'
);
SET @sql := IF(
  @has_owner_user_id = 0,
  'ALTER TABLE maps ADD COLUMN owner_user_id BIGINT UNSIGNED NULL COMMENT ''地图创建者用户 ID'' AFTER required_kills',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_edit_mode := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND COLUMN_NAME = 'edit_mode'
);
SET @sql := IF(
  @has_edit_mode = 0,
  'ALTER TABLE maps ADD COLUMN edit_mode VARCHAR(20) NOT NULL DEFAULT ''public'' COMMENT ''编辑范围：public 登录用户可编辑，private 仅创建者和超管可编辑'' AFTER owner_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_owner_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND INDEX_NAME = 'idx_maps_owner_user_id'
);
SET @sql := IF(
  @has_owner_index = 0,
  'ALTER TABLE maps ADD KEY idx_maps_owner_user_id (owner_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_edit_mode_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND INDEX_NAME = 'idx_maps_edit_mode'
);
SET @sql := IF(
  @has_edit_mode_index = 0,
  'ALTER TABLE maps ADD KEY idx_maps_edit_mode (edit_mode)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_owner_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'maps'
    AND CONSTRAINT_NAME = 'fk_maps_owner_user_id'
);
SET @sql := IF(
  @has_owner_fk = 0,
  'ALTER TABLE maps ADD CONSTRAINT fk_maps_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
