import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Spin, Switch, Table, TimePicker, Upload } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUpdateSetting, fetchUpdateUser, fetchUpdateSiteConfig, fetchExportConfig, fetchImportConfig, fetchGetDeploymentVersion, fetchGetBackupConfig, fetchSaveBackupConfig, fetchTestBackupConnection, fetchBackupNow, fetchGetBackupStatus } from "../../../utils/api";
import { useData } from "../hooks/useData";
import { CloudDownloadOutlined, CloudUploadOutlined, CloudServerOutlined, ExclamationCircleOutlined, SyncOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

// 辅助函数：将 "HH:mm" 字符串转为 dayjs 对象（不依赖 customParseFormat 插件）
const parseTimeStr = (timeStr: string) => {
  const parts = (timeStr || "02:00").split(":");
  const hour = parseInt(parts[0] || "2", 10);
  const minute = parseInt(parts[1] || "0", 10);
  return dayjs().hour(hour).minute(minute).second(0);
};
export interface SettingProps { }
export const Setting: React.FC<SettingProps> = (props) => {
  const { store, loading, reload } = useData();
  const [userForm] = Form.useForm();
  const [settingForm] = Form.useForm();
  const [siteConfigForm] = Form.useForm();
  const [importing, setImporting] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [deploymentVersion, setDeploymentVersion] = useState<string>("v1.13.1.1");

  // 备份相关状态
  const [backupForm] = Form.useForm();
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupTesting, setBackupTesting] = useState(false);
  const [backupNowLoading, setBackupNowLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ lastBackupTime?: string; lastBackupStatus?: string }>({});
  const [scheduleType, setScheduleType] = useState<string>("daily");
  const [retentionType, setRetentionType] = useState<string>("unlimited");
  const [isDark, setIsDark] = useState(() => document.body.classList.contains("dark-mode"));

  // 监听主题变化
  useEffect(() => {
    const check = () => setIsDark(document.body.classList.contains("dark-mode"));
    check();
    window.addEventListener("theme-change", check);
    return () => window.removeEventListener("theme-change", check);
  }, []);

  // 获取部署版本号
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await fetchGetDeploymentVersion();
        setDeploymentVersion(version);
      } catch (e) {
        console.error("获取版本号失败:", e);
      }
    };
    loadVersion();
  }, []);

  // 加载备份配置
  useEffect(() => {
    const loadBackupConfig = async () => {
      try {
        const res = await fetchGetBackupConfig();
        if (res?.success && res?.data) {
          const config = res.data;
          backupForm.setFieldsValue({
            webdavUrl: config.webdavUrl || "",
            username: config.username || "",
            password: "", // 不回显密码
            backupDir: config.backupDir || "/",
            scheduleType: config.scheduleType || "daily",
            scheduleTime: parseTimeStr(config.scheduleTime),
            cronExpr: config.cronExpr || "",
            retentionType: config.retentionType || "unlimited",
            retentionValue: config.retentionValue || 0,
            enabled: config.enabled !== false,
          });
          setScheduleType(config.scheduleType || "daily");
          setRetentionType(config.retentionType || "unlimited");
        }
      } catch (e) {
        console.error("获取备份配置失败:", e);
      }
    };
    loadBackupConfig();
  }, [backupForm]);

  // 加载备份状态
  useEffect(() => {
    const loadBackupStatus = async () => {
      try {
        const res = await fetchGetBackupStatus();
        if (res?.success && res?.data) {
          setBackupStatus(res.data);
        }
      } catch (e) {
        console.error("获取备份状态失败:", e);
      }
    };
    loadBackupStatus();
  }, []);

  // 测试 WebDAV 连接
  const handleTestConnection = useCallback(async () => {
    try {
      const values = await backupForm.validateFields(["webdavUrl", "username", "password"]);
      setBackupTesting(true);
      const res = await fetchTestBackupConnection({
        webdavUrl: values.webdavUrl,
        username: values.username,
        password: values.password,
      });
      if (res?.success) {
        message.success("WebDAV 连接成功！");
      } else {
        message.error(res?.errorMessage || "连接失败");
      }
    } catch (err: any) {
      if (err.errorFields) {
        message.warning("请填写必填字段");
      } else {
        message.error("连接测试失败: " + (err.message || "未知错误"));
      }
    } finally {
      setBackupTesting(false);
    }
  }, [backupForm]);

  // 立即备份
  const handleBackupNow = useCallback(async () => {
    setBackupNowLoading(true);
    try {
      const res = await fetchBackupNow();
      if (res?.success) {
        message.success("备份任务已启动，请稍后刷新查看状态");
        // 延迟后刷新状态
        setTimeout(async () => {
          try {
            const statusRes = await fetchGetBackupStatus();
            if (statusRes?.success && statusRes?.data) {
              setBackupStatus(statusRes.data);
            }
          } catch (e) {}
        }, 3000);
      } else {
        message.error(res?.errorMessage || "备份失败");
      }
    } catch (err: any) {
      message.error("备份失败: " + (err.message || "未知错误"));
    } finally {
      setBackupNowLoading(false);
    }
  }, []);

  // 保存备份配置
  const handleSaveBackupConfig = useCallback(async (values: any) => {
    setBackupLoading(true);
    try {
      const payload = {
        ...values,
        scheduleTime: values.scheduleTime ? values.scheduleTime.format("HH:mm") : "02:00",
        enabled: values.enabled !== false,
      };
      const res = await fetchSaveBackupConfig(payload);
      if (res?.success) {
        message.success("备份配置已保存");
        // 刷新备份状态
        try {
          const statusRes = await fetchGetBackupStatus();
          if (statusRes?.success && statusRes?.data) {
            setBackupStatus(statusRes.data);
          }
        } catch (e) {}
      } else {
        message.error(res?.errorMessage || "保存失败");
      }
    } catch (err: any) {
      message.error("保存失败: " + (err.message || "未知错误"));
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    userForm.setFieldsValue(store?.user ?? {})
    settingForm.setFieldsValue({
      ...(store?.setting ?? {}),
      pcColumnCount: store?.setting?.pcColumnCount || 3,
    })
    siteConfigForm.setFieldsValue(store?.siteConfig ?? {})
  }, [store])
  const handleUpdateUser = useCallback(
    async (values: any) => {
      try {
        await fetchUpdateUser({ ...values, id: store?.user?.id });
        message.success("修改成功!");
      } catch (err) {
        message.warning("修改失败!");
      } finally {
        reload();
      }
    },
    [reload, store]
  );
  const handleUpdateWebSite = useCallback(
    async (values: any) => {
      try {
        await fetchUpdateSetting(values);
        message.success("修改成功!");
      } catch (err) {
        message.warning("修改失败!");
      } finally {
        reload();
      }
    },
    [reload]
  );
  const handleUpdateSiteConfig = useCallback(
    async (values: any) => {
      try {
        await fetchUpdateSiteConfig(values);
        message.success("修改成功!");
      } catch (err) {
        message.warning("修改失败!");
      } finally {
        reload();
      }
    },
    [reload]
  );

  // 导出配置
  const handleExport = useCallback(async () => {
    try {
      const res = await fetchExportConfig();
      if (res?.success && res?.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const filename = `project-config-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // API Token 安全提示
        if (res.data.api_tokens && res.data.api_tokens.length > 0) {
          Modal.warning({
            title: '⚠️ 包含敏感令牌信息',
            icon: <WarningOutlined />,
            content: '导出的配置文件中包含 API Token 的完整值，请妥善保管此文件，切勿分享给他人或在非安全环境中存储。',
          });
        }

        message.success(`配置已导出至 ${filename}`);
      } else {
        message.error('导出失败');
      }
    } catch (err) {
      message.error('导出失败: ' + (err as any).message);
    }
  }, []);

  // 导入文件选择
  const handleImportFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        // 校验格式
        if (!content.version || !content.tools || !content.categories || !content.search_engines || !content.api_tokens || !content.settings) {
          message.error('文件格式无效：缺少必要的字段（version、tools、categories、search_engines、api_tokens、settings）');
          return;
        }
        setImportFile(file);
        setImportPreview(content);
        setImportModalVisible(true);
      } catch {
        message.error('文件格式无效：请上传有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  }, []);
// 确认导入
  const handleImportConfirm = useCallback(async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const payload = {
        tools: importPreview.tools || [],
        categories: importPreview.categories || [],
        search_engines: importPreview.search_engines || [],
        api_tokens: importPreview.api_tokens || [],
        settings: importPreview.settings || {},
        site_config: importPreview.site_config || {},
      };
      const res = await fetchImportConfig(payload);
      if (res?.success && res?.data) {
        const result = res.data;
        const detailLines = [
          `分类：导入 ${result.categories_imported} 条`,
          `工具：导入 ${result.tools_imported} 条`,
          `搜索引擎：导入 ${result.search_engines_imported} 条`,
          `Token：导入 ${result.api_tokens_imported} 条，跳过 ${result.api_tokens_skipped} 条`,
          `设置：更新 ${result.settings_updated} 项`,
        ];
        if (result.errors && result.errors.length > 0) {
          detailLines.push('', '⚠️ 部分操作出现错误：');
          result.errors.forEach((err: string) => detailLines.push(`  - ${err}`));
        }
        Modal.success({
          title: result.success ? '✅ 导入成功' : '⚠️ 导入完成（有错误）',
          content: (
            <div>
              {detailLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ),
        });
        setImportModalVisible(false);
        setImportPreview(null);
        setImportFile(null);
        // 刷新图标缓存：逐个触发工具图标缓存
        if (importPreview.tools && importPreview.tools.length > 0) {
          try {
            const { fetchUpdateTool } = await import('../../../utils/api');
            for (const tool of importPreview.tools) {
              try {
                await fetchUpdateTool({ ...tool });
              } catch (e) { }
            }
          } catch (e) { }
        }
        reload();
      } else {
        message.error('导入失败: ' + (res?.data?.errorMessage || '未知错误'));
      }
    } catch (err) {
      message.error('导入失败: ' + (err as any).message);
    } finally {
      setImporting(false);
    }
  }, [importPreview, reload]);

  // 构建预览表格列
  const previewColumns = [
    { title: '模块', dataIndex: 'module', key: 'module' },
    { title: '数量', dataIndex: 'count', key: 'count' },
  ];

  const previewData = importPreview ? [
    { key: '1', module: '工具', count: importPreview.tools?.length || 0 },
    { key: '2', module: '分类', count: importPreview.categories?.length || 0 },
    { key: '3', module: '搜索引擎', count: importPreview.search_engines?.length || 0 },
    { key: '4', module: 'API Token', count: importPreview.api_tokens?.length || 0 },
    { key: '5', module: '设置项', count: Object.keys(importPreview.settings || {}).length },
  ] : [];

  // 样本数据
  const sampleColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
  ];

  return (
    <div className="overflow-auto">
      {/* 导入导出操作区 */}
      <Card
        title={
          <span>
            <CloudDownloadOutlined style={{ marginRight: 8 }} />
            配置导入导出
          </span>
        }
        style={{ marginBottom: 32 }}
        extra={
          <span style={{ fontSize: 12, color: '#999' }}>
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            支持工具、分类、搜索引擎、API Token、设置的整体备份与恢复
          </span>
        }
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Button
            type="primary"
            size="large"
            icon={<CloudDownloadOutlined />}
            onClick={handleExport}
            loading={loading}
          >
            导出配置
          </Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleImportFileSelect}
            disabled={importing}
          >
            <Button
              size="large"
              icon={<CloudUploadOutlined />}
              loading={importing}
              disabled={importing}
            >
              导入配置
            </Button>
          </Upload>
        </div>
      </Card>

      {/* 导入确认 Modal */}
      <Modal
        title="确认导入配置"
        open={importModalVisible}
        onOk={handleImportConfirm}
        onCancel={() => {
          setImportModalVisible(false);
          setImportPreview(null);
          setImportFile(null);
        }}
        confirmLoading={importing}
        okText="确认导入"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          即将导入以下配置，当前数据将被替换（Token 按名称去重、设置合并更新）：
        </div>
        <Table
          dataSource={previewData}
          columns={previewColumns}
          pagination={false}
          size="small"
          style={{ marginBottom: 16 }}
        />
        {importPreview?.api_tokens?.length > 0 && (
          <div style={{ marginBottom: 16, padding: 8, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
            <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            <strong>包含敏感令牌信息</strong>，请确保导出文件来源可靠。
          </div>
        )}
        {/* 样本预览 */}
        {importPreview?.tools?.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>工具样本（前 5 条）</summary>
            <Table
              dataSource={importPreview.tools.slice(0, 5).map((t: any, i: number) => ({ key: i, name: t.name, value: t.url }))}
              columns={sampleColumns}
              pagination={false}
              size="small"
            />
          </details>
        )}
      </Modal>

      <Card title={`修改用户信息`} style={{ marginBottom: 32 }}>
        <Spin spinning={loading}>
          <Form onFinish={handleUpdateUser} initialValues={store?.user ?? {}} form={userForm}>
            <Form.Item
              label="用户名"
              name="name"
              required
              labelCol={{ span: 4 }}
            >
              <Input placeholder="请输入新用户名"></Input>
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              required
              labelCol={{ span: 4 }}
            >
              <Input.Password placeholder="请输入新密码" ></Input.Password>
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
      <Card title={`修改网站信息`}>
        <Spin spinning={loading}>
          <Form
            onFinish={handleUpdateWebSite}
            initialValues={store?.setting ?? {}}
            labelCol={{ span: 6 }}
            form={settingForm}
          >
            <Form.Item
              label="网站 logo"
              name="favicon"
              tooltip="输入 logo 的 url，仅支持 png 或 svg 格式"
              required
              rules={[{ required: true, message: "请输入网站 logo 链接" }]}

            >
              <Input placeholder="请输入网站 logo"></Input>
            </Form.Item>
            <Form.Item
              label="网站标题"
              name="title"
              required
              rules={[{ required: true, message: "请输入网站 title" }]}


            >
              <Input placeholder="请输入网站标题"></Input>
            </Form.Item>
            <Form.Item
              label="公信部备案"
              name="govRecord"
            >
              <Input placeholder="请输入网站备案信息"></Input>
            </Form.Item>


            <Form.Item label="默认跳转方式" name="jumpTargetBlank" rules={[{ required: true, message: "这是必填项" }]}
              tooltip="选择点击卡片后默认的跳转方式"
            >
              <Select options={[
                {
                  label: "原地跳转",
                  value: false,
                },
                {
                  label: "新标签页",
                  value: true,
                },
              ]}>

              </Select>

            </Form.Item>
            <Form.Item
              label="logo 192x192"
              name="logo192"
              rules={[{ required: true, message: "请输入 192x192 大小的 logo 链接" }]}

              tooltip="192x192 大小的 logo，用于实现可安装的 web 应用"

            >
              <Input placeholder="192x192 大小的 logo 链接"></Input>
            </Form.Item>
            <Form.Item
              label="logo 512x512"
              name="logo512"
              rules={[{ required: true, message: "请输入 512x512 大小的 logo 链接" }]}

              tooltip="512x512 大小的 logo，用于实现可安装的 web 应用"

            >
              <Input placeholder="512x512 大小的 logo 链接"></Input>
            </Form.Item>
            <Form.Item label="隐藏管理员后台卡片" name="hideAdmin" tooltip="默认展示，开启后将在前台隐藏管理员卡片" >
              <Switch defaultChecked={Boolean(store?.setting?.hideAdmin)} />
            </Form.Item>
            <Form.Item label="隐藏 Github 按钮" name="hideGithub" tooltip="默认展示，开启后将在前台隐藏 Github 按钮" >
              <Switch defaultChecked={Boolean(store?.setting?.hideGithub)} />
            </Form.Item>
            <Form.Item label="隐藏跳转方式卡片" name="hideToggleJumpTarget" tooltip="默认展示，开启后将在前台隐藏跳转方式卡片" >
              <Switch defaultChecked={Boolean(store?.setting?.hideToggleJumpTarget)} />
            </Form.Item>
            <Form.Item label="显示搜索引擎" name="showSearchEngine" tooltip="开启后搜索时显示搜索引擎快捷切换按钮，关闭后仅显示搜索框" >
              <Switch defaultChecked={store?.setting?.showSearchEngine !== false} />
            </Form.Item>
            <Form.Item label="电脑端标签列数" name="pcColumnCount" tooltip="设置首页工具卡片在电脑端的列数（2-8），默认 3 列">
              <InputNumber min={2} max={8} placeholder="默认 3" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
      <Card title={`修改网站配置`} style={{ marginTop: 32 }}>
        <Spin spinning={loading}>
          <Form
            onFinish={handleUpdateSiteConfig}
            initialValues={store?.siteConfig ?? {}}
            labelCol={{ span: 6 }}
            form={siteConfigForm}
          >
            <Form.Item label="无图模式" name="noImageMode" tooltip="开启后前台将不展示工具logo等图片">
              <Switch defaultChecked={Boolean(store?.siteConfig?.noImageMode)} />
            </Form.Item>
            <Form.Item label="精简模式" name="compactMode" tooltip="开启后卡片只显示标题和logo，如果同时开启无图模式则只显示标题">
              <Switch defaultChecked={Boolean(store?.siteConfig?.compactMode)} />
            </Form.Item>
            <Form.Item
              label="Logo API 地址模板"
              name="faviconApiTemplate"
              tooltip="使用 {domain} 占位符表示工具主域名，默认使用 https://favicon.im/{domain}"
              rules={[
                { required: true, message: "请输入 API 地址模板" },
                {
                  validator: (_, value) => {
                    if (!value || !value.includes("{domain}")) {
                      return Promise.reject(new Error("模板必须包含 {domain} 占位符"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder="https://favicon.im/{domain}" />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* 数据备份卡片 */}
      <Card
        title={
          <span>
            <CloudServerOutlined style={{ marginRight: 8 }} />
            数据备份
          </span>
        }
        style={{ marginTop: 32 }}
        extra={
          <span style={{ fontSize: 12, color: '#999' }}>
            配置 WebDAV 云盘，定期自动备份数据库
          </span>
        }
      >
        {/* 备份状态显示 */}
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 8, background: isDark ? '#222' : '#fafafa', border: isDark ? '1px solid #333' : '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.6)' : undefined }}>最近备份状态：</span>
            {backupStatus.lastBackupTime ? (
              <>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : undefined }}>时间：{backupStatus.lastBackupTime}</span>
                <span style={{ color: backupStatus.lastBackupStatus === '成功' ? '#52c41a' : '#ff4d4f' }}>
                  状态：{backupStatus.lastBackupStatus || '未知'}
                </span>
              </>
            ) : (
              <span style={{ color: '#999' }}>暂无备份</span>
            )}
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={async () => {
                try {
                  const res = await fetchGetBackupStatus();
                  if (res?.success && res?.data) {
                    setBackupStatus(res.data);
                  }
                } catch (e) {}
              }}
            >
              刷新
            </Button>
          </div>
        </div>

        <Spin spinning={backupLoading}>
          <Form
            form={backupForm}
            onFinish={handleSaveBackupConfig}
            labelCol={{ span: 6 }}
            initialValues={{
              backupDir: "/",
              scheduleType: "daily",
              scheduleTime: parseTimeStr("02:00"),
              retentionType: "unlimited",
              retentionValue: 0,
              enabled: true,
            }}
          >
            <Form.Item
              label="WebDAV 服务地址"
              name="webdavUrl"
              required
              rules={[{ required: true, message: "请输入 WebDAV 服务地址" }]}
              tooltip="例如：https://dav.jianguoyun.com/dav/"
            >
              <Input placeholder="https://dav.jianguoyun.com/dav/" />
            </Form.Item>

            <Form.Item
              label="用户名"
              name="username"
              required
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input placeholder="请输入 WebDAV 用户名" />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              required
              rules={[{ required: true, message: "请输入密码" }]}
              tooltip="密码将加密存储，不会明文显示"
            >
              <Input.Password placeholder="请输入 WebDAV 密码" />
            </Form.Item>

            <Form.Item
              label="备份目录"
              name="backupDir"
              tooltip="WebDAV 上的备份目录路径，默认为根目录 /"
            >
              <Input placeholder="/" />
            </Form.Item>

            <Form.Item
              label="启用备份"
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="备份周期"
              name="scheduleType"
              required
            >
              <Select
                onChange={(value) => setScheduleType(value)}
                options={[
                  { label: "每天", value: "daily" },
                  { label: "每周", value: "weekly" },
                  { label: "每月", value: "monthly" },
                  { label: "自定义（Cron）", value: "cron" },
                ]}
              />
            </Form.Item>

            {scheduleType !== "cron" && (
              <Form.Item
                label="备份时间"
                name="scheduleTime"
                required
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} popupClassName={isDark ? "nav-dark-picker-dropdown" : ""} />
              </Form.Item>
            )}

            {scheduleType === "cron" && (
              <Form.Item
                label="Cron 表达式"
                name="cronExpr"
                required
                rules={[{ required: true, message: "请输入 Cron 表达式" }]}
                tooltip="标准 Cron 表达式，如：0 2 * * * 表示每天凌晨2点"
              >
                <Input placeholder="0 2 * * *" />
              </Form.Item>
            )}

            <Form.Item
              label="备份保留策略"
              name="retentionType"
              required
            >
              <Select
                onChange={(value) => setRetentionType(value)}
                options={[
                  { label: "不限制", value: "unlimited" },
                  { label: "保留最近 N 天", value: "days" },
                  { label: "保留最近 N 周", value: "weeks" },
                  { label: "保留最近 N 月", value: "months" },
                ]}
              />
            </Form.Item>

            {retentionType !== "unlimited" && (
              <Form.Item
                label="保留时长"
                name="retentionValue"
                required
                rules={[{ required: true, message: "请输入保留时长" }]}
              >
                <InputNumber min={1} max={999} placeholder="请输入数字" style={{ width: '100%' }} addonAfter={
                  retentionType === "days" ? "天" : retentionType === "weeks" ? "周" : "月"
                } />
              </Form.Item>
            )}

            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  onClick={handleTestConnection}
                  loading={backupTesting}
                >
                  测试连接
                </Button>
                <Button
                  type="default"
                  onClick={handleBackupNow}
                  loading={backupNowLoading}
                >
                  立即备份
                </Button>
                <Button type="primary" htmlType="submit">
                  保存配置
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* 部署版本信息 */}
      <Card title="部署版本信息" style={{ marginTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 16, color: "#666" }}>当前版本：</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#1890ff", fontFamily: "monospace" }}>
            {deploymentVersion}
          </span>
          <span style={{ fontSize: 13, color: "#999", marginLeft: "auto" }}>
            版本号格式：v主版本.次版本.修订版本.构建号
          </span>
        </div>
      </Card>
    </div>
  );
};