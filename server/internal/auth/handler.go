package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(router gin.IRouter, requireAuth gin.HandlerFunc) {
	router.POST("/register", h.Register)
	router.POST("/login", h.Login)
	router.GET("/me", requireAuth, h.Me)
}

func (h *Handler) Register(c *gin.Context) {
	var request RegisterRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeAuthError(c, http.StatusBadRequest, err)
		return
	}

	response, err := h.service.Register(request)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrPhoneExists) {
			status = http.StatusConflict
		}
		writeAuthError(c, status, err)
		return
	}

	c.JSON(http.StatusCreated, response)
}

func (h *Handler) Login(c *gin.Context) {
	var request LoginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeAuthError(c, http.StatusBadRequest, err)
		return
	}

	response, err := h.service.Login(request)
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, ErrUserDisabled) {
			status = http.StatusForbidden
		}
		writeAuthError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) Me(c *gin.Context) {
	user, ok := CurrentUser(c)
	if !ok {
		writeAuthError(c, http.StatusUnauthorized, ErrUnauthorized)
		return
	}

	profile, err := h.service.Me(user.ID)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, ErrUserDisabled) {
			status = http.StatusForbidden
		}
		writeAuthError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

func writeAuthError(c *gin.Context, status int, err error) {
	c.JSON(status, gin.H{"error": err.Error()})
}
