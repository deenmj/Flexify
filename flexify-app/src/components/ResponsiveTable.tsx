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
          
          let firstCol: any = null;
          let actionCol: any = null;
          const middleCols: any[] = [];
          
          columns.forEach((col: any) => {
            if (col.hidden || !col.title) return;
            const titleLow = col.title.toString().toLowerCase();
            
            if (!firstCol && (titleLow === 'user' || titleLow === 'vehicle' || titleLow === 'name' || titleLow === 'title' || titleLow === 'reviewer' || titleLow === 'booking')) {
                firstCol = col;
            } else if (titleLow === 'actions' || titleLow === 'action') {
                actionCol = col;
            } else {
                if (!firstCol) {
                  firstCol = col;
                } else {
                  middleCols.push(col);
                }
            }
          });

          return (
            <Card key={key} size="small" style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', width: '100%', border: '1px solid #e2e8f0', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
              
              {firstCol && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, wordBreak: 'break-word', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    {firstCol.render ? firstCol.render(firstCol.dataIndex ? record[firstCol.dataIndex] : undefined, record, index) : record[firstCol.dataIndex]}
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {middleCols.map((col: any, idx: number) => {
                  const val = col.render ? col.render(col.dataIndex ? record[col.dataIndex] : undefined, record, index) : record[col.dataIndex];
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      gap: '12px'
                    }}>
                      <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{col.title}</Text>
                      <div style={{ textAlign: 'right', wordBreak: 'break-word', fontSize: '14px', flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>{val}</div>
                    </div>
                  );
                })}
              </div>

              {actionCol && (
                <div className="mobile-action-bar" style={{ padding: '10px 16px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                   {actionCol.render ? actionCol.render(actionCol.dataIndex ? record[actionCol.dataIndex] : undefined, record, index) : record[actionCol.dataIndex]}
                </div>
              )}
            </Card>
          );
        }}
      />
    );
  }

  return <Table columns={columns} dataSource={dataSource} rowKey={rowKey} pagination={pagination} loading={loading} scroll={{ x: true }} {...props} />;
}
