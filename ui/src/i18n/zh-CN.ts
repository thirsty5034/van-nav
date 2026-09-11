/**
 * VanNav 中文语言包 (zh-CN)
 *
 * Key 命名规范：模块.场景.语义
 * 示例：login.title、admin.tools.table.name
 */
const zhCN: Record<string, string> = {
  // ==================== Login 模块 ====================
  "login.title": "VanNav 登录",
  "login.brand": "VanNav",
  "login.username": "用户名",
  "login.password": "密码",
  "login.submit": "登录",
  "login.error.loginFailed": "登录失败",
  "login.error.networkError": "登录失败，请检查网络连接",

  // ==================== Home 模块 ====================
  "home.search.placeholder": "按任意键直接开始搜索",
  "home.tag.allTools": "全部工具",
  "home.tag.uncategorized": "未分类",
  "home.tag.admin": "管理后台",
  "home.cache.networkFail": "网络请求失败，尝试从本地缓存恢复",
  "home.cache.restored": "已从本地缓存恢复工具数据",
  "home.cache.restoreFailed": "本地缓存恢复失败",

  // ==================== Admin 公共 ====================
  "admin.header.title": "VanNav 管理系统",
  "admin.header.home": "返回主页",
  "admin.header.logout": "退出登录",

  // ==================== Admin 侧边栏 ====================
  "admin.sidebar.tools": "工具管理",
  "admin.sidebar.categories": "分类管理",
  "admin.sidebar.searchEngines": "搜索引擎管理",
  "admin.sidebar.apiToken": "API Token",
  "admin.sidebar.settings": "系统设置",
  "admin.sidebar.theme": "主题美化",

  // ==================== Admin / Tools 管理 ====================
  // 标题与统计
  "admin.tools.title": "工具管理",
  "admin.tools.total": "当前共 {count} 条",

  // 表格列名
  "admin.tools.table.sort": "排序",
  "admin.tools.table.name": "名称",
  "admin.tools.table.category": "分类",
  "admin.tools.table.url": "网址",
  "admin.tools.table.hidden": "隐藏",
  "admin.tools.table.hidden.tooltip": "开启后只有登录后才会展示该工具",
  "admin.tools.table.status": "状态",
  "admin.tools.table.action": "操作",
  "admin.tools.table.total": "共 {total} 条",

  // 状态标签
  "admin.tools.status.normal": "正常",
  "admin.tools.status.dead": "失效",
  "admin.tools.status.unchecked": "未检测",

  // 操作按钮
  "admin.tools.btn.add": "添加",
  "admin.tools.btn.refresh": "刷新",
  "admin.tools.btn.import": "导入",
  "admin.tools.btn.export": "导出",
  "admin.tools.btn.edit": "修改",
  "admin.tools.btn.delete": "删除",

  // 批量操作
  "admin.tools.bulk.delete": "删除",
  "admin.tools.bulk.resetDefaultIcon": "重置默认图标",
  "admin.tools.bulk.resetCacheIcon": "重置缓存图标",
  "admin.tools.bulk.updateLogo": "一键更新Logo网址",
  "admin.tools.bulk.updateDesc": "一键更新描述",

  // 批量操作确认弹窗
  "admin.tools.bulk.confirmDelete": "确定删除这些吗？",
  "admin.tools.bulk.confirmResetDefault": "确定重置这些的图标吗？（会自动获取网站默认的）",
  "admin.tools.bulk.confirmResetCache": "确定重新缓存这些的图标吗？（会自动获取图标缓存到数据库）",
  "admin.tools.bulk.confirmUpdateLogo": "根据 Logo API 模板自动获取并更新选中工具的 logo 网址？",
  "admin.tools.bulk.confirmUpdateDesc": "自动获取并更新选中工具的描述？",

  // 弹窗标题
  "admin.tools.modal.add": "新建工具",
  "admin.tools.modal.edit": "修改工具",

  // 表单
  "admin.tools.form.id": "序号",
  "admin.tools.form.name": "名称",
  "admin.tools.form.namePlaceholder": "请输入名称",
  "admin.tools.form.nameRequired": "请输入名称",
  "admin.tools.form.url": "网址",
  "admin.tools.form.urlPlaceholder": "请输入网址",
  "admin.tools.form.urlRequired": "请输入网址",
  "admin.tools.form.category": "分类",
  "admin.tools.form.categoryPlaceholder": "请选择分类",
  "admin.tools.form.categoryRequired": "请选择分类",
  "admin.tools.form.desc": "描述",
  "admin.tools.form.descPlaceholder": "请输入描述",
  "admin.tools.form.sort": "排序",
  "admin.tools.form.sortPlaceholder": "请输入排序",
  "admin.tools.form.sortTooltip": "升序，按数字从小到大排序",
  "admin.tools.form.sortRequired": "请排序",
  "admin.tools.form.hidden": "隐藏",
  "admin.tools.form.hiddenTooltip": "开启后只有登录后才会展示该工具",
  "admin.tools.form.logo": "Logo",
  "admin.tools.form.logoUrl": "Logo 网址",
  "admin.tools.form.logoPlaceholder": "请输入 Logo 网址",
  "admin.tools.form.logoUpload": "上传图标",
  "admin.tools.form.logoUploadHint": "png/jpeg/webp/ico，最大 200KB",
  "admin.tools.msg.logoTooLarge": "图标不能超过 200KB",
  "admin.tools.msg.logoBadType": "仅支持 png/jpeg/webp/ico",
  "admin.tools.msg.logoReadFailed": "读取图标失败",

  // 分类筛选
  "admin.tools.filter.category": "分类筛选",

  // 自动获取
  "admin.tools.form.autoGetLogo": "一键更新Logo网址",
  "admin.tools.form.autoGetDesc": "自动获取描述",
  "admin.tools.form.fillUrlFirst": "请先填写工具网址",
  "admin.tools.form.getFaviconSuccess": "获取 favicon 成功",
  "admin.tools.form.getFaviconFailed": "获取失败",
  "admin.tools.form.getFaviconError": "获取 favicon 失败",
  "admin.tools.form.getDescSuccess": "获取描述成功",
  "admin.tools.form.getDescNotFound": "未找到描述信息，请手动输入",
  "admin.tools.form.getDescFailed": "获取描述失败",

  // 删除确认
  "admin.tools.confirm.delete": "确定要删除 {name} 吗？",
  "admin.tools.confirm.deleteBulk": "确定要删除选中的工具吗？",

  // 操作结果消息
  "admin.tools.msg.addSuccess": "添加成功! Logo 将在 3 秒后刷新并加载！",
  "admin.tools.msg.addFailed": "添加失败!",
  "admin.tools.msg.updateSuccess": "更新成功! Logo 将在 3 秒后刷新并加载！",
  "admin.tools.msg.updateFailed": "更新失败!",
  "admin.tools.msg.deleteSuccess": "删除成功!",
  "admin.tools.msg.deleteFailed": "删除失败!",
  "admin.tools.msg.toggleSuccess": "更新成功",
  "admin.tools.msg.toggleFailed": "更新失败",
  "admin.tools.msg.exportSuccess": "导出成功！",
  "admin.tools.msg.importEmpty": "导入数据为空",
  "admin.tools.msg.importing": "正在导入 {count} 条工具数据...",
  "admin.tools.msg.importComplete": "导入完成：成功 {imported} 条",
  "admin.tools.msg.importSkipped": "，跳过 {skipped} 条（ID 已存在）",
  "admin.tools.msg.importRefreshing": "，正在刷新图标缓存...",
  "admin.tools.msg.importFailed": "导入失败!",
  "admin.tools.msg.resetSuccess": "重置成功!",
  "admin.tools.msg.resetFailed": "重置失败!",
  "admin.tools.msg.updateLogoProgress": "正在更新 Logo 网址...",
  "admin.tools.msg.updateDescProgress": "正在获取描述...",
  "admin.tools.msg.bulkUpdateComplete": "更新完成：成功 {success} 个，失败 {fail} 个",

  // 排序
  "admin.tools.msg.sortSuccess": "排序更新成功",
  "admin.tools.msg.sortFailed": "排序更新失败",

  // 网站健康检测
  "admin.tools.health.title": "网站健康检测",
  "admin.tools.health.startCheck": "开始检测",
  "admin.tools.health.checking": "检测中...",
  "admin.tools.health.checkingTip": "正在检测所有链接，请稍候...",
  "admin.tools.health.checkFailed": "检测失败",
  "admin.tools.health.checkRequestFailed": "检测请求失败：",
  "admin.tools.health.checkComplete": "检测完成：{alive} 个正常，{dead} 个失效",
  "admin.tools.health.organizeDeadLinks": "整理失效链接",
  "admin.tools.health.confirmOrganize": "确定将 {count} 条失效链接移至列表末尾？",
  "admin.tools.health.organizeSuccess": "已整理 {count} 条失效链接",
  "admin.tools.health.organizeFailed": "整理失败",
  "admin.tools.health.organizeRequestFailed": "整理请求失败：",
  "admin.tools.health.total": "总数",
  "admin.tools.health.alive": "正常",
  "admin.tools.health.dead": "失效",
  "admin.tools.health.table.name": "名称",
  "admin.tools.health.table.url": "网址",
  "admin.tools.health.table.statusCode": "状态码",
  "admin.tools.health.table.status": "状态",
  "admin.tools.health.table.error": "错误信息",
  "admin.tools.health.table.total": "共 {total} 条",
  "admin.tools.health.unreachable": "无法访问",
  "admin.tools.health.hint": "点击\"开始检测\"按钮，检测所有已收录网站的可用性",

  // Switch 开关文案
  "admin.common.switch.on": "开",
  "admin.common.switch.off": "关",

  // ==================== Admin / Catelog 分类管理 ====================
  // 标题与统计
  "admin.catelog.title": "分类管理",
  "admin.catelog.total": "当前共 {count} 条",

  // 表格列名
  "admin.catelog.table.sort": "排序",
  "admin.catelog.table.name": "名称",
  "admin.catelog.table.hidden": "隐藏",
  "admin.catelog.table.hidden.tooltip": "开启后只有登录后才会展示该分类",
  "admin.catelog.table.action": "操作",
  "admin.catelog.table.total": "共 {total} 条",

  // 操作按钮
  "admin.catelog.btn.add": "添加",
  "admin.catelog.btn.refresh": "刷新",
  "admin.catelog.btn.edit": "修改",
  "admin.catelog.btn.delete": "删除",

  // 批量操作
  "admin.catelog.bulk.delete": "删除 ({count})",
  "admin.catelog.bulk.confirmDelete": "确定删除选中的分类吗？",

  // 弹窗标题
  "admin.catelog.modal.add": "新建分类",
  "admin.catelog.modal.edit": "修改分类",

  // 表单
  "admin.catelog.form.id": "序号",
  "admin.catelog.form.name": "名称",
  "admin.catelog.form.namePlaceholder": "请输入分类名称",
  "admin.catelog.form.sort": "排序",
  "admin.catelog.form.sortPlaceholder": "请输入分类排序",
  "admin.catelog.form.sortTooltip": "升序，按数字从小到大排序",
  "admin.catelog.form.hidden": "隐藏",
  "admin.catelog.form.hiddenTooltip": "开启后只有登录后才会展示该工具",

  // 删除确认
  "admin.catelog.confirm.delete": "确定要删除分类 {name} 吗？",

  // 操作结果消息
  "admin.catelog.msg.addSuccess": "添加成功!",
  "admin.catelog.msg.addFailed": "添加失败!",
  "admin.catelog.msg.updateSuccess": "更新成功!",
  "admin.catelog.msg.updateFailed": "更新失败!",
  "admin.catelog.msg.deleteSuccess": "删除成功!",
  "admin.catelog.msg.deleteFailed": "删除失败!",
  "admin.catelog.msg.toggleSuccess": "更新成功",
  "admin.catelog.msg.toggleFailed": "更新失败",
  "admin.catelog.msg.sortSuccess": "排序已更新",
  "admin.catelog.msg.sortFailed": "排序更新失败",

  // ==================== Admin / Search 搜索引擎管理 ====================
  // 标题与统计
  "admin.search.title": "搜索引擎管理",
  "admin.search.total": "当前共 {count} 条",

  // 表格列名
  "admin.search.table.sort": "排序",
  "admin.search.table.logo": "Logo",
  "admin.search.table.name": "名称",
  "admin.search.table.urlTemplate": "URL模板",
  "admin.search.table.description": "描述",
  "admin.search.table.enabled": "启用",
  "admin.search.table.action": "操作",
  "admin.search.table.total": "共 {total} 条",

  // 操作按钮
  "admin.search.btn.add": "添加搜索引擎",
  "admin.search.btn.edit": "编辑",
  "admin.search.btn.delete": "删除",

  // 批量操作
  "admin.search.bulk.confirmDelete": "确定删除选中的搜索引擎吗？",
  "admin.search.bulk.confirmDeleteContent": "即将删除 {count} 个搜索引擎，此操作不可恢复。",
  "admin.search.bulk.confirmDeleteOk": "确认删除",
  "admin.search.bulk.confirmDeleteCancel": "取消",

  // 表单
  "admin.search.form.name": "名称",
  "admin.search.form.namePlaceholder": "例如：百度",
  "admin.search.form.nameRequired": "请输入搜索引擎名称",
  "admin.search.form.urlTemplate": "搜索URL模板",
  "admin.search.form.urlTemplatePlaceholder": "https://www.google.com/search?q={query}",
  "admin.search.form.urlTemplateExtra": "使用 {query} 或 %s 作为搜索关键词占位符",
  "admin.search.form.urlTemplateRequired": "请输入搜索URL模板",
  "admin.search.form.urlTemplateValidator": "URL模板必须包含 {query} 或 %s 作为搜索关键词占位符",
  "admin.search.form.description": "描述",
  "admin.search.form.descriptionPlaceholder": "搜索引擎的简要描述（可选）",
  "admin.search.form.logo": "图标",
  "admin.search.form.logoPlaceholder": "例如：baidu.ico 或 https://example.com/logo.png",
  "admin.search.form.logoRequired": "请输入图标文件名或网址",
  "admin.search.form.logoValidator": "请输入有效的网址或图标文件名",
  "admin.search.form.autoFetch": "一键获取描述和图标",

  // 自动获取
  "admin.search.form.fillUrlTemplateFirst": "请先填写搜索URL模板",
  "admin.search.form.cannotExtractUrl": "无法从 URL 模板中提取网址",
  "admin.search.form.fetchSuccess": "获取完成",
  "admin.search.form.fetchFailed": "获取失败: ",
  "admin.search.msg.loadFailed": "加载搜索引擎失败",

  // 操作结果消息
  "admin.search.msg.addSuccess": "添加成功",
  "admin.search.msg.editSuccess": "修改成功",
  "admin.search.msg.deleteSuccess": "删除成功",
  "admin.search.msg.deleteFailed": "删除失败",
  "admin.search.msg.sortFailed": "排序更新失败",

  // ==================== Admin / ApiToken 管理 ====================
  // 标题与统计
  "admin.apiToken.title": "API Token 管理",
  "admin.apiToken.total": "当前共 {count} 条",

  // 表格列名
  "admin.apiToken.table.id": "序号",
  "admin.apiToken.table.name": "名称",
  "admin.apiToken.table.value": "值",
  "admin.apiToken.table.action": "操作",
  "admin.apiToken.table.total": "共 {total} 条",

  // 操作按钮
  "admin.apiToken.btn.add": "添加",
  "admin.apiToken.btn.refresh": "刷新",

  // 弹窗标题
  "admin.apiToken.modal.add": "新建 Token",

  // 表单
  "admin.apiToken.form.name": "名称",
  "admin.apiToken.form.namePlaceholder": "请输入 API Token 名称",

  // 删除确认
  "admin.apiToken.confirm.delete": "确定要删除 Token {name} 吗？",

  // 操作结果消息
  "admin.apiToken.msg.addSuccess": "添加成功!",
  "admin.apiToken.msg.addFailed": "添加失败!",
  "admin.apiToken.msg.deleteSuccess": "删除成功!",
  "admin.apiToken.msg.deleteFailed": "删除失败!",

  // ==================== Admin / Setting 系统设置 ====================
  // 通用按钮
  "admin.settings.btn.submit": "提交",

  // ---- 配置导入导出 ----
  "admin.settings.importExport.title": "配置导入导出",
  "admin.settings.importExport.description": "支持工具、分类、搜索引擎、API Token、设置的整体备份与恢复",
  "admin.settings.btn.export": "导出配置",
  "admin.settings.btn.import": "导入配置",
  "admin.settings.msg.exportSuccess": "配置已导出至 {filename}",
  "admin.settings.msg.exportFailed": "导出失败",
  "admin.settings.msg.exportFailedDetail": "导出失败: ",
  "admin.settings.msg.importFailed": "导入失败",
  "admin.settings.msg.importFailedDetail": "导入失败: ",
  "admin.settings.msg.importFormatInvalid": "文件格式无效：缺少必要的字段（version、tools、categories、search_engines、api_tokens、settings）",
  "admin.settings.msg.importJsonInvalid": "文件格式无效：请上传有效的 JSON 文件",
  "admin.settings.msg.importSuccess": "✅ 导入成功",
  "admin.settings.msg.importSuccessWithError": "⚠️ 导入完成（有错误）",
  "admin.settings.msg.importTokenWarning": "⚠️ 包含敏感令牌信息",
  "admin.settings.msg.languageSynced": "根据服务器保存记录，已切换为{lang}",
  "admin.settings.msg.importTokenWarningContent": "导出的配置文件中包含 API Token 的完整值，请妥善保管此文件，切勿分享给他人或在非安全环境中存储。",
  "admin.settings.modal.importTitle": "确认导入配置",
  "admin.settings.modal.importConfirm": "确认导入",
  "admin.settings.modal.importCancel": "取消",
  "admin.settings.modal.importDescription": "即将导入以下配置，当前数据将被替换（Token 按名称去重、设置合并更新）：",
  "admin.settings.modal.importTokenAlert": "包含敏感令牌信息",
  "admin.settings.modal.importTokenAlertContent": "请确保导出文件来源可靠。",
  "admin.settings.importPreview.module": "模块",
  "admin.settings.importPreview.count": "数量",
  "admin.settings.importPreview.tools": "工具",
  "admin.settings.importPreview.categories": "分类",
  "admin.settings.importPreview.searchEngines": "搜索引擎",
  "admin.settings.importPreview.apiToken": "API Token",
  "admin.settings.importPreview.settings": "设置项",
  "admin.settings.importPreview.toolSample": "工具样本（前 5 条）",

  // ---- 修改用户信息 ----
  "admin.settings.user.title": "修改用户信息",
  "admin.settings.user.username": "用户名",
  "admin.settings.user.usernamePlaceholder": "请输入新用户名",
  "admin.settings.user.password": "密码",
  "admin.settings.user.passwordPlaceholder": "请输入新密码",

  // ---- 修改网站信息 ----
  "admin.settings.site.title": "修改网站信息",
  "admin.settings.site.favicon": "网站 logo",
  "admin.settings.site.faviconTooltip": "输入 logo 的 url，仅支持 png 或 svg 格式",
  "admin.settings.site.faviconPlaceholder": "请输入网站 logo",
  "admin.settings.site.faviconRequired": "请输入网站 logo 链接",
  "admin.settings.site.title_label": "网站标题",
  "admin.settings.site.titlePlaceholder": "请输入网站标题",
  "admin.settings.site.titleRequired": "请输入网站 title",
  "admin.settings.site.govRecord": "公信部备案",
  "admin.settings.site.govRecordPlaceholder": "请输入网站备案信息",
  "admin.settings.site.jumpTarget": "默认跳转方式",
  "admin.settings.site.jumpTargetTooltip": "选择点击卡片后默认的跳转方式",
  "admin.settings.site.jumpTargetRequired": "这是必填项",
  "admin.settings.site.jumpTarget.sameWindow": "原地跳转",
  "admin.settings.site.jumpTarget.newTab": "新标签页",
  "admin.settings.site.logo192": "logo 192x192",
  "admin.settings.site.logo192Placeholder": "192x192 大小的 logo 链接",
  "admin.settings.site.logo192Tooltip": "192x192 大小的 logo，用于实现可安装的 web 应用",
  "admin.settings.site.logo192Required": "请输入 192x192 大小的 logo 链接",
  "admin.settings.site.logo512": "logo 512x512",
  "admin.settings.site.logo512Placeholder": "512x512 大小的 logo 链接",
  "admin.settings.site.logo512Tooltip": "512x512 大小的 logo，用于实现可安装的 web 应用",
  "admin.settings.site.logo512Required": "请输入 512x512 大小的 logo 链接",
  "admin.settings.site.hideAdmin": "隐藏管理员后台卡片",
  "admin.settings.site.hideAdminTooltip": "默认展示，开启后将在前台隐藏管理员卡片",
  "admin.settings.site.hideGithub": "隐藏 Github 按钮",
  "admin.settings.site.hideGithubTooltip": "默认展示，开启后将在前台隐藏 Github 按钮",
  "admin.settings.site.hideJumpTarget": "隐藏跳转方式卡片",
  "admin.settings.site.hideJumpTargetTooltip": "默认展示，开启后将在前台隐藏跳转方式卡片",
  "admin.settings.site.showSearchEngine": "显示搜索引擎",
  "admin.settings.site.showSearchEngineTooltip": "开启后搜索时显示搜索引擎快捷切换按钮，关闭后仅显示搜索框",
  "admin.settings.site.pcColumnCount": "电脑端标签列数",
  "admin.settings.site.pcColumnCountTooltip": "设置首页工具卡片在电脑端的列数（2-8），默认 3 列",
  "admin.settings.site.pcColumnCountPlaceholder": "默认 3",

  // ---- 修改网站配置 ----
  "admin.settings.config.title": "修改网站配置",
  "admin.settings.config.noImageMode": "无图模式",
  "admin.settings.config.noImageModeTooltip": "开启后前台将不展示工具logo等图片",
  "admin.settings.config.compactMode": "精简模式",
  "admin.settings.config.compactModeTooltip": "开启后卡片只显示标题和logo，如果同时开启无图模式则只显示标题",
  "admin.settings.config.faviconApiTemplate": "Logo API 地址模板",
  "admin.settings.config.faviconApiTemplatePlaceholder": "https://favicon.im/{domain}",
  "admin.settings.config.faviconApiTemplateTooltip": "使用 {domain} 占位符表示工具主域名，默认使用 https://favicon.im/{domain}",
  "admin.settings.config.faviconApiTemplateRequired": "请输入 API 地址模板",
  "admin.settings.config.faviconApiTemplateValidator": "模板必须包含 {domain} 占位符",
  "admin.settings.config.sortByClicks": "智能排序（按使用频率）",
  "admin.settings.config.sortByClicksTooltip": "开启后，全部工具 Tab 将根据用户点击频率自动重排，新工具享有 14 天冷启动曝光",
  "admin.settings.config.sortByClicksNote": "提示：开启后，系统将根据用户在当前浏览器中的点击频次进行个性化重排。由于点击数据存储于本地浏览器（localStorage），不同用户的排序结果将因其使用习惯而异。",

  // ---- 数据备份 ----
  "admin.settings.backup.title": "数据备份",
  "admin.settings.backup.description": "配置 WebDAV 云盘，定期自动备份数据库",
  "admin.settings.backup.statusLabel": "最近备份状态：",
  "admin.settings.backup.statusTime": "时间：{time}",
  "admin.settings.backup.statusValue": "状态：{status}",
  "admin.settings.backup.statusNone": "暂无备份",
  "admin.settings.backup.statusSuccess": "成功",
  "admin.settings.backup.statusUnknown": "未知",
  "admin.settings.backup.btnRefresh": "刷新",

  // 备份表单
  "admin.settings.backup.webdavUrl": "WebDAV 服务地址",
  "admin.settings.backup.webdavUrlPlaceholder": "https://dav.jianguoyun.com/dav/",
  "admin.settings.backup.webdavUrlTooltip": "例如：https://dav.jianguoyun.com/dav/",
  "admin.settings.backup.webdavUrlRequired": "请输入 WebDAV 服务地址",
  "admin.settings.backup.username": "用户名",
  "admin.settings.backup.usernamePlaceholder": "请输入 WebDAV 用户名",
  "admin.settings.backup.usernameRequired": "请输入用户名",
  "admin.settings.backup.password": "密码",
  "admin.settings.backup.passwordPlaceholder": "请输入 WebDAV 密码",
  "admin.settings.backup.passwordRequired": "请输入密码",
  "admin.settings.backup.passwordTooltip": "密码将加密存储，不会明文显示",
  "admin.settings.backup.backupDir": "备份目录",
  "admin.settings.backup.backupDirPlaceholder": "/",
  "admin.settings.backup.backupDirTooltip": "WebDAV 上的备份目录路径，默认为根目录 /",
  "admin.settings.backup.enabled": "启用备份",
  "admin.settings.backup.scheduleType": "备份周期",
  "admin.settings.backup.scheduleType.daily": "每天",
  "admin.settings.backup.scheduleType.weekly": "每周",
  "admin.settings.backup.scheduleType.monthly": "每月",
  "admin.settings.backup.scheduleType.cron": "自定义（Cron）",
  "admin.settings.backup.scheduleTime": "备份时间",
  "admin.settings.backup.cronExpr": "Cron 表达式",
  "admin.settings.backup.cronExprPlaceholder": "0 2 * * *",
  "admin.settings.backup.cronExprTooltip": "标准 Cron 表达式，如：0 2 * * * 表示每天凌晨2点",
  "admin.settings.backup.cronExprRequired": "请输入 Cron 表达式",
  "admin.settings.backup.retentionType": "备份保留策略",
  "admin.settings.backup.retentionType.unlimited": "不限制",
  "admin.settings.backup.retentionType.days": "保留最近 N 天",
  "admin.settings.backup.retentionType.weeks": "保留最近 N 周",
  "admin.settings.backup.retentionType.months": "保留最近 N 月",
  "admin.settings.backup.retentionValue": "保留时长",
  "admin.settings.backup.retentionValueRequired": "请输入保留时长",
  "admin.settings.backup.retentionValuePlaceholder": "请输入数字",
  "admin.settings.backup.retentionUnit.days": "天",
  "admin.settings.backup.retentionUnit.weeks": "周",
  "admin.settings.backup.retentionUnit.months": "月",

  // 备份按钮
  "admin.settings.backup.btnTestConnection": "测试连接",
  "admin.settings.backup.btnBackupNow": "立即备份",
  "admin.settings.backup.btnSave": "保存配置",

  // 备份消息
  "admin.settings.backup.msg.connectionSuccess": "WebDAV 连接成功！",
  "admin.settings.backup.msg.connectionFailed": "连接失败",
  "admin.settings.backup.msg.connectionTestFailed": "连接测试失败: ",
  "admin.settings.backup.msg.fillRequired": "请填写必填字段",
  "admin.settings.backup.msg.backupStarted": "备份任务已启动，请稍后刷新查看状态",
  "admin.settings.backup.msg.backupFailed": "备份失败",
  "admin.settings.backup.msg.backupFailedDetail": "备份失败: ",
  "admin.settings.backup.msg.configSaved": "备份配置已保存",
  "admin.settings.backup.msg.saveFailed": "保存失败",
  "admin.settings.backup.msg.saveFailedDetail": "保存失败: ",

  // 备份文件管理
  "admin.settings.backup.files.title": "备份文件管理",
  "admin.settings.backup.files.btnRefresh": "刷新列表",
  "admin.settings.backup.files.description": "以下是从 WebDAV 云端获取的备份文件，可选择任意文件恢复数据库。恢复后请刷新页面以查看最新数据。",
  "admin.settings.backup.files.column.name": "文件名",
  "admin.settings.backup.files.column.time": "备份时间",
  "admin.settings.backup.files.column.size": "大小",
  "admin.settings.backup.files.column.action": "操作",
  "admin.settings.backup.files.btnRestore": "恢复",
  "admin.settings.backup.files.emptyLoading": "加载中...",
  "admin.settings.backup.files.emptyText": "暂无备份文件（请先配置 WebDAV 并执行备份）",
  "admin.settings.backup.files.tableTotal": "共 {total} 条",

  // 恢复确认
  "admin.settings.backup.restore.title": "确认恢复数据库",
  "admin.settings.backup.restore.content": "即将从备份文件 {filename} 恢复数据库。当前数据库将被覆盖（会自动备份到 .bak 文件）。恢复完成后请刷新页面以查看最新数据。确认继续？",
  "admin.settings.backup.restore.btnOk": "确认恢复",
  "admin.settings.backup.restore.btnCancel": "取消",
  "admin.settings.backup.restore.msg.success": "数据库恢复成功，请刷新页面以查看最新数据",
  "admin.settings.backup.restore.msg.failed": "恢复失败",
  "admin.settings.backup.restore.msg.failedDetail": "恢复失败: ",

  // ---- 部署版本信息 ----
  "admin.settings.version.title": "部署版本信息",
  "admin.settings.version.current": "当前版本：",
  "admin.settings.version.format": "版本号格式：v主版本.次版本.修订版本.构建号",

  // ---- 通用操作结果消息 ----
  "admin.settings.msg.updateSuccess": "修改成功!",
  "admin.settings.msg.updateFailed": "修改失败!",

  "admin.settings.msg.unknownError": "未知错误",
  "admin.settings.msg.importDetailCategory": "分类：导入 {count} 条",
  "admin.settings.msg.importDetailTool": "工具：导入 {count} 条",
  "admin.settings.msg.importDetailSearchEngine": "搜索引擎：导入 {count} 条",
  "admin.settings.msg.importDetailToken": "Token：导入 {count} 条，跳过 {skipped} 条",
  "admin.settings.msg.importDetailSetting": "设置：更新 {count} 项",
  "admin.settings.msg.importPartialError": "部分操作出现错误：",
  "admin.settings.importPreview.value": "值",
  "admin.tools.form.hideHint": "开启后只有登录后才会展示该工具",
  "admin.tools.form.hide": "隐藏",
  "admin.tools.form.autoFavicon": "根据网址自动获取 favicon",
  "admin.tools.form.autoDesc": "自动获取并更新选中工具的描述",
  "admin.tools.form.sortHint": "升序，按数字从小到大排序",
  "admin.tools.form.logoApiHint": "根据 Logo API 模板自动获取并更新选中工具的 logo 网址",
  "admin.tools.form.logoUrlLabel": "Logo 网址",
  "admin.tools.form.descLabel": "描述",
  "admin.tools.confirm.deleteSingle": "确定要删除 {name} 吗？",
  "admin.tools.msg.fillUrlFirst": "请先填写工具网址",
  "admin.tools.msg.faviconSuccess": "获取 favicon 成功",
  "admin.tools.msg.fetchFailed": "获取失败",
  "admin.tools.msg.faviconFailed": "获取 favicon 失败",
  "admin.tools.msg.descSuccess": "获取描述成功",
  "admin.tools.msg.descNotFound": "未找到描述信息，请手动输入",
  "admin.tools.msg.descFailed": "获取失败，请手动输入描述",
  "admin.tools.msg.refreshingIcon": "，正在刷新图标缓存...",
  "admin.tools.msg.updatingLogo": "正在更新 Logo 网址...",
  "admin.tools.msg.updateLogoComplete": "更新完成：成功 {success} 个，失败 {fail} 个",
  "admin.tools.msg.fetchingDesc": "正在获取描述...",
  "admin.tools.msg.sortUpdated": "排序已更新",
  "admin.catelog.form.sortHint": "升序，按数字从小到大排序",
  "admin.catelog.msg.sortUpdated": "排序已更新",
  "admin.search.msg.enterLogo": "请输入图标文件名或网址",
  "admin.search.msg.invalidLogo": "请输入有效的网址或图标文件名",
  "admin.search.batch.fetchInfo": "一键获取描述和图标",
  "admin.catelog.confirm.bulkDelete": "确定批量删除选中的分类吗？",
  "admin.search.confirm.bulkDelete": "确定批量删除选中的搜索引擎吗？",
  "admin.search.confirm.bulkDeleteContent": "确定删除选中的 {count} 个搜索引擎吗？",
  "admin.search.confirm.cancel": "取消",
  "admin.search.confirm.deleteContent": "确定删除搜索引擎 {name} 吗？",
  "admin.search.confirm.deleteSingle": "确认删除",
  "admin.search.confirm.ok": "确定",
  "admin.search.form.descHint": "搜索引擎描述",
  "admin.search.msg.cannotExtractUrl": "无法从 URL 模板中提取域名",
  "admin.search.msg.enterUrlTemplate": "请输入 URL 模板",
  "admin.search.msg.fetchComplete": "获取描述和图标完成",
  "admin.search.msg.fetchFailed": "获取失败：",
  "admin.search.msg.fillUrlFirst": "请先填写 URL 模板",
  "admin.search.msg.updateFailed": "更新失败",
  "admin.search.msg.updateSuccess": "更新成功",
  "admin.search.msg.urlTemplateRequired": "URL 模板必须包含 {query} 或 %s",
  "admin.settings.title": "系统设置",
  "admin.token.title": "API 令牌",
  "admin.tools.batch.resetCachedIcon": "重置缓存图标",
  "admin.tools.batch.resetDefaultIcon": "重置默认图标",
  "admin.tools.batch.updateDesc": "批量获取描述",
  "admin.tools.batch.updateLogo": "批量获取图标",
  "admin.tools.confirm.recacheIcon": "确定重新缓存选中工具的图标吗？",
  "admin.tools.confirm.resetIcon": "确定重置选中工具的图标为默认吗？",
  "admin.tools.form.urlFormat": "请输入以 http:// 或 https:// 开头的网址",
  "admin.tools.health.complete": "检测完成：{alive} 个正常，{dead} 个失效",
  "admin.tools.health.organized": "已整理 {count} 条失效链接",
  "admin.tools.msg.addSuccessLogo": "添加成功！Logo 将在 3 秒后刷新加载",
  "admin.tools.msg.checkFailed": "检测失败",
  "admin.tools.msg.errorInfo": "错误信息",
  "admin.tools.msg.networkError": "网络错误",
  "admin.tools.msg.organizeFailed": "整理失败",
  "admin.tools.msg.updateSuccessLogo": "更新成功！Logo 将在 3 秒后刷新加载",
  "admin.tools.total.label": "总数",
  "common.delete": "删除",
  "home.cache.failed": "缓存恢复失败",
  "home.cache.networkError": "网络错误，尝试从缓存恢复",
  "home.searchEngine.category": "搜索",
  "home.searchEngine.desc": "在 {name} 中搜索 「{query}」",
  "home.searchEngine.name": "使用 {name} 搜索",
  "home.admin.button": "管理后台",
};

export default zhCN;
