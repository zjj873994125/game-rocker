package domain

import (
	"time"

	"gorm.io/datatypes"
)

// Map 保存一张地图的当前版本，用于列表、编辑器加载和运行时读取。
type Map struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	MapKey        string `gorm:"column:map_key;type:varchar(100);not null;uniqueIndex:idx_maps_map_key" json:"mapKey"`
	Name          string `gorm:"column:name;type:varchar(100);not null" json:"name"`
	Status        string `gorm:"column:status;type:varchar(20);not null;default:draft;index:idx_maps_status" json:"status"`
	RequiredKills int    `gorm:"column:required_kills;not null;default:0" json:"requiredKills"`
	OwnerUserID   *uint  `gorm:"column:owner_user_id;index:idx_maps_owner_user_id" json:"ownerUserId,omitempty"`
	EditMode      string `gorm:"column:edit_mode;type:varchar(20);not null;default:public;index:idx_maps_edit_mode" json:"editMode"`
	// 地图结构变化会比较频繁，第一版保留完整 GameMapConfig，避免过早拆子表。
	Config    datatypes.JSON `gorm:"column:config;type:json;not null" json:"config"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (Map) TableName() string {
	return "maps"
}

// MapVersion 是地图保存快照，后续可以用于历史查看和版本回滚。
type MapVersion struct {
	ID      uint   `gorm:"primaryKey" json:"id"`
	MapID   uint   `gorm:"column:map_id;not null;index:idx_map_versions_map_id_version,priority:1" json:"mapId"`
	MapKey  string `gorm:"column:map_key;type:varchar(100);not null;index:idx_map_versions_map_key" json:"mapKey"`
	Version int    `gorm:"column:version;not null;index:idx_map_versions_map_id_version,priority:2" json:"version"`
	Remark  string `gorm:"column:remark;type:varchar(255)" json:"remark"`
	// 每个版本保存完整快照，不依赖当前 maps.config，避免当前配置被改后历史失真。
	Config    datatypes.JSON `gorm:"column:config;type:json;not null" json:"config"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
}

func (MapVersion) TableName() string {
	return "map_versions"
}
