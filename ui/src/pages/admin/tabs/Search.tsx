import React, { useState, useEffect } from 'react';
import {
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
} from 'antd';
import { DragOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
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
      title: '排序',
      dataIndex: 'sort',
      width: 90,
      render: (_: any, record: SearchEngine, index: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="drag-handle" style={{ cursor: 'move', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <DragOutlined style={{ color: '#999' }} />
          </div>
          <Tooltip title="上移">
            <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => handleMoveUp(index)} />
          </Tooltip>
          <Tooltip title="下移">
            <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === engines.length - 1} onClick={() => handleMoveDown(index)} />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 80,
      render: (logo: string, record: SearchEngine) => (
        <Image 
          src={logo.startsWith('http') ? logo : `/api/img?url=${logo}`} 
          alt={record.name} width={24} height={24}
          style={{ objectFit: 'contain' }}
          fallback="data:image/png;base64,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"
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: 'URL模板',
      dataIndex: 'urlTemplate',
      ellipsis: true,
      render: (url: string) => (<Tooltip title={url}><span>{url}</span></Tooltip>),
    },
    {
      title: '描述',
      dataIndex: 'description',
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
      width: 140,
      render: (_: any, record: SearchEngine) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
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

  const handleAdd = () => {
    setEditingEngine(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...engines];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const reordered = newItems.map((item, i) => ({ ...item, sort: i + 1 }));
    setEngines(reordered);
    saveSortOrder(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === engines.length - 1) return;
    const newItems = [...engines];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const reordered = newItems.map((item, i) => ({ ...item, sort: i + 1 }));
    setEngines(reordered);
    saveSortOrder(reordered);
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
        await fetchUpdateSearchEngine({ ...values, id: editingEngine.id });
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
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加搜索引擎</Button>
        <span style={{ color: '#999', fontSize: 13 }}>支持拖拽排序或点击 ↑↓ 按钮调整顺序</span>
      </div>
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
            />
          </SortableContext>
        </DndContext>
      </Spin>
      <Modal
        title={editingEngine ? '编辑搜索引擎' : '添加搜索引擎'}
        open={isModalVisible}
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
    </div>
  );
};

export default SearchEngineManager;
