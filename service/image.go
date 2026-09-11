package service

import (
	"encoding/base64"
	"net/url"
	"strings"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/goscraper"
	"github.com/mereith/nav/logger"
	"github.com/mereith/nav/types"
	"github.com/mereith/nav/utils"
)

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

const defaultLogoPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVR42u3OIQEAAAwCMPono9UfAzMxv7S9pQgICAgICAgICAgICAgICKwDD9YGXMTFGcCDAAAAAElFTkSuQmCC"

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
