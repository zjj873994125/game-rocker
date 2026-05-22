package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

type tokenHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type tokenClaims struct {
	Subject  string `json:"sub"`
	Phone    string `json:"phone"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
	Expires  int64  `json:"exp"`
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{secret: []byte(secret), ttl: ttl}
}

func (m *TokenManager) Issue(user AuthUser) (string, time.Time, error) {
	expiresAt := time.Now().Add(m.ttl).UTC()
	headerPart, err := encodeTokenPart(tokenHeader{Alg: "HS256", Typ: "JWT"})
	if err != nil {
		return "", time.Time{}, err
	}

	claimPart, err := encodeTokenPart(tokenClaims{
		Subject:  strconv.FormatUint(uint64(user.ID), 10),
		Phone:    user.Phone,
		Nickname: user.Nickname,
		Role:     user.Role,
		Expires:  expiresAt.Unix(),
	})
	if err != nil {
		return "", time.Time{}, err
	}

	unsignedToken := fmt.Sprintf("%s.%s", headerPart, claimPart)
	signature := m.sign(unsignedToken)

	return fmt.Sprintf("%s.%s", unsignedToken, signature), expiresAt, nil
}

func (m *TokenManager) Parse(token string) (AuthUser, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return AuthUser{}, ErrUnauthorized
	}

	unsignedToken := fmt.Sprintf("%s.%s", parts[0], parts[1])
	if !hmac.Equal([]byte(parts[2]), []byte(m.sign(unsignedToken))) {
		return AuthUser{}, ErrUnauthorized
	}

	var claims tokenClaims
	if err := decodeTokenPart(parts[1], &claims); err != nil {
		return AuthUser{}, ErrUnauthorized
	}
	if claims.Expires <= time.Now().Unix() {
		return AuthUser{}, ErrUnauthorized
	}

	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return AuthUser{}, ErrUnauthorized
	}

	return AuthUser{
		ID:       uint(userID),
		Phone:    claims.Phone,
		Nickname: claims.Nickname,
		Role:     claims.Role,
	}, nil
}

func (m *TokenManager) sign(unsignedToken string) string {
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(unsignedToken))

	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func encodeTokenPart(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(data), nil
}

func decodeTokenPart(value string, target any) error {
	data, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return err
	}
	if len(data) == 0 {
		return errors.New("empty token part")
	}

	return json.Unmarshal(data, target)
}
