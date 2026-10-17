// flexify-app/src/components/TrafficAnalyticsOverview.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Tag, Tooltip, Space, Spin, Button, Progress, Table, Alert } from 'antd';
import {
  Globe,
  Users,
  Eye,
  Target,
  Smartphone,
  RotateCcw,
  TrendingUp,
  Share2,
  ExternalLink,
  HelpCircle,
  Laptop
} from 'lucide-react';
import { adminApi, type TrafficAnalyticsResponse } from '../api';

export const TrafficAnalyticsOverview: React.FC = () => {
  const [data, setData] = useState<TrafficAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'lifetime'>('7d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showAdGuide, setShowAdGuide] = useState<boolean>(false);

  const fetchTraffic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTrafficAnalytics(timeframe);
      setData(res);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load traffic analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  const summary = data?.summary || {
    visitorsToday: 0,
    pageViewsToday: 0,
    fbAdsToday: 0,
    visitors7d: 0,
    pageViews7d: 0,
    fbAds7d: 0,
    visitors30d: 0,
    pageViews30d: 0,
    fbAds30d: 0,
    totalAllTime: 0,
    mobilePercent: 100,
  };

  const chartPoints = useMemo(() => data?.chartData || [], [data?.chartData]);

  const maxVal = useMemo(() => {
    if (!chartPoints.length) return 10;
    const highest = Math.max(...chartPoints.map(p => Math.max(p.pageViews, p.visitors, p.fbAds)));
    return highest <= 5 ? 5 : Math.ceil(highest * 1.25);
  }, [chartPoints]);

  const peakPoint = useMemo(() => {
    if (!chartPoints.length) return null;
    return [...chartPoints].sort((a, b) => b.pageViews - a.pageViews)[0];
  }, [chartPoints]);

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2 - 20;

  const getX = (idx: number) => {
    if (chartPoints.length <= 1) return paddingX + chartW / 2;
    return paddingX + (idx / (chartPoints.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const ratio = Math.min(1, Math.max(0, val / (maxVal || 1)));
    return paddingY + chartH - ratio * chartH;
  };

  const buildPath = (key: 'pageViews' | 'visitors' | 'fbAds') => {
    if (!chartPoints.length) return '';
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p[key])}`)
      .join(' ');
  };

  const pageViewsLine = useMemo(() => buildPath('pageViews'), [chartPoints, maxVal]);
  const visitorsLine = useMemo(() => buildPath('visitors'), [chartPoints, maxVal]);
  const fbAdsLine = useMemo(() => buildPath('fbAds'), [chartPoints, maxVal]);

  const pageViewsArea = useMemo(() => {
    if (!chartPoints.length) return '';
    const baseBottom = paddingY + chartH;
    const lastX = getX(chartPoints.length - 1);
    const firstX = getX(0);
    return `${pageViewsLine} L ${lastX} ${baseBottom} L ${firstX} ${baseBottom} Z`;
  }, [pageViewsLine, chartPoints]);

  return (
    <div style={{
      marginTop: '2.5rem',
      marginBottom: '2.5rem',
      borderRadius: '16px',
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
      padding: '24px',
      position: 'relative'
    }}>
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
              background: 'linear-gradient(135deg, #1877F2 0%, #0284c7 100%)',
              color: '#fff',
              boxShadow: '0 4px 10px rgba(24, 119, 242, 0.25)'
            }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Website Traffic &amp; Facebook Ads Analytics
                </h3>
                <Tag color="processing" style={{ borderRadius: '12px', padding: '1px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1877F2', display: 'inline-block' }} />
                  Live Visitor Attribution
                </Tag>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                Track real visitors, page views, and ad clicks driven by Facebook Ads campaigns.
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {(['today', '7d', '30d', 'lifetime'] as const).map((t) => {
              const labels = {
                today: 'Today',
                '7d': 'Past 7 Days',
                '30d': 'Past 30 Days',
                lifetime: 'Lifetime',
              };
              const active = timeframe === t;
              return (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    fontWeight: active ? 700 : 500,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          <Tooltip title={`Last synced: ${lastUpdated.toLocaleTimeString()}`}>
            <Button
              icon={<RotateCcw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={fetchTraffic}
              size="middle"
              style={{ borderRadius: '8px' }}
            >
              Refresh
            </Button>
          </Tooltip>

          <Button
            type="dashed"
            icon={<HelpCircle size={14} />}
            onClick={() => setShowAdGuide(!showAdGuide)}
            style={{ borderRadius: '8px', borderColor: '#3b82f6', color: '#1d4ed8' }}
          >
            FB Ads URL Setup
          </Button>
        </div>
      </div>

      {/* Facebook Ads UTM Guide Drawer/Alert */}
      {showAdGuide && (
        <Alert
          type="info"
          showIcon
          closable
          onClose={() => setShowAdGuide(false)}
          style={{ marginBottom: '20px', borderRadius: '10px', border: '1px solid #bfdbfe' }}
          message={<strong>How to Track Facebook Ads Automatically</strong>}
          description={
            <div style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: 1.6 }}>
              <p style={{ margin: '4px 0' }}>
                When setting up your Facebook or Instagram Ad in Meta Ads Manager, append campaign tags to your Website Destination URL:
              </p>
              <div style={{
                background: '#1e293b',
                color: '#38bdf8',
                padding: '8px 12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                margin: '6px 0',
                wordBreak: 'break-all'
              }}>
                https://yourdomain.com/explore?utm_source=facebook&amp;utm_medium=paid&amp;utm_campaign=kandy_cars
              </div>
              <ul style={{ paddingLeft: '18px', margin: '4px 0' }}>
                <li><strong>utm_source=facebook</strong> — Categorizes traffic under Facebook Ads.</li>
                <li><strong>utm_campaign=your_campaign_name</strong> — Groups traffic under your campaign name in the table below.</li>
                <li>Meta also automatically attaches <strong>fbclid</strong> to all ad clicks, which this system identifies automatically.</li>
              </ul>
            </div>
          }
        />
      )}

      {/* 4 Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Visitors Today */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>Unique Visitors Today</span>
            <div style={{ background: '#16a34a', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#14532d', marginTop: '6px' }}>
            {summary.visitorsToday}
          </div>
          <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
            Past 7 Days: <strong>{summary.visitors7d}</strong> visitors
          </div>
        </div>

        {/* Page Views Today */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>Page Views Today</span>
            <div style={{ background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Eye size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a', marginTop: '6px' }}>
            {summary.pageViewsToday}
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', marginTop: '4px' }}>
            Past 7 Days: <strong>{summary.pageViews7d}</strong> page views
          </div>
        </div>

        {/* Facebook Ads Clicks Today */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
          border: '1px solid #c7d2fe',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4338ca' }}>Facebook Ads Visitors Today</span>
            <div style={{ background: '#1877F2', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Target size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#312e81', marginTop: '6px' }}>
            {summary.fbAdsToday}
          </div>
          <div style={{ fontSize: '12px', color: '#3730a3', marginTop: '4px' }}>
            Past 7 Days: <strong>{summary.fbAds7d}</strong> FB ad visitors
          </div>
        </div>

        {/* Device Breakdown */}
        <div style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          border: '1px solid #fef08a',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#a16207' }}>Mobile Traffic Share</span>
            <div style={{ background: '#eab308', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Smartphone size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#713f12', marginTop: '6px' }}>
            {summary.mobilePercent}%
          </div>
          <div style={{ fontSize: '12px', color: '#854d0e', marginTop: '4px' }}>
            Desktop: <strong>{100 - summary.mobilePercent}%</strong>
          </div>
        </div>
      </div>

      {/* Main Traffic Trend Graph */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '20px 20px 16px 20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              {timeframe === 'today' && 'Today’s Hourly Traffic (24 Hours)'}
              {timeframe === '7d' && 'Website Traffic Over Past 7 Days'}
              {timeframe === '30d' && 'Website Traffic Over Past 30 Days'}
              {timeframe === 'lifetime' && 'Monthly Traffic History (Lifetime)'}
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Hover over points to see Page Views, Unique Visitors, and Facebook Ad clicks.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#2563eb', display: 'inline-block' }} />
              <span style={{ color: '#475569', fontWeight: 500 }}>Page Views</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#16a34a', display: 'inline-block' }} />
              <span style={{ color: '#475569', fontWeight: 500 }}>Unique Visitors</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#1877F2', display: 'inline-block' }} />
              <span style={{ color: '#475569', fontWeight: 500 }}>Facebook Ads</span>
            </div>
          </div>
        </div>

        {/* SVG Chart Area */}
        <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
          {loading && !data ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><Spin tip="Loading traffic data..." /></div>
          ) : chartPoints.length === 0 || maxVal === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Globe size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <div style={{ fontWeight: 600 }}>0 Traffic Recorded in this timeframe</div>
              <div style={{ fontSize: '12px' }}>Visits will appear here live as users open the website.</div>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: 600, display: 'block', overflow: 'visible' }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="pvAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = paddingY + chartH - pct * chartH;
                const val = Math.round(pct * maxVal);
                return (
                  <g key={pct}>
                    <line x1={paddingX} y1={y} x2={paddingX + chartW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Page Views Area */}
              {pageViewsArea && (
                <path d={pageViewsArea} fill="url(#pvAreaGradient)" />
              )}

              {/* Lines */}
              {pageViewsLine && (
                <path d={pageViewsLine} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {visitorsLine && (
                <path d={visitorsLine} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
              )}
              {fbAdsLine && (
                <path d={fbAdsLine} fill="none" stroke="#1877F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Points */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const cyPv = getY(p.pageViews);
                const isHovered = hoveredIndex === idx;

                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cyPv} r={isHovered ? 5 : 3} fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const isHourly = timeframe === 'today';
                const shouldShow = isHourly
                  ? idx % 3 === 0 || idx === chartPoints.length - 1
                  : timeframe === '30d'
                  ? idx % 4 === 0 || idx === chartPoints.length - 1
                  : true;

                if (!shouldShow) return null;

                return (
                  <text
                    key={`lbl-${idx}`}
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

              {/* Invisible Hover Rectangles */}
              {chartPoints.map((p, idx) => {
                const cx = getX(idx);
                const sliceW = chartW / chartPoints.length;

                return (
                  <g key={`hit-${idx}`}>
                    <rect
                      x={cx - sliceW / 2}
                      y={paddingY}
                      width={sliceW}
                      height={chartH}
                      fill="transparent"
                      cursor="pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />
                    {hoveredIndex === idx && (
                      <line
                        x1={cx}
                        y1={paddingY}
                        x2={cx}
                        y2={paddingY + chartH}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Floating Tooltip */}
          {hoveredIndex !== null && chartPoints[hoveredIndex] && (() => {
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
                  📅 {p.label}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#93c5fd' }}>📄 Page Views:</span>
                  <strong>{p.pageViews}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#86efac' }}>👥 Unique Visitors:</span>
                  <strong>{p.visitors}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#60a5fa' }}>🎯 Facebook Ads:</span>
                  <strong>{p.fbAds}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 2 Detail Breakdown Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Traffic Channels / Sources */}
        <Card
          title={<Space><Share2 size={16} /> Traffic Channels &amp; Referrers</Space>}
          bordered={false}
          style={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}
        >
          {(!data?.sources || data.sources.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              No traffic sources recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.sources.map((s) => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: s.name === 'Facebook Ads' ? '#1877F2' : '#334155' }}>
                      {s.name === 'Facebook Ads' && '🎯 '}
                      {s.name}
                    </span>
                    <span style={{ color: '#64748b' }}>
                      <strong>{s.visitors}</strong> visitors ({s.pageViews} views)
                    </span>
                  </div>
                  <Progress
                    percent={s.percent}
                    size="small"
                    strokeColor={s.name === 'Facebook Ads' ? '#1877F2' : s.name === 'Instagram' ? '#E1306C' : s.name === 'Google' ? '#EA4335' : '#3b82f6'}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Facebook Campaigns & Top Landing Pages */}
        <Card
          title={<Space><Target size={16} /> Top Facebook Campaigns &amp; Landing Pages</Space>}
          bordered={false}
          style={{ border: '1px solid #f1f5f9', borderRadius: '12px' }}
        >
          {(!data?.campaigns || data.campaigns.length === 0) ? (
            <div style={{ padding: '1rem', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                No active campaign tags detected yet. When running Facebook Ads, add <code>?utm_campaign=your_name</code> to your ad link to see it ranked here!
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Active Campaigns
              </div>
              <Table
                dataSource={data.campaigns}
                rowKey="campaign"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Campaign Name',
                    dataIndex: 'campaign',
                    render: (c: string) => <Tag color="blue">{c}</Tag>
                  },
                  {
                    title: 'Visitors',
                    dataIndex: 'visitors',
                    render: (v: number) => <strong>{v}</strong>
                  },
                  {
                    title: 'Views',
                    dataIndex: 'pageViews'
                  }
                ]}
              />
            </div>
          )}

          {data?.topPages && data.topPages.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Top Visited Pages
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.topPages.map((p) => (
                  <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: '12px' }}>
                    <code style={{ color: '#0369a1' }}>{p.path}</code>
                    <span style={{ fontWeight: 600 }}>{p.views} views</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TrafficAnalyticsOverview;
