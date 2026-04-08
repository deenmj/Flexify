import React, { useState, useEffect } from 'react';
import { Table, Card, List, Typography } from 'antd';

const { Text } = Typography;

export default function ResponsiveTable({ columns, dataSource, rowKey, pagination, loading, ...props }: any) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <List
        dataSource={dataSource}
        loading={loading}
        pagination={pagination ? {
          ...pagination,
          size: 'small',
          style: { display: 'flex', justifyContent: 'center', marginTop: 16 }
        } : false}
        renderItem={(record: any, index) => {
          const key = typeof rowKey === 'function' ? rowKey(record) : (rowKey ? record[rowKey] : index);
          return (
            <Card key={key} size="small" style={{ marginBottom: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', width: '100%', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {columns.map((col: any, idx: number) => {
                  if (col.hidden || !col.title) return null;
                  const val = col.render 
                    ? col.render(col.dataIndex ? record[col.dataIndex] : undefined, record, index) 
                    : record[col.dataIndex];
                  
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      gap: '12px',
                      padding: '4px 0',
                      borderBottom: idx === columns.length - 1 ? 'none' : '1px solid #f1f5f9'
                    }}>
                      <Text type="secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 500 }}>{col.title}</Text>
                      <div style={{ textAlign: 'right', flex: 1, wordBreak: 'break-word', fontSize: '13px' }}>{val}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        }}
      />
    );
  }

  return <Table columns={columns} dataSource={dataSource} rowKey={rowKey} pagination={pagination} loading={loading} {...props} />;
}
