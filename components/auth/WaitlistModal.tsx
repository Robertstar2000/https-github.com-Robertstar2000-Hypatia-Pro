import React, { useState } from 'react';
import { PortalModal } from '../common/PortalModal';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  stackOrder?: number;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose, stackOrder = 1 }) => {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistError, setWaitlistError] = useState('');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistStatus('loading');
    setWaitlistError('');

    try {
      let platform = 'Unknown';
      if (navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('iPad') !== -1) platform = 'iOS';
      else if (navigator.userAgent.indexOf('Linux') !== -1) platform = 'Linux';
      else if (navigator.userAgent.indexOf('Windows') !== -1) platform = 'Windows';

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail, platform })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to join waitlist');

      setWaitlistStatus('success');
    } catch (err: any) {
      setWaitlistError(err.message || 'Failed to join waitlist');
      setWaitlistStatus('error');
    }
  };

  const handleClose = () => {
    setWaitlistStatus('idle');
    setWaitlistError('');
    onClose();
  };

  return (
    <PortalModal isOpen={isOpen} onClose={handleClose} modalId="waitlist-modal" stackOrder={stackOrder}>
      <div className="card w-100 max-w-lg border-0 bg-[#1e293b] rounded-3xl p-5 shadow-2xl border border-[rgba(255,255,255,0.1)] animate-in" style={{ width: '500px' }}>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="h4 fw-black font-['Space_Grotesk'] tracking-tight mb-1 text-white">
              HYPATIA PRO <span className="text-[#6366f1] text-xs">ENTERPRISE INQUIRY</span>
            </h2>
            <p className="text-xs text-[#94a3b8] tracking-widest uppercase">Self-service Stripe checkout is live. Submit for custom university/lab SLAs.</p>
          </div>
          <button onClick={handleClose} className="btn-close btn-close-white" aria-label="Close"></button>
        </div>

        <div className="mb-4">
          <h3 className="text-xs fw-bold text-[#f8fafc] tracking-widest mb-3 uppercase">LIVE ENTERPRISE CAPABILITIES</h3>
          <ul className="list-unstyled space-y-3">
            {[
              { icon: 'bi-cpu', text: 'Managed high-throughput inference across Claude 3.7 Sonnet, GPT-4o, and Gemini 3.8 Pro.' },
              { icon: 'bi-flask', text: 'Unlimited in-browser Monte Carlo simulations with statistical power analysis.' },
              { icon: 'bi-lightbulb', text: 'Autonomous hypothesis tree divergence and automated uniqueness grading.' },
              { icon: 'bi-people', text: 'Multi-agent adversarial peer review audits prior to journal submission.' },
              { icon: 'bi-journal-text', text: 'Camera-ready LaTeX, PDF, and PPTX scientific manuscript exports.' }
            ].map((item, i) => (
              <li key={i} className="d-flex align-items-start gap-3 text-sm text-[#94a3b8] mb-2">
                <i className={`bi ${item.icon} text-[#06b6d4] fs-6`}></i>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {waitlistStatus === 'success' ? (
          <div className="text-center py-4">
            <i className="bi bi-check-circle-fill text-[#10b981] display-4 mb-3 d-block"></i>
            <h4 className="fw-bold mb-2 text-white">INQUIRY RECEIVED</h4>
            <p className="text-sm text-[#94a3b8]">Our institutional team will contact you regarding campus SLA deployment.</p>
            <button onClick={handleClose} className="btn btn-primary w-100 mt-4 rounded-2xl py-3 fw-bold">CLOSE</button>
          </div>
        ) : (
          <form onSubmit={handleWaitlistSubmit}>
            <div className="mb-4">
              <label className="d-block text-[10px] fw-black text-[#f8fafc] tracking-[0.2em] mb-2 uppercase">Institutional Email Address</label>
              <input 
                type="email" 
                required
                placeholder="researcher@institute.edu"
                className="form-control bg-[#0f172a] border-[rgba(255,255,255,0.08)] rounded-2xl py-3 px-4 text-sm text-white focus:border-[#06b6d4] transition-all"
                value={waitlistEmail}
                onChange={e => setWaitlistEmail(e.target.value)}
              />
            </div>
            {waitlistError && <p className="text-danger text-xs mb-3">{waitlistError}</p>}
            <button 
              type="submit" 
              disabled={waitlistStatus === 'loading'}
              className="btn w-100 bg-[#6366f1] text-white fw-black py-3 rounded-2xl tracking-widest hover:bg-[#4f46e5] transition-all disabled:opacity-50"
            >
              {waitlistStatus === 'loading' ? 'SUBMITTING INQUIRY...' : 'REQUEST INSTITUTIONAL INVOICE'}
            </button>
          </form>
        )}
      </div>
    </PortalModal>
  );
};
