package service

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"strings"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/goscraper"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

// data:URI 图片白名单：站点图标（favicon/logo）允许位图 + ico；背景图仅允许位图
var (
	webIconImageMIMEs = map[string]bool{"image/png": true, "image/jpeg": true, "image/jpg": true, "image/webp": true, "image/x-icon": true, "image/vnd.microsoft.icon": true}
	bitmapImageMIMEs  = map[string]bool{"image/png": true, "image/jpeg": true, "image/jpg": true, "image/webp": true}
)

// ValidateDataURLImage 校验 data:URI 图片：MIME 白名单、解码后大小上限、魔数一致性。
// 空值或非 data: 协议直接放行（历史 URL / 站内文件名兼容，由调用方决定是否另行限制）。
func ValidateDataURLImage(field, value, formatsHint string, maxKB int, allowed map[string]bool) error {
	if value == "" || !strings.HasPrefix(value, "data:") {
		return nil
	}
	if !strings.HasPrefix(value, "data:image/") {
		return fmt.Errorf("%s 仅支持图片 data:URI（%s）", field, formatsHint)
	}
	header, payload, ok := strings.Cut(value[len("data:"):], ",")
	if !ok || payload == "" {
		return fmt.Errorf("%s 图片数据为空", field)
	}
	mime := strings.TrimSpace(strings.Split(header, ";")[0])
	if !allowed[mime] {
		return fmt.Errorf("%s 仅支持 %s 格式", field, formatsHint)
	}
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return fmt.Errorf("%s 图片数据解码失败", field)
	}
	if len(raw) > maxKB*1024 {
		return fmt.Errorf("%s 大小不能超过 %dKB", field, maxKB)
	}
	got := utils.DetectImageMIME(raw)
	if got == "" {
		return fmt.Errorf("%s 不是有效图片", field)
	}
	if mime == "image/jpg" {
		mime = "image/jpeg"
	}
	if mime == "image/vnd.microsoft.icon" {
		mime = "image/x-icon"
	}
	if got == "image/x-icon" && mime == "image/x-icon" {
		return nil
	}
	if got != mime {
		return fmt.Errorf("%s 声明类型与图片内容不一致", field)
	}
	return nil
}

func getIcon(url string) string {
	logger.LogInfo("getIcon: %s", url)
	s, err := goscraper.Scrape(url, 5)
	if err != nil {
		logger.LogError("getIcon: %s", err)
		return ""
	}
	var result string = ""
	if strings.Contains(s.Preview.Icon, "http:") || strings.Contains(s.Preview.Icon, "https:") {
		result = s.Preview.Icon
	} else {
		var first string = s.Preview.Link
		var second string = s.Preview.Icon
		if !strings.Contains(s.Preview.Link[len(s.Preview.Link)-1:len(s.Preview.Link)], "/") {
			first = s.Preview.Link + "/"
		}
		if strings.Contains(s.Preview.Icon[0:1], "/") {
			second = s.Preview.Icon[1:len(s.Preview.Icon)]
		}
		result = first + second
	}
	logger.LogInfo("getIcon: %s", result)
	return result
}

func LazyFetchLogo(url string, id int64) {
	defer func() {
		if r := recover(); r != nil {
			logger.LogError("LazyFetchLogo panic: %v", r)
		}
	}()
	logo := getIcon(url)
	UpdateToolIcon(id, logo)
}

const defaultLogoPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAEfklEQVR42u2dr5LiQBDGI9ZiMdi8AAbLC2AxMTzGVSEwPAEiFsMTrEXsuVMYBPYM/qqwiOQmdS2ubm9vITeT7pn5fVWfocifydeZzPR09xQFAAAAAAAAAAAAQMQYf2lfHKeOlePGce94dDw7Xh1vjnfHRniX367yn6Mcs5FzdOd64cnaFXwiQtWOJxG19cxGzl3LtSY8eV3RZ45bEaVV4knuYYYiw4heSrd8URT9I17k3kqU8i/8wvHVoOgfsbvXBcr9v/Ar5S7exydihZLPC1/JaLxNhF1bKpT9XPi541tCwv/Jrm1zlH4v/EimV20m7No6Qvlf4i/FAdNmxq7Ny9zFrzMU/l1vkKPw08hH9yFmC9OcRvh3RH/He/IzBdfANUJ/ynWq4u8Q92HuUhN/j6hPc5+K+AfE7M0Dbz7c882Hu9jEZ7Sf6+xA5vkIFoaVdfGnOHmCO4umlg0A9+4AbmMWdmBtTfwlogzOpRXxR5mu51uIJxjR9fMpUI/hQwhdzjUN4A0B9ANNcfjASsMAzjx4O3kHQ4u/4qGb42pIA8Djl6uHUBI1eeA2uRjCAF550HazkkOLX2o3cve1ba8/2ofR/bc7xup1ArAMaQAbzcZ9+972RnestesE4iakAVw03/z/xSNv6FDXCVmpJJT4M03LfqY7/lc3beU6gTkLYQBbzUb5gpXrBOY2ubk/BqDoE5A6fC0GEI0BtF7rGFpY+MEAFBeILAR9YACKwSIWfP8YgNI4QAovNxhAdAbQeClwLckeLQYQnQG0XpJIrET+YABKA0Ft/z8GoLwuYCXHH1ewUm0B2T1DvTEsBvXiMangT5aDFYJFraV9ERDyXPqYDwO4EWoVLW8+DICCDxEXlPBhAA0PMlo2GAAGwCeATwCDQAaBqUwD4fDTQLKAc84atuIKxhGk5wo2U/AZV7DOYtDGypvPYpDOcrCJgBCWg/UCQggJyzwkjKDQnINCCQvPPCycxBASQ0gNIzWM5NCsk0NJD888PZwCERSIUC8RgwEol4jRLhKFASgXidJeF8AVbKNMXMlikPnFoHCFIrVLxbIcrFwq1kKxaAJClItFUy4+83LxbBjBhhEEi6YY/MmmUVFTZ1fxMdvGWaDOtnFiAHMEUKfexpFWgkUypv4u4mM2j1ZL+xpb2DxajIDt44enje3j+RRk2vXjIczA49cziYSCEgELPnhJ9sBBhMMntBGsEcs710VMcDe8QzRv3BUxwlJtgYi5L2KGa8ABEXvzUKQAeoIM33zGBBl+85kdZDja7+knwFn0dydPVeQA8RjiNv7NvWvew8cCUmYLOwMvJecYT3A1t6SrHFSSU29QmwnmMGYI88QDTd/UY/gimimklHdwzmaE79kQVpHPFk6DZ+wkaggLzazkPlm6gyVqZmYIpRSpuBgU/SL3VqLUMMYwk8JVJ+UufhusJg942BgmMnCsRZQQtY0bOXct15rw5O0axIu4myvplvey88lZHDA38b03wrv8dpX/HOWYjZxj6q3wMgAAAAAAAAAAAIASfgKWNq3wgU5/9wAAAABJRU5ErkJggg=="

func DefaultLogoPNG() []byte {
	b, err := base64.StdEncoding.DecodeString(defaultLogoPNGBase64)
	if err != nil {
		return []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	}
	return b
}

func ImageBytesFromCacheValue(value string) (body []byte, mime string, ok bool) {
	if value == "" {
		return nil, "", false
	}
	raw, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		raw, err = base64.StdEncoding.DecodeString(value + strings.Repeat("=", (4-len(value)%4)%4))
		if err != nil {
			return nil, "", false
		}
	}
	mime = utils.DetectImageMIME(raw)
	if mime == "" {
		return nil, "", false
	}
	return raw, mime, true
}

func GetImgFromDB(url1 string) (types.Img, error) {
	urlEncoded := url.QueryEscape(url1)
	img, found, err := database.GetImageByUrl(urlEncoded)
	if err != nil {
		return types.Img{}, err
	}
	if found {
		return img, nil
	}
	return types.Img{Id: 0, Url: url1, Value: defaultLogoPNGBase64}, nil
}

func UpdateImg(url1 string) {
	defer func() {
		if r := recover(); r != nil {
			logger.LogError("UpdateImg panic: %v", r)
		}
	}()
	urlEncoded := url.QueryEscape(url1)
	base64ImgValue := utils.GetImgBase64FromUrl(url1)
	if base64ImgValue == "" {
		return
	}
	if err := database.InsertImage(urlEncoded, base64ImgValue); err != nil {
		logger.LogError("UpdateImg: insert error for %s: %v", url1, err)
	}
}
