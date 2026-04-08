import { useState } from 'react';
import { Modal, Form, Input, Select, Button, message, FloatButton } from 'antd';
import { MessageSquare, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { feedbackApi } from '../api';
import './GlobalFeedback.css';

const { TextArea } = Input;
const { Option } = Select;

export default function GlobalFeedback() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const location = useLocation();

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/subadmin')) {
    return null;
  }

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const email = localStorage.getItem('token') ? undefined : values.contactEmail;
      await feedbackApi.submit({
        ...values,
        contactEmail: email,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }
      });
      message.success('Thank you for your feedback!');
      setOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<MessageSquare size={20} />}
        type="primary"
        style={{ right: 24, bottom: 24, width: 48, height: 48 }}
        onClick={() => setOpen(true)}
        tooltip="Send Feedback"
        className="global-feedback-btn"
      />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#0d9488" />
            <span>Send Feedback</span>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="type"
            label="Feedback Type"
            rules={[{ required: true, message: 'Please select a feedback type' }]}
          >
            <Select placeholder="What kind of feedback do you have?">
              <Option value="bug">Report a Bug</Option>
              <Option value="suggestion">Feature Suggestion</Option>
              <Option value="complaint">Complaint</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          {!localStorage.getItem('token') && (
            <Form.Item
              name="contactEmail"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="So we can follow up with you" />
            </Form.Item>
          )}

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter your feedback' }, { min: 10, message: 'Please be more descriptive' }]}
          >
            <TextArea rows={4} placeholder="Tell us what you think..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<Send size={16} />}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
