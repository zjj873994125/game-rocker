package auth

import (
	"errors"
	"time"
)

const (
	RoleUser       = "user"
	RoleSuperAdmin = "super_admin"

	UserStatusActive   = "active"
	UserStatusDisabled = "disabled"
)

var (
	ErrInvalidCredentials = errors.New("手机号或密码错误")
	ErrPhoneExists        = errors.New("手机号已注册")
	ErrUserDisabled       = errors.New("账号已被禁用")
	ErrUnauthorized       = errors.New("请先登录")
	ErrForbidden          = errors.New("没有操作权限")
)

type UserProfile struct {
	ID        uint      `json:"id"`
	Phone     string    `json:"phone"`
	Nickname  string    `json:"nickname"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}

type AuthUser struct {
	ID       uint
	Phone    string
	Nickname string
	Role     string
}

type AuthResponse struct {
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expiresAt"`
	User      UserProfile `json:"user"`
}

type RegisterRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Nickname string `json:"nickname" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}
