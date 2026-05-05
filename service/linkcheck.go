package service

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/mereith/nav/database"
	"github.com/mereith/nav/logger"
)

// LinkCheckResult 单条链接检测结果
type LinkCheckResult struct {
	Id         int
	Url        string
	Title      string
	StatusCode int
	Alive      bool
	Error      string
}

// CheckAllLinks 并发检测所有链接，更新 DB 中的 is_alive，并返回结果
func CheckAllLinks() ([]LinkCheckResult, int, int) {
	tools, err := database.GetAllToolsForCheck()
	if err != nil {
		logger.LogError("获取工具列表失败: %s", err)
		return nil, 0, 0
	}

	if len(tools) == 0 {
		return nil, 0, 0
	}

	concurrency := 10
	if len(tools) < concurrency {
		concurrency = len(tools)
	}

	results := make([]LinkCheckResult, len(tools))
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
			MaxIdleConns:        concurrency,
			MaxIdleConnsPerHost: concurrency,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	for i, tool := range tools {
		wg.Add(1)
		go func(idx int, id int, urlStr, title string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			res := LinkCheckResult{Id: id, Url: urlStr, Title: title}

			// 只处理 http/https 协议
			if !strings.HasPrefix(urlStr, "http://") && !strings.HasPrefix(urlStr, "https://") {
				res.Alive = true
				database.UpdateLinkHealth(id, true)
				results[idx] = res
				return
			}

			req, err := http.NewRequest("HEAD", urlStr, nil)
			if err != nil {
				res.Error = "构建请求失败"
				res.Alive = false
				database.UpdateLinkHealth(id, false)
				results[idx] = res
				return
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

			resp, err := client.Do(req)
			if err != nil {
				// HEAD 失败时尝试 GET
				reqGet, errGet := http.NewRequest("GET", urlStr, nil)
				if errGet != nil {
					res.Error = err.Error()
					res.Alive = false
					database.UpdateLinkHealth(id, false)
					results[idx] = res
					return
				}
				reqGet.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
				respGet, errGet := client.Do(reqGet)
				if errGet != nil {
					res.Error = errGet.Error()
					res.Alive = false
					database.UpdateLinkHealth(id, false)
					results[idx] = res
					return
				}
				respGet.Body.Close()
				res.StatusCode = respGet.StatusCode
				res.Alive = respGet.StatusCode >= 200 && respGet.StatusCode < 400
				database.UpdateLinkHealth(id, res.Alive)
				results[idx] = res
				return
			}
			resp.Body.Close()

			res.StatusCode = resp.StatusCode
			res.Alive = resp.StatusCode >= 200 && resp.StatusCode < 400
			database.UpdateLinkHealth(id, res.Alive)
			results[idx] = res
		}(i, tool.Id, tool.Url, tool.Title)
	}

	wg.Wait()

	var aliveCount, deadCount int
	for _, r := range results {
		if r.Alive {
			aliveCount++
		} else {
			deadCount++
		}
	}

	logger.LogInfo("链接检测完成: 总数=%d, 正常=%d, 失效=%d", len(results), aliveCount, deadCount)
	return results, aliveCount, deadCount
}
