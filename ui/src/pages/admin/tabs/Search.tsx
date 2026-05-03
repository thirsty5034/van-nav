import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Image,
  Switch,
  Spin,
  Tooltip,
  Popconfirm,
} from 'antd';
import { DragOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchGetAllSearchEngines,
  fetchAddSearchEngine,
  fetchUpdateSearchEngine,
  fetchDeleteSearchEngine,
  fetchUpdateSearchEnginesSort,
} from '../../../utils/api';
import { clearSearchEngineCache } from '../../../utils/serachEngine';

interface SearchEngine {
  id: number;
  name: string;
  urlTemplate: string;
  logo: string;
  sort: number;
  enabled: boolean;
  description: string;
}

const DraggableRow = ({ children, ...props }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key'],
  });

  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 9999 } : {}),
  };

  const modifiedListeners = {
    ...listeners,
    onPointerDown: (e: any) => {
      if (e.target.closest('.drag-handle')) {
        listeners.onPointerDown?.(e);
      }
    }
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes} {...modifiedListeners}>
      {children}
    </tr>
  );
};

const SearchEngineManager: React.FC = () => {
  const [engines, setEngines] = useState<SearchEngine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEngine, setEditingEngine] = useState<SearchEngine | null>(null);
  const [form] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<SearchEngine[]>([]);

  const loadEngines = async () => {
    try {
      setLoading(true);
      const data = await fetchGetAllSearchEngines();
      setEngines(data);
    } catch (error) {
      message.error('加载搜索引擎失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngines();
  }, []);

  const validateUrlTemplate = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入搜索URL模板'));
    }
    if (!value.includes('{query}') && !value.includes('%s')) {
      return Promise.reject(new Error('URL模板必须包含 {query} 或 %s 作为搜索关键词占位符'));
    }
    return Promise.resolve();
  };

  const columns = [
    {
      title: <div style={{ textAlign: 'left' }}>排序</div>,
      dataIndex: 'sort',
      width: 60,
      render: (_: any, record: SearchEngine) => (
        <div
          className="drag-handle"
          style={{
            cursor: 'move',
            padding: '8px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center'
          }}
        >
          <DragOutlined style={{ color: '#999' }} />
        </div>
      ),
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 80,
      render: (logo: string, record: SearchEngine) => (
        // HTTP/dataURI用原值，文件名用根相对路径（管理页面在 /admin，相对路径会404）
        <Image 
          src={logo.startsWith('http') || logo.startsWith('data:') ? logo : '/' + logo} 
          alt={record.name} 
          width={24} 
          height={24}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'URL模板',
      dataIndex: 'urlTemplate',
      width: 280,
      ellipsis: true,
      render: (url: string) => (<Tooltip title={url}><span>{url}</span></Tooltip>),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 150,
      ellipsis: true,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, record: SearchEngine) => (
        <Switch checked={enabled} onChange={(checked) => handleToggleEnabled(record, checked)} />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: SearchEngine) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm
            title="确定要删除这个搜索引擎吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleToggleEnabled = async (engine: SearchEngine, enabled: boolean) => {
    try {
      await fetchUpdateSearchEngine({ ...engine, enabled });
      message.success('更新成功');
      clearSearchEngineCache();
      loadEngines();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleEdit = (engine: SearchEngine) => {
    setEditingEngine(engine);
    form.setFieldsValue({
      name: engine.name,
      urlTemplate: engine.urlTemplate,
      logo: engine.logo,
      description: engine.description,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (engine: SearchEngine) => {
    Modal.confirm({
      title: '确定要删除搜索引擎吗？',
      content: `即将删除搜索引擎「${engine.name}」，此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await fetchDeleteSearchEngine(engine.id);
          message.success('删除成功');
          clearSearchEngineCache();
          loadEngines();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    Modal.confirm({
      title: '确定删除选中的搜索引擎吗？',
      content: `即将删除 ${selectedRows.length} 个搜索引擎，此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const engine of selectedRows) {
            await fetchDeleteSearchEngine(engine.id);
          }
          message.success('删除成功');
          clearSearchEngineCache();
          setSelectedRows([]);
          loadEngines();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleAdd = () => {
    setEditingEngine(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const saveSortOrder = async (items: SearchEngine[]) => {
    try {
      const updates = items.map((item, index) => ({ id: item.id, sort: index + 1 }));
      await fetchUpdateSearchEnginesSort(updates);
      clearSearchEngineCache();
    } catch (error) {
      message.error('排序更新失败');
      loadEngines();
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingEngine) {
        await fetchUpdateSearchEngine({ ...values, id: editingEngine.id, enabled: editingEngine.enabled });
        message.success('修改成功');
      } else {
        await fetchAddSearchEngine({ ...values, enabled: true });
        message.success('添加成功');
      }
      clearSearchEngineCache();
      setIsModalVisible(false);
      loadEngines();
    } catch (error) {
      console.error('Validate Failed:', error);
    }
  };

  const onDragEnd = async ({ active, over }: any) => {
    if (active.id !== over?.id) {
      const activeIndex = engines.findIndex((i) => i.id === active.id);
      const overIndex = engines.findIndex((i) => i.id === over?.id);
      const newItems = [...engines];
      const [reorderedItem] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, reorderedItem);
      const reorderedItems = newItems.map((item, index) => ({ ...item, sort: index + 1 }));
      setEngines(reorderedItems);
      await saveSortOrder(reorderedItems);
    }
  };

return (
    <Card
      title={
        <Space>
          <span>搜索引擎管理</span>
          <span style={{ color: '#999', fontSize: 13 }}>当前共 {engines.length} 条</span>
          {selectedRows.length > 0 && (
            <Popconfirm
              title="确定删除选中的搜索引擎吗？"
              onConfirm={handleBulkDelete}
            >
              <Button type="link" danger>删除 ({selectedRows.length})</Button>
            </Popconfirm>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加搜索引擎</Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext items={engines.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <Table
              columns={columns}
              dataSource={engines}
              rowKey="id"
              components={{ body: { row: DraggableRow } }}
              pagination={false}
              size="middle"
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: selectedRows.map(r => r.id),
                onChange: (_: React.Key[], selectedRows: SearchEngine[]) => {
                  setSelectedRows(selectedRows);
                },
              }}
            />
          </SortableContext>
        </DndContext>
      </Spin>
    </Card>
  );
  return (
    <Modal
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入搜索引擎名称' }]}>
            <Input placeholder="例如：百度" />
          </Form.Item>
          <Form.Item
            name="urlTemplate"
            label="搜索URL模板"
            extra="使用 {query} 或 %s 作为搜索关键词占位符"
            rules={[{ required: true, message: '请输入搜索URL模板' }, { validator: validateUrlTemplate }]}
          >
            <Input placeholder="https://www.google.com/search?q={query}" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="搜索引擎的简要描述（可选）" />
          </Form.Item>
          <Form.Item
            name="logo"
            label="图标"
            rules={[
              { required: true, message: '请输入图标文件名或网址' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const urlPattern = /^https?:\/\/.+/i;
                  const filePattern = /\.(ico|png|jpg|jpeg|gif|svg|webp)$/i;
                  if (urlPattern.test(value) || filePattern.test(value)) return Promise.resolve();
                  return Promise.reject(new Error('请输入有效的网址或图标文件名'));
                }
              }
            ]}
          >
            <Input placeholder="例如：baidu.ico 或 https://example.com/logo.png" />
          </Form.Item>
        </Form>
      </Modal>
  );
};

export default SearchEngineManager;
