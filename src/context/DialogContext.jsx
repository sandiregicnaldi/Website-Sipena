import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, Trash2, HelpCircle, X } from 'lucide-react';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  // Modal state
  const [modalState, setModalState] = useState(null);
  // Toast state
  const [toasts, setToasts] = useState([]);

  const resolverRef = useRef(null);

  /**
   * showAlert({ title, message, type = 'info', confirmText = 'Mengerti' })
   * returns Promise<void>
   */
  const showAlert = useCallback(({ title, message, type = 'info', confirmText = 'Mengerti' }) => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setModalState({
        mode: 'alert',
        title: title || (type === 'success' ? 'Berhasil' : type === 'error' ? 'Terjadi Kesalahan' : 'Informasi'),
        message,
        type,
        confirmText,
      });
    });
  }, []);

  /**
   * showConfirm({ title, message, type = 'warning', confirmText = 'Lanjutkan', cancelText = 'Batal' })
   * returns Promise<boolean>
   */
  const showConfirm = useCallback(({ title, message, type = 'warning', confirmText = 'Lanjutkan', cancelText = 'Batal' }) => {
    return new Promise((resolve) => {
      resolverRef.current = (confirmed) => resolve(confirmed);
      setModalState({
        mode: 'confirm',
        title: title || (type === 'danger' ? 'Konfirmasi Penghapusan' : 'Konfirmasi Tindakan'),
        message,
        type,
        confirmText,
        cancelText,
      });
    });
  }, []);

  /**
   * showToast({ message, type = 'success', duration = 3500 })
   */
  const showToast = useCallback(({ message, type = 'success', duration = 3500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setModalState(null);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalState(null);
  };

  // Keyboard navigation: Enter / Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalState) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && modalState.mode === 'alert') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState]);

  // Expose global bridge on window for non-React/fallback usage
  useEffect(() => {
    window.$dialog = {
      alert: (message, title = 'Pemberitahuan') => showAlert({ message, title, type: 'info' }),
      success: (message, title = 'Berhasil') => showAlert({ message, title, type: 'success' }),
      error: (message, title = 'Terjadi Kesalahan') => showAlert({ message, title, type: 'error' }),
      confirm: (message, title = 'Konfirmasi') => showConfirm({ message, title }),
      toast: (message, type = 'success') => showToast({ message, type }),
    };
  }, [showAlert, showConfirm, showToast]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={32} color="#10b981" strokeWidth={2.2} />;
      case 'danger':
      case 'error':
        return <AlertTriangle size={32} color="#ef4444" strokeWidth={2.2} />;
      case 'warning':
        return <AlertTriangle size={32} color="#f59e0b" strokeWidth={2.2} />;
      case 'help':
        return <HelpCircle size={32} color="#2563eb" strokeWidth={2.2} />;
      case 'info':
      default:
        return <Info size={32} color="#2563eb" strokeWidth={2.2} />;
    }
  };

  const getIconBadgeBg = (type) => {
    switch (type) {
      case 'success':
        return '#ecfdf5';
      case 'danger':
      case 'error':
        return '#fef2f2';
      case 'warning':
        return '#fffbeb';
      case 'info':
      default:
        return '#eff6ff';
    }
  };

  const getConfirmBtnColor = (type) => {
    if (type === 'danger' || type === 'error') {
      return {
        background: '#dc2626',
        hoverBg: '#b91c1c',
        boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
      };
    }
    if (type === 'success') {
      return {
        background: '#059669',
        hoverBg: '#047857',
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
      };
    }
    return {
      background: '#1c51a1',
      hoverBg: '#153e7e',
      boxShadow: '0 4px 14px rgba(28, 81, 161, 0.35)',
    };
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}

      {/* ── MODAL DIALOG POPUP ── */}
      {modalState && (
        <div
          className="sipena-dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && modalState.mode === 'alert') {
              handleConfirm();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'sipenaFadeIn 0.2s ease-out forwards',
          }}
        >
          <div
            className="sipena-dialog-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              animation: 'sipenaZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Header / Icon */}
            <div
              style={{
                padding: '2rem 1.75rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  backgroundColor: getIconBadgeBg(modalState.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                {getIcon(modalState.type)}
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.3,
                  fontFamily: 'Poppins, Inter, sans-serif',
                }}
              >
                {modalState.title}
              </h3>

              <div
                style={{
                  marginTop: '0.65rem',
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  color: '#475569',
                  whiteSpace: 'pre-line',
                  maxWidth: '380px',
                }}
              >
                {modalState.message}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                padding: '1.25rem 1.5rem 1.5rem',
                backgroundColor: '#fafafa',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}
            >
              {modalState.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {modalState.cancelText || 'Batal'}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: getConfirmBtnColor(modalState.type).background,
                  color: '#ffffff',
                  boxShadow: getConfirmBtnColor(modalState.type).boxShadow,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getConfirmBtnColor(modalState.type).hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getConfirmBtnColor(modalState.type).background;
                }}
              >
                {modalState.confirmText || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATIONS CONTAINER ── */}
      <div
        className="sipena-toast-container"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error' || t.type === 'danger';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                minWidth: '300px',
                maxWidth: '420px',
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                borderLeft: `4px solid ${
                  isSuccess ? '#10b981' : isError ? '#ef4444' : isWarning ? '#f59e0b' : '#2563eb'
                }`,
                animation: 'sipenaToastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {isSuccess && <CheckCircle size={20} color="#10b981" />}
                {isError && <AlertTriangle size={20} color="#ef4444" />}
                {isWarning && <AlertTriangle size={20} color="#f59e0b" />}
                {!isSuccess && !isError && !isWarning && <Info size={20} color="#2563eb" />}
              </div>

              <div
                style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#1e293b',
                  lineHeight: 1.45,
                }}
              >
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Global Injected Keyframes */}
      <style>{`
        @keyframes sipenaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sipenaZoomIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes sipenaToastSlideIn {
          from { opacity: 0; transform: translateX(30px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export default DialogContext;
