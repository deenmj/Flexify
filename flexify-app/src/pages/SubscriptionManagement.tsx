import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../SocketContext';
import { Check, Shield, Zap, AlertCircle, Clock, Info, CreditCard, Landmark, ArrowLeft, Loader2 } from 'lucide-react';
import { ownerApi, bankDetailsApi, type BankDetailsData } from '../api';
import './SubscriptionManagement.css';
import { notification, message, Button, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

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
    icon: <Zap className="plan-icon" style={{ color: '#f59e0b' }} />,
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
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [is6Month, setIs6Month] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'BANK'>('CARD');
  const [payhereParams, setPayhereParams] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailsData | null>(null);

  const sub = user?.subscription || { tier: 'BASIC', status: 'trial', endDate: null };
  const isTrial = sub.status === 'trial';
  const isExpired = sub.status === 'expired';

  useEffect(() => {
    if (socket) {
      socket.on('subscriptionActivated', (data: any) => {
        notification.success({
          message: 'Subscription Activated!',
          description: `Your ${data.tier} plan is now active until ${new Date(data.endDate).toLocaleDateString()}.`,
          duration: 10
        });
        refreshUser();
        setShowPayment(false);
      });

      return () => {
        socket.off('subscriptionActivated');
      };
    }
  }, [socket, refreshUser]);

  useEffect(() => {
    bankDetailsApi.get().then(setBankDetails).catch(console.error);
  }, []);

  const handleRequestUpgrade = (plan: any) => {
    setSelectedTier(plan);
    setShowPayment(true);
  };

  const handlePayHere = async () => {
    setLoading(true);
    try {
      const duration = (selectedTier.id === 'ENTERPRISE' && is6Month) ? 'BI_ANNUAL' : 'MONTHLY';
      const amount = (selectedTier.id === 'ENTERPRISE' && is6Month) ? selectedTier.price6 : selectedTier.price;

      const params = await ownerApi.getPayHereParams(selectedTier.id, duration, amount);
      setPayhereParams(params);

      setTimeout(() => {
        (document.getElementById('payhere-form') as HTMLFormElement).submit();
      }, 100);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to initiate payment' });
      setLoading(false);
    }
  };

  const confirmManualPayment = async () => {
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

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          message.success(`${label} copied!`);
        })
        .catch(() => {
          fallbackCopyTextToClipboard(text, label);
        });
    } else {
      fallbackCopyTextToClipboard(text, label);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, label: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Ensure textArea is not visible
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success(`${label} copied!`);
      } else {
        message.error(`Failed to copy ${label}`);
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      message.error(`Failed to copy ${label}`);
    }
    document.body.removeChild(textArea);
  };

  const copyAllDetails = () => {
    if (!bankDetails) return;
    const details = `Bank: ${bankDetails.bankName}\nAccount Name: ${bankDetails.accountName}\nAccount Number: ${bankDetails.accountNumber}\nReference: ${user?.email}`;
    handleCopy(details, 'All bank details');
  };

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
        <div className="payment-selection-container animate-scale-in">
          <button className="back-link" onClick={() => setShowPayment(false)}><ArrowLeft size={16} /> Back to plans</button>

          <div className="payment-checkout-card">
            <div className="checkout-summary">
              <h2>Checkout: {selectedTier.name}</h2>
              <div className="amount-display">
                <span className="label">Total to Pay:</span>
                <span className="value">LKR {(selectedTier.id === 'ENTERPRISE' && is6Month ? selectedTier.price6 : selectedTier.price).toLocaleString()}</span>
              </div>
              <p className="duration-text">Subscription for {is6Month ? '6 months' : '1 month'}</p>
            </div>

            <div className="method-selector">
              <div
                className={`method-option ${paymentMethod === 'CARD' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={20} />
                <div>
                  <strong>Online Payment</strong>
                  <p>Card, Genie, Vishwa, etc. (Instant Activation)</p>
                </div>
                <div className="radio-circle"></div>
              </div>

              <div
                className={`method-option ${paymentMethod === 'BANK' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('BANK')}
              >
                <Landmark size={20} />
                <div>
                  <strong>Bank Transfer</strong>
                  <p>Manual verification (Takes 2-4 hours)</p>
                </div>
                <div className="radio-circle"></div>
              </div>
            </div>

            {paymentMethod === 'CARD' ? (
              <div className="card-payment-info">
                <button
                  className="pay-now-btn"
                  onClick={handlePayHere}
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : 'Pay with PayHere'}
                </button>
                <p className="secure-text">Securely processed by PayHere</p>
              </div>
            ) : (
              <div className="bank-payment-info">
                <div className="bank-details">
                  <div className="detail-row"><span>Bank:</span> <strong>{bankDetails ? bankDetails.bankName : 'Loading...'}</strong></div>
                  <div className="detail-row"><span>Acc Name:</span> <strong>{bankDetails ? bankDetails.accountName : 'Loading...'}</strong></div>
                  <div className="detail-row">
                    <span>Acc Number:</span>
                    <div className="value-with-copy">
                      <strong>{bankDetails ? bankDetails.accountNumber : '...'}</strong>
                      <Tooltip title="Copy account number">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          className="copy-btn"
                          disabled={!bankDetails}
                          onClick={() => handleCopy(bankDetails?.accountNumber || '', 'Account number')}
                        />
                      </Tooltip>
                    </div>
                  </div>
                  <div className="detail-row"><span>Reference:</span> <strong>{user?.email}</strong></div>
                  
                  {bankDetails?.notes && (
                    <div className="detail-row"><span>Notes:</span> <strong style={{color: '#f59e0b'}}>{bankDetails.notes}</strong></div>
                  )}

                  <div className="copy-all-container">
                    <Button
                      type="link"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={copyAllDetails}
                      className="copy-all-btn"
                      disabled={!bankDetails}
                    >
                      Copy All Details
                    </Button>
                  </div>
                </div>
                <button
                  className="confirm-manual-btn"
                  onClick={confirmManualPayment}
                  disabled={loading}
                >
                  {loading ? 'Sending Request...' : 'I Have Made the Transfer'}
                </button>
              </div>
            )}
          </div>

          {/* Hidden PayHere Form */}
          {payhereParams && (
            <form id="payhere-form" method="post" action={payhereParams.payhere_url}>
              <input type="hidden" name="merchant_id" value={payhereParams.merchant_id} />
              <input type="hidden" name="return_url" value={payhereParams.return_url} />
              <input type="hidden" name="cancel_url" value={payhereParams.cancel_url} />
              <input type="hidden" name="notify_url" value={payhereParams.notify_url} />
              <input type="hidden" name="order_id" value={payhereParams.order_id} />
              <input type="hidden" name="items" value={payhereParams.items} />
              <input type="hidden" name="currency" value={payhereParams.currency} />
              <input type="hidden" name="amount" value={payhereParams.amount} />
              <input type="hidden" name="first_name" value={payhereParams.first_name} />
              <input type="hidden" name="last_name" value={payhereParams.last_name} />
              <input type="hidden" name="email" value={payhereParams.email} />
              <input type="hidden" name="phone" value={payhereParams.phone} />
              <input type="hidden" name="address" value={payhereParams.address} />
              <input type="hidden" name="city" value={payhereParams.city} />
              <input type="hidden" name="country" value={payhereParams.country} />
              <input type="hidden" name="hash" value={payhereParams.hash} />
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
