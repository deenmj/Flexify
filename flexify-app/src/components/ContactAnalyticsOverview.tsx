import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Select, Button, Tag, Tooltip, Space, Spin, message, Badge } from 'antd';
import { 
  Phone, 
  MessageSquare, 
  TrendingUp, 
  Activity, 
  RotateCcw, 
  Filter, 
  Car, 
  CheckCircle2, 
  BarChart3, 
  LineChart as LineChartIcon,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { adminApi, vehicleApi, getImageUrl, type ContactAnalyticsResponse, type VehicleContactStats } from '../api';

interface ContactAnalyticsOverviewProps {
  district?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  socketConnected?: boolean;
}

export const ContactAnalyticsOverview: React.FC<ContactAnalyticsOverviewProps> = ({
  district = 'All Sri Lanka',
  socketConnected = false,
}) => {
  const [data, setData] = useState<ContactAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'lifetime'>('today');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [testingClickId, setTestingClickId] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await adminApi.getContactAnalytics({
        timeframe,
        vehicleId: selectedVehicleId,
        district: district !== 'All Sri Lanka' ? district : undefined
      });
      setData(res);
      setLastUpdated(new Date());
      if (isSilent) {
        setHighlightPulse(true);
        setTimeout(() => setHighlightPulse(false), 2000);
      }
    } catch (err: any) {
      console.error('Failed to fetch contact analytics:', err);
      if (!isSilent) message.error(err.message || 'Failed to load inquiry analytics');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [timeframe, selectedVehicleId, district]);

  const handleTestClick = async (vehicleId: string, type: 'call' | 'whatsapp', title: string) => {
    setTestingClickId(`${vehicleId}-${type}`);
    try {
      await vehicleApi.trackContactClick(vehicleId, type);
      message.success(`Recorded 1 real ${type === 'call' ? '📞 Call' : '💬 WhatsApp'} click for ${title}`);
      await fetchAnalytics(true);
    } catch (err: any) {
      message.error(err.message || 'Failed to record click');
    } finally {
      setTestingClickId(null);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Selected vehicle object if filtering by one
  const selectedVehicle = useMemo(() => {
    if (!data?.vehicles || selectedVehicleId === 'all') return null;
    return data.vehicles.find(v => v._id === selectedVehicleId) || null;
  }, [data?.vehicles, selectedVehicleId]);

  // Chart data calculations
  const chartPoints = useMemo(() => {
    return data?.chartData || [];
  }, [data?.chartData]);

  const maxVal = useMemo(() => {
    if (!chartPoints.length) return 10;
    const highest = Math.max(...chartPoints.map(p => Math.max(p.calls, p.whatsapp, p.total)));
    return highest <= 5 ? 5 : Math.ceil(highest * 1.25);
  }, [chartPoints]);

  const peakPoint = useMemo(() => {
    if (!chartPoints.length) return null;
    return [...chartPoints].sort((a, b) => b.total - a.total)[0];
  }, [chartPoints]);

  const totalInChart = useMemo(() => {
    return chartPoints.reduce((sum, p) => sum + p.total, 0);
  }, [chartPoints]);

  // SVG dimensions
  const svgWidth = 860;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 24;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const getY = (val: number) => {
    return paddingY + chartH - (val / (maxVal || 1)) * chartH;
  };

  const getX = (index: number) => {
    if (chartPoints.length <= 1) return paddingX + chartW / 2;
    return paddingX + (index / (chartPoints.length - 1)) * chartW;
  };

  // Build curved SVG path
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const callsCoords = useMemo(() => {
    return chartPoints.map((p, idx) => ({ x: getX(idx), y: getY(p.calls) }));
  }, [chartPoints, maxVal]);

  const whatsappCoords = useMemo(() => {
    return chartPoints.map((p, idx) => ({ x: getX(idx), y: getY(p.whatsapp) }));
  }, [chartPoints, maxVal]);

  const callsLinePath = useMemo(() => buildSmoothPath(callsCoords), [callsCoords]);
  const whatsappLinePath = useMemo(() => buildSmoothPath(whatsappCoords), [whatsappCoords]);

  const callsAreaPath = useMemo(() => {
    if (!callsCoords.length) return '';
    const baseBottom = paddingY + chartH;
    return `${callsLinePath} L ${callsCoords[callsCoords.length - 1].x} ${baseBottom} L ${callsCoords[0].x} ${baseBottom} Z`;
  }, [callsLinePath, callsCoords, chartH]);

  const whatsappAreaPath = useMemo(() => {
    if (!whatsappCoords.length) return '';
    const baseBottom = paddingY + chartH;
    return `${whatsappLinePath} L ${whatsappCoords[whatsappCoords.length - 1].x} ${baseBottom} L ${whatsappCoords[0].x} ${baseBottom} Z`;
  }, [whatsappLinePath, whatsappCoords, chartH]);

  const callsToday = data?.today?.calls || 0;
  const whatsappToday = data?.today?.whatsapp || 0;
  const totalToday = data?.today?.total || 0;
  const totalYesterday = data?.today?.totalYesterday || 0;
  const growthPercent = totalYesterday > 0 
    ? Math.round(((totalToday - totalYesterday) / totalYesterday) * 100)
    : totalToday > 0 ? 100 : 0;

  const whatsappRatio = totalToday > 0 ? Math.round((whatsappToday / totalToday) * 100) : 50;
  const callsRatio = 100 - whatsappRatio;

  return (
    <div style={{
      marginBottom: '2.5rem',
      borderRadius: '16px',
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative subtle ambient lights */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 180,
        height: 180,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, rgba(255,255,255,0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 20,
        left: '30%',
        width: 250,
        height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.07) 0%, rgba(255,255,255,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
            }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Calls & WhatsApp Inquiry Analytics
                </h3>
                <Tag color="success" style={{ borderRadius: '12px', padding: '1px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Live Inquiries
                </Tag>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                Monitor how many calls and WhatsApp messages came for specific vehicles in rental.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Specific Vehicle Selector */}
          <div style={{ minWidth: 260 }}>
            <Select
              showSearch
              placeholder="Search or Select Vehicle..."
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
              style={{ width: '100%' }}
              optionFilterProp="label"
              suffixIcon={<Car size={15} style={{ color: '#64748b' }} />}
              options={[
                { value: 'all', label: '🚗 All Rental Vehicles (Platform-Wide)' },
                ...(data?.vehicles || []).map(v => ({
                  value: v._id,
                  label: `${v.title} ${v.registrationNumber ? `(${v.registrationNumber})` : ''} — ${v.totalToday > 0 ? `🔥 ${v.totalToday} today` : `${v.totalLifetime} total`}`
                }))
              ]}
            />
          </div>

          {/* Timeframe Buttons */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setTimeframe('today')}
              style={{
                border: 'none',
                background: timeframe === 'today' ? '#ffffff' : 'transparent',
                color: timeframe === 'today' ? '#0f172a' : '#64748b',
                fontWeight: timeframe === 'today' ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: timeframe === 'today' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Today (Hourly)
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              style={{
                border: 'none',
                background: timeframe === '7d' ? '#ffffff' : 'transparent',
                color: timeframe === '7d' ? '#0f172a' : '#64748b',
                fontWeight: timeframe === '7d' ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: timeframe === '7d' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              style={{
                border: 'none',
                background: timeframe === '30d' ? '#ffffff' : 'transparent',
                color: timeframe === '30d' ? '#0f172a' : '#64748b',
                fontWeight: timeframe === '30d' ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: timeframe === '30d' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeframe('lifetime')}
              style={{
                border: 'none',
                background: timeframe === 'lifetime' ? '#ffffff' : 'transparent',
                color: timeframe === 'lifetime' ? '#0f172a' : '#64748b',
                fontWeight: timeframe === 'lifetime' ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: timeframe === 'lifetime' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Lifetime
            </button>
          </div>

          {/* Refresh Button */}
          <Tooltip title={`Last synced: ${lastUpdated.toLocaleTimeString()}`}>
            <Button
              icon={<RotateCcw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => fetchAnalytics(false)}
              size="middle"
              style={{ borderRadius: '8px' }}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Selected Vehicle Filter Banner if a single vehicle is active */}
      {selectedVehicle && (
        <div style={{
          background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedVehicle.image ? (
              <img
                src={getImageUrl(selectedVehicle.image)}
                alt={selectedVehicle.title}
                style={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
              />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={22} color="#64748b" />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{selectedVehicle.title}</span>
                {selectedVehicle.registrationNumber && (
                  <Tag color="geekblue" style={{ fontSize: '11px', fontWeight: 600 }}>{selectedVehicle.registrationNumber}</Tag>
                )}
                {selectedVehicle.district && (
                  <Tag color="cyan" style={{ fontSize: '11px' }}>{selectedVehicle.district}</Tag>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '12px' }}>
                <span>Owner: <strong>{selectedVehicle.ownerName}</strong> ({selectedVehicle.ownerPhone || 'No phone'})</span>
                <span>•</span>
                <span>Lifetime: <strong>{selectedVehicle.callsLifetime} calls</strong>, <strong>{selectedVehicle.whatsappLifetime} whatsapp</strong></span>
              </div>
            </div>
          </div>

          <Button
            size="small"
            type="link"
            danger
            onClick={() => setSelectedVehicleId('all')}
            style={{ fontWeight: 600 }}
          >
            Clear Filter (Show All Vehicles)
          </Button>
        </div>
      )}

      {/* Hero Metric Cards (Today Focus) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Phone Calls Today */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Phone Calls Today</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Phone size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              {callsToday}
            </span>
            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: '#eff6ff', padding: '2px 8px', borderRadius: '10px' }}>
              📞 Calls
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            All-time: <strong style={{ color: '#475569' }}>{data?.lifetime?.calls || 0}</strong> calls recorded
          </div>
        </div>

        {/* Card 2: WhatsApp Messages Today */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #bbf7d0',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>WhatsApp Messages Today</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#14532d', letterSpacing: '-0.02em' }}>
              {whatsappToday}
            </span>
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
              💬 WhatsApp
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            All-time: <strong style={{ color: '#475569' }}>{data?.lifetime?.whatsapp || 0}</strong> messages
          </div>
        </div>

        {/* Card 3: Total Combined Today */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Total Inquiries Today</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#f3e8ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {totalToday}
            </span>
            {growthPercent !== 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: growthPercent >= 0 ? '#16a34a' : '#dc2626',
                background: growthPercent >= 0 ? '#dcfce7' : '#fee2e2',
                padding: '2px 6px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`} vs yest.
              </span>
            )}
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
              <span>💬 {whatsappRatio}% WhatsApp</span>
              <span>📞 {callsRatio}% Calls</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: `${whatsappRatio}%`, background: '#22c55e', transition: 'width 0.3s' }} />
              <div style={{ width: `${callsRatio}%`, background: '#3b82f6', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Peak Activity / Quick Conversion Insight */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          padding: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>Peak Activity Time</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a', marginTop: '4px' }}>
            {peakPoint && peakPoint.total > 0 ? (
              <span>{peakPoint.label} <small style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3b82f6' }}>({peakPoint.total} leads)</small></span>
            ) : (
              <span style={{ fontSize: '1rem', color: '#64748b' }}>No inquiries yet</span>
            )}
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>
            {timeframe === 'today' 
              ? 'Highest customer interaction hour recorded today'
              : timeframe === 'lifetime'
              ? 'Month with the highest inquiry volume'
              : 'Day with the highest inquiry volume'}
          </p>
        </div>
      </div>

      {/* Main Interactive Graph Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '20px 20px 16px 20px',
        marginBottom: '24px'
      }}>
        {/* Graph Header / Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                {timeframe === 'today' && 'Today’s Hourly Inquiry Trend (24 Hours)'}
                {timeframe === '7d' && 'Inquiry Activity Over Past 7 Days'}
                {timeframe === '30d' && 'Inquiry Activity Over Past 30 Days'}
                {timeframe === 'lifetime' && 'Lifetime Inquiry Activity (All-Time History)'}
              </h4>
              {selectedVehicle && (
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  Filter: {selectedVehicle.title}
                </Tag>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Hover over points to see exact call vs WhatsApp numbers at each interval.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Chart Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#2563eb', display: 'inline-block' }} />
                <span style={{ color: '#334155', fontWeight: 600 }}>📞 Calls ({callsToday})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#16a34a', display: 'inline-block' }} />
                <span style={{ color: '#334155', fontWeight: 600 }}>💬 WhatsApp ({whatsappToday})</span>
              </div>
            </div>

            {/* Chart style toggle (Area vs Bar) */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setChartType('area')}
                title="Smooth Waves Graph"
                style={{
                  border: 'none',
                  background: chartType === 'area' ? '#ffffff' : 'transparent',
                  color: chartType === 'area' ? '#0f172a' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: chartType === 'area' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <LineChartIcon size={14} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                title="Bar Chart"
                style={{
                  border: 'none',
                  background: chartType === 'bar' ? '#ffffff' : 'transparent',
                  color: chartType === 'bar' ? '#0f172a' : '#64748b',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: chartType === 'bar' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <BarChart3 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Chart Canvas */}
        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="Analyzing customer inquiry trends..." />
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
            {totalInChart === 0 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(2px)',
                borderRadius: '8px',
                zIndex: 4,
                padding: '16px'
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  color: '#64748b'
                }}>
                  <Activity size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                  0 Inquiries Recorded {timeframe === 'today' ? 'Today' : timeframe === 'lifetime' ? 'in Platform History' : 'in this timeframe'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', maxWidth: 400, textAlign: 'center' }}>
                  Real-time calls and WhatsApp message clicks will plot here as visitors click contact buttons on rental vehicles.
                </div>
              </div>
            )}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: 600, display: 'block', overflow: 'visible' }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {/* Calls Blue Gradient */}
                <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>

                {/* WhatsApp Green Gradient */}
                <linearGradient id="whatsappGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>

                {/* Drop shadow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = paddingY + chartH * (1 - pct);
                const val = Math.round(maxVal * pct);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={paddingX + chartW}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={pct === 0 ? 'none' : '4 4'}
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area Waves View */}
              {chartType === 'area' && (
                <>
                  {/* WhatsApp Area & Line */}
                  <path d={whatsappAreaPath} fill="url(#whatsappGrad)" />
                  <path
                    d={whatsappLinePath}
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />

                  {/* Calls Area & Line */}
                  <path d={callsAreaPath} fill="url(#callsGrad)" />
                  <path
                    d={callsLinePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />

                  {/* Dots on points */}
                  {chartPoints.map((p, idx) => {
                    const cx = getX(idx);
                    const cyW = getY(p.whatsapp);
                    const cyC = getY(p.calls);
                    const isHovered = hoveredIndex === idx;

                    return (
                      <g key={idx}>
                        {/* WhatsApp dot */}
                        {p.whatsapp > 0 && (
                          <circle
                            cx={cx}
                            cy={cyW}
                            r={isHovered ? 6 : 3.5}
                            fill="#16a34a"
                            stroke="#ffffff"
                            strokeWidth="2"
                            style={{ transition: 'all 0.15s ease' }}
                          />
                        )}
                        {/* Calls dot */}
                        {p.calls > 0 && (
                          <circle
                            cx={cx}
                            cy={cyC}
                            r={isHovered ? 6 : 3.5}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth="2"
                            style={{ transition: 'all 0.15s ease' }}
                          />
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Bar Chart View */}
              {chartType === 'bar' && (
                <g>
                  {chartPoints.map((p, idx) => {
                    const cx = getX(idx);
                    const barW = Math.max(4, Math.min(16, (chartW / chartPoints.length) * 0.35));
                    const bottomY = paddingY + chartH;

                    const heightC = (p.calls / (maxVal || 1)) * chartH;
                    const heightW = (p.whatsapp / (maxVal || 1)) * chartH;

                    return (
                      <g key={idx}>
                        {/* Calls Bar (Blue) */}
                        <rect
                          x={cx - barW - 1}
                          y={bottomY - heightC}
                          width={barW}
                          height={Math.max(1, heightC)}
                          fill="#3b82f6"
                          rx="2"
                          opacity={hoveredIndex === idx ? 1 : 0.85}
                        />
                        {/* WhatsApp Bar (Green) */}
                        <rect
                          x={cx + 1}
                          y={bottomY - heightW}
                          width={barW}
                          height={Math.max(1, heightW)}
                          fill="#22c55e"
                          rx="2"
                          opacity={hoveredIndex === idx ? 1 : 0.85}
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Interactive Hover Guides & Slices */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const isHovered = hoveredIndex === idx;
                const sliceW = chartW / chartPoints.length;

                return (
                  <g key={`slice-${idx}`}>
                    {/* Invisible full-height hit area for mouse hover */}
                    <rect
                      x={cx - sliceW / 2}
                      y={paddingY}
                      width={sliceW}
                      height={chartH}
                      fill="transparent"
                      cursor="pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />

                    {/* Guide line on hover */}
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={paddingY}
                        x2={cx}
                        y2={paddingY + chartH}
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const isHourly = timeframe === 'today';
                // Show labels at reasonable intervals to avoid clutter
                const shouldShow = isHourly
                  ? idx % 3 === 0 || idx === chartPoints.length - 1
                  : timeframe === '30d'
                  ? idx % 4 === 0 || idx === chartPoints.length - 1
                  : timeframe === 'lifetime'
                  ? chartPoints.length > 12 ? idx % 2 === 0 || idx === chartPoints.length - 1 : true
                  : true;

                if (!shouldShow) return null;

                return (
                  <text
                    key={`label-${idx}`}
                    x={cx}
                    y={paddingY + chartH + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill={hoveredIndex === idx ? '#0f172a' : '#64748b'}
                    fontWeight={hoveredIndex === idx ? 700 : 500}
                    fontFamily="sans-serif"
                  >
                    {p.label}
                  </text>
                );
              })}
            </svg>

            {/* Floating Glassmorphism Tooltip when hovered */}
            {hoveredIndex !== null && chartPoints[hoveredIndex] && (
              (() => {
                const p = chartPoints[hoveredIndex];
                const leftPos = (getX(hoveredIndex) / svgWidth) * 100;
                return (
                  <div style={{
                    position: 'absolute',
                    top: 15,
                    left: `${Math.min(85, Math.max(15, leftPos))}%`,
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    minWidth: 170,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#93c5fd', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px', marginBottom: '6px' }}>
                      ⏱️ {p.label} {timeframe === 'today' ? 'Today' : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📞 Calls:
                      </span>
                      <strong style={{ color: '#ffffff' }}>{p.calls}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💬 WhatsApp:
                      </span>
                      <strong style={{ color: '#ffffff' }}>{p.whatsapp}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '4px', marginTop: '4px' }}>
                      <span style={{ color: '#cbd5e1' }}>Total Inquiries:</span>
                      <strong style={{ color: '#facc15' }}>{p.total}</strong>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Specific Vehicles In Rental Activity Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={16} style={{ color: '#3b82f6' }} />
              Rental Vehicles Inquiry Breakdown (Calls & WhatsApp)
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Click "View Graph" on any vehicle to visualize its specific inquiries over time.
            </span>
          </div>

          {selectedVehicleId !== 'all' && (
            <Button
              size="small"
              onClick={() => setSelectedVehicleId('all')}
              style={{ fontSize: '12px' }}
            >
              Reset to All Vehicles
            </Button>
          )}
        </div>

        {/* Scrollable table of vehicles */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Vehicle</th>
                <th style={{ padding: '10px 12px' }}>Owner</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Calls Today</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>WhatsApp Today</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Today</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>All-Time (Public Explore)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.vehicles || data.vehicles.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No rental vehicles found matching this filter.
                  </td>
                </tr>
              ) : (
                data.vehicles.slice(0, 15).map((v) => {
                  const isSelected = selectedVehicleId === v._id;
                  return (
                    <tr
                      key={v._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f0f9ff' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Vehicle Column */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {v.image ? (
                            <img
                              src={getImageUrl(v.image)}
                              alt={v.title}
                              style={{ width: 40, height: 40, borderRadius: '6px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Car size={18} color="#94a3b8" />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{v.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {v.registrationNumber && <Tag color="default" style={{ fontSize: '10px', padding: '0 4px', marginRight: 4 }}>{v.registrationNumber}</Tag>}
                              {v.district && <span>{v.district}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Column */}
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        <div style={{ fontWeight: 500 }}>{v.ownerName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{v.ownerPhone || '—'}</div>
                      </td>

                      {/* Calls Today */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <Tag color={v.callsToday > 0 ? 'blue' : 'default'} style={{ borderRadius: '10px', fontWeight: 600 }}>
                          📞 {v.callsToday}
                        </Tag>
                      </td>

                      {/* WhatsApp Today */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <Tag color={v.whatsappToday > 0 ? 'green' : 'default'} style={{ borderRadius: '10px', fontWeight: 600 }}>
                          💬 {v.whatsappToday}
                        </Tag>
                      </td>

                      {/* Total Today */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: v.totalToday > 0 ? '#0f172a' : '#94a3b8',
                          background: v.totalToday > 0 ? '#fef3c7' : 'transparent',
                          padding: v.totalToday > 0 ? '2px 8px' : '0',
                          borderRadius: '8px'
                        }}>
                          {v.totalToday > 0 ? `🔥 ${v.totalToday}` : 0}
                        </span>
                      </td>

                      {/* All-time Total (Matches Explore Page) */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>
                            {v.totalLifetime} Total
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            📞 {v.callsLifetime} · 💬 {v.whatsappLifetime}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Space size="small">
                          <Tooltip title="Test: Increment 1 real Call click for this vehicle">
                            <Button
                              size="small"
                              loading={testingClickId === `${v._id}-call`}
                              onClick={() => handleTestClick(v._id, 'call', v.title)}
                              style={{ fontSize: '11px', color: '#2563eb', borderColor: '#bfdbfe', borderRadius: '6px' }}
                            >
                              +1 Call
                            </Button>
                          </Tooltip>
                          <Tooltip title="Test: Increment 1 real WhatsApp click for this vehicle">
                            <Button
                              size="small"
                              loading={testingClickId === `${v._id}-whatsapp`}
                              onClick={() => handleTestClick(v._id, 'whatsapp', v.title)}
                              style={{ fontSize: '11px', color: '#16a34a', borderColor: '#bbf7d0', borderRadius: '6px' }}
                            >
                              +1 WA
                            </Button>
                          </Tooltip>
                          <Button
                            size="small"
                            type={isSelected ? 'primary' : 'default'}
                            onClick={() => setSelectedVehicleId(isSelected ? 'all' : v._id)}
                            style={{
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: isSelected ? '#2563eb' : undefined
                            }}
                          >
                            {isSelected ? 'Active Filter' : 'View Graph'}
                          </Button>
                        </Space>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContactAnalyticsOverview;
