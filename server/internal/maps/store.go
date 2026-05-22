package maps

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"zjj-virtual-arcade-controller/server/internal/auth"
)

var ErrNotFound = errors.New("map not found")

type FileStore struct {
	rootDir string
	mu      sync.Mutex
}

func NewFileStore(rootDir string) *FileStore {
	return &FileStore{rootDir: rootDir}
}

func (s *FileStore) ListMaps() ([]MapSummary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := ensureDir(s.mapsDir()); err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(s.mapsDir())
	if err != nil {
		return nil, err
	}

	summaries := make([]MapSummary, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		stored, err := s.readMap(strings.TrimSuffix(entry.Name(), ".json"))
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, MapSummary{
			MapKey:        stored.MapKey,
			Name:          stored.Name,
			Status:        stored.Status,
			OwnerUserID:   stored.OwnerUserID,
			EditMode:      normalizeEditMode(stored.EditMode),
			RequiredKills: stored.Config.RequiredKills,
			UpdatedAt:     stored.UpdatedAt,
		})
	}

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].UpdatedAt.After(summaries[j].UpdatedAt)
	})

	return summaries, nil
}

func (s *FileStore) GetMap(mapKey string) (StoredMap, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.readMap(mapKey)
}

func (s *FileStore) SaveMap(mapKey string, request SaveMapRequest, user auth.AuthUser) (StoredMap, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := validateMapKey(mapKey); err != nil {
		return StoredMap{}, err
	}
	if err := validateConfig(mapKey, request.Config); err != nil {
		return StoredMap{}, err
	}
	if err := ensureDir(s.mapsDir()); err != nil {
		return StoredMap{}, err
	}

	now := time.Now().UTC()
	status := request.Status
	if status == "" {
		status = "draft"
	}

	stored, err := s.readMap(mapKey)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			return StoredMap{}, err
		}
		stored = StoredMap{MapKey: mapKey, CreatedAt: now, OwnerUserID: &user.ID}
	} else if !CanEditMap(stored.OwnerUserID, stored.EditMode, user) {
		return StoredMap{}, auth.ErrForbidden
	}

	stored.Name = request.Config.Name
	stored.Status = status
	stored.EditMode = normalizeEditMode(request.EditMode)
	if stored.OwnerUserID == nil {
		stored.OwnerUserID = &user.ID
	}
	stored.Config = request.Config
	stored.UpdatedAt = now

	if err := writeJSONFile(s.mapPath(mapKey), stored); err != nil {
		return StoredMap{}, err
	}
	if err := s.writeVersion(mapKey, stored.Config, request.Remark, now); err != nil {
		return StoredMap{}, err
	}

	return stored, nil
}

func (s *FileStore) DeleteMap(mapKey string, user auth.AuthUser) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := validateMapKey(mapKey); err != nil {
		return err
	}
	stored, err := s.readMap(mapKey)
	if err != nil {
		return err
	}
	if !CanEditMap(stored.OwnerUserID, stored.EditMode, user) {
		return auth.ErrForbidden
	}

	err = os.Remove(s.mapPath(mapKey))
	if errors.Is(err, os.ErrNotExist) {
		return ErrNotFound
	}

	return err
}

func (s *FileStore) ListVersions(mapKey string) ([]MapVersion, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.readMap(mapKey); err != nil {
		return nil, err
	}

	dir := s.versionDir(mapKey)
	if err := ensureDir(dir); err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	versions := make([]MapVersion, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		var version MapVersion
		if err := readJSONFile(filepath.Join(dir, entry.Name()), &version); err != nil {
			return nil, err
		}
		versions = append(versions, version)
	}

	sort.Slice(versions, func(i, j int) bool {
		return versions[i].Version > versions[j].Version
	})

	return versions, nil
}

func (s *FileStore) readMap(mapKey string) (StoredMap, error) {
	if err := validateMapKey(mapKey); err != nil {
		return StoredMap{}, err
	}

	var stored StoredMap
	err := readJSONFile(s.mapPath(mapKey), &stored)
	if errors.Is(err, os.ErrNotExist) {
		return StoredMap{}, ErrNotFound
	}

	return stored, err
}

func (s *FileStore) writeVersion(mapKey string, config GameMapConfig, remark string, createdAt time.Time) error {
	dir := s.versionDir(mapKey)
	if err := ensureDir(dir); err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	version := MapVersion{
		Version:   len(entries) + 1,
		Config:    config,
		Remark:    remark,
		CreatedAt: createdAt,
	}
	filename := fmt.Sprintf("v%06d.json", version.Version)

	return writeJSONFile(filepath.Join(dir, filename), version)
}

func (s *FileStore) mapsDir() string {
	return filepath.Join(s.rootDir, "maps")
}

func (s *FileStore) mapPath(mapKey string) string {
	return filepath.Join(s.mapsDir(), mapKey+".json")
}

func (s *FileStore) versionDir(mapKey string) string {
	return filepath.Join(s.rootDir, "versions", mapKey)
}

func validateMapKey(mapKey string) error {
	if mapKey == "" {
		return errors.New("map key is required")
	}
	for _, char := range mapKey {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			continue
		}
		return errors.New("map key can only contain lowercase letters, numbers, '-' and '_'")
	}

	return nil
}

func validateConfig(mapKey string, config GameMapConfig) error {
	if config.ID == "" {
		return errors.New("config.id is required")
	}
	if config.ID != mapKey {
		return errors.New("config.id must equal map key")
	}
	if config.Name == "" {
		return errors.New("config.name is required")
	}

	return nil
}

func ValidateMapInput(mapKey string, config GameMapConfig) error {
	if err := validateMapKey(mapKey); err != nil {
		return err
	}

	return validateConfig(mapKey, config)
}

func NormalizeEditMode(value string) string {
	return normalizeEditMode(value)
}

func CanEditMap(ownerUserID *uint, editMode string, user auth.AuthUser) bool {
	if user.Role == auth.RoleSuperAdmin {
		return true
	}
	if normalizeEditMode(editMode) != "private" {
		return true
	}

	return ownerUserID != nil && *ownerUserID == user.ID
}

func normalizeEditMode(value string) string {
	if value == "private" {
		return "private"
	}

	return "public"
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

func readJSONFile(path string, target any) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	return json.NewDecoder(file).Decode(target)
}

func writeJSONFile(path string, value any) error {
	if err := ensureDir(filepath.Dir(path)); err != nil {
		return err
	}

	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')

	return os.WriteFile(path, data, 0644)
}
