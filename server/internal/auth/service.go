package auth

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"zjj-virtual-arcade-controller/server/internal/domain"
)

type UserStore interface {
	CreateUser(user *domain.User) error
	FindUserByPhone(phone string) (domain.User, error)
	FindUserByID(id uint) (domain.User, error)
}

type Service struct {
	users  UserStore
	tokens *TokenManager
}

var phonePattern = regexp.MustCompile(`^1[3-9]\d{9}$`)

func NewService(users UserStore, tokens *TokenManager) *Service {
	return &Service{users: users, tokens: tokens}
}

func (s *Service) Register(request RegisterRequest) (AuthResponse, error) {
	phone := strings.TrimSpace(request.Phone)
	nickname := strings.TrimSpace(request.Nickname)
	password := strings.TrimSpace(request.Password)

	if err := validateRegisterInput(phone, nickname, password); err != nil {
		return AuthResponse{}, err
	}

	if _, err := s.users.FindUserByPhone(phone); err == nil {
		return AuthResponse{}, ErrPhoneExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return AuthResponse{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}

	user := domain.User{
		Phone:        phone,
		Nickname:     nickname,
		PasswordHash: string(hash),
		Role:         RoleUser,
		Status:       UserStatusActive,
	}
	if err := s.users.CreateUser(&user); err != nil {
		return AuthResponse{}, err
	}

	return s.issueAuthResponse(user)
}

func (s *Service) Login(request LoginRequest) (AuthResponse, error) {
	user, err := s.users.FindUserByPhone(strings.TrimSpace(request.Phone))
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return AuthResponse{}, ErrInvalidCredentials
	}
	if err != nil {
		return AuthResponse{}, err
	}
	if user.Status != UserStatusActive {
		return AuthResponse{}, ErrUserDisabled
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.Password)); err != nil {
		return AuthResponse{}, ErrInvalidCredentials
	}

	return s.issueAuthResponse(user)
}

func (s *Service) Me(userID uint) (UserProfile, error) {
	user, err := s.users.FindUserByID(userID)
	if err != nil {
		return UserProfile{}, err
	}
	if user.Status != UserStatusActive {
		return UserProfile{}, ErrUserDisabled
	}

	return toProfile(user), nil
}

func (s *Service) ParseToken(token string) (AuthUser, error) {
	return s.tokens.Parse(token)
}

func (s *Service) issueAuthResponse(user domain.User) (AuthResponse, error) {
	token, expiresAt, err := s.tokens.Issue(AuthUser{
		ID:       user.ID,
		Phone:    user.Phone,
		Nickname: user.Nickname,
		Role:     user.Role,
	})
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      toProfile(user),
	}, nil
}

func validateRegisterInput(phone string, nickname string, password string) error {
	if !phonePattern.MatchString(phone) {
		return errors.New("请输入 11 位中国大陆手机号")
	}
	if len([]rune(nickname)) < 2 || len([]rune(nickname)) > 16 {
		return errors.New("昵称长度为 2 到 16 位")
	}
	if len(password) < 6 {
		return errors.New("密码至少 6 位")
	}

	return nil
}

func toProfile(user domain.User) UserProfile {
	return UserProfile{
		ID:        user.ID,
		Phone:     user.Phone,
		Nickname:  user.Nickname,
		Role:      user.Role,
		Status:    user.Status,
		CreatedAt: normalizeTime(user.CreatedAt),
		UpdatedAt: normalizeTime(user.UpdatedAt),
	}
}

func normalizeTime(value time.Time) time.Time {
	if value.IsZero() {
		return value
	}

	return value.UTC()
}
