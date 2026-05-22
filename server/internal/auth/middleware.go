package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const currentUserContextKey = "auth.currentUser"

func Middleware(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if token == "" {
			writeAuthError(c, http.StatusUnauthorized, ErrUnauthorized)
			c.Abort()
			return
		}

		user, err := service.ParseToken(token)
		if err != nil {
			writeAuthError(c, http.StatusUnauthorized, ErrUnauthorized)
			c.Abort()
			return
		}

		c.Set(currentUserContextKey, user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) (AuthUser, bool) {
	value, ok := c.Get(currentUserContextKey)
	if !ok {
		return AuthUser{}, false
	}

	user, ok := value.(AuthUser)
	return user, ok
}

func bearerToken(header string) string {
	prefix := "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}

	return strings.TrimSpace(strings.TrimPrefix(header, prefix))
}
