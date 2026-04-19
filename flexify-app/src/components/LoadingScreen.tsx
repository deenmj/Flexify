import { motion } from 'framer-motion';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Finding your perfect ride...' }: LoadingScreenProps) {
  return (
    <div className="loading-screen" id="loading-screen-overlay">
      {/* Subtle ambient glow */}
      <div className="loading-screen-glow" />

      {/* Logo */}
      <motion.div
        className="loading-screen-logo"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-logo-icon">
          <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="white" opacity="0.4" />
          <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263Z" fill="white" />
        </svg>
        <span className="loading-logo-text">Rentify</span>
      </motion.div>

      {/* Spinner */}
      <motion.div
        className="loading-screen-spinner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Spin
          indicator={
            <LoadingOutlined
              style={{ fontSize: 28, color: '#1890ff' }}
              spin
            />
          }
        />
      </motion.div>

      {/* Message */}
      <motion.p
        className="loading-screen-message"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
      >
        {message}
      </motion.p>
    </div>
  );
}
