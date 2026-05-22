package maps

import "zjj-virtual-arcade-controller/server/internal/auth"

type Store interface {
	ListMaps() ([]MapSummary, error)
	GetMap(mapKey string) (StoredMap, error)
	SaveMap(mapKey string, request SaveMapRequest, user auth.AuthUser) (StoredMap, error)
	DeleteMap(mapKey string, user auth.AuthUser) error
	ListVersions(mapKey string) ([]MapVersion, error)
}
