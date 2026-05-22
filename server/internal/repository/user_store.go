package repository

import (
	"gorm.io/gorm"
	"zjj-virtual-arcade-controller/server/internal/domain"
)

type UserStore struct {
	db *gorm.DB
}

func NewUserStore(db *gorm.DB) *UserStore {
	return &UserStore{db: db}
}

func (s *UserStore) CreateUser(user *domain.User) error {
	return s.db.Create(user).Error
}

func (s *UserStore) FindUserByPhone(phone string) (domain.User, error) {
	var user domain.User
	err := s.db.Where("phone = ?", phone).First(&user).Error

	return user, err
}

func (s *UserStore) FindUserByID(id uint) (domain.User, error) {
	var user domain.User
	err := s.db.Where("id = ?", id).First(&user).Error

	return user, err
}
