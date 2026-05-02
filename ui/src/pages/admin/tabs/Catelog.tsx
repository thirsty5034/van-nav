import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tooltip,
  Switch,
} from "antd";
import { QuestionCircleOutlined, DragOutlined } from "@ant-design/icons";
import { useCallback, useState } from "react";
import {
  fetchAddCateLog,
  fetchDeleteCatelog,
  fetchUpdateCateLog,
  fetchUpdateCatelogsSort,
} from "../../../utils/api";
import { useData } from "../hooks/useData";
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CatelogItem {
  id: number;
  name: string;
  sort: number;
  hide: boolean;
}

const DraggableRow = ({ children, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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

export interface CatelogProps {}
export const Catelog: React.FC<CatelogProps> = (props) => {
  const { store, loading, reload } = useData();
  const [requestLoading, setRequestLoading] = useState(false);
  const [addForm] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [showAddModel, setShowAddModel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedRows, setSelectRows] = useState<CatelogItem[]>([]);
  const [dataSource, setDataSource] = useState<CatelogItem[]>([]);

  // 从 store 同步 dataSource
  useState(() => {
    if (store?.catelogs) {
      setDataSource([...store.catelogs].sort((a: any, b: any) => a.sort - b.sort));
    }
  });

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await fetchDeleteCatelog(id);
        message.success("删除成功!");
      } catch (err) {
        message.warning("删除失败!");
      } finally {
        reload();
      }
    },
    [reload]
  );

  const handleCreate = useCallback(
    async (record: any) => {
      try {
        await fetchAddCateLog(record);
        message.success("添加成功!");
      } catch (err) {
        message.warning("添加失败!");
      } finally {
        setShowAddModel(false);
        reload();
      }
    },
    [reload, setShowAddModel]
  );

  const handleUpdate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchUpdateCateLog(record);
        message.success("更新成功!");
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

  const handleToggleHide = async (record: CatelogItem, hide: boolean) => {
    try {
      await fetchUpdateCateLog({ ...record, hide });
      message.success("更新成功");
      reload();
    } catch (error) {
      message.error("更新失败");
    }
  };

  const handleBulkDelete = useCallback(async () => {
    try {
      for (const each of selectedRows) {
        try {
          await fetchDeleteCatelog(each.id);
        } catch (err) {}
      }
      message.success("删除成功!");
    } catch (err) {
      message.success("删除失败!");
    } finally {
      setSelectRows([]);
      reload();
    }
  }, [reload, selectedRows]);

  const onDragEnd = async ({ active, over }: any) => {
    if (active.id !== over?.id) {
      const activeIndex = dataSource.findIndex((i) => i.id === active.id);
      const overIndex = dataSource.findIndex((i) => i.id === over?.id);
      const newItems = [...dataSource];
      const [reorderedItem] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, reorderedItem);

      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        sort: index + 1,
      }));

      setDataSource(reorderedItems);

      try {
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          sort: index + 1,
        }));
        await fetchUpdateCatelogsSort(updates);
        message.success('排序已更新');
      } catch (error) {
        message.error('排序更新失败');
        reload();
      }
    }
  };

  return (
    <Card
      title={`当前共 ${store?.catelogs?.length ?? 0} 条`}
      extra={
        <Space>
          {selectedRows.length > 0 && (
            <Popconfirm
              title="确定删除选中的分类吗？"
              onConfirm={() => handleBulkDelete()}
            >
              <Button type="link" danger>删除 ({selectedRows.length})</Button>
            </Popconfirm>
          )}
          <Button
            type="primary"
            onClick={() => {
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
        </Space>
      }
    >
      <Spin spinning={loading}>
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext
            items={dataSource.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={dataSource}
              rowKey="id"
              size="small"
              components={{
                body: {
                  row: DraggableRow,
                },
              }}
              rowSelection={{
                type: 'checkbox',
                onChange: (selectedRowKeys: React.Key[], selectedRows: CatelogItem[]) => {
                  setSelectRows(selectedRows);
                },
              }}
            >
              <Table.Column
                title="排序"
                dataIndex="sort"
                width={60}
                render={(_: any, record: CatelogItem) => (
                  <div
                    className="drag-handle"
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
                )}
              />
              <Table.Column title="ID" dataIndex="id" width={40} />
              <Table.Column
                title="名称"
                dataIndex="name"
                width={150}
              />
              <Table.Column
                title={
                  <span>
                    隐藏
                    <Tooltip title="开启后只有登录后才会展示该分类">
                      <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                    </Tooltip>
                  </span>
                }
                dataIndex="hide"
                width={60}
                render={(val: boolean, record: CatelogItem) => (
                  <Switch
                    checked={Boolean(val)}
                    onChange={(checked) => handleToggleHide(record, checked)}
                  />
                )}
              />
              <Table.Column
                title="操作"
                width={120}
                dataIndex="action"
                key="action"
                render={(_: any, record: CatelogItem) => {
                  return (
                    <Space>
                      <Button
                        type="text"
                        icon={<QuestionCircleOutlined />}
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
                        title={`确定要删除分类 ${record.name} 吗？`}
                      >
                        <Button type="text" danger>删除</Button>
                      </Popconfirm>
                    </Space>
                  );
                }}
              />
            </Table>
          </SortableContext>
        </DndContext>
      </Spin>
      <Modal
        open={showAddModel}
        title={"新建分类"}
        onCancel={() => {
          setShowAddModel(false);
        }}
        onOk={() => {
          const values = addForm?.getFieldsValue();
          handleCreate(values);
        }}
      >
        <Form form={addForm}>
          <Form.Item name="name" required label="名称" labelCol={{ span: 4 }}>
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item
            name="sort"
            required
            initialValue={1}
            label={
              <span>
                <Tooltip title="升序，按数字从小到大排序">
                  <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                </Tooltip>
                &nbsp;排序
              </span>
            }
            labelCol={{ span: 4 }}
          >
            <InputNumber
              placeholder="请输入分类排序"
              type="number"
              defaultValue={1}
            />
          </Form.Item>
          <Form.Item
            name="hide"
            initialValue={false}
            required
            label={
              <span>
                <Tooltip title="开启后只有登录后才会展示该工具">
                  <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                </Tooltip>
                &nbsp;隐藏
              </span>
            }
            labelCol={{ span: 4 }}
          >
            <Switch checkedChildren="开" unCheckedChildren="关" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showEdit}
        title={"修改分类"}
        onCancel={() => {
          setShowEdit(false);
        }}
        onOk={() => {
          const values = updateForm?.getFieldsValue();
          handleUpdate(values);
        }}
      >
        <Spin spinning={requestLoading}>
          <Form form={updateForm}>
            <Form.Item name="id" label="序号" labelCol={{ span: 4 }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="name" required label="名称" labelCol={{ span: 4 }}>
              <Input placeholder="请输入分类名称" />
            </Form.Item>
            <Form.Item
              name="sort"
              required
              label={
                <span>
                  <Tooltip title="升序，按数字从小到大排序">
                    <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                  </Tooltip>
                  &nbsp;排序
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <InputNumber placeholder="请输入分类排序" defaultValue={1} />
            </Form.Item>
            <Form.Item
              name="hide"
              required
              label={
                <span>
                  <Tooltip title="开启后只有登录后才会展示该工具">
                    <QuestionCircleOutlined style={{ marginLeft: "5px" }} />
                  </Tooltip>
                  &nbsp;隐藏
                </span>
              }
              labelCol={{ span: 4 }}
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </Card>
  );
};
