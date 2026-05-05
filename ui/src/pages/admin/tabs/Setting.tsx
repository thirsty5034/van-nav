import { Button, Card, Form, Input, message, Modal, Select, Spin, Switch, Table, Upload } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchUpdateSetting, fetchUpdateUser, fetchUpdateSiteConfig, fetchExportConfig, fetchImportConfig, fetchGetDeploymentVersion } from "../../../utils/api";
import { useData } from "../hooks/useData";
import { CloudDownloadOutlined, CloudUploadOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
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
  useEffect(() => {
    userForm.setFieldsValue(store?.user ?? {})
    settingForm.setFieldsValue(store?.setting ?? {})
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