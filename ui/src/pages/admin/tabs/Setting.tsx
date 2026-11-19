import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Spin, Switch, Table, TimePicker, Upload } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUpdateSetting, fetchUpdateLanguage, fetchUpdateUser, fetchUpdateSiteConfig, fetchExportConfig, fetchImportConfig, fetchGetDeploymentVersion, fetchGetBackupConfig, fetchSaveBackupConfig, fetchTestBackupConnection, fetchBackupNow, fetchGetBackupStatus, fetchListBackupFiles, fetchRestoreBackup } from "../../../utils/api";
import { useData } from "../hooks/useData";
import { CloudDownloadOutlined, CloudUploadOutlined, CloudServerOutlined, ExclamationCircleOutlined, SyncOutlined, WarningOutlined, RollbackOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from '../../../i18n';

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
  const { t, language, setLanguage } = useTranslation();
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
  const [backupFiles, setBackupFiles] = useState<{ name: string; size: number; modTime: string }[]>([]);
  const [backupFilesLoading, setBackupFilesLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null); // 正在恢复的文件名

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
        message.success(t("admin.settings.backup.msg.connectionSuccess"));
      } else {
        message.error(res?.errorMessage || t("admin.settings.backup.msg.connectionFailed"));
      }
    } catch (err: any) {
      if (err.errorFields) {
        message.warning(t("admin.settings.backup.msg.fillRequired"));
      } else {
        message.error(t("admin.settings.backup.msg.connectionTestFailed") + (err.message || t("admin.settings.msg.unknownError")));
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
        message.success(t("admin.settings.backup.msg.backupStarted"));
        // 延迟后刷新状态和文件列表
        setTimeout(async () => {
          try {
            const statusRes = await fetchGetBackupStatus();
            if (statusRes?.success && statusRes?.data) {
              setBackupStatus(statusRes.data);
            }
            loadBackupFiles();
          } catch (e) {}
        }, 3000);
      } else {
        message.error(res?.errorMessage || t("admin.settings.backup.msg.backupFailed"));
      }
    } catch (err: any) {
      message.error(t("admin.settings.backup.msg.backupFailedDetail") + (err.message || t("admin.settings.msg.unknownError")));
    } finally {
      setBackupNowLoading(false);
    }
  }, []);

  // 加载备份文件列表
  const loadBackupFiles = useCallback(async () => {
    setBackupFilesLoading(true);
    try {
      const res = await fetchListBackupFiles();
      if (res?.success && res?.data) {
        setBackupFiles(res.data);
      } else {
        setBackupFiles([]);
      }
    } catch (e) {
      console.error("获取备份文件列表失败:", e);
      setBackupFiles([]);
    } finally {
      setBackupFilesLoading(false);
    }
  }, []);

  // 从备份恢复数据库
  const handleRestoreBackup = useCallback(async (filename: string) => {
    Modal.confirm({
      title: t("admin.settings.backup.restore.title"),
      icon: <WarningOutlined />,
      content: t("admin.settings.backup.restore.content").replace("{filename}", filename),
      okText: t("admin.settings.backup.restore.btnOk"),
      cancelText: t("admin.settings.backup.restore.btnCancel"),
      okType: "danger",
      onOk: async () => {
        setRestoreLoading(filename);
        try {
          const res = await fetchRestoreBackup(filename);
          if (res?.success) {
            message.success(t("admin.settings.backup.restore.msg.success"));
            // 延迟后刷新页面
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            message.error(res?.errorMessage || t("admin.settings.backup.restore.msg.failed"));
          }
        } catch (err: any) {
          message.error(t("admin.settings.backup.restore.msg.failedDetail") + (err.message || t("admin.settings.msg.unknownError")));
        } finally {
          setRestoreLoading(null);
        }
      },
    });
  }, []);

  // 初始加载备份文件列表
  useEffect(() => {
    loadBackupFiles();
  }, [loadBackupFiles]);

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
        message.success(t("admin.settings.backup.msg.configSaved"));
        // 刷新备份状态
        try {
          const statusRes = await fetchGetBackupStatus();
          if (statusRes?.success && statusRes?.data) {
            setBackupStatus(statusRes.data);
          }
        } catch (e) {}
      } else {
        message.error(res?.errorMessage || t("admin.settings.backup.msg.saveFailed"));
      }
    } catch (err: any) {
      message.error(t("admin.settings.backup.msg.saveFailedDetail") + (err.message || t("admin.settings.msg.unknownError")));
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    userForm.setFieldsValue(store?.user ?? {})
    // settingForm 的 initialValues 已处理类型转换，这里只需处理动态加载的数据
    settingForm.setFieldsValue({
      ...(store?.setting ?? {}),
    })
    siteConfigForm.setFieldsValue(store?.siteConfig ?? {})
    // 从后端设置数据同步语言偏好
    if (store?.setting?.language && (store.setting.language === 'zh-CN' || store.setting.language === 'en-US')) {
      if (store.setting.language !== language) {
        const langName = store.setting.language === 'zh-CN' ? '中文' : 'English';
        message.info(t('admin.settings.msg.languageSynced', { lang: langName }));
        setLanguage(store.setting.language);
      }
    }
  }, [store, setLanguage])
  const handleUpdateUser = useCallback(
    async (values: any) => {
      try {
        await fetchUpdateUser({ ...values, id: store?.user?.id });
        message.success(t("admin.settings.msg.updateSuccess"));
      } catch (err) {
        message.warning(t("admin.settings.msg.updateFailed"));
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
        message.success(t("admin.settings.msg.updateSuccess"));
      } catch (err) {
        message.warning(t("admin.settings.msg.updateFailed"));
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
        message.success(t("admin.settings.msg.updateSuccess"));
      } catch (err) {
        message.warning(t("admin.settings.msg.updateFailed"));
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
            title: t("admin.settings.msg.importTokenWarning"),
            icon: <WarningOutlined />,
            content: t("admin.settings.msg.importTokenWarningContent"),
          });
        }

        message.success(t("admin.settings.msg.exportSuccess").replace("{filename}", filename));
      } else {
        message.error(t("admin.settings.msg.exportFailed"));
      }
    } catch (err) {
      message.error(t("admin.settings.msg.exportFailedDetail") + (err as any).message);
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
          message.error(t("admin.settings.msg.importFormatInvalid"));
          return;
        }
        setImportFile(file);
        setImportPreview(content);
        setImportModalVisible(true);
      } catch {
        message.error(t("admin.settings.msg.importJsonInvalid"));
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
          t("admin.settings.msg.importDetailCategory").replace("{count}", String(result.categories_imported)),
          t("admin.settings.msg.importDetailTool").replace("{count}", String(result.tools_imported)),
          t("admin.settings.msg.importDetailSearchEngine").replace("{count}", String(result.search_engines_imported)),
          t("admin.settings.msg.importDetailToken").replace("{count}", String(result.api_tokens_imported)).replace("{skipped}", String(result.api_tokens_skipped)),
          t("admin.settings.msg.importDetailSetting").replace("{count}", String(result.settings_updated)),
        ];
        if (result.errors && result.errors.length > 0) {
          detailLines.push('', '⚠️ ' + t("admin.settings.msg.importPartialError"));
          result.errors.forEach((err: string) => detailLines.push(`  - ${err}`));
        }
        Modal.success({
          title: result.success ? t("admin.settings.msg.importSuccess") : t("admin.settings.msg.importSuccessWithError"),
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
        message.error(t("admin.settings.msg.importFailedDetail") + (res?.data?.errorMessage || t("admin.settings.msg.unknownError")));
      }
    } catch (err) {
      message.error(t("admin.settings.msg.importFailedDetail") + (err as any).message);
    } finally {
      setImporting(false);
    }
  }, [importPreview, reload]);

  // 构建预览表格列
  const previewColumns = [
    { title: t("admin.settings.importPreview.module"), dataIndex: "module", key: "module" },
    { title: t("admin.settings.importPreview.count"), dataIndex: "count", key: "count" },
  ];

  const previewData = importPreview ? [
    { key: "1", module: t("admin.settings.importPreview.tools"), count: importPreview.tools?.length || 0 },
    { key: "2", module: t("admin.settings.importPreview.categories"), count: importPreview.categories?.length || 0 },
    { key: "3", module: t("admin.settings.importPreview.searchEngines"), count: importPreview.search_engines?.length || 0 },
    { key: "4", module: "API Token", count: importPreview.api_tokens?.length || 0 },
    { key: "5", module: t("admin.settings.importPreview.settings"), count: Object.keys(importPreview.settings || {}).length },
  ] : [];

  // 样本数据
  const sampleColumns = [
    { title: t("admin.tools.table.name"), dataIndex: "name", key: "name", ellipsis: true },
    { title: t("admin.settings.importPreview.value"), dataIndex: "value", key: "value", ellipsis: true },
  ];

  return (
    <div className="overflow-auto">
      {/* 语言切换 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button size="small" type={language === 'zh-CN' ? 'primary' : 'default'} onClick={async () => { setLanguage('zh-CN'); try { await fetchUpdateLanguage('zh-CN'); } catch (e) {} }}>中文</Button>
          <Button size="small" type={language === 'en-US' ? 'primary' : 'default'} onClick={async () => { setLanguage('en-US'); try { await fetchUpdateLanguage('en-US'); } catch (e) {} }}>English</Button>
        </Space>
      </div>

      {/* 导入导出操作区 */}
      <Card
        title={
          <span>
            <CloudDownloadOutlined style={{ marginRight: 8 }} />
            {t("admin.settings.importExport.title")}
          </span>
        }
        style={{ marginBottom: 32 }}
        extra={
          <span style={{ fontSize: 12, color: '#999' }}>
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            {t("admin.settings.importExport.description")}
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
            {t("admin.settings.btn.export")}
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
              {t("admin.settings.btn.import")}
            </Button>
          </Upload>
        </div>
      </Card>

      {/* 导入确认 Modal */}
      <Modal
        title={t("admin.settings.modal.importTitle")}
        open={importModalVisible}
        onOk={handleImportConfirm}
        onCancel={() => {
          setImportModalVisible(false);
          setImportPreview(null);
          setImportFile(null);
        }}
        confirmLoading={importing}
        okText={t("admin.settings.modal.importConfirm")}
        cancelText={t("admin.settings.modal.importCancel")}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          {t("admin.settings.modal.importDescription")}
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
            <strong>{t("admin.settings.modal.importTokenAlert")}</strong>{t("admin.settings.modal.importTokenAlertContent")}
          </div>
        )}
        {/* 样本预览 */}
        {importPreview?.tools?.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>{t("admin.settings.importPreview.toolSample")}</summary>
            <Table
              dataSource={importPreview.tools.slice(0, 5).map((t: any, i: number) => ({ key: i, name: t.name, value: t.url }))}
              columns={sampleColumns}
              pagination={false}
              size="small"
            />
          </details>
        )}
      </Modal>

      <Card title={t("admin.settings.user.title")} style={{ marginBottom: 32 }}>
        <Spin spinning={loading}>
          <Form onFinish={handleUpdateUser} initialValues={store?.user ?? {}} form={userForm}>
            <Form.Item
              label={t("admin.settings.user.username")}
              name="name"
              required
              labelCol={{ span: 4 }}
            >
              <Input placeholder={t("admin.settings.user.usernamePlaceholder")}></Input>
            </Form.Item>
            <Form.Item
              label={t("admin.settings.user.password")}
              name="password"
              required
              labelCol={{ span: 4 }}
            >
              <Input.Password placeholder={t("admin.settings.user.passwordPlaceholder")} ></Input.Password>
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                {t("admin.settings.btn.submit")}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
      <Card title={t("admin.settings.site.title")}>
        <Spin spinning={loading}>
          <Form
            onFinish={handleUpdateWebSite}
            initialValues={{
              ...(store?.setting ?? {}),
            }}
            labelCol={{ span: 6 }}
            form={settingForm}
          >
            <Form.Item label={t("admin.settings.site.hideAdmin")} name="hideAdmin" tooltip={t("admin.settings.site.hideAdminTooltip")} >
              <Switch defaultChecked={Boolean(store?.setting?.hideAdmin)} />
            </Form.Item>
            <Form.Item label={t("admin.settings.site.hideGithub")} name="hideGithub" tooltip={t("admin.settings.site.hideGithubTooltip")} >
              <Switch defaultChecked={Boolean(store?.setting?.hideGithub)} />
            </Form.Item>
            <Form.Item label={t("admin.settings.site.hideJumpTarget")} name="hideToggleJumpTarget" tooltip={t("admin.settings.site.hideJumpTargetTooltip")} >
              <Switch defaultChecked={Boolean(store?.setting?.hideToggleJumpTarget)} />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                {t("admin.settings.btn.submit")}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
      <Card title={t("admin.settings.config.title")} style={{ marginTop: 32 }}>
        <Spin spinning={loading}>
          <Form
            onFinish={handleUpdateSiteConfig}
            initialValues={store?.siteConfig ?? {}}
            labelCol={{ span: 6 }}
            form={siteConfigForm}
          >
            <Form.Item
              label={t("admin.settings.config.faviconApiTemplate")}
              name="faviconApiTemplate"
              tooltip={t("admin.settings.config.faviconApiTemplateTooltip")}
              rules={[
                { required: true, message: t("admin.settings.config.faviconApiTemplateRequired") },
                {
                  validator: (_, value) => {
                    if (!value || !value.includes("{domain}")) {
                      return Promise.reject(new Error(t("admin.settings.config.faviconApiTemplateValidator")));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input placeholder={t("admin.settings.config.faviconApiTemplatePlaceholder")} />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                {t("admin.settings.btn.submit")}
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
            {t("admin.settings.backup.title")}
          </span>
        }
        style={{ marginTop: 32 }}
        extra={
          <span style={{ fontSize: 12, color: '#999' }}>
            {t("admin.settings.backup.description")}
          </span>
        }
      >
        {/* 备份状态显示 */}
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 8, background: isDark ? '#222' : '#fafafa', border: isDark ? '1px solid #333' : '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.6)' : undefined }}>{t("admin.settings.backup.statusLabel")}</span>
            {backupStatus.lastBackupTime ? (
              <>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : undefined }}>{t("admin.settings.backup.statusTime").replace("{time}", backupStatus.lastBackupTime || "")}</span>
                <span style={{ color: backupStatus.lastBackupStatus === '成功' ? '#52c41a' : '#ff4d4f' }}>
                  {t("admin.settings.backup.statusValue").replace("{status}", backupStatus.lastBackupStatus || t("admin.settings.backup.statusUnknown"))}
                </span>
              </>
            ) : (
              <span style={{ color: '#999' }}>{t("admin.settings.backup.statusNone")}</span>
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
              {t("admin.settings.backup.btnRefresh")}
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
              label={t("admin.settings.backup.webdavUrl")}
              name="webdavUrl"
              required
              rules={[{ required: true, message: t("admin.settings.backup.webdavUrlRequired") }]}
              tooltip={t("admin.settings.backup.webdavUrlTooltip")}
            >
              <Input placeholder={t("admin.settings.backup.webdavUrlPlaceholder")} />
            </Form.Item>

            <Form.Item
              label={t("admin.settings.backup.username")}
              name="username"
              required
              rules={[{ required: true, message: t("admin.settings.backup.usernameRequired") }]}
            >
              <Input placeholder={t("admin.settings.backup.usernamePlaceholder")} />
            </Form.Item>

            <Form.Item
              label={t("admin.settings.backup.password")}
              name="password"
              required
              rules={[{ required: true, message: t("admin.settings.backup.passwordRequired") }]}
              tooltip={t("admin.settings.backup.passwordTooltip")}
            >
              <Input.Password placeholder={t("admin.settings.backup.passwordPlaceholder")} />
            </Form.Item>

            <Form.Item
              label={t("admin.settings.backup.backupDir")}
              name="backupDir"
              tooltip={t("admin.settings.backup.backupDirTooltip")}
            >
              <Input placeholder="/" />
            </Form.Item>

            <Form.Item
              label={t("admin.settings.backup.enabled")}
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label={t("admin.settings.backup.scheduleType")}
              name="scheduleType"
              required
            >
              <Select
                onChange={(value) => setScheduleType(value)}
                options={[
                  { label: t("admin.settings.backup.scheduleType.daily"), value: "daily" },
                  { label: t("admin.settings.backup.scheduleType.weekly"), value: "weekly" },
                  { label: t("admin.settings.backup.scheduleType.monthly"), value: "monthly" },
                  { label: t("admin.settings.backup.scheduleType.cron"), value: "cron" },
                ]}
              />
            </Form.Item>

            {scheduleType !== "cron" && (
              <Form.Item
                label={t("admin.settings.backup.scheduleTime")}
                name="scheduleTime"
                required
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} popupClassName={isDark ? "nav-dark-picker-dropdown" : ""} />
              </Form.Item>
            )}

            {scheduleType === "cron" && (
              <Form.Item
                label={t("admin.settings.backup.cronExpr")}
                name="cronExpr"
                required
                rules={[{ required: true, message: t("admin.settings.backup.cronExprRequired") }]}
                tooltip={t("admin.settings.backup.cronExprTooltip")}
              >
                <Input placeholder="0 2 * * *" />
              </Form.Item>
            )}

            <Form.Item
              label={t("admin.settings.backup.retentionType")}
              name="retentionType"
              required
            >
              <Select
                onChange={(value) => setRetentionType(value)}
                options={[
                  { label: t("admin.settings.backup.retentionType.unlimited"), value: "unlimited" },
                  { label: t("admin.settings.backup.retentionType.days"), value: "days" },
                  { label: t("admin.settings.backup.retentionType.weeks"), value: "weeks" },
                  { label: t("admin.settings.backup.retentionType.months"), value: "months" },
                ]}
              />
            </Form.Item>

            {retentionType !== "unlimited" && (
              <Form.Item
                label={t("admin.settings.backup.retentionValue")}
                name="retentionValue"
                required
                rules={[{ required: true, message: t("admin.settings.backup.retentionValueRequired") }]}
              >
                <InputNumber min={1} max={999} placeholder={t("admin.settings.backup.retentionValuePlaceholder")} style={{ width: '100%' }} addonAfter={
                  retentionType === "days" ? t("admin.settings.backup.retentionUnit.days") : retentionType === "weeks" ? t("admin.settings.backup.retentionUnit.weeks") : t("admin.settings.backup.retentionUnit.months")
                } />
              </Form.Item>
            )}

            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  onClick={handleTestConnection}
                  loading={backupTesting}
                >
                  {t("admin.settings.backup.btnTestConnection")}
                </Button>
                <Button
                  type="default"
                  onClick={handleBackupNow}
                  loading={backupNowLoading}
                >
                  {t("admin.settings.backup.btnBackupNow")}
                </Button>
                <Button type="primary" htmlType="submit">
                  {t("admin.settings.backup.btnSave")}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* 备份文件列表 */}
      <Card
        title={
          <span>
            <RollbackOutlined style={{ marginRight: 8 }} />
            {t("admin.settings.backup.files.title")}
          </span>
        }
        style={{ marginTop: 32 }}
        extra={
          <Button
            size="small"
            icon={<SyncOutlined />}
            onClick={loadBackupFiles}
            loading={backupFilesLoading}
          >
            {t("admin.settings.backup.files.btnRefresh")}
          </Button>
        }
      >
        <div style={{ marginBottom: 16, color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }}>
          {t("admin.settings.backup.files.description")}
        </div>
        <Table
          dataSource={backupFiles}
          loading={backupFilesLoading}
          rowKey="name"
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
            showTotal: (total) => t("admin.settings.backup.files.tableTotal").replace("{total}", String(total)),
          }}
          columns={[
            {
              title: t("admin.settings.backup.files.column.name"),
              dataIndex: 'name',
              key: 'name',
              ellipsis: true,
            },
            {
              title: t("admin.settings.backup.files.column.time"),
              dataIndex: 'modTime',
              key: 'modTime',
              width: 200,
            },
            {
              title: t("admin.settings.backup.files.column.size"),
              dataIndex: 'size',
              key: 'size',
              width: 120,
              render: (size: number) => {
                if (size > 1024 * 1024) {
                  return `${(size / 1024 / 1024).toFixed(2)} MB`;
                } else if (size > 1024) {
                  return `${(size / 1024).toFixed(1)} KB`;
                }
                return `${size} B`;
              },
            },
            {
              title: t("admin.settings.backup.files.column.action"),
              key: 'action',
              width: 120,
              render: (_: any, record: { name: string }) => (
                <Button
                  type="link"
                  danger
                  icon={<RollbackOutlined />}
                  loading={restoreLoading === record.name}
                  disabled={restoreLoading !== null}
                  onClick={() => handleRestoreBackup(record.name)}
                >
                  {t("admin.settings.backup.files.btnRestore")}
                </Button>
              ),
            },
          ]}
          locale={{
            emptyText: backupFilesLoading ? t("admin.settings.backup.files.emptyLoading") : t("admin.settings.backup.files.emptyText"),
          }}
        />
      </Card>

      {/* 部署版本信息 — 紧凑 footer */}
      <div style={{
        marginTop: 24,
        padding: '12px 0',
        textAlign: 'center',
        color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb',
        fontSize: 13,
      }}>
        VanNav {deploymentVersion}
      </div>
    </div>
  );
};