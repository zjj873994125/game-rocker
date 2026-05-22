package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"zjj-virtual-arcade-controller/server/internal/auth"
	"zjj-virtual-arcade-controller/server/internal/http/middleware"
	"zjj-virtual-arcade-controller/server/internal/maps"
)

func NewRouter(mapHandler *maps.Handler, authHandler *auth.Handler, requireAuth gin.HandlerFunc) http.Handler {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS())

	api := router.Group("/api")
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	authHandler.RegisterRoutes(api.Group("/auth"), requireAuth)
	mapHandler.RegisterRoutes(api.Group("/maps"), requireAuth)

	return router
}
