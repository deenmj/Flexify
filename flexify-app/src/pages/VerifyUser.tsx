import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { userApi } from '../api';
import { Shield, Upload, CheckCircle, Clock, XCircle, ArrowLeft, MapPin, Phone, UserCheck, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Checkbox, Modal, Button, Typography } from 'antd';

const { Title: AntTitle, Paragraph, Text: AntText } = Typography;

export default function VerifyUser() {
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: '',
  });
  const [files, setFiles] = useState<{ nicFront?: File; nicBack?: File; license?: File; selfie?: File }>({});
  const [previews, setPreviews] = useState<{ nicFront?: string; nicBack?: string; license?: string; selfie?: string }>({});

  const handleFileChange = (field: 'nicFront' | 'nicBack' | 'license' | 'selfie', file: File | null) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [field]: file }));
    const reader = new FileReader();
    reader.onload = (e) => setPreviews((prev) => ({ ...prev, [field]: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!agreed) {
      setError('You must agree to the Terms & Conditions to proceed');
      return;
    }

    if (!files.nicFront || !files.nicBack || !files.license || !files.selfie) {
      setError('Please upload all 4 required documents');
      return;
    }
    if (!form.address.trim()) {
      setError('Please enter your current address');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nicFront', files.nicFront);
      formData.append('nicBack', files.nicBack);
      formData.append('license', files.license);
      formData.append('selfie', files.selfie);
      formData.append('address', form.address);
      formData.append('fullName', form.fullName);
      formData.append('phone', form.phone);
      formData.append('kycConsentGiven', 'true');

      await userApi.submitKyc(formData);
      setMessage('KYC documents submitted successfully! Please wait for admin approval.');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBanner = () => {
    if (!user) return null;

    if (user.verificationStatus === 'approved') {
      return (
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #6ee7b7', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#10b981', padding: '14px', borderRadius: '14px', color: 'white' }}><CheckCircle size={28} /></div>
          <div>
            <h3 style={{ color: '#065f46', margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Identity Verified</h3>
            <p style={{ color: '#047857', margin: '4px 0 0', fontSize: isMobile ? '0.85rem' : '1rem' }}>Your KYC documents have been approved. You can now book vehicles and access all features.</p>
          </div>
        </div>
      );
    }

    if (user.verificationStatus === 'pending') {
      return (
        <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fcd34d', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f59e0b', padding: '14px', borderRadius: '14px', color: 'white' }}><Clock size={28} /></div>
          <div>
            <h3 style={{ color: '#92400e', margin: 0 }}>Verification Pending</h3>
            <p style={{ color: '#a16207', margin: '4px 0 0' }}>Your documents are being reviewed by our team. This usually takes 1-2 business days.</p>
          </div>
        </div>
      );
    }

    if (user.verificationStatus === 'rejected') {
      return (
        <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fecaca)', border: '1px solid #fca5a5', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ef4444', padding: '14px', borderRadius: '14px', color: 'white' }}><XCircle size={28} /></div>
          <div>
            <h3 style={{ color: '#991b1b', margin: 0 }}>Verification Rejected</h3>
            <p style={{ color: '#b91c1c', margin: '4px 0 0' }}>Your documents were not accepted. Please re-submit with clear, valid documents.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const fileFields: { key: 'nicFront' | 'nicBack' | 'license' | 'selfie'; label: string; desc: string }[] = [
    { key: 'nicFront', label: 'NIC Front', desc: 'Upload the front side of your National Identity Card' },
    { key: 'nicBack', label: 'NIC Back', desc: 'Upload the back side of your National Identity Card' },
    { key: 'license', label: 'Driving License', desc: 'Upload a clear photo of your valid driving license' },
    { key: 'selfie', label: 'Selfie / Photo', desc: 'Take a clear selfie or upload a recent photo of yourself' },
  ];

  const canSubmit = user?.verificationStatus !== 'pending' && user?.verificationStatus !== 'approved';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: '2rem' }}>
      <div className="container" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: '1.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1890ff, #096dd9)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white' }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>KYC Verification</h1>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            Verify your identity to unlock booking features. Upload your documents below for review.
          </p>
        </div>

        {renderStatusBanner()}

        {canSubmit && (
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: isMobile ? '1.25rem' : '2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: '#334155' }}>
                <UserCheck size={20} color="#1890ff" /> Personal Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#475569' }}>Full Name</label>
                  <input className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="As shown on NIC" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#475569' }}>
                    <Phone size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Phone Number
                  </label>
                  <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 7X XXX XXXX" required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#475569' }}>
                  <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Current Address
                </label>
                <textarea className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Enter your full address" rows={3} required style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div className="card" style={{ padding: isMobile ? '1.25rem' : '2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', color: '#334155' }}>
                <Upload size={20} color="#1890ff" /> Upload Documents
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
                {fileFields.map((f) => (
                  <div key={f.key} style={{
                    border: previews[f.key] ? '2px solid #1890ff' : '2px dashed #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: previews[f.key] ? '#f0f9ff' : '#fafafa',
                    transition: 'all 0.2s',
                  }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(f.key, e.target.files?.[0] || null)} style={{ display: 'none' }} />
                      {previews[f.key] ? (
                        <div style={{ position: 'relative' }}>
                          <img src={previews[f.key]} alt={f.label} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: '#1890ff', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                            <CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{f.label}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                          <Upload size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155', marginBottom: '4px' }}>{f.label}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{f.desc}</div>
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
                <span style={{ fontSize: '14px', color: '#475569' }}>
                  I have read and agree to the <a onClick={(e) => { e.preventDefault(); setShowTerms(true); }} style={{ color: '#1890ff', fontWeight: 600 }}>Verification Terms & Conditions</a> and Privacy Policy.
                </span>
              </Checkbox>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', marginBottom: '1rem', fontWeight: 600, fontSize: '14px' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '12px', marginBottom: '1rem', fontWeight: 600, fontSize: '14px' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${!agreed ? 'btn-disabled' : ''}`}
              disabled={loading || !agreed}
              style={{ width: '100%', padding: '1rem', fontSize: '16px', borderRadius: '12px', fontWeight: 700, opacity: agreed ? 1 : 0.6, cursor: agreed ? 'pointer' : 'not-allowed' }}
            >
              {loading ? 'Submitting...' : 'Submit KYC for Verification'}
            </button>
          </form>
        )}
      </div>

      <Modal
        title={null}
        open={showTerms}
        onCancel={() => setShowTerms(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowTerms(false)}>
            I Understand
          </Button>
        ]}
        width={700}
        bodyStyle={{ padding: '2rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: '#e6f7ff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#1890ff' }}>
            <FileText size={24} />
          </div>
          <AntTitle level={3}>Flexify Verification Terms</AntTitle>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }} className="custom-scrollbar">
          <Paragraph>
            By submitting your National Identity Card (NIC), driving licence, selfie photograph, and address details for verification on Flexify, you agree to the following:
          </Paragraph>

          <AntTitle level={5}>1. Purpose</AntTitle>
          <Paragraph>
            These documents are collected only to verify your identity and eligibility to use Flexify as a renter or vehicle owner, in accordance with Sri Lankan law and to ensure platform safety.
          </Paragraph>

          <AntTitle level={5}>2. Data Handling & Security</AntTitle>
          <Paragraph>
            <ul>
              <li>Your documents are stored securely on encrypted servers.</li>
              <li>Access is strictly limited to authorised Flexify administrators and sub-administrators for verification purposes only.</li>
              <li>We do not share your documents with third parties except when required by law or to prevent fraud/abuse.</li>
            </ul>
          </Paragraph>

          <AntTitle level={5}>3. Retention</AntTitle>
          <Paragraph>
            <ul>
              <li>Verified documents are retained for the life of your active account plus 2 years after deletion (for legal and dispute resolution purposes).</li>
              <li>After successful verification, we may retain only a secure reference instead of full images where possible.</li>
            </ul>
          </Paragraph>

          <AntTitle level={5}>4. Your Rights</AntTitle>
          <Paragraph>
            <ul>
              <li>You may request access to, correction of, or deletion of your personal data by emailing support@flexify.lk.</li>
              <li>We will respond within 30 days in line with the Personal Data Protection Act No. 9 of 2022 (PDPA).</li>
              <li>You may withdraw consent at any time, but this may result in suspension of your account or inability to use certain features.</li>
            </ul>
          </Paragraph>

          <AntTitle level={5}>5. Accuracy & Liability</AntTitle>
          <Paragraph>
            <ul>
              <li>You confirm that all submitted information and documents are true, accurate, and belong to you.</li>
              <li>Submitting false or forged documents may lead to permanent account suspension and reporting to relevant authorities.</li>
            </ul>
          </Paragraph>

          <AntTitle level={5}>6. Rejection & Resubmission</AntTitle>
          <Paragraph>
            <ul>
              <li>If verification is rejected, you will be notified by email with a reason and may resubmit corrected documents.</li>
              <li>Repeated rejections may result in account restrictions.</li>
            </ul>
          </Paragraph>

          <AntTitle level={5}>7. Governing Law</AntTitle>
          <Paragraph>
            These terms are governed by the laws of Sri Lanka.
          </Paragraph>

          <AntText type="secondary" italic>
            By checking the box and clicking "Submit Verification", you give your <strong>explicit consent</strong> to the collection, processing, and storage of the submitted personal data for the purposes described above.
          </AntText>
        </div>
      </Modal>
    </div>
  );
}
