import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { userApi } from '../api';
import { Shield, Upload, CheckCircle, Clock, XCircle, ArrowLeft, MapPin, Phone, UserCheck, FileText, Camera, RefreshCcw, CameraOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Checkbox, Modal, Button, Typography } from 'antd';

import imageCompression from 'browser-image-compression';

const { Title: AntTitle, Paragraph, Text: AntText } = Typography;

export default function VerifyUser() {
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraActiveField, setCameraActiveField] = useState<'nicFront' | 'nicBack' | 'license' | 'selfie' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraOpen]);

  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: '',
  });
  const [files, setFiles] = useState<{ nicFront?: File; nicBack?: File; license?: File; selfie?: File }>({});
  const [previews, setPreviews] = useState<{ nicFront?: string; nicBack?: string; license?: string; selfie?: string }>({});

  const handleFileChange = async (field: 'nicFront' | 'nicBack' | 'license' | 'selfie', file: File | null) => {
    if (!file) return;
    
    try {
      // Compress the image down to 700KB to ensure quick uploads while maintaining quality
      const options = {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Attach metadata for size feedback
      Object.defineProperty(compressedFile, 'originalSize', { value: file.size, writable: true, enumerable: true });
      Object.defineProperty(compressedFile, 'compressedSize', { value: compressedFile.size, writable: true, enumerable: true });
      Object.defineProperty(compressedFile, 'savings', { value: Math.round(((file.size - compressedFile.size) / file.size) * 100), writable: true, enumerable: true });
      
      setFiles((prev) => ({ ...prev, [field]: compressedFile }));
      
      if (previews[field]) URL.revokeObjectURL(previews[field]!);
      setPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(compressedFile) }));
    } catch (err) {
      console.error('Compression failed:', err);
      setFiles((prev) => ({ ...prev, [field]: file }));
      setPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const removeImage = (field: 'nicFront' | 'nicBack' | 'license' | 'selfie', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[field];
      return newFiles;
    });
    
    setPreviews((prev) => {
      if (prev[field]) URL.revokeObjectURL(prev[field]!);
      const newPreviews = { ...prev };
      delete newPreviews[field];
      return newPreviews;
    });
    
    const fileInput = document.getElementById(`file-input-${field}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    const cameraInput = document.getElementById(`camera-input-${field}`) as HTMLInputElement;
    if (cameraInput) cameraInput.value = '';
  };

  // Camera Logic
  const openCamera = (field: 'nicFront' | 'nicBack' | 'license' | 'selfie') => {
    setCameraActiveField(field);
    setCameraFacing(field === 'selfie' ? 'user' : 'environment');
    setIsCameraOpen(true);
    startStream(field === 'selfie' ? 'user' : 'environment');
  };

  const startStream = async (facing: 'user' | 'environment') => {
    setCameraLoading(true);
    setError(''); // Clear previous errors
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('BROWSER_UNSUPPORTED');
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowPermissionModal(true);
      } else if (err.message === 'BROWSER_UNSUPPORTED' || !window.isSecureContext) {
        setError('In-app camera is not supported on this browser or connection. Please use the "Upload" button instead — it will still let you take a photo using your phone\'s native camera.');
      } else {
        setError('Could not start camera. Please ensure no other app is using it and try again, or use the "Upload" button.');
      }
      setIsCameraOpen(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const flipCamera = () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    startStream(newFacing);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setCameraActiveField(null);
  };

  const capturePhoto = () => {
    if (!cameraActiveField || !cameraStream) return;
    
    const video = document.getElementById('camera-preview') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${cameraActiveField}.jpg`, { type: 'image/jpeg' });
        handleFileChange(cameraActiveField, file);
        closeCamera();
      }
    }, 'image/jpeg', 0.95);
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
      await refreshUser();

      // If there's a returnTo URL, redirect back to that page
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }

      setMessage('Documents submitted successfully! You can now book vehicles.');
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
            <p style={{ color: '#047857', margin: '4px 0 0', fontSize: isMobile ? '0.85rem' : '1rem' }}>Your documents have been approved. You can book vehicles and access all features.</p>
          </div>
        </div>
      );
    }

    if (user.verificationStatus === 'pending') {
      return (
        <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fcd34d', borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f59e0b', padding: '14px', borderRadius: '14px', color: 'white' }}><Clock size={28} /></div>
          <div>
            <h3 style={{ color: '#92400e', margin: 0 }}>Documents Under Review</h3>
            <p style={{ color: '#a16207', margin: '4px 0 0' }}>Your documents are being reviewed by our team. You can still book vehicles while we verify your details.</p>
            {returnTo && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(returnTo, { replace: true })}
                style={{ marginTop: '1rem' }}
              >
                Continue Booking →
              </button>
            )}
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

  // Only allow form submission if not pending or approved
  const canSubmit = user?.verificationStatus !== 'pending' && user?.verificationStatus !== 'approved';

  // Determine the back link destination
  const backLink = returnTo || '/dashboard';
  const backLabel = returnTo ? 'Back to Vehicle' : 'Back to Dashboard';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: '2rem' }}>
      <div className="container" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
        <Link to={backLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 600, marginBottom: '1.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
          <ArrowLeft size={18} /> {backLabel}
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1890ff, #096dd9)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white' }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>One-Time Verification</h1>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', fontSize: isMobile ? '0.9rem' : '1rem' }}>
            Upload your identity documents once to start booking vehicles. This is a one-time process — it only takes a minute!
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
                    <style>{`
                      .upload-box-wrapper:hover {
                        border-color: #1890ff;
                        background: #f8fbff;
                        transform: translateY(-2px);
                        box-shadow: 0 8px 16px rgba(24, 144, 255, 0.08);
                      }
                      .upload-box-wrapper:hover .icon-container {
                        background: #e6f7ff;
                        color: #1890ff;
                        transform: scale(1.1);
                      }
                      .action-btn:hover {
                        transform: scale(1.05);
                        filter: brightness(1.1);
                      }
                      .action-btn:active {
                        transform: scale(0.95);
                      }
                      .remove-btn:hover {
                        transform: scale(1.1);
                        background: rgba(220, 38, 38, 0.95) !important;
                      }
                    `}</style>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
                {fileFields.map((f) => (
                  <div key={f.key} className="upload-box-wrapper" style={{
                    border: previews[f.key] ? '2px solid #1890ff' : '2px dashed #cbd5e1',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: previews[f.key] ? '#f0f9ff' : '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}>
                    {/* Hidden Inputs */}
                    <input 
                      id={`file-input-${f.key}`}
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(f.key, e.target.files?.[0] || null)} 
                      style={{ display: 'none' }} 
                    />
                    <input 
                      id={`camera-input-${f.key}`}
                      type="file" 
                      accept="image/*" 
                      capture={f.key === 'selfie' ? 'user' : 'environment'}
                      onChange={(e) => handleFileChange(f.key, e.target.files?.[0] || null)} 
                      style={{ display: 'none' }} 
                    />

                    {/* Interactive Area */}
                    <div style={{ width: '100%', height: '100%' }}>
                      {previews[f.key] ? (
                        <div style={{ position: 'relative', display: 'block' }}>
                          <img src={previews[f.key]} alt={f.label} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                          
                          <div 
                            onClick={(e) => removeImage(f.key, e)}
                            style={{ 
                              position: 'absolute', 
                              top: '12px', 
                              right: '12px', 
                              background: 'rgba(239, 68, 68, 0.9)', 
                              backdropFilter: 'blur(4px)', 
                              color: 'white', 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s'
                            }}
                            title="Remove image"
                            className="remove-btn"
                          >
                            <XCircle size={18} />
                          </div>

                          <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(24, 144, 255, 0.9)', backdropFilter: 'blur(4px)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <CheckCircle size={14} /> {f.label}
                          </div>
                          {files[f.key] && (
                            <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(22, 163, 74, 0.95)', backdropFilter: 'blur(4px)', color: 'white', padding: '6px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'right' }}>
                              <span>{Math.round(files[f.key]!.size / 1024)} KB</span>
                              {(files[f.key] as any).originalSize && (
                                <span style={{ fontSize: '8px', opacity: 0.9, fontWeight: 500 }}>Saved {(files[f.key] as any).savings}% (WebP)</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                          <div style={{ 
                            background: '#f1f5f9', 
                            width: '52px', 
                            height: '52px', 
                            borderRadius: '16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 1rem',
                            color: '#94a3b8',
                          }} className="icon-container">
                            <Upload size={24} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>{f.label}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', marginBottom: '1.25rem' }}>{f.desc}</div>
                          
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <label 
                              htmlFor={`file-input-${f.key}`}
                              className="action-btn" 
                              style={{ 
                                cursor: 'pointer',
                                background: '#1890ff', 
                                color: 'white', 
                                padding: '8px 12px', 
                                borderRadius: '10px', 
                                fontSize: '13px', 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Upload size={14} /> Upload
                            </label>
                            <div 
                              className="action-btn" 
                              onClick={() => openCamera(f.key)}
                              style={{ 
                                cursor: 'pointer',
                                background: '#f1f5f9', 
                                color: '#475569', 
                                padding: '8px 12px', 
                                borderRadius: '10px', 
                                fontSize: '13px', 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Camera size={14} /> Camera
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '16px', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(185, 28, 28, 0.05)' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <XCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                      {error.toLowerCase().includes('camera') || error.toLowerCase().includes('permission') || error.toLowerCase().includes('denied')
                        ? 'Camera Permission Required'
                        : 'Upload Error'}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.5', opacity: 0.9 }}>{error}</div>
                    {(error.includes('denied') || error.includes('permission')) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(185, 28, 28, 0.05)', borderRadius: '8px', fontSize: '13px' }}>
                        <strong>Tip:</strong> If you're on a mobile phone, look for a camera icon in your browser's menu or settings to "Reset Permissions" or check your phone's system settings for the browser.
                      </div>
                    )}
                  </div>
                </div>
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
              {loading ? 'Submitting...' : 'Submit Documents'}
            </button>
          </form>
        )}
      </div>

      <Modal
        title={null}
        open={isCameraOpen}
        onCancel={closeCamera}
        footer={null}
        width={600}
        centered
        bodyStyle={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}
      >
        <div style={{ background: '#000', position: 'relative', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cameraLoading && (
            <div style={{ position: 'absolute', color: 'white', textAlign: 'center' }}>
              <RefreshCcw size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
              <div>Starting Camera...</div>
            </div>
          )}
          
          <video 
            id="camera-preview"
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {!cameraLoading && cameraStream && (
            <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
              <button 
                onClick={closeCamera}
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft size={20} />
              </button>
              
              <button 
                onClick={capturePhoto}
                style={{ background: 'white', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '6px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
              >
                <div style={{ background: '#1890ff', width: '56px', height: '56px', borderRadius: '50%' }} />
              </button>
              
              <button 
                onClick={flipCamera}
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RefreshCcw size={20} />
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: '1rem', background: 'white', textAlign: 'center' }}>
          <AntText strong style={{ fontSize: '16px' }}>Take {fileFields.find(f => f.key === cameraActiveField)?.label}</AntText>
          <div style={{ color: '#64748b', fontSize: '13px' }}>Ensure the document is clear and well-lit</div>
        </div>
      </Modal>

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
          <AntTitle level={3}>Rentify Verification Terms</AntTitle>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }} className="custom-scrollbar">
          <Paragraph>
            By submitting your National Identity Card (NIC), driving licence, selfie photograph, and address details for verification on Rentify, you agree to the following:
          </Paragraph>

          <AntTitle level={5}>1. Purpose</AntTitle>
          <Paragraph>
            These documents are collected only to verify your identity and eligibility to use Rentify as a renter or vehicle owner, in accordance with Sri Lankan law and to ensure platform safety.
          </Paragraph>

          <AntTitle level={5}>2. Data Handling & Security</AntTitle>
          <Paragraph>
            <ul>
              <li>Your documents are stored securely on encrypted servers.</li>
              <li>Access is strictly limited to authorised Rentify administrators and sub-administrators for verification purposes only.</li>
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
              <li>You may request access to, correction of, or deletion of your personal data by emailing support@rentify.lk.</li>
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

      <Modal
        title={null}
        open={showPermissionModal}
        onCancel={() => setShowPermissionModal(false)}
        footer={null}
        centered
        width={400}
        bodyStyle={{ padding: '2rem', textAlign: 'center' }}
      >
        <div style={{ background: '#fef2f2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#ef4444' }}>
          <CameraOff size={32} />
        </div>
        <AntTitle level={4}>Camera Access Denied</AntTitle>
        <Paragraph style={{ color: '#64748b', fontSize: '15px' }}>
          We need camera access to take photos of your documents. Please enable camera permissions in your device or browser settings.
        </Paragraph>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '8px' }}>How to enable:</div>
          <ul style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>iOS (Safari):</strong> Settings {'>'} Safari {'>'} Camera {'>'} Allow</li>
            <li><strong>Android (Chrome):</strong> Site Settings {'>'} Camera {'>'} Allow</li>
            <li><strong>Desktop:</strong> Click the lock icon (🔒) in the address bar and select "Allow".</li>
          </ul>
        </div>
        <Button type="primary" size="large" block onClick={() => setShowPermissionModal(false)} style={{ borderRadius: '10px', height: '48px', fontWeight: 600 }}>
          I Understand
        </Button>
      </Modal>
    </div>
  );
}
