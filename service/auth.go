package service

import (
	"github.com/mereith/nav/database"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

func GetApiTokens() ([]types.Token, error) {
	return database.GetAllActiveApiTokens()
}

func GetUser(name string) (types.User, error) {
	return database.GetUserByName(name)
}

func AddApiTokenInDB(data types.Token) error {
	return database.InsertApiToken(data)
}

// UpdateUser 更新用户名和密码，同时使旧 token 失效
func UpdateUser(data types.UpdateUserDto) error {
	hashedPassword, err := utils.HashPassword(data.Password)
	if err != nil {
		return err
	}
	// 递增 token_version，使旧 token 失效
	if err := database.IncrementUserTokenVersion(int(data.Id)); err != nil {
		return err
	}
	return database.UpdateUserNameAndPassword(int(data.Id), data.Name, hashedPassword)
}

// UpdatePassword 仅更新密码（不更新用户名），同时使旧 token 失效
func UpdatePassword(uid int, hashedPassword string) error {
	// 递增 token_version，使旧 token 失效
	if err := database.IncrementUserTokenVersion(uid); err != nil {
		return err
	}
	return database.UpdateUserPasswordById(uid, hashedPassword)
}

func DeleteApiToken(id string) error {
	return database.DisableApiToken(id)
}

// UpgradeUserPassword 将旧版明文密码升级为 bcrypt 哈希
func UpgradeUserPassword(userId int, hashedPassword string) error {
	return database.UpdateUserPasswordById(userId, hashedPassword)
}

// ResetAdminPassword 重置管理员密码（main.go 入口层调用）
func ResetAdminPassword(newPassword string) error {
	hashed, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	return database.ResetAdminPassword(hashed)
}

// GetUserTokenVersion 获取用户当前 token_version（handler 生成 JWT 时使用）
func GetUserTokenVersion(uid int) int {
	return database.GetUserTokenVersion(uid)
}
