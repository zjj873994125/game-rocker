package maps

import (
	"encoding/json"
	"time"
)

type Vector3 [3]float64

type MapColliderConfig struct {
	ID       string  `json:"id"`
	Position Vector3 `json:"position"`
	Size     Vector3 `json:"size"`
	Rotation Vector3 `json:"rotation,omitempty"`
}

type MapPropConfig struct {
	ID       string   `json:"id"`
	AssetID  string   `json:"assetId,omitempty"`
	ModelURL string   `json:"modelUrl,omitempty"`
	Position Vector3  `json:"position"`
	Size     Vector3  `json:"size"`
	Rotation Vector3  `json:"rotation,omitempty"`
	Scale    *Vector3 `json:"scale,omitempty"`
	Color    int      `json:"color"`
}

type MapDoorConfig struct {
	ID                  string  `json:"id"`
	Position            Vector3 `json:"position"`
	Size                Vector3 `json:"size"`
	TargetMapID         string  `json:"targetMapId"`
	TargetSpawnID       string  `json:"targetSpawnId"`
	InteractionDistance float64 `json:"interactionDistance"`
}

type GroundMaterialConfig struct {
	TextureID string  `json:"textureId"`
	Repeat    float64 `json:"repeat"`
}

type GameMapConfig struct {
	ID             string                `json:"id"`
	Name           string                `json:"name"`
	SpawnPoint     Vector3               `json:"spawnPoint"`
	RequiredKills  int                   `json:"requiredKills"`
	GroundMaterial *GroundMaterialConfig `json:"groundMaterial,omitempty"`
	Colliders      []MapColliderConfig   `json:"colliders"`
	Props          []MapPropConfig       `json:"props"`
	Doors          []MapDoorConfig       `json:"doors"`
}

type StoredMap struct {
	MapKey      string          `json:"mapKey"`
	Name        string          `json:"name"`
	Status      string          `json:"status"`
	LevelNo     int             `json:"levelNo"`
	LevelTheme  string          `json:"levelTheme"`
	OwnerUserID *uint           `json:"ownerUserId,omitempty"`
	EditMode    string          `json:"editMode"`
	Config      GameMapConfig   `json:"config"`
	RawConfig   json.RawMessage `json:"rawConfig,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type MapSummary struct {
	MapKey        string    `json:"mapKey"`
	Name          string    `json:"name"`
	Status        string    `json:"status"`
	LevelNo       int       `json:"levelNo"`
	LevelTheme    string    `json:"levelTheme"`
	OwnerUserID   *uint     `json:"ownerUserId,omitempty"`
	EditMode      string    `json:"editMode"`
	RequiredKills int       `json:"requiredKills"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type MapVersion struct {
	Version   int           `json:"version"`
	Config    GameMapConfig `json:"config"`
	Remark    string        `json:"remark,omitempty"`
	CreatedAt time.Time     `json:"createdAt"`
}

type SaveMapRequest struct {
	Status     string        `json:"status"`
	Remark     string        `json:"remark"`
	LevelNo    int           `json:"levelNo"`
	LevelTheme string        `json:"levelTheme"`
	EditMode   string        `json:"editMode"`
	Config     GameMapConfig `json:"config"`
}
