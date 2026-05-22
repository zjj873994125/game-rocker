package domain

import "time"

// User 是后台账号表，权限判断只信任服务端角色和状态，不信任前端传入值。
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Phone        string    `gorm:"column:phone;type:varchar(20);not null;uniqueIndex:idx_users_phone" json:"phone"`
	Nickname     string    `gorm:"column:nickname;type:varchar(50);not null" json:"nickname"`
	PasswordHash string    `gorm:"column:password_hash;type:varchar(255);not null" json:"-"`
	Role         string    `gorm:"column:role;type:varchar(30);not null;default:user;index:idx_users_role" json:"role"`
	Status       string    `gorm:"column:status;type:varchar(20);not null;default:active;index:idx_users_status" json:"status"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (User) TableName() string {
	return "users"
}
