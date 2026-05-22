package maps

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"zjj-virtual-arcade-controller/server/internal/auth"
)

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler {
	return &Handler{store: store}
}

func (h *Handler) RegisterRoutes(router gin.IRouter, requireAuth gin.HandlerFunc) {
	router.GET("", h.ListMaps)
	router.POST("", requireAuth, h.CreateMap)
	router.GET("/:mapKey", h.GetMap)
	router.PUT("/:mapKey", requireAuth, h.UpdateMap)
	router.DELETE("/:mapKey", requireAuth, h.DeleteMap)
	router.GET("/:mapKey/versions", h.ListVersions)
}

func (h *Handler) ListMaps(c *gin.Context) {
	maps, err := h.store.ListMaps()
	if err != nil {
		writeError(c, http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, maps)
}

func (h *Handler) GetMap(c *gin.Context) {
	stored, err := h.store.GetMap(c.Param("mapKey"))
	if err != nil {
		writeStoreError(c, err)
		return
	}

	c.JSON(http.StatusOK, stored)
}

func (h *Handler) CreateMap(c *gin.Context) {
	var request SaveMapRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	user, ok := auth.CurrentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, auth.ErrUnauthorized)
		return
	}

	stored, err := h.store.SaveMap(request.Config.ID, request, user)
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	c.JSON(http.StatusCreated, stored)
}

func (h *Handler) UpdateMap(c *gin.Context) {
	var request SaveMapRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	user, ok := auth.CurrentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, auth.ErrUnauthorized)
		return
	}

	stored, err := h.store.SaveMap(c.Param("mapKey"), request, user)
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	c.JSON(http.StatusOK, stored)
}

func (h *Handler) DeleteMap(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, auth.ErrUnauthorized)
		return
	}

	if err := h.store.DeleteMap(c.Param("mapKey"), user); err != nil {
		writeStoreError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ListVersions(c *gin.Context) {
	versions, err := h.store.ListVersions(c.Param("mapKey"))
	if err != nil {
		writeStoreError(c, err)
		return
	}

	c.JSON(http.StatusOK, versions)
}

func writeStoreError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		writeError(c, http.StatusNotFound, err)
		return
	}
	if errors.Is(err, auth.ErrForbidden) {
		writeError(c, http.StatusForbidden, err)
		return
	}

	writeError(c, http.StatusInternalServerError, err)
}

func writeError(c *gin.Context, status int, err error) {
	c.JSON(status, gin.H{"error": err.Error()})
}
