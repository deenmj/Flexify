import { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Tag } from 'antd';
import { Rocket, MessageSquare, Heart, Shield, Zap } from 'lucide-react';

const { Title, Text } = Typography;

export function BetaBadge() {
  return (
    <Tag color="cyan" style={{ fontSize: '10px', fontWeight: 700, borderRadius: '4px', verticalAlign: 'middle', marginLeft: '6px' }}>
      BETA
    </Tag>
  );
}

export function BetaFeedbackButton() {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      <Button 
        type="primary" 
        shape="round" 
        size="large" 
        icon={<MessageSquare size={18} style={{ marginRight: '8px' }} />}
        onClick={() => window.open('https://forms.gle/your-google-form-id', '_blank')}
        style={{ 
          background: '#0d9488', 
          borderColor: '#0d9488', 
          boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        Feedback
      </Button>
    </div>
  );
}

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('flexify_welcome_seen');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('flexify_welcome_seen', 'true');
    setIsOpen(false);
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={500}
      centered
      bodyStyle={{ padding: '32px', textAlign: 'center' }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ width: '64px', height: '64px', background: '#ecfeff', color: '#0891b2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Rocket size={32} />
        </div>
        <Title level={3}>Welcome to Flexify Beta!</Title>
        <Text type="secondary">
          We're thrilled to have you as one of our first users. Help us build the future of mobility in Sri Lanka.
        </Text>
      </div>

      <div style={{ textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
        <Space direction="vertical" size="middle">
          <div style={{ display: 'flex', gap: '12px' }}>
            <Zap size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
            <div>
              <Text strong>Explore & Book</Text><br />
              <Text type="secondary" style={{ fontSize: '12px' }}>Find the perfect vehicle or list yours in minutes.</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Shield size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
            <div>
              <Text strong>Identity Verification</Text><br />
              <Text type="secondary" style={{ fontSize: '12px' }}>Complete your KYC to unlock full rental capabilities.</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Heart size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
            <div>
              <Text strong>Give us Feedback</Text><br />
              <Text type="secondary" style={{ fontSize: '12px' }}>Spotted a bug? Have an idea? Use the feedback button!</Text>
            </div>
          </div>
        </Space>
      </div>

      <Button type="primary" size="large" block onClick={handleClose} style={{ height: '48px', borderRadius: '8px' }}>
        Let's Get Started
      </Button>
    </Modal>
  );
}
