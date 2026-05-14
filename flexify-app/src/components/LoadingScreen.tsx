import { motion } from 'framer-motion';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import './LoadingScreen.css';
import logoImage from '../assets/logo.jpg';

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
        <img src={logoImage} alt="Rentify" className="loading-logo-icon" style={{ height: '48px', width: 'auto' }} />
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
