import {
  Button,
  Card,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
  Tooltip,
  Switch,
  Tag,
  Statistic,
  Row as AntRow,
  Col,
} from "antd";
import { HolderOutlined, DragOutlined, QuestionCircleOutlined, CloudDownloadOutlined, HeartOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import React, { useCallback, useState, useEffect, useContext, useMemo } from "react";
import { getFilter, getOptions, mutiSearch } from "../../../utils/admin";
import { getLogoUrl, handleLogoImgError, fileToLogoDataURI } from "../../../utils/check";
import {
  fetchAddTool,
  fetchDeleteTool,
  fetchExportTools,
  fetchImportTools,
  fetchUpdateTool,
  fetchUpdateToolsSort,
  fetchGetFaviconFromApi,
  fetchPageInfo,
  fetchMaxSort,
  fetchUpdateToolDesc,
  fetchCheckLinks,
  fetchOrganizeDeadLinks,
} from "../../../utils/api";
import { useData } from "../hooks/useData";
import { useTranslation } from "../../../i18n";
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DataType {
  id: number;
  name: string;
  sort: number;
  [key: string]: any;
}

interface RowContextProps {
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  listeners?: SyntheticListenerMap;
}

const RowContext = React.createContext<RowContextProps>({});

const DragHandle: React.FC = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);
  return (
    <div
      className="drag-handle"
      ref={setActivatorNodeRef}
      {...listeners}
      style={{
        cursor: 'move',
        padding: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <DragOutlined style={{ color: '#999' }} />
    </div>
  );
};

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': React.Key;
}

const Row = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key']?.toString() || '',
  });

  // 暗色模式下，只要存在 transform（拖拽中或动画过渡中），就显式设置背景色
  // 防止浏览器合成层（compositing layer）导致 <td> 背景色短暂丢失
  const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
    ...(isDarkMode ? { backgroundColor: '#1a1a1a' } : {}),
  };

  const contextValue = useMemo<RowContextProps>(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  );

  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes}>
        {children}
      </tr>
    </RowContext.Provider>
  );
};

