import React from 'react';
import { Icon } from './Icon';

interface LockedFeatureOverlayProps {
  isLocked: boolean;
  featureName: string;
  description?: string;
  badge?: string;
  onUnlockClick?: () => void;
  children?: React.ReactNode;
  minHeight?: string | number;
  variant?: 'modal' | 'banner';
}

export const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({
  isLocked,
  featureName,
  description = 'Tingkatkan ke paket Pro Trader untuk mengakses data lengkap dan analisis mendalam ini.',
  badge = 'AKSES PRO TRADER',
  onUnlockClick,
  children,
  minHeight,
  variant = 'modal',
}) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  if (variant === 'banner') {
    return (
      <div
        style={{
          marginTop: '14px',
          padding: '12px 16px',
          background: 'var(--soft, #f8fafc)',
          border: '1px solid var(--line, #e2e8f0)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--line, #e2e8f0)',
              color: 'var(--ink, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="lock" cls="sm" style={{ width: '15px', height: '15px' }} />
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink, #0f172a)', lineHeight: 1.3 }}>
              {featureName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted, #64748b)', marginTop: '2px', lineHeight: 1.4 }}>
              {description}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={onUnlockClick}
          style={{
            fontSize: '11.5px',
            fontWeight: 650,
            padding: '7px 16px',
            borderRadius: '7px',
            background: 'var(--ink, #0f172a)',
            borderColor: 'var(--ink, #0f172a)',
            color: '#ffffff',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Buka Akses Pro
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '14px',
        overflow: 'hidden',
        minHeight: minHeight || '180px',
      }}
    >
      {/* Blurred background content */}
      {children && (
        <div
          style={{
            filter: 'blur(7px) grayscale(0.2)',
            opacity: 0.35,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {children}
        </div>
      )}

      {/* Lock Overlay Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 10,
          padding: '16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            textAlign: 'center',
            background: 'var(--card-bg, #ffffff)',
            padding: '22px 20px 20px',
            borderRadius: '14px',
            boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.05)',
            border: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Minimalist Lock Squircle */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--soft, #f8fafc)',
              border: '1px solid var(--line, #e2e8f0)',
              color: 'var(--ink, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
            }}
          >
            <Icon name="lock" cls="sm" style={{ width: '16px', height: '16px', strokeWidth: 1.8 }} />
          </div>

          {/* Micro Category Badge */}
          {badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted, #64748b)',
                marginBottom: '4px',
              }}
            >
              {badge}
            </span>
          )}

          {/* Title */}
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 750,
              margin: '0 0 6px 0',
              color: 'var(--ink, #0f172a)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {featureName}
          </h4>

          {/* Description */}
          <p
            className="small muted"
            style={{
              fontSize: '11.5px',
              lineHeight: 1.5,
              margin: '0 0 16px 0',
              maxWidth: '320px',
              color: 'var(--muted, #64748b)',
            }}
          >
            {description}
          </p>

          {/* Action Button */}
          <button
            type="button"
            className="btn primary"
            onClick={onUnlockClick}
            style={{
              fontSize: '12px',
              fontWeight: 650,
              padding: '8px 22px',
              borderRadius: '8px',
              background: 'var(--ink, #0f172a)',
              borderColor: 'var(--ink, #0f172a)',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Icon name="sparkles" cls="sm" style={{ width: '13px', height: '13px' }} />
            Buka Akses Pro Trader
          </button>
        </div>
      </div>
    </div>
  );
};
