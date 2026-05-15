import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Check, Shield, Zap, AlertCircle, Clock, Info, CreditCard, Landmark, ArrowLeft, Loader2, Crown, Sparkles } from 'lucide-react';
import { ownerApi, bankDetailsApi, type BankDetailsData } from '../api';
import './SubscriptionManagement.css';
import { notification, message, Button, Tooltip, Upload } from 'antd';
import { CopyOutlined, UploadOutlined, FileImageOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    description: 'Get started with 2 vehicle listings',
    features: [
      '2 vehicle listings',
      'Basic search visibility',
      'Email notifications',
      'Reviews & ratings',
    ],
    icon: <Shield className="plan-icon" />,
    color: '#64748b',
    limit: '2 Vehicles',
    popular: false,
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 990,
    description: 'Perfect for growing vehicle owners',
    features: [
      'Up to 8 vehicle listings',
      'Boosted search visibility',
      'Email notifications',
      'Standard badge on listings',
      'Reviews & ratings',
    ],
    icon: <Zap className="plan-icon" style={{ color: '#f59e0b' }} />,
    color: '#f59e0b',
    limit: '8 Vehicles',
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 2490,
    description: 'For serious rental businesses',
    features: [
      'Unlimited vehicle listings',
      'Top priority in search results',
      'Pro badge on all listings',
      'Email notifications',
      'Reviews highlighted',
    ],
    icon: <Crown className="plan-icon pro" />,
    color: '#6610f2',
    limit: 'Unlimited',
    popular: true,
  }
];

