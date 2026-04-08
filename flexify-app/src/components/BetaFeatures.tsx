import { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Tag, Form, Input, Select, message } from 'antd';
import { Rocket, MessageSquare, Heart, Shield, Zap, Send } from 'lucide-react';
import { feedbackApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

export function BetaBadge() {
  return (
    <Tag color="cyan" style={{ fontSize: '10px', fontWeight: 700, borderRadius: '4px', verticalAlign: 'middle', marginLeft: '6px' }}>
      BETA
    </Tag>
  );
}

export function BetaFeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await feedbackApi.submit({
        ...values,
        deviceInfo: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`
        }
      });
      message.success('Thank you! Your feedback has been submitted.');
      setIsOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 1000 }}>
        <Button 
          type="primary" 
          shape="round" 
          size="large" 
          icon={<MessageSquare size={18} style={{ marginRight: '8px' }} />}
          onClick={() => setIsOpen(true)}
          style={{ 
            background: 'var(--primary-color, #0d9488)', 
            borderColor: 'var(--primary-color, #0d9488)', 
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
            display: 'flex',
            alignItems: 'center',
            height: '46px',
            padding: '0 20px',
            fontWeight: 600
          }}
        >
          Feedback
        </Button>
      </div>

      <Modal
        title={
          <Space>
            <MessageSquare size={18} style={{ color: '#0d9488' }} />
            <span>Submit Feedback</span>
            <BetaBadge />
          </Space>
        }
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        width={450}
        centered
      >
        <Paragraph type="secondary" style={{ fontSize: '13px' }}>
          Spotted a bug? Have a suggestion? We'd love to hear from you as we improve the platform.
        </Paragraph>

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSubmit}
          initialValues={{ type: 'suggestion', contactEmail: user?.email }}
        >
          <Form.Item 
            name="type" 
            label="Feedback Type" 
            rules={[{ required: true }]}
          >
            <Select options={[
              { value: 'bug', label: '🪲 Report a Bug' },
              { value: 'suggestion', label: '💡 Suggestion' },
              { value: 'general', label: '💬 General Inquiry' },
            ]} />
          </Form.Item>

          <Form.Item 
            name="message" 
            label="Message" 
            rules={[{ required: true, message: 'Please enter your feedback' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the issue or share your idea..." />
          </Form.Item>

          <Form.Item 
            name="contactEmail" 
            label="Reply Email (Optional)"
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <div style={{ marginTop: '24px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              size="large" 
              icon={<Send size={16} />}
              style={{ background: '#0d9488', borderColor: '#0d9488', height: '48px', borderRadius: '8px' }}
            >
              Submit Feedback
            </Button>
          </div>
        </Form>
      </Modal>
    </>
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
