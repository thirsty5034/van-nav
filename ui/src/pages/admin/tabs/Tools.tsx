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
import { HolderOutlined, DragOutlined, QuestionCircleOutlined, CloudDownloadOutlined, HeartOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import React, { useCallback, useState, useEffect, useContext, useMemo } from "react";
import { getFilter, getOptions, mutiSearch } from "../../../utils/admin";
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

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
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
  const { store, loading, reload } = useData();
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

  // ==================== 网站健康检测状态 ====================
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
      message.warning('请先填写工具网址');
      return;
    }
    setGettingFavicon(true);
    try {
      const res = await fetchGetFaviconFromApi(url);
      if (res.success && res.logoUrl) {
        form.setFieldsValue({ logo: res.logoUrl });
        message.success('获取 favicon 成功');
      } else {
        message.warning(res.errorMessage || '获取失败');
      }
    } catch (err: any) {
      message.error(err.response?.data?.errorMessage || '获取 favicon 失败');
    } finally {
      setGettingFavicon(false);
    }
  };

  // 获取描述的函数
  const handleGetDesc = async (form: any) => {
    const url = form.getFieldValue('url');
    if (!url) {
      message.warning('请先填写工具网址');
      return;
    }
    setGettingDesc(true);
    try {
      const res = await fetchPageInfo(url);
      if (res.success) {
        const desc = res.data.description || res.data.title;
        if (desc) {
          form.setFieldsValue({ desc });
          message.success('获取描述成功');
        } else {
          message.warning('未找到描述信息，请手动输入');
        }
      } else {
        message.warning(res.errorMessage || '获取失败，请手动输入描述');
      }
    } catch (err: any) {
      message.error(err.response?.data?.errorMessage || '获取失败，请手动输入描述');
    } finally {
      setGettingDesc(false);
    }
  };

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await fetchDeleteTool(id);
        message.success("删除成功!");
      } catch (err) {
        message.warning("删除失败!");
      } finally {
        reload();
      }
    },
    [reload]
  );
  const handleToggleHide = useCallback(async (record: any, hide: boolean) => {
    try {
      await fetchUpdateTool({ ...record, hide });
      message.success("更新成功");
      reload();
    } catch (error) {
      message.error("更新失败");
    }
  }, [reload]);
  const handleUpdate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchUpdateTool(record);
        message.success("更新成功! Logo 将在 3 秒后刷新并加载！", 3);
        setTimeout(() => {
          reload();
        }, 3000);
      } catch (err) {
        message.warning("更新失败!");
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
        message.success("添加成功! Logo 将在 3 秒后刷新并加载！", 3);
        setTimeout(() => {
          reload();
        }, 3000);
      } catch (err) {
        message.warning("添加失败!");
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
      try {
        await fetchImportTools(data);
        message.success("导入成功! 正在刷新图标缓存...");
        // 触发缓存刷新：逐个更新工具触发图标缓存
        if (data && Array.isArray(data)) {
          for (const tool of data) {
            try {
              await fetchUpdateTool({ ...tool });
            } catch (e) { }
          }
        }
      } catch (err) {
        message.warning("导入失败!");
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
      message.success("删除成功!");
    } catch (err) {
      message.success("删除失败!");
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
      message.success("重置成功!");
    } catch (err) {
      message.success("重置失败!");
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
      message.success("重置成功!");
    } catch (err) {
      message.success("重置失败!");
    } finally {
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkUpdateLogoFromApi = useCallback(async () => {
    if (selectedRows.length === 0) return;
    let success = 0;
    let fail = 0;
    const hide = message.loading('正在更新 Logo 网址...', 0);
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
      message.success(`更新完成：成功 ${success} 个，失败 ${fail} 个`);
      reload();
    }
  }, [reload, selectedRows]);
  const handleBulkUpdateDesc = useCallback(async () => {
    if (selectedRows.length === 0) return;
    let success = 0;
    let fail = 0;
    const hide = message.loading('正在获取描述...', 0);
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
      message.success(`更新完成：成功 ${success} 个，失败 ${fail} 个`);
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
    message.success("导出成功！");
    reload();
  }, [reload]);

  // ==================== 网站健康检测 ====================
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
        message.success(`检测完成：${res.data.alive} 个正常，${res.data.dead} 个失效`);
      } else {
        message.error(res.errorMessage || "检测失败");
      }
    } catch (err: any) {
      message.error("检测请求失败：" + (err.message || "网络错误"));
    } finally {
      setChecking(false);
    }
  }, [reload]);

  const handleOrganizeDeadLinks = useCallback(async () => {
    setOrganizing(true);
    try {
      const res = await fetchOrganizeDeadLinks();
      if (res.success) {
        message.success(res.message || `已整理 ${res.data?.affected || 0} 条失效链接`);
        reload();
      } else {
        message.error(res.errorMessage || "整理失败");
      }
    } catch (err: any) {
      message.error("整理请求失败：" + (err.message || "网络错误"));
    } finally {
      setOrganizing(false);
    }
  }, [reload]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setDataSource((previous) => {
        const activeIndex = previous.findIndex((i) => i.id.toString() === active.id);
        const overIndex = previous.findIndex((i) => i.id.toString() === over?.id);

        // 计算新的排序值
        const newData = arrayMove(previous, activeIndex, overIndex);
        const updates = newData.map((item, index) => ({
          id: item.id,
          sort: index + 1,
        }));

        // 调用后端接口更新排序
        fetchUpdateToolsSort(updates).then(() => {
          message.success('排序更新成功');
          reload();
        }).catch(() => {
          message.error('排序更新失败');
        });

        return newData;
      });
    }
  };

  // 在 useEffect 中初始化 dataSource
  useEffect(() => {
    if (store?.tools) {
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
          <span>工具管理</span>
          <span style={{ color: '#999', fontSize: 13 }}>{`当前共 ${store?.tools?.length ?? 0} 条`}</span>
          {selectedRows.length > 0 && (
            <Popconfirm
              title="确定删除这些吗？"
              onConfirm={() => {
                handleBulkDelete();
              }}
            >
              <Button type="link">删除</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title="确定重置这些的图标吗？（会自动获取网站默认的）"
              onConfirm={() => {
                handleBulkResetLogo();
              }}
            >
              <Button type="link">重置默认图标</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title="确定重新缓存这些的图标吗？（会自动获取图标缓存到数据库）"
              onConfirm={() => {
                handleBulkCacheLogo();
              }}
            >
              <Button type="link">重置缓存图标</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title="根据 Logo API 模板自动获取并更新选中工具的 logo 网址？"
              onConfirm={() => {
                handleBulkUpdateLogoFromApi();
              }}
            >
              <Button type="link">一键更新Logo网址</Button>
            </Popconfirm>
          )}
          {selectedRows.length > 0 && (
            <Popconfirm
              title="自动获取并更新选中工具的描述？"
              onConfirm={() => {
                handleBulkUpdateDesc();
              }}
            >
              <Button type="link">一键更新描述</Button>
            </Popconfirm>
          )}
        </Space>
      }
      extra={
        <Space>
          <Select
            style={{ minWidth: 120 }}
            options={getOptions(store?.catelogs || [])}
            placeholder="分类筛选"
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
            添加
          </Button>
          <Button
            type="primary"
            onClick={() => {
              reload();
            }}
          >
            刷新
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
            <Button type="primary">导入</Button>
          </Upload>
          <Button
            type="primary"
            onClick={() => {
              handleExport();
            }}
          >
            导出
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
                showTotal: (total) => `共 ${total} 条`
              }}
            >
              <Table.Column
                key="sort"
                align="center"
                width={50}
                title="排序"
                render={() => <DragHandle />}
              />
              
              <Table.Column
                title="名称"
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
                          src={`/api/img?url=${record.logo}`}
                          width={32}
                          height={32}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                        ></img>
                      <span style={{ marginLeft: 8 }}>{record.name}</span>
                    </div>
                  );
                }}
              />
              <Table.Column
                title="分类"
                dataIndex="catelog"
                width={60}
              />
              <Table.Column
                title="网址"
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
                    <Tooltip title="升序，按数字从小到大排序">
                      <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                    </Tooltip>
                  </span>
                }
                dataIndex="sort"
                width={50}
              /> */}
              <Table.Column title={
                <span>隐藏
                  <Tooltip title="开启后只有登录后才会展示该工具">
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                </span>
              } dataIndex={"hide"} width={60} render={(val: boolean, record: any) => {
                return <Switch checked={Boolean(val)} onChange={(checked) => handleToggleHide(record, checked)} />
              }} />
              <Table.Column
                title="状态"
                dataIndex="is_alive"
                width={70}
                align="center"
                render={(alive: boolean | null, record: any) => {
                  if (alive === false) {
                    return <Tag color="error">失效</Tag>;
                  }
                  if (alive === true && record.last_checked) {
                    return <Tag color="success">正常</Tag>;
                  }
                  return <Tag>未检测</Tag>;
                }}
              />
              <Table.Column
                title="操作"
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
                        修改
                      </Button>
                      <Popconfirm
                        onConfirm={() => {
                          handleDelete(record.id);
                        }}
                        title={`确定要删除 ${record.name} 吗？`}
                      >
                        <Button type="link" danger>删除</Button>
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
        title={"新建工具"}
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
              label="名称"
              rules={[{ required: true, message: "请填写名称" }]}
              labelCol={{ span: 4 }}
            >
              <Input placeholder="请输入工具名称" />
            </Form.Item>
            <Form.Item
              name="url"
              rules={[
                { required: true, message: "请填写网址" },
                {
                  pattern: /^(https?:\/\/)/,
                  message: "网址必须以 http:// 或 https:// 开头"
                }
              ]}
              required
              label="网址"
              labelCol={{ span: 4 }}
            >
              <Input placeholder="请输入完整URL（以 http:// 或 https:// 开头）" />
            </Form.Item>
            <Form.Item name="logo" label="logo 网址" labelCol={{ span: 4 }}>
              <Input 
                placeholder="请输入 logo url, 为空则自动获取"
                addonAfter={
                  <Tooltip title="根据网址自动获取 favicon">
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
            <Form.Item
              name="catelog"
              required
              label="分类"
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: "请选择分类" }]}
            >
              <Select
                options={getOptions(store?.catelogs || [])}
                placeholder="请选择分类"
              />
            </Form.Item>
            <Form.Item
              name="desc"
              label="描述"
              labelCol={{ span: 4 }}
            >
              <Input.TextArea
                rows={2}
                placeholder="请输入描述"
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
                自动获取描述
              </Button>
            </Form.Item>
            <Form.Item
              rules={[{ required: true, message: "请排序" }]}
              name="sort"
              required
              label={
                <span>
                  <Tooltip title="升序，按数字从小到大排序">
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  &nbsp;排序
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <InputNumber placeholder="请输入排序" />
            </Form.Item>
            <Form.Item
              name="hide"
              initialValue={false}
              label={
                <span>
                  <Tooltip title="开启后只有登录后才会展示该工具">
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  &nbsp;隐藏
                </span>
              }
              labelCol={{ span: 4 }}>
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>}
      {<Modal
        open={showEdit}
        title={"修改工具"}
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
            <Form.Item name="id" label="序号" labelCol={{ span: 4 }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="name" required label="名称" labelCol={{ span: 4 }}
              rules={[{ required: true, message: "请填写名称" }]}
            >
              <Input placeholder="请输入工具名称" />
            </Form.Item>
            <Form.Item name="url" required label="网址" labelCol={{ span: 4 }}
              rules={[
                { required: true, message: "请填写网址" },
                {
                  pattern: /^(https?:\/\/)/,
                  message: "网址必须以 http:// 或 https:// 开头"
                }
              ]}
            >
              <Input placeholder="请输入 url" />
            </Form.Item>
            <Form.Item name="logo" label="logo 网址" labelCol={{ span: 4 }}>
              <Input 
                placeholder="请输入 logo url, 为空则自动获取"
                addonAfter={
                  <Tooltip title="根据网址自动获取 favicon">
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
            <Form.Item
              name="catelog"
              required
              label="分类"
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: "请选择分类" }]}
            >
              <Select
                options={getOptions(store?.catelogs || [])}
                placeholder="请选���分类"
              />
            </Form.Item>
            <Form.Item name="desc" label="描述" labelCol={{ span: 4 }}>
              <Input.TextArea
                rows={2}
                placeholder="请输入描述"
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
                自动获取描述
              </Button>
            </Form.Item>

            <Form.Item
              name="sort"
              required
              label={
                <span>
                  <Tooltip title="升序，按数字从小到大排序">
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  &nbsp;排序
                </span>
              }
              labelCol={{ span: 4 }}
              rules={[{ required: true, message: "请排序" }]}
            >
              <InputNumber placeholder="请输入排序" defaultValue={1} />
            </Form.Item>

            <Form.Item
              name="hide"
              required
              label={
                <span>
                  <Tooltip title="开启后只有登录后才会展示该工具">
                    <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
                  </Tooltip>
                  &nbsp;隐藏
                </span>
              }
              labelCol={{ span: 4 }}>
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>}
    </Card>

    {/* ==================== 网站健康检测 ==================== */}
    <Card
      title={
        <Space>
          <HeartOutlined />
          <span>网站健康检测</span>
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
            {checking ? "检测中..." : "开始检测"}
          </Button>
          {checkSummary && checkSummary.dead > 0 && (
            <Popconfirm
              title={`确定将 ${checkSummary.dead} 条失效链接移至列表末尾？`}
              onConfirm={handleOrganizeDeadLinks}
            >
              <Button loading={organizing}>
                整理失效链接
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
              title="总数"
              value={checkSummary.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="正常"
              value={checkSummary.alive}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="失效"
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
            showTotal: (total) => `共 ${total} 条`,
          }}
        >
          <Table.Column
            title="名称"
            dataIndex="title"
            width={120}
          />
          <Table.Column
            title="网址"
            dataIndex="url"
            width={200}
            render={(url: string) => (
              <div style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>{url}</div>
            )}
          />
          <Table.Column
            title="状态码"
            dataIndex="status_code"
            width={80}
            align="center"
            render={(code: number) => code || '-'}
          />
          <Table.Column
            title="状态"
            dataIndex="alive"
            width={80}
            align="center"
            render={(alive: boolean, record: LinkCheckResultItem) => (
              alive ? (
                <Tag color="success">正常</Tag>
              ) : (
                <Tooltip title={record.error || '无法访问'}>
                  <Tag color="error">失效</Tag>
                </Tooltip>
              )
            )}
          />
          <Table.Column
            title="错误信息"
            dataIndex="error"
            width={150}
            render={(err: string) => err || '-'}
          />
        </Table>
      )}

      {!checkSummary && !checking && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          点击"开始检测"按钮，检测所有已收录网站的可用性
        </div>
      )}

      {checking && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="正在检测所有链接，请稍候..." />
        </div>
      )}
    </Card>
    </>
  );
};