const SubscriptionManagement: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'BANK'>('BANK');
  const [payhereParams, setPayhereParams] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailsData | null>(null);
  const [receiptFile, setReceiptFile] = useState<any>(null);

  const sub = user?.subscription || { tier: 'FREE', status: 'free', endDate: null };
  const isFree = sub.status === 'free' || sub.tier === 'FREE';
  const isExpired = sub.status === 'expired';
  const isActive = sub.status === 'active';

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
    if (plan.id === 'FREE') return; // Can't "buy" free
    if (!user) {
      navigate('/auth', { state: { returnTo: '/subscription' } });
      return;
    }
    setSelectedTier(plan);
    setShowPayment(true);
  };

  const handlePayHere = async () => {
    setLoading(true);
    try {
      const params = await ownerApi.getPayHereParams(selectedTier.id, 'MONTHLY', selectedTier.price);
      setPayhereParams(params);

      setTimeout(() => {
        (document.getElementById('payhere-form') as HTMLFormElement).submit();
      }, 100);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to initiate payment' });
      setLoading(false);
    }
  };

  const confirmManualPayment = async () => {
    if (!selectedTier) return;
    if (!receiptFile) {
      message.error('Please upload your payment receipt');
      return;
    }

    setLoading(true);
    try {
      let compressedFile = receiptFile;
      if (receiptFile.type.startsWith('image/')) {
        const imageCompression = (await import('browser-image-compression')).default;
        compressedFile = await imageCompression(receiptFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
      }

      const formData = new FormData();
      formData.append('tier', selectedTier.id);
      formData.append('duration', 'MONTHLY');
      formData.append('amount', selectedTier.price.toString());
      formData.append('reference', user?.email || 'Unknown');
      formData.append('receipt', compressedFile);

      const res = await ownerApi.initiateSubscription(formData);

      setStatusMessage({ type: 'success', text: res.message });
      setShowPayment(false);
      setReceiptFile(null);
      await refreshUser();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to send request' });
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

  const getButtonLabel = (plan: any) => {
    if (plan.id === 'FREE') {
      if (isFree) return 'Current Plan';
      return 'Downgrade';
    }
    if (plan.id === sub.tier && !isExpired) return 'Active Plan';
    if (isExpired) return 'Subscribe Now';
    if (plan.id === sub.tier) return 'Renew';
    // If upgrading
    const planIndex = PLANS.findIndex(p => p.id === plan.id);
    const currentIndex = PLANS.findIndex(p => p.id === sub.tier);
    return planIndex > currentIndex ? 'Upgrade' : 'Switch Plan';
  };

  return (
    <div className="subscription-container">
      <SEO 
        title="Subscription Plans — Rentify Vehicle Owner"
        description="Upgrade your Rentify vehicle owner account to list more vehicles and get priority support."
        noindex={true}
      />
      <div className="subscription-header">
        <div className="sub-header-icon"><Sparkles size={28} /></div>
        <h1>Pricing Plans</h1>
        <p>Choose the perfect plan for your rental business</p>
      </div>

      {/* Current Status Banner */}
      <div className={`status-banner ${sub.status}`}>
        <div className="status-info">
          {isFree ? <Shield size={22} /> : isExpired ? <AlertCircle size={22} /> : <Zap size={22} />}
          <div>
            <h3>
              {isFree ? 'Free Plan' : isExpired ? 'Plan Expired' : 'Plan Active'}
              <span className="tier-badge" style={{ background: PLANS.find(p => p.id === sub.tier)?.color || '#64748b' }}>{sub.tier}</span>
            </h3>
            <p>
              {isFree
                ? 'You can list up to 2 vehicles for free. Upgrade anytime!'
                : isExpired
                ? 'Your plan has expired. Renew or your listings will be hidden.'
                : `Your plan is active${daysLeft !== null ? ` — ${daysLeft} days remaining` : ''}.`}
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`message-banner ${statusMessage.type}`}>
          {statusMessage.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {!showPayment ? (
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.id === sub.tier && !isExpired ? 'active' : ''} ${plan.popular ? 'popular' : ''}`}
              style={{ '--accent-color': plan.color } as React.CSSProperties}
            >
              {plan.popular && <div className="popular-label">Most Popular</div>}
              {plan.id === sub.tier && !isExpired && <div className="current-label">Current</div>}
              
              <div className="plan-icon-wrapper">{plan.icon}</div>
              <h2 className="plan-name">{plan.name}</h2>

              <div className="plan-price">
                {plan.price === 0 ? (
                  <>Free<span className="duration"> forever</span></>
                ) : (
                  <>LKR {plan.price.toLocaleString()}<span className="duration">/mo</span></>
                )}
              </div>

              <p className="plan-desc">{plan.description}</p>
              <div className="plan-limit-info"><Info size={14} /> {plan.limit}</div>

              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}><Check size={16} /> {feature}</li>
                ))}
              </ul>

              <button
                className={`plan-button ${plan.popular ? 'plan-button-popular' : ''}`}
                disabled={loading || (plan.id === sub.tier && !isExpired) || (plan.id === 'FREE' && isFree)}
                onClick={() => handleRequestUpgrade(plan)}
              >
                {getButtonLabel(plan)}
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
                <span className="value">LKR {selectedTier.price.toLocaleString()}</span>
              </div>
              <p className="duration-text">Monthly subscription</p>
            </div>

            <div className="method-selector">
              <div
                className={`method-option ${paymentMethod === 'CARD' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={20} />
                <div>
                  <strong>Online Payment (Coming Soon)</strong>
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
                  className="pay-now-btn coming-soon-disabled"
                  onClick={() => message.info("Online payment is coming soon. Please use Bank Transfer for now.")}
                  disabled={true}
                >
                  Coming Soon
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

                <div className="receipt-upload-section">
                  <p className="upload-label">Upload Payment Receipt <span className="required">*</span></p>
                  <Upload
                    beforeUpload={(file) => {
                      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf';
                      if (!isJpgOrPng) {
                        message.error('You can only upload JPG/PNG images or PDF files!');
                      }
                      const isLt5M = file.size / 1024 / 1024 < 5;
                      if (!isLt5M) {
                        message.error('Image must be smaller than 5MB!');
                      }
                      if (isJpgOrPng && isLt5M) {
                        setReceiptFile(file);
                      }
                      return false;
                    }}
                    fileList={receiptFile ? [receiptFile] : []}
                    onRemove={() => setReceiptFile(null)}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} className="upload-trigger-btn">
                      {receiptFile ? 'Change Receipt' : 'Choose File'}
                    </Button>
                  </Upload>
                  {receiptFile && (
                    <div className="file-preview-info">
                      <FileImageOutlined /> <span>{receiptFile.name}</span>
                    </div>
                  )}
                  <p className="upload-hint">Format: JPG, PNG, PDF (Max 5MB)</p>
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
