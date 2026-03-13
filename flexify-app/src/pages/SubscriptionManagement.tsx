import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, Shield, Zap, AlertCircle, Clock, Info } from 'lucide-react';
import { ownerApi } from '../api';
import './SubscriptionManagement.css';

const PLANS = [
  {
    id: 'BASIC',
    name: 'Basic',
    price: 1000,
    description: 'Perfect for casual owners',
    features: [
      'Up to 2 vehicle listings',
      'Standard search visibility',
      'Email support',
      'Basic analytics'
    ],
    icon: <Shield className="plan-icon" />,
    color: '#0d6efd',
    limit: '2 Vehicles'
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 2500,
    description: 'Recommended for active owners',
    features: [
      'Up to 6 vehicle listings',
      'Higher search visibility',
      'Priority email support',
      'Standard analytics'
    ],
    icon: <Zap className="plan-icon" style={{ color: '#f59e0b'}} />,
    color: '#f59e0b',
    limit: '6 Vehicles'
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 3500,
    price6: 18000,
    description: 'For professional fleet owners',
    features: [
      'Unlimited vehicle listings',
      'Priority sort boost + Badge',
      '24/7 Priority support',
      'Advanced performance metrics',
      'Featured listing status'
    ],
    icon: <Zap className="plan-icon pro" />,
    color: '#6610f2',
    limit: 'Unlimited'
  }
];

const SubscriptionManagement: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [is6Month, setIs6Month] = useState(false);

  const sub = user?.subscription || { tier: 'BASIC', status: 'trial', endDate: null };
  const isTrial = sub.status === 'trial';
  const isExpired = sub.status === 'expired';

  const handleRequestUpgrade = (plan: any) => {
    setSelectedTier(plan);
    setShowPayment(true);
  };

  const confirmPaymentRequest = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      const duration = (selectedTier.id === 'ENTERPRISE' && is6Month) ? 'BI_ANNUAL' : 'MONTHLY';
      const amount = (selectedTier.id === 'ENTERPRISE' && is6Month) ? selectedTier.price6 : selectedTier.price;
      
      const res = await ownerApi.initiateSubscription(
          selectedTier.id, 
          duration, 
          amount, 
          user?.email || 'Unknown'
      );
      
      setMessage({ type: 'success', text: res.message });
      setShowPayment(false);
      await refreshUser();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send request' });
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!sub.endDate) return null;
    const end = new Date(sub.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysLeft = getTimeRemaining();

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h1>Subscription Management</h1>
        <p>Keep your listings visible and reach more customers</p>
      </div>

      <div className={`status-banner ${sub.status}`}>
        <div className="status-info">
          {isTrial ? <Clock size={24} /> : isExpired ? <AlertCircle size={24} /> : <Shield size={24} />}
          <div>
            <h3>
              {isTrial ? 'Free Trial Active' : isExpired ? 'Subscription Expired' : 'Subscription Active'} 
              <span className="tier-badge">{sub.tier}</span>
            </h3>
            <p>
              {isExpired 
                ? 'Your listings are currently hidden (or will be soon after grace period).' 
                : `Your ${isTrial ? 'trial' : 'subscription'} ends in ${daysLeft} days (${new Date(sub.endDate!).toLocaleDateString()}).`}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {!showPayment ? (
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.id === sub.tier && !isExpired ? 'active' : ''}`}
              style={{ '--accent-color': plan.color } as React.CSSProperties}
            >
              {plan.id === sub.tier && !isExpired && <div className="current-label">Active</div>}
              <div className="plan-icon-wrapper">{plan.icon}</div>
              <h2 className="plan-name">{plan.name}</h2>
              
              {plan.id === 'ENTERPRISE' ? (
                  <div className="enterprise-toggle-container">
                      <div className="toggle-switch">
                          <button 
                            className={!is6Month ? 'active' : ''} 
                            onClick={() => setIs6Month(false)}
                          >Monthly</button>
                          <button 
                            className={is6Month ? 'active' : ''} 
                            onClick={() => setIs6Month(true)}
                          >6-Months</button>
                      </div>
                      <div className="plan-price">
                        LKR {is6Month ? plan.price6!.toLocaleString() : plan.price.toLocaleString()}
                        <span className="duration">/{is6Month ? '6mo' : 'mo'}</span>
                      </div>
                      {is6Month && <div className="save-badge">Save 14%</div>}
                  </div>
              ) : (
                <div className="plan-price">LKR {plan.price.toLocaleString()}<span className="duration">/mo</span></div>
              )}

              <p className="plan-desc">{plan.description}</p>
              <div className="plan-limit-info"><Info size={14} /> {plan.limit}</div>
              
              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}><Check size={16} /> {feature}</li>
                ))}
              </ul>

              <button 
                className="plan-button" 
                disabled={loading || (plan.id === sub.tier && !isExpired)}
                onClick={() => handleRequestUpgrade(plan)}
              >
                {plan.id === sub.tier && !isExpired ? 'Active Plan' : isExpired ? 'Renew Now' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="payment-instructions-card animate-scale-in">
          <button className="back-link" onClick={() => setShowPayment(false)}>← Back to plans</button>
          <h2>Complete Your {selectedTier.name} Subscription</h2>
          <p>Please follow the manual payment steps below to activate your plan.</p>
          
          <div className="bank-details">
            <h3>Bank Transfer Details</h3>
            <div className="detail-row"><span>Bank:</span> <strong>Commercial Bank of Ceylon</strong></div>
            <div className="detail-row"><span>Account Name:</span> <strong>Studio Nazar (Pvt) Ltd</strong></div>
            <div className="detail-row"><span>Account Number:</span> <strong>8010045622</strong></div>
            <div className="detail-row"><span>Branch:</span> <strong>Colombo Main</strong></div>
            <div className="detail-row"><span>Amount:</span> <strong>LKR {(selectedTier.id === 'ENTERPRISE' && is6Month ? selectedTier.price6 : selectedTier.price).toLocaleString()}</strong></div>
          </div>

          <div className="instruction-box">
            <h4>Instructions:</h4>
            <ol>
              <li>Transfer the exact amount to the account above.</li>
              <li>Include your email address <strong>({user?.email})</strong> in the reference field.</li>
              <li>Click the button below to notify our admin team.</li>
              <li>Activation takes 2-4 hours after verification.</li>
            </ol>
          </div>

          <button 
            className="confirm-payment-btn" 
            onClick={confirmPaymentRequest}
            disabled={loading}
          >
            {loading ? 'Sending Request...' : 'I Have Made the Payment'}
          </button>
          <p className="note">By clicking, you confirm that you have initiated the transfer.</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
