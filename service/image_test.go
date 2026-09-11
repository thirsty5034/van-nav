package service

import (
	"bytes"
	"encoding/base64"
	"testing"

	"github.com/mereith/nav/utils"
)

func TestDefaultLogoPNGIsPNG(t *testing.T) {
	b := DefaultLogoPNG()
	if utils.DetectImageMIME(b) != "image/png" {
		t.Fatalf("default logo mime=%q len=%d", utils.DetectImageMIME(b), len(b))
	}
}

func TestImageBytesFromCacheValueRejectsHTML(t *testing.T) {
	html := base64.StdEncoding.EncodeToString([]byte("<!doctype html><html></html>"))
	if _, _, ok := ImageBytesFromCacheValue(html); ok {
		t.Fatal("html must not be treated as image")
	}
}

func TestImageBytesFromCacheValueAcceptsPNG(t *testing.T) {
	body, mime, ok := ImageBytesFromCacheValue(defaultLogoPNGBase64)
	if !ok || mime != "image/png" || !bytes.Equal(body, DefaultLogoPNG()) {
		t.Fatalf("ok=%v mime=%s", ok, mime)
	}
}

func TestDetectImageMIMEJPEG(t *testing.T) {
	if utils.DetectImageMIME([]byte{0xFF, 0xD8, 0xFF, 0xE0}) != "image/jpeg" {
		t.Fatal("jpeg magic")
	}
}
