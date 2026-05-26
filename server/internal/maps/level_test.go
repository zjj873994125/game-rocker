package maps

import "testing"

func TestNormalizeLevelMetadataUsesExplicitValues(t *testing.T) {
	levelNo, levelTheme := NormalizeLevelMetadata(2, "mini_market", GameMapConfig{
		ID:   "custom-store",
		Name: "便利店",
	})

	if levelNo != 2 {
		t.Fatalf("expected level no 2, got %d", levelNo)
	}
	if levelTheme != "mini_market" {
		t.Fatalf("expected mini_market theme, got %s", levelTheme)
	}
}

func TestNormalizeLevelMetadataInfersMiniMarketFromAsset(t *testing.T) {
	levelNo, levelTheme := NormalizeLevelMetadata(0, "", GameMapConfig{
		ID:   "legacy-map",
		Name: "旧便利店地图",
		Props: []MapPropConfig{
			{ID: "shelf", AssetID: "mini-market:shelf-boxes"},
		},
	})

	if levelNo != 2 {
		t.Fatalf("expected inferred level no 2, got %d", levelNo)
	}
	if levelTheme != "mini_market" {
		t.Fatalf("expected inferred mini_market theme, got %s", levelTheme)
	}
}

func TestNormalizeLevelMetadataDefaultsToGraveyard(t *testing.T) {
	levelNo, levelTheme := NormalizeLevelMetadata(0, "", GameMapConfig{
		ID:   "graveyard-courtyard",
		Name: "墓地庭院",
	})

	if levelNo != 1 {
		t.Fatalf("expected default level no 1, got %d", levelNo)
	}
	if levelTheme != "graveyard" {
		t.Fatalf("expected default graveyard theme, got %s", levelTheme)
	}
}
