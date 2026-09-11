package utils

import (
	"crypto/rand"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"io"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"time"

	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
)

func CheckErr(err error) {
	if err != nil {
		logger.LogError("捕获到错误：%s, 堆栈信息：%s", err, string(debug.Stack()))
	}
}

func CheckTxErr(err error, tx *sql.Tx) {
	if err != nil {
		logger.LogError("出现事务异常，回滚事务: %s, 堆栈信息：%s", err, string(debug.Stack()))
		err2 := tx.Rollback()
		CheckErr(err2)
	}
}

func In(target string, str_array []string) bool {
	for _, element := range str_array {
		if target == element {
			return true
		}
	}
	return false
}

func DetectImageMIME(data []byte) string {
	if len(data) >= 8 && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "image/png"
	}
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if len(data) >= 6 && (string(data[0:6]) == "GIF87a" || string(data[0:6]) == "GIF89a") {
		return "image/gif"
	}
	if len(data) >= 4 && data[0] == 0x00 && data[1] == 0x00 && (data[2] == 0x01 || data[2] == 0x02) && data[3] == 0x00 {
		return "image/x-icon"
	}
	head := data
	if len(head) > 256 {
		head = head[:256]
	}
	s := strings.TrimSpace(string(head))
	if strings.HasPrefix(s, "<svg") || strings.Contains(s, "<svg") {
		return "image/svg+xml"
	}
	return ""
}

func GetImgBase64FromUrl(url string) string {
	imgUrl := url
	//获取远端图片
	req, err := http.NewRequest("GET", imgUrl, nil)
	if err != nil {
		CheckErr(err)
		return ""
	}
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36")
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // codeql[go/disabled-certificate-check] — favicon 获取需兼容自签名证书
		},
		Timeout: 10 * time.Second,
	}
	res, err := client.Do(req)
	if err != nil {
		CheckErr(err)
		return ""
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		logger.LogError("图片下载状态码异常: %s %d", url, res.StatusCode)
		return ""
	}

	// 读取获取的[]byte数据（限制 5MB 防止 OOM）
	const maxImageSize = 5 * 1024 * 1024
	limitedReader := io.LimitReader(res.Body, maxImageSize+1)
	data, err := io.ReadAll(limitedReader)
	if err != nil || len(data) > maxImageSize {
		logger.LogError("图片过大或读取失败: %s", url)
		return ""
	}

	if DetectImageMIME(data) == "" {
		logger.LogError("远端内容不是图片: %s", url)
		return ""
	}

	imageBase64 := base64.StdEncoding.EncodeToString(data)
	return imageBase64
}

func GetSuffixFromUrl(url string) string {
	suffix := url[strings.LastIndex(url, "."):]
	return suffix
}
func GetMIME(suffix string) string {
	var t string = "image/x-icon"
	if suffix == ".svg" {
		t = "image/svg+xml"
	}
	if suffix == ".png" {
		t = "image/png"
	}
	return t
}

func PathExistsOrCreate(path string) {
	_, err := os.Stat(path)
	if err == nil {
		return
	}
	os.Mkdir(path, os.ModePerm)
}

func GenerateId() int {
	// 生成一个随机 id，避免时间戳冲突
	b := make([]byte, 4)
	_, err := rand.Read(b)
	if err != nil {
		// 回退到时间戳（极少数情况）
		return int(time.Now().Unix())
	}
	// 确保正数
	id := int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])
	if id < 0 {
		id = -id
	}
	return id
}

func FilterHideTools(tools []types.Tool, cates []types.Catelog) []types.Tool {
	result := make([]types.Tool, 0)
	var hideCates []string
	// 提取出需要隐藏的分类
	for _, cate := range cates {
		if cate.Hide {
			hideCates = append(hideCates, cate.Name)
		}
	}
	// 过滤工具
	for _, tool := range tools {
		if !tool.Hide && !In(tool.Catelog, hideCates) {
			result = append(result, tool)
		}
	}
	return result
}

func FilterHideCates(cates []types.Catelog) []types.Catelog {
	result := make([]types.Catelog, 0)
	for _, cate := range cates {
		if !cate.Hide {
			result = append(result, cate)
		}
	}
	return result
}