export interface ToolsProps { }
export const Tools: React.FC<ToolsProps> = (props) => {
  const { t } = useTranslation();
  const { store, loading, reload, setStoreData } = useData();
  const [showEdit, setShowEdit] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [addForm] = Form.useForm();
  const [searchString, setSearchString] = useState("");
  const [catelogName, setCatelogName] = useState("");
  const [updateForm] = Form.useForm();
  const [selectedRows, setSelectRows] = useState<any>([]);
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [gettingFavicon, setGettingFavicon] = useState(false);
  const [gettingDesc, setGettingDesc] = useState(false);

  // ==================== {t("admin.tools.health.title")}状态 ====================
  interface LinkCheckResultItem {
    id: number;
    url: string;
    title: string;
    status_code: number;
    alive: boolean;
    error?: string;
  }
  const [checkResults, setCheckResults] = useState<LinkCheckResultItem[]>([]);
  const [checkSummary, setCheckSummary] = useState<{ total: number; alive: number; dead: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [organizing, setOrganizing] = useState(false);

  // 获取 favicon 的函数
  const handleGetFavicon = async (form: any, formInstance: 'add' | 'update') => {
    const url = form.getFieldValue('url');
    if (!url) {
      message.warning(t("admin.tools.msg.fillUrlFirst"));
      return;
    }
    setGettingFavicon(true);
    try {
      const res = await fetchGetFaviconFromApi(url);
      if (res.success && res.logoUrl) {
        form.setFieldsValue({ logo: res.logoUrl });
        message.success(t("admin.tools.msg.faviconSuccess"));
      } else {
        message.warning(res.errorMessage || t("admin.tools.msg.fetchFailed"));
      }
    } catch (err: any) {
      message.error(err.response?.data?.errorMessage || t("admin.tools.msg.faviconFailed"));
    } finally {
      setGettingFavicon(false);
    }
  };

  const applyLogoFile = async (form: any, file: File) => {
    try {
      const dataUri = await fileToLogoDataURI(file);
      form.setFieldsValue({ logo: dataUri });
    } catch (e: any) {
      if (e?.message === "too-large") message.error(t("admin.tools.msg.logoTooLarge"));
      else if (e?.message === "bad-type") message.error(t("admin.tools.msg.logoBadType"));
      else message.error(t("admin.tools.msg.logoReadFailed"));
    }
    return false;
  };

  // 获取描述的函数
  const handleGetDesc = async (form: any) => {
    const url = form.getFieldValue('url');
    if (!url) {
      message.warning(t("admin.tools.msg.fillUrlFirst"));
      return;
    }
    setGettingDesc(true);
    try {
      const res = await fetchPageInfo(url);
      if (res.success) {
        const desc = res.data.description || res.data.title;
        if (desc) {
          form.setFieldsValue({ desc });
          message.success(t("admin.tools.msg.descSuccess"));
        } else {
          message.warning(t("admin.tools.msg.descNotFound"));
        }
      } else {
        message.warning(res.errorMessage || t("admin.tools.msg.descFailed"));
      }
    } catch (err: any) {
      message.error(err.response?.data?.errorMessage || t("admin.tools.msg.descFailed"));
    } finally {
      setGettingDesc(false);
    }
  };

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await fetchDeleteTool(id);
        message.success(t("admin.tools.msg.deleteSuccess"));
      } catch (err) {
        message.warning(t("admin.tools.msg.deleteFailed"));
      } finally {
        reload();
      }
    },
    [reload]
  );
  const handleToggleHide = useCallback(async (record: any, hide: boolean) => {
    try {
      await fetchUpdateTool({ ...record, hide });
      message.success(t("admin.tools.msg.updateSuccess"));
      reload();
    } catch (error) {
      message.error(t("admin.tools.msg.updateFailed"));
    }
  }, [reload]);
  const handleUpdate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchUpdateTool(record);
        message.success(t("admin.tools.msg.updateSuccessLogo"), 3);
        setTimeout(() => {
          reload();
        }, 3000);
      } catch (err) {
        message.warning(t("admin.tools.msg.updateFailed"));
      } finally {
        setRequestLoading(false);
        setShowEdit(false);
        reload();
      }
    },
    [reload, setShowEdit, setRequestLoading]
  );
  const handleCreate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchAddTool(record);
        message.success(t("admin.tools.msg.addSuccessLogo"), 3);
        setTimeout(() => {
          reload();
        }, 3000);
      } catch (err) {
        message.warning(t("admin.tools.msg.addFailed"));
      } finally {
        setRequestLoading(false);
        setShowAddModel(false);
        reload();
      }
    },
    [reload, setShowAddModel, setRequestLoading]
  );
  const handleImport = useCallback(
    async (data: any) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        message.warning(t("admin.tools.msg.importEmpty"));
        return;
      }
      const loadingMsg = message.loading(t("admin.tools.msg.importing", { count: data.length }), 0);
      try {
        const res = await fetchImportTools(data);
        loadingMsg();
        if (res.success) {
          const imported = res.tools_imported ?? 0;
          const skipped = res.tools_skipped ?? 0;
          let msg = t("admin.tools.msg.importComplete", { imported });
          if (skipped > 0) msg += t("admin.tools.msg.importSkipped", { skipped });
          message.success(msg + t("admin.tools.msg.refreshingIcon"));
        } else {
          message.warning(res.errorMessage || t("admin.tools.msg.importFailed"));
        }
      } catch (err) {
        loadingMsg();
        message.warning(t("admin.tools.msg.importFailed"));
      } finally {
        reload();
      }
    },
    [reload]
  );
  const handleBulkDelete = useCallback(async () => {
    try {
      for (const each of selectedRows) {
        try {
          await fetchDeleteTool(each.id);
        } catch (err) { }
      }
      message.success(t("admin.tools.msg.deleteSuccess"));
    } catch (err) {
      message.success(t("admin.tools.msg.deleteFailed"));
    } finally {
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkResetLogo = useCallback(async () => {
    try {
      for (const each of selectedRows) {
        try {
          await fetchUpdateTool({ ...each, logo: "" });
        } catch (err) { }
      }
      message.success(t("admin.tools.msg.resetSuccess"));
    } catch (err) {
      message.success(t("admin.tools.msg.resetFailed"));
    } finally {
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkCacheLogo = useCallback(async () => {
    try {
      for (const each of selectedRows) {
        try {
          await fetchUpdateTool(each);
        } catch (err) { }
      }
      message.success(t("admin.tools.msg.resetSuccess"));
    } catch (err) {
      message.success(t("admin.tools.msg.resetFailed"));
    } finally {
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkUpdateLogoFromApi = useCallback(async () => {
    if (selectedRows.length === 0) return;
    let success = 0;
    let fail = 0;
    const hide = message.loading(t('admin.tools.msg.updatingLogo'), 0);
    try {
      for (const each of selectedRows) {
        try {
          const res = await fetchGetFaviconFromApi(each.url);
          if (res.success && res.logoUrl) {
            await fetchUpdateTool({ id: each.id, name: each.name, url: each.url, logo: res.logoUrl, catelog: each.catelog, desc: each.desc, sort: each.sort, hide: each.hide });
            success++;
          } else {
            fail++;
          }
        } catch (err) {
          fail++;
        }
      }
    } finally {
      hide();
      message.success(t("admin.tools.msg.updateLogoComplete", { success, fail }));
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkUpdateDesc = useCallback(async () => {
    if (selectedRows.length === 0) return;
    let success = 0;
    let fail = 0;
    const hide = message.loading(t('admin.tools.msg.fetchingDesc'), 0);
    try {
      for (const each of selectedRows) {
        try {
          // 先获取该工具的当前最新数据（防止前面其他操作已修改过 logo 等字段）
          const current = store?.tools?.find((t: any) => t.id === each.id) || each;
          const res = await fetchPageInfo(each.url);
          if (res.success) {
            const desc = res.data.description || res.data.title;
            if (desc) {
              // 只更新描述，不修改其他字段
              await fetchUpdateToolDesc(each.id, desc);
              success++;
            } else {
              fail++;
            }
          } else {
            fail++;
          }
        } catch (err) {
          fail++;
        }
      }
    } finally {
      hide();
      message.success(t("admin.tools.msg.updateLogoComplete", { success, fail }));
      reload();
    }
  }, [reload, selectedRows, store?.tools]);
  const handleExport = useCallback(async () => {
    const data = await fetchExportTools();
    const jsr = JSON.stringify(data);
    const blob = new Blob([jsr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tools.json";
    document.documentElement.appendChild(a);
    a.click();
    document.documentElement.removeChild(a);
    message.success(t("admin.tools.msg.exportSuccess"));
    reload();
  }, [reload]);

  // ==================== {t("admin.tools.health.title")} ====================
  const handleCheckLinks = useCallback(async () => {
    setChecking(true);
    setCheckResults([]);
    setCheckSummary(null);
    try {
      const res = await fetchCheckLinks();
      if (res.success && res.data) {
        setCheckResults(res.data.results || []);
        setCheckSummary({
          total: res.data.total,
          alive: res.data.alive,
          dead: res.data.dead,
        });
        // 检测完成后刷新工具列表（因为 is_alive 字段已更新）
        reload();
        message.success(t("admin.tools.health.complete", { alive: res.data.alive, dead: res.data.dead }));
      } else {
        message.error(res.errorMessage || t("admin.tools.msg.checkFailed"));
      }
    } catch (err: any) {
      message.error(t("admin.tools.health.checkRequestFailed") + " " + (err.message || t("admin.tools.msg.networkError")));
    } finally {
      setChecking(false);
    }
  }, [reload]);

  const handleOrganizeDeadLinks = useCallback(async () => {
    setOrganizing(true);
    try {
      const res = await fetchOrganizeDeadLinks();
      if (res.success) {
        // 直接用 POST 响应中的数据更新 store，不依赖 GET reload（避免 SW 缓存）
        if (res.data?.tools) {
          setStoreData(res.data);
        } else {
          reload();
        }
        message.success(res.message || t("admin.tools.health.organized", { count: res.data?.affected || 0 }));
      } else {
        message.error(res.errorMessage || t("admin.tools.msg.organizeFailed"));
      }
    } catch (err: any) {
      message.error(t("admin.tools.health.organizeRequestFailed") + " " + (err.message || t("admin.tools.msg.networkError")));
    } finally {
      setOrganizing(false);
    }
  }, [reload]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setDataSource((previous) => {
        const activeIndex = previous.findIndex((i) => i.id.toString() === active.id);
        const overIndex = previous.findIndex((i) => i.id.toString() === over?.id);
        const newData = arrayMove(previous, activeIndex, overIndex);
        const updates = newData.map((item, index) => ({
          id: item.id,
          sort: index + 1,
        }));
        fetchUpdateToolsSort(updates).then(() => {
          message.success(t("admin.tools.msg.sortUpdated"));
          reload();
        }).catch(() => {
          message.error(t("admin.tools.msg.sortFailed"));
        });
        return newData;
      });
    }
  };

  // 在 useEffect 中初始化 dataSource
  useEffect(() => {
    if (Array.isArray(store?.tools)) {
      const filteredData = store.tools
        .filter((item: any) => {
          let show = false;
          if (searchString === "") {
            show = true;
          } else {
            show = mutiSearch(item.name, searchString) || mutiSearch(item.desc, searchString) || mutiSearch(item.url, searchString);
          }
          if (!catelogName || catelogName === "") {
            show = show && true;
          } else {
            show = show && mutiSearch(item.catelog, catelogName);
          }
          return show;
        })
        .sort((a: DataType, b: DataType) => a.sort - b.sort);
      setDataSource(filteredData);
    }
  }, [store?.tools, searchString, catelogName]);

  return (
    <>
    <Card
      title={
        <Space>
          <span>{t("admin.tools.title")}</span>
          <span style={{ color: '#999', fontSize: 13 }}>{t("admin.tools.total", { count: store?.tools?.length ?? 0 })}</span>
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.tools.confirm.deleteBulk")}
              onConfirm={() => {
                handleBulkDelete();
              }}
            >
              <Button type="link">{t("admin.tools.btn.delete")}</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.tools.confirm.resetIcon")}
              onConfirm={() => {
                handleBulkResetLogo();
              }}
            >
              <Button type="link">{t("admin.tools.batch.resetDefaultIcon")}</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.tools.confirm.recacheIcon")}
              onConfirm={() => {
                handleBulkCacheLogo();
              }}
            >
              <Button type="link">{t("admin.tools.batch.resetCachedIcon")}</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.tools.form.logoApiHint")}
              onConfirm={() => {
                handleBulkUpdateLogoFromApi();
              }}
            >
              <Button type="link">{t("admin.tools.batch.updateLogo")}</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title={t("admin.tools.form.autoDesc")}
              onConfirm={() => {
                handleBulkUpdateDesc();
              }}
            >
              <Button type="link">{t("admin.tools.batch.updateDesc")}</Button>
            </Popconfirm>
          )}
        </Space>
      }
      extra={
        <Space>
          <Select
            style={{ minWidth: 120 }}
            options={getOptions(store?.catelogs || [])}
            placeholder={t("admin.tools.filter.category")}
            allowClear
            // size="small"
            onClear={() => {
              setCatelogName("");
            }}
            onChange={(name: string) => {
              setCatelogName(name);
            }}
          />
          <Input.Search
            allowClear
            onSearch={(s: string) => {
              setSearchString(s.trim());
            }}
          />
          <Button
            type="primary"
            onClick={async () => {
              // 获取最大排序值并设置默认值
              try {
                const res = await fetchMaxSort();
                if (res.success) {
                  addForm.setFieldsValue({ sort: res.data.maxSort + 1 });
                }
              } catch (e) {
                // 忽略错误，使用默认值
              }
              setShowAddModel(true);
            }}
          >
            {t("admin.tools.btn.add")}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              reload();
            }}
          >
            {t("admin.tools.btn.refresh")}
          </Button>
          <Upload
            name="tools.json"
            maxCount={1}
            accept=".json"
            fileList={[]}
            beforeUpload={(file, fileList) => {
              const reader = new FileReader();
              reader.readAsText(file);
              reader.onload = (result) => {
                let tools = result?.target?.result;
                if (tools) {
                  handleImport(JSON.parse(tools as string));
                }
              };
              return false;
            }}
          >
            <Button type="primary">{t("admin.tools.btn.import")}</Button>
          </Upload>
          <Button
            type="primary"
            onClick={() => {
              handleExport();
            }}
          >
            {t("admin.tools.btn.export")}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext
            items={dataSource.map((i) => i.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <Table
              components={{
                body: {
                  row: Row,
                },
              }}
              rowKey="id"
              dataSource={dataSource}
              rowSelection={{
                type: "checkbox",
                onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
                  setSelectRows(selectedRows);
                },
              }}
              pagination={{
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                defaultPageSize: 10,
                showTotal: (total) => t("admin.tools.table.total", { total })
              }}
            >
              <Table.Column
                key="sort"
                align="center"
                width={50}
                title={t("admin.tools.table.sort")}
                render={() => <DragHandle />}
              />
              
              <Table.Column
                title={t("admin.tools.table.name")}
                dataIndex="name"
                width={120}
                render={(_, record: any) => {
                  return (
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center"
                    }}>
                      {" "}
                        <img
                          src={getLogoUrl(record.logo)}
                          alt={record.name}
                          width={32}
                          height={32}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                          onError={handleLogoImgError}
                        ></img>
                      <span style={{ marginLeft: 8 }}>{record.name}</span>
                    </div>
                  );
                }}
              />
              <Table.Column
                title={t("admin.tools.table.category")}
                dataIndex="catelog"
                width={60}
              />
              <Table.Column
                title={t("admin.tools.table.url")}
                dataIndex="url"
                width={150}
                render={(url) => (
                  <div style={{
                    wordBreak: 'break-all',
                    whiteSpace: 'normal'
                  }}>
                    {url}
                  </div>
                )}
              />
              {/* <Table.Column
                title={
                  <span>排序
                    <Tooltip title={t("admin.tools.form.sortHint")}>
                      <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                    </Tooltip>
                  </span>
                }
                dataIndex="sort"
                width={50}
              /> */}
              <Table.Column title={
                <span>{t("admin.tools.form.hide")}
                  <Tooltip title={t("admin.tools.form.hideHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                </span>
              } dataIndex={"hide"} width={60} render={(val: boolean, record: any) => {
                return <Switch checked={Boolean(val)} onChange={(checked) => handleToggleHide(record, checked)} />
              }} />
              <Table.Column
                title={t("admin.tools.table.status")}
                dataIndex="is_alive"
                width={70}
                align="center"
                render={(alive: boolean | null, record: any) => {
                  if (alive === false) {
                    return <Tag color="error">{t("admin.tools.status.dead")}</Tag>;
                  }
                  if (alive === true && record.last_checked) {
                    return <Tag color="success">{t("admin.tools.status.normal")}</Tag>;
                  }
                  return <Tag>{t("admin.tools.status.unchecked")}</Tag>;
                }}
              />
              <Table.Column
                title={t("admin.tools.table.action")}
                width={120}
                dataIndex="action"
                key="action"
                render={(_, record: any) => {
                  return (
                    <Space>
                      <Button
                        type="link"
                        onClick={() => {
                          updateForm.setFieldsValue(record);
                          setShowEdit(true);
                        }}
                      >
                        {t("admin.tools.btn.edit")}
                      </Button>
                      <Popconfirm
                        onConfirm={() => {
                          handleDelete(record.id);
                        }}
                        title={t("admin.tools.confirm.deleteSingle", { name: record.name })}
                      >
                        <Button type="link" danger>{t("admin.tools.btn.delete")}</Button>
                      </Popconfirm>
                    </Space>
                  );
                }}
              />
            </Table>
          </SortableContext>
        </DndContext>
      </Spin>
      {<Modal
        open={showAddModel}
        title={t("admin.tools.modal.add")}
        onCancel={() => {
          setShowAddModel(false);
          addForm.resetFields();
        }}
        afterClose={() => {
          addForm.resetFields(); // Modal完全关闭后再次重置表单
        }}
        destroyOnClose={true}
        onOk={async () => {
          try {
            const values = await addForm.validateFields();
            handleCreate(values);
          } catch (err) {
            // 验证失败，antd 会自动显示错误提示
          }
        }}
      >
        <Spin spinning={requestLoading}>
          <Form form={addForm}>
            <Form.Item
              name="name"
              required
              label={t("admin.tools.form.name")}
              rules={[{ required: true, message: t("admin.tools.form.nameRequired") }]}
              labelCol={{ span: 4 }}
            >
              <Input placeholder={t("admin.tools.form.name")} />
            </Form.Item>
            <Form.Item
              name="url"
              rules={[
                { required: true, message: t("admin.tools.form.urlRequired") },
                {
                  pattern: /^(https?:\/\/)/,
                  message: t("admin.tools.form.urlFormat")
                }
              ]}
              required
              label={t("admin.tools.form.url")}
              labelCol={{ span: 4 }}
            >
              <Input placeholder={t("admin.tools.form.urlPlaceholder")} />
            </Form.Item>
            <Form.Item name="logo" label={t("admin.tools.form.logoUrl")} labelCol={{ span: 4 }}>
              <Input 
                placeholder={t("admin.tools.form.logoPlaceholder")}
                addonAfter={
                  <Tooltip title={t("admin.tools.form.autoFavicon")}>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CloudDownloadOutlined />} 
                      loading={gettingFavicon}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGetFavicon(addForm, 'add');
                      }}
                      style={{ padding: 0 }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
            <Form.Item label={t("admin.tools.form.logoUpload")} labelCol={{ span: 4 }}>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/x-icon,.png,.jpg,.jpeg,.webp,.ico"
                showUploadList={false}
                maxCount={1}
                beforeUpload={(file) => applyLogoFile(addForm, file)}
              >
                <Button icon={<UploadOutlined />}>{t("admin.tools.form.logoUpload")}</Button>
              </Upload>
              <div style={{ color: "rgba(0,0,0,0.45)", marginTop: 4 }}>
                {t("admin.tools.form.logoUploadHint")}
              </div>
            </Form.Item>
            <Form.Item
              name="catelog"
              required
              label={t("admin.tools.form.category")}
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: t("admin.tools.form.categoryRequired") }]}
            >
              <Select
                options={getOptions(store?.catelogs || [])}
                placeholder={t("admin.tools.form.categoryRequired")}
              />
            </Form.Item>
            <Form.Item
              name="desc"
              label={t("admin.tools.form.desc")}
              labelCol={{ span: 4 }}
            >
              <Input.TextArea
                rows={2}
                placeholder={t("admin.tools.form.desc")}
              />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 4, span: 20 }}>
              <Button
                type="link"
                icon={<CloudDownloadOutlined />}
                loading={gettingDesc}
                onClick={(e) => {
                  e.preventDefault();
                  handleGetDesc(addForm);
                }}
                style={{ padding: 0, fontSize: 13 }}
              >
                {t("admin.tools.form.autoDesc")}
              </Button>
            </Form.Item>
            <Form.Item
              rules={[{ required: true, message: t("admin.tools.form.sortRequired") }]}
              name="sort"
              required
              label={
                <span>
                  <Tooltip title={t("admin.tools.form.sortHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  {t("admin.tools.form.sort")}
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <InputNumber placeholder={t("admin.tools.form.sort")} />
            </Form.Item>
            <Form.Item
              name="hide"
              initialValue={false}
              label={
                <span>
                  <Tooltip title={t("admin.tools.form.hideHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  {t("admin.tools.form.hide")}
                </span>
              }
              labelCol={{ span: 4 }}>
              <Switch checkedChildren={t("admin.common.switch.on")} unCheckedChildren={t("admin.common.switch.off")} />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>}
      {<Modal
        open={showEdit}
        title={t("admin.tools.modal.edit")}
        destroyOnClose
        onCancel={() => {
          setShowEdit(false);
        }}
        onOk={async () => {
          try {
            const values = await updateForm.validateFields();
            handleUpdate(values);
          } catch (err) {
            // 验证失败，antd 会自动显示错误提示
          }
        }}
      >
        <Spin spinning={requestLoading}>
          <Form form={updateForm}>
            <Form.Item name="id" label={t("admin.tools.form.id")} labelCol={{ span: 4 }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="name" required label={t("admin.tools.form.name")} labelCol={{ span: 4 }}
              rules={[{ required: true, message: t("admin.tools.form.nameRequired") }]}
            >
              <Input placeholder={t("admin.tools.form.name")} />
            </Form.Item>
            <Form.Item name="url" required label={t("admin.tools.form.url")} labelCol={{ span: 4 }}
              rules={[
                { required: true, message: t("admin.tools.form.urlRequired") },
                {
                  pattern: /^(https?:\/\/)/,
                  message: t("admin.tools.form.urlFormat")
                }
              ]}
            >
              <Input placeholder={t("admin.tools.form.urlPlaceholder")} />
            </Form.Item>
            <Form.Item name="logo" label={t("admin.tools.form.logoUrl")} labelCol={{ span: 4 }}>
              <Input 
                placeholder={t("admin.tools.form.logoPlaceholder")}
                addonAfter={
                  <Tooltip title={t("admin.tools.form.autoFavicon")}>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CloudDownloadOutlined />} 
                      loading={gettingFavicon}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGetFavicon(updateForm, 'update');
                      }}
                      style={{ padding: 0 }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
            <Form.Item label={t("admin.tools.form.logoUpload")} labelCol={{ span: 4 }}>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/x-icon,.png,.jpg,.jpeg,.webp,.ico"
                showUploadList={false}
                maxCount={1}
                beforeUpload={(file) => applyLogoFile(updateForm, file)}
              >
                <Button icon={<UploadOutlined />}>{t("admin.tools.form.logoUpload")}</Button>
              </Upload>
              <div style={{ color: "rgba(0,0,0,0.45)", marginTop: 4 }}>
                {t("admin.tools.form.logoUploadHint")}
              </div>
            </Form.Item>
            <Form.Item
              name="catelog"
              required
              label={t("admin.tools.form.category")}
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: t("admin.tools.form.categoryRequired") }]}
            >
              <Select
                options={getOptions(store?.catelogs || [])}
                placeholder={t("admin.tools.form.categoryPlaceholder")}
              />
            </Form.Item>
            <Form.Item name="desc" label={t("admin.tools.form.desc")} labelCol={{ span: 4 }}>
              <Input.TextArea
                rows={2}
                placeholder={t("admin.tools.form.desc")}
              />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 4, span: 20 }}>
              <Button
                type="link"
                icon={<CloudDownloadOutlined />}
                loading={gettingDesc}
                onClick={(e) => {
                  e.preventDefault();
                  handleGetDesc(updateForm);
                }}
                style={{ padding: 0, fontSize: 13 }}
              >
                {t("admin.tools.form.autoDesc")}
              </Button>
            </Form.Item>

            <Form.Item
              name="sort"
              required
              label={
                <span>
                  <Tooltip title={t("admin.tools.form.sortHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  {t("admin.tools.form.sort")}
                </span>
              }
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: t("admin.tools.form.sortRequired") }]}
            >
              <InputNumber placeholder={t("admin.tools.form.sort")} defaultValue={1} />
            </Form.Item>

            <Form.Item
              name="hide"
              required
              label={
                <span>
                  <Tooltip title={t("admin.tools.form.hideHint")}>
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  {t("admin.tools.form.hide")}
                </span>
              }
              labelCol={{ span: 4 }}>
              <Switch checkedChildren={t("admin.common.switch.on")} unCheckedChildren={t("admin.common.switch.off")} />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>}
    </Card>

    {/* ==================== {t("admin.tools.health.title")} ==================== */}
    <Card
      title={
        <Space>
          <HeartOutlined />
          <span>{t("admin.tools.health.title")}</span>
        </Space>
      }
      style={{ marginTop: 16 }}
      extra={
        <Space>
          <Button
            type="primary"
            loading={checking}
            onClick={handleCheckLinks}
          >
            {checking ? t("admin.tools.health.checking") : t("admin.tools.health.startCheck")}
          </Button>
          {checkSummary && checkSummary.dead > 0 && (
            <Popconfirm
              title={t("admin.tools.health.confirmOrganize", { count: checkSummary.dead })}
              onConfirm={handleOrganizeDeadLinks}
            >
              <Button loading={organizing}>
                {t("admin.tools.health.organizeDeadLinks")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      {checkSummary && (
        <AntRow gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Statistic
              title={t("admin.tools.total.label")}
              value={checkSummary.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={t("admin.tools.status.normal")}
              value={checkSummary.alive}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={t("admin.tools.status.dead")}
              value={checkSummary.dead}
              valueStyle={{ color: checkSummary.dead > 0 ? '#cf1322' : undefined }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </AntRow>
      )}

      {checkResults.length > 0 && (
        <Table
          dataSource={checkResults}
          rowKey="id"
          size="small"
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
            showTotal: (total) => t("admin.tools.table.total", { total }),
          }}
        >
          <Table.Column
            title={t("admin.tools.table.name")}
            dataIndex="title"
            width={120}
          />
          <Table.Column
            title={t("admin.tools.table.url")}
            dataIndex="url"
            width={200}
            render={(url: string) => (
              <div style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>{url}</div>
            )}
          />
          <Table.Column
            title={t("admin.tools.health.table.statusCode")}
            dataIndex="status_code"
            width={80}
            align="center"
            render={(code: number) => code || '-'}
          />
          <Table.Column
            title={t("admin.tools.table.status")}
            dataIndex="alive"
            width={80}
            align="center"
            render={(alive: boolean, record: LinkCheckResultItem) => (
              alive ? (
                <Tag color="success">{t("admin.tools.health.alive")}</Tag>
              ) : (
                <Tooltip title={record.error || t('admin.tools.health.unreachable')}>
                  <Tag color="error">{t("admin.tools.health.dead")}</Tag>
                </Tooltip>
              )
            )}
          />
          <Table.Column
            title={t("admin.tools.msg.errorInfo")}
            dataIndex="error"
            width={150}
            render={(err: string) => err || '-'}
          />
        </Table>
      )}

      {!checkSummary && !checking && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          {t("admin.tools.health.hint")}
        </div>
      )}

      {checking && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip={t("admin.tools.health.checkingTip")} />
        </div>
      )}
    </Card>
    </>
  );
};
