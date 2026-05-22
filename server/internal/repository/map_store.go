package repository

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"zjj-virtual-arcade-controller/server/internal/auth"
	"zjj-virtual-arcade-controller/server/internal/domain"
	"zjj-virtual-arcade-controller/server/internal/maps"
)

type MapStore struct {
	db *gorm.DB
}

func NewMapStore(db *gorm.DB) *MapStore {
	return &MapStore{db: db}
}

func (s *MapStore) ListMaps() ([]maps.MapSummary, error) {
	var rows []domain.Map
	if err := s.db.Order("updated_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}

	summaries := make([]maps.MapSummary, 0, len(rows))
	for _, row := range rows {
		summaries = append(summaries, maps.MapSummary{
			MapKey:        row.MapKey,
			Name:          row.Name,
			Status:        row.Status,
			OwnerUserID:   row.OwnerUserID,
			EditMode:      maps.NormalizeEditMode(row.EditMode),
			RequiredKills: row.RequiredKills,
			UpdatedAt:     row.UpdatedAt,
		})
	}

	return summaries, nil
}

func (s *MapStore) GetMap(mapKey string) (maps.StoredMap, error) {
	row, err := s.findMap(mapKey)
	if err != nil {
		return maps.StoredMap{}, err
	}

	return toStoredMap(row)
}

func (s *MapStore) SaveMap(mapKey string, request maps.SaveMapRequest, user auth.AuthUser) (maps.StoredMap, error) {
	if err := maps.ValidateMapInput(mapKey, request.Config); err != nil {
		return maps.StoredMap{}, err
	}

	status := request.Status
	if status == "" {
		status = "draft"
	}

	configJSON, err := json.Marshal(request.Config)
	if err != nil {
		return maps.StoredMap{}, err
	}

	var saved domain.Map
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var row domain.Map
		err := tx.Where("map_key = ?", mapKey).First(&row).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if row.ID != 0 && !maps.CanEditMap(row.OwnerUserID, row.EditMode, user) {
			return auth.ErrForbidden
		}

		row.MapKey = mapKey
		row.Name = request.Config.Name
		row.Status = status
		row.RequiredKills = request.Config.RequiredKills
		row.EditMode = maps.NormalizeEditMode(request.EditMode)
		if row.OwnerUserID == nil {
			row.OwnerUserID = &user.ID
		}
		row.Config = datatypes.JSON(configJSON)

		if row.ID == 0 {
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		} else if err := tx.Save(&row).Error; err != nil {
			return err
		}

		nextVersion, err := s.nextVersion(tx, row.ID)
		if err != nil {
			return err
		}

		version := domain.MapVersion{
			MapID:   row.ID,
			MapKey:  row.MapKey,
			Version: nextVersion,
			Remark:  request.Remark,
			Config:  datatypes.JSON(configJSON),
		}
		if err := tx.Create(&version).Error; err != nil {
			return err
		}

		saved = row
		return nil
	})
	if err != nil {
		return maps.StoredMap{}, err
	}

	return toStoredMap(saved)
}

func (s *MapStore) DeleteMap(mapKey string, user auth.AuthUser) error {
	row, err := s.findMap(mapKey)
	if err != nil {
		return err
	}
	if !maps.CanEditMap(row.OwnerUserID, row.EditMode, user) {
		return auth.ErrForbidden
	}

	result := s.db.Where("id = ?", row.ID).Delete(&domain.Map{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return maps.ErrNotFound
	}

	return nil
}

func (s *MapStore) ListVersions(mapKey string) ([]maps.MapVersion, error) {
	row, err := s.findMap(mapKey)
	if err != nil {
		return nil, err
	}

	var rows []domain.MapVersion
	if err := s.db.Where("map_id = ?", row.ID).Order("version DESC").Find(&rows).Error; err != nil {
		return nil, err
	}

	versions := make([]maps.MapVersion, 0, len(rows))
	for _, item := range rows {
		config, err := decodeConfig(item.Config)
		if err != nil {
			return nil, err
		}
		versions = append(versions, maps.MapVersion{
			Version:   item.Version,
			Config:    config,
			Remark:    item.Remark,
			CreatedAt: item.CreatedAt,
		})
	}

	return versions, nil
}

func (s *MapStore) findMap(mapKey string) (domain.Map, error) {
	var row domain.Map
	err := s.db.Where("map_key = ?", mapKey).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.Map{}, maps.ErrNotFound
	}

	return row, err
}

func (s *MapStore) nextVersion(tx *gorm.DB, mapID uint) (int, error) {
	var maxVersion int
	err := tx.Model(&domain.MapVersion{}).Where("map_id = ?", mapID).Select("COALESCE(MAX(version), 0)").Scan(&maxVersion).Error
	if err != nil {
		return 0, err
	}

	return maxVersion + 1, nil
}

func toStoredMap(row domain.Map) (maps.StoredMap, error) {
	config, err := decodeConfig(row.Config)
	if err != nil {
		return maps.StoredMap{}, err
	}

	return maps.StoredMap{
		MapKey:      row.MapKey,
		Name:        row.Name,
		Status:      row.Status,
		OwnerUserID: row.OwnerUserID,
		EditMode:    maps.NormalizeEditMode(row.EditMode),
		Config:      config,
		CreatedAt:   normalizeTime(row.CreatedAt),
		UpdatedAt:   normalizeTime(row.UpdatedAt),
	}, nil
}

func decodeConfig(raw datatypes.JSON) (maps.GameMapConfig, error) {
	var config maps.GameMapConfig
	if len(raw) == 0 {
		return config, fmt.Errorf("map config is empty")
	}
	if err := json.Unmarshal(raw, &config); err != nil {
		return config, err
	}

	return config, nil
}

func normalizeTime(value time.Time) time.Time {
	if value.IsZero() {
		return value
	}

	return value.UTC()
}
