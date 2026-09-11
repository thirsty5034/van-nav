package service

import (
	"encoding/base64"
	"testing"
)

func TestValidateToolLogoEmptyAndHTTP(t *testing.T) {
	if err := ValidateToolLogo(""); err != nil {
		t.Fatal(err)
	}
	if err := ValidateToolLogo("https://example.com/a.png"); err != nil {
		t.Fatal(err)
	}
	if err := ValidateToolLogo("baidu.ico"); err != nil {
		t.Fatal(err)
	}
}

func TestValidateToolLogoAcceptsPNG(t *testing.T) {
	logo := "data:image/png;base64," + defaultLogoPNGBase64
	if err := ValidateToolLogo(logo); err != nil {
		t.Fatal(err)
	}
}

func TestValidateToolLogoRejectsSVGAndOversize(t *testing.T) {
	svg := "data:image/svg+xml;base64," + base64.StdEncoding.EncodeToString([]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))
	if err := ValidateToolLogo(svg); err == nil {
		t.Fatal("svg must fail")
	}
	big := "data:image/png;base64," + base64.StdEncoding.EncodeToString(make([]byte, 200*1024+1))
	if err := ValidateToolLogo(big); err == nil {
		t.Fatal("oversize must fail")
	}
	if err := ValidateToolLogo("data:text/plain;base64,QQ=="); err == nil {
		t.Fatal("non-image data must fail")
	}
}

func TestValidateToolLogoRejectsHTMLPretendingPNG(t *testing.T) {
	html := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("<html>x</html>"))
	if err := ValidateToolLogo(html); err == nil {
		t.Fatal("html-as-png must fail")
	}
}

func TestValidateToolLogoRejectsEmptyPayload(t *testing.T) {
	if err := ValidateToolLogo("data:image/png;base64,"); err == nil {
		t.Fatal("empty payload")
	}
}

func TestDefaultPNGUnderLimit(t *testing.T) {
	if len(DefaultLogoPNG()) > 200*1024 {
		t.Fatal("default png unexpectedly large")
	}
}
