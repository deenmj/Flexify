import { motion } from 'framer-motion';
import { Skeleton } from 'antd';
import './PageSkeleton.css';

interface PageSkeletonProps {
  /** Number of card skeletons to show (default 6) */
  cards?: number;
  /** Whether to show the header skeleton section (default true) */
  showHeader?: boolean;
  /** Optional variant for specific page types */
  variant?: 'grid' | 'list' | 'dashboard';
}

const pulseTransition = {
  duration: 1.8,
  repeat: Infinity,
  repeatType: 'reverse' as const,
  ease: 'easeInOut' as const,
};

export default function PageSkeleton({
  cards = 6,
  showHeader = true,
  variant = 'grid',
}: PageSkeletonProps) {
  return (
    <motion.div
      className="page-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Page header skeleton */}
      {showHeader && (
        <div className="page-skeleton-header">
          <div className="container">
            <Skeleton
              active
              title={{ width: '40%' }}
              paragraph={{ rows: 1, width: ['60%'] }}
            />
          </div>
        </div>
      )}

      {/* Content skeleton */}
      <div className="page-skeleton-content">
        <div className="container">
          {variant === 'dashboard' ? (
            <>
              {/* Stat cards row */}
              <div className="skeleton-stats-row">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`stat-${i}`}
                    className="skeleton-stat-card"
                    animate={{ opacity: [0.5, 1] }}
                    transition={{ ...pulseTransition, delay: i * 0.12 }}
                  >
                    <div className="skeleton-bar skeleton-stat-value" />
                    <div className="skeleton-bar skeleton-stat-label" />
                  </motion.div>
                ))}
              </div>

              {/* Table skeleton */}
              <motion.div
                className="skeleton-table-card"
                animate={{ opacity: [0.5, 1] }}
                transition={{ ...pulseTransition, delay: 0.2 }}
              >
                <Skeleton active title={false} paragraph={{ rows: 8, width: Array(8).fill('100%') }} />
              </motion.div>
            </>
          ) : variant === 'list' ? (
            <div className="skeleton-list">
              {[...Array(cards)].map((_, i) => (
                <motion.div
                  key={`list-${i}`}
                  className="skeleton-list-item"
                  animate={{ opacity: [0.5, 1] }}
                  transition={{ ...pulseTransition, delay: i * 0.08 }}
                >
                  <div className="skeleton-list-thumb" />
                  <div className="skeleton-list-body">
                    <Skeleton active title={{ width: '50%' }} paragraph={{ rows: 2, width: ['75%', '40%'] }} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Default grid variant — similar to Explore page */
            <div className="skeleton-grid">
              {[...Array(cards)].map((_, i) => (
                <motion.div
                  key={`card-${i}`}
                  className="skeleton-card card"
                  animate={{ opacity: [0.5, 1] }}
                  transition={{ ...pulseTransition, delay: i * 0.08 }}
                >
                  <div className="skeleton-card-image" />
                  <div className="skeleton-card-body">
                    <div className="skeleton-bar skeleton-title" />
                    <div className="skeleton-bar skeleton-subtitle" />
                    <div className="skeleton-bar-row">
                      <div className="skeleton-bar skeleton-chip" />
                      <div className="skeleton-bar skeleton-chip" />
                    </div>
                    <div className="skeleton-bar skeleton-price" />
                    <div className="skeleton-bar skeleton-button" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
