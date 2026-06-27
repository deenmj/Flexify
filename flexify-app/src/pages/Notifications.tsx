import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, type NotificationItem } from '../api';
import { useSocket } from '../context/SocketContext';
import { List, Typography, Badge, Button, Spin, Card } from 'antd';
import { Bell, Calendar, Shield, CreditCard, Info } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './Notifications.css';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications(prev => [notification, ...prev]);
    };
    socket.on('newNotification', handleNewNotification);
    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.get();
      setNotifications(res.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, relatedId?: string, type?: string) => {
    try {
      const target = notifications.find(n => n._id === id);
      if (target && !target.isRead) {
        await notificationApi.markAsRead(id);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }

      // Navigate based on type
      if (relatedId && type) {
        switch (type) {
          case 'booking_request':
          case 'booking_update':
            navigate(`/dashboard?tab=bookings&highlight=${relatedId}`);
            break;
          case 'kyc':
            navigate('/profile');
            break;
          default:
            break;
        }
      }
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_update':
        return <Calendar size={20} className="icon-calendar" />;
      case 'kyc':
        return <Shield size={20} className="icon-kyc" />;
      default:
        return <Info size={20} className="icon-system" />;
    }
  };

  return (
    <div className="notifications-page container animate-fade-in">
      <div className="notifications-header">
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={28} /> Notifications
          </Title>
          <Text type="secondary">Stay updated with your latest activity.</Text>
        </div>
        <Button onClick={handleMarkAllRead} type="default">
          Mark all as read
        </Button>
      </div>

      <Card bordered={false} className="notifications-card">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            locale={{ emptyText: "No notifications yet." }}
            renderItem={(item) => (
              <List.Item
                key={item._id}
                className={`notification-item ${!item.isRead ? 'unread' : ''}`}
                onClick={() => handleMarkAsRead(item._id, item.relatedId, item.type)}
              >
                <div className="notification-icon-wrapper">
                  {getIcon(item.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title-row">
                    <span className="notification-title">
                      {!item.isRead && <Badge status="processing" style={{ marginRight: 8 }} />}
                      {item.title}
                    </span>
                    <span className="notification-time">{dayjs(item.createdAt).fromNow()}</span>
                  </div>
                  <Text className="notification-message" type="secondary">{item.message}</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
