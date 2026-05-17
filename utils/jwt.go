package utils

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func RandomJWTKey() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		logger.LogError("生成随机密钥失败: %v", err)
		// 使用更安全的回退方案：组合多个随机源
		panic("无法生成安全的 JWT 密钥，请检查系统随机数生成器")
	}
	return hex.EncodeToString(bytes)
}

// JTW 密钥
var jwtSecret = []byte("boy_next_door")

func init() {
	jwtSecret = []byte(RandomJWTKey())
	logger.LogInfo("jwtSecret Setted: %s", jwtSecret)
}

// 签名一个 JTW
func SignJWT(user types.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": user.Name,
		"id":   user.Id,
		"exp":  time.Now().Add(time.Hour * 24 * 30).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

// 签名一个 JTW
func SignJWTForAPI(tokenName string, tokenId int) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": tokenName,
		"id":   tokenId,
		"exp":  time.Now().Add(time.Hour * 24 * 365 * 100).Unix(),
	})
	tokenString, err := token.SignedString([]byte(jwtSecret))
	return tokenString, err
}

// 解密一个 JTW
func ParseJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (i interface{}, e error) {
		return jwtSecret, nil
	})
	return token, err
}

func IsLogin(c *gin.Context) bool {
	rawToken := c.Request.Header.Get("Authorization")
	if rawToken == "" {
		return false
	}
	// 处理 Bearer 前缀
	rawToken = strings.TrimPrefix(rawToken, "Bearer ")
	token, err := ParseJWT(rawToken)
	return err == nil && token.Valid
}
