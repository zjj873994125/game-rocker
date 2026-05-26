package maps

import "strings"

const (
	LevelThemeGraveyard  = "graveyard"
	LevelThemeMiniMarket = "mini_market"
)

// NormalizeLevelMetadata 统一地图关卡元数据。旧数据没有字段时，会从资源 ID 兜底推断。
func NormalizeLevelMetadata(levelNo int, levelTheme string, config GameMapConfig) (int, string) {
	theme := normalizeLevelTheme(levelTheme)
	if theme == "" {
		theme = inferLevelTheme(config)
	}

	if levelNo <= 0 {
		levelNo = defaultLevelNoForTheme(theme)
	}

	return levelNo, theme
}

func normalizeLevelTheme(value string) string {
	normalized := strings.TrimSpace(strings.ToLower(value))
	switch normalized {
	case "mini-market", LevelThemeMiniMarket:
		return LevelThemeMiniMarket
	case LevelThemeGraveyard:
		return LevelThemeGraveyard
	default:
		return ""
	}
}

func inferLevelTheme(config GameMapConfig) string {
	if strings.Contains(config.ID, "mini-market") || strings.Contains(config.ID, "mini_market") {
		return LevelThemeMiniMarket
	}

	for _, prop := range config.Props {
		if strings.HasPrefix(prop.AssetID, "mini-market:") {
			return LevelThemeMiniMarket
		}
	}

	return LevelThemeGraveyard
}

func defaultLevelNoForTheme(levelTheme string) int {
	if levelTheme == LevelThemeMiniMarket {
		return 2
	}

	return 1
}
