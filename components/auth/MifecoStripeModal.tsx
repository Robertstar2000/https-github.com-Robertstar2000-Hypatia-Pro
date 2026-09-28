import React, { useState } from 'react';
import { PortalModal } from '../common/PortalModal';
import { useToast } from '../../toast';

interface MifecoStripeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: any) => void;
    initialEmail?: string;
}

export const MifecoStripeModal: React.FC<MifecoStripeModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    initialEmail = '' 
}) => {
    const { addToast } = useToast();
    const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team'>('pro');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [email, setEmail] = useState(initialEmail);
    const [companyName, setCompanyName] = useState('');
    const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
    const [cardExpiry, setCardExpiry] = useState('12/28');
    const [cardCvc, setCardCvc] = useState('888');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const proPrice = billingCycle === 'monthly' ? 29 : 24;
    const teamPrice = billingCycle === 'monthly' ? 199 : 159;
    const currentPrice = selectedPlan === 'pro' ? proPrice : teamPrice;

    const handleAuthorizePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            addToast('Please enter an account email for Stripe billing.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const resp = await fetch('/api/auth/mifeco-stripe/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    companyName: companyName.trim() || 'Institutional Researcher',
                    plan: selectedPlan,
                    billingCycle,
                    amount: currentPrice,
                    stripeToken: `tok_stripe_authority_${Date.now()}`
                })
            });

            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error || 'Stripe authorization failed');
            }

            setIsConfirmed(true);
            localStorage.setItem('hmap-current-user', JSON.stringify(data.user));
            if (data.token) {
                localStorage.setItem('hmap-token', data.token);
            }

            addToast(`Mifeco Business Authority activated successfully! Welcome to ${selectedPlan.toUpperCase()} tier.`, 'success');
            
            setTimeout(() => {
                onSuccess(data.user);
                onClose();
            }, 1200);
        } catch (err: any) {
            addToast(err.message || 'Payment authorization failed.', 'danger');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} modalId="mifeco-stripe-modal">
            <div className="modal-dialog modal-dialog-centered modal-lg my-0" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                <div className="modal-content bg-slate-900 border border-slate-700 shadow-2xl rounded-3 text-white">
                    
                    {/* Header */}
                    <div className="modal-header border-bottom border-slate-800 px-4 py-3.5 bg-slate-950/80">
                        <div className="d-flex align-items-center gap-2.5">
                            <div className="d-flex align-items-center justify-content-center rounded-2 p-2 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" style={{ width: '38px', height: '38px' }}>
                                <i className="bi bi-stripe fs-5"></i>
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: '1.15rem' }}>
                                        Mifeco Business Stripe Authority
                                    </h5>
                                    <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-xs">
                                        SECURE STRIPE CHECKOUT
                                    </span>
                                </div>
                                <p className="text-white-50 small mb-0" style={{ fontSize: '0.78rem' }}>
                                    Enterprise cloud quota, multi-agent reasoning, and automated institutional invoicing
                                </p>
                            </div>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-3 p-md-4" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                        
                        {/* Success Screen */}
                        {isConfirmed ? (
                            <div className="text-center py-5">
                                <div className="d-inline-flex p-3 rounded-circle bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3">
                                    <i className="bi bi-patch-check-fill fs-1"></i>
                                </div>
                                <h4 className="fw-bold text-white">Mifeco Business Authority Verified</h4>
                                <p className="text-slate-400 small mb-3 max-w-md mx-auto">
                                    Your Stripe subscription is active. Managed high-throughput models (Claude 3.7, GPT-4o, Gemini 3.8) are now unlocked with institutional SLA.
                                </p>
                                <div className="spinner-border spinner-border-sm text-cyan-400" role="status"></div>
                                <span className="small text-slate-400 ms-2">Redirecting to research workspace...</span>
                            </div>
                        ) : (
                            <form onSubmit={handleAuthorizePayment}>
                                
                                {/* Plan Selection */}
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label text-white-50 small font-mono text-uppercase fw-bold mb-0">
                                            1. Select Business Subscription Plan
                                        </label>
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button
                                                type="button"
                                                onClick={() => setBillingCycle('monthly')}
                                                className={`btn btn-xs ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            >
                                                Monthly
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBillingCycle('annual')}
                                                className={`btn btn-xs ${billingCycle === 'annual' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            >
                                                Annual (-20%)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="row g-3">
                                        {/* Pro Plan */}
                                        <div className="col-12 col-md-6">
                                            <div 
                                                onClick={() => setSelectedPlan('pro')}
                                                className={`p-3 rounded-3 border cursor-pointer transition-all h-100 d-flex flex-column justify-content-between ${
                                                    selectedPlan === 'pro'
                                                        ? 'bg-indigo-500/15 border-indigo-400 text-white shadow-sm'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover-border-primary'
                                                }`}
                                            >
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="fw-bold">Researcher Pro</span>
                                                        <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                                            POPULAR
                                                        </span>
                                                    </div>
                                                    <div className="d-flex align-items-baseline gap-1 my-2">
                                                        <span className="fs-3 fw-bold font-mono">${proPrice}</span>
                                                        <span className="text-white-50 small">/month</span>
                                                    </div>
                                                    <ul className="list-unstyled small text-slate-400 mb-0 space-y-1">
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-indigo-400"></i>
                                                            <span>Managed Gemini 3.8 & GPT-4o Quota</span>
                                                        </li>
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-indigo-400"></i>
                                                            <span>Unlimited Monte Carlo Simulations</span>
                                                        </li>
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-indigo-400"></i>
                                                            <span>Camera-Ready LaTeX & PDF Exports</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Authority Plan */}
                                        <div className="col-12 col-md-6">
                                            <div 
                                                onClick={() => setSelectedPlan('team')}
                                                className={`p-3 rounded-3 border cursor-pointer transition-all h-100 d-flex flex-column justify-content-between ${
                                                    selectedPlan === 'team'
                                                        ? 'bg-indigo-500/15 border-indigo-400 text-white shadow-sm'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover-border-primary'
                                                }`}
                                            >
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="fw-bold">Institutional Team</span>
                                                        <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                                            ENTERPRISE
                                                        </span>
                                                    </div>
                                                    <div className="d-flex align-items-baseline gap-1 my-2">
                                                        <span className="fs-3 fw-bold font-mono">${teamPrice}</span>
                                                        <span className="text-white-50 small">/month</span>
                                                    </div>
                                                    <ul className="list-unstyled small text-slate-400 mb-0 space-y-1">
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-purple-400"></i>
                                                            <span>10 Co-Principal Investigator Seats</span>
                                                        </li>
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-purple-400"></i>
                                                            <span>Claude 3.7 & DeepSeek R1 Hybrid</span>
                                                        </li>
                                                        <li className="d-flex items-center gap-1.5">
                                                            <i className="bi bi-check2 text-purple-400"></i>
                                                            <span>Dedicated Stripe Authority Invoicing</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Info */}
                                <div className="mb-4 p-3 rounded-3 bg-slate-950/80 border border-slate-800">
                                    <label className="form-label text-white-50 small font-mono text-uppercase fw-bold mb-2">
                                        2. Billing & Stripe Authority Information
                                    </label>

                                    <div className="row g-2 mb-3">
                                        <div className="col-12 col-md-6">
                                            <label className="form-label text-slate-300 small mb-1">Billing Email</label>
                                            <input 
                                                type="email" 
                                                required
                                                className="form-control bg-slate-900 border-slate-700 text-white text-sm"
                                                placeholder="researcher@university.edu"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label text-slate-300 small mb-1">Institution / Company</label>
                                            <input 
                                                type="text" 
                                                className="form-control bg-slate-900 border-slate-700 text-white text-sm"
                                                placeholder="e.g. Stanford University or Mifeco Lab"
                                                value={companyName}
                                                onChange={e => setCompanyName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Stripe Card Element Simulation */}
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label text-slate-300 small mb-0">Card Details (Encrypted via Stripe)</label>
                                            <span className="text-white-50 small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                                                <i className="bi bi-shield-lock-fill text-indigo-400"></i>
                                                <span>256-Bit SSL Authority</span>
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-2 bg-slate-900 border border-slate-700">
                                            <div className="row g-2 align-items-center">
                                                <div className="col-12 col-sm-6">
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text bg-slate-950 border-slate-700 text-indigo-400">
                                                            <i className="bi bi-credit-card-2-front-fill"></i>
                                                        </span>
                                                        <input 
                                                            type="text" 
                                                            className="form-control bg-slate-950 border-slate-700 text-white font-mono"
                                                            placeholder="Card Number"
                                                            value={cardNumber}
                                                            onChange={e => setCardNumber(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-6 col-sm-3">
                                                    <input 
                                                        type="text" 
                                                        className="form-control form-control-sm bg-slate-950 border-slate-700 text-white font-mono text-center"
                                                        placeholder="MM/YY"
                                                        value={cardExpiry}
                                                        onChange={e => setCardExpiry(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-6 col-sm-3">
                                                    <input 
                                                        type="text" 
                                                        className="form-control form-control-sm bg-slate-950 border-slate-700 text-white font-mono text-center"
                                                        placeholder="CVC"
                                                        value={cardCvc}
                                                        onChange={e => setCardCvc(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-text text-white-50 small mt-1.5" style={{ fontSize: '0.72rem' }}>
                                            Test credentials pre-filled. Authorization uses the Mifeco Business Stripe Merchant Gateway.
                                        </div>
                                    </div>
                                </div>

                                {/* Order Summary */}
                                <div className="p-3 rounded-2 bg-slate-950/60 border border-slate-800 mb-4 d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="fw-semibold small text-white">
                                            {selectedPlan === 'pro' ? 'Mifeco Pro Monthly Subscription' : 'Mifeco Institutional Team Subscription'}
                                        </div>
                                        <div className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
                                            Includes high-speed multi-model AI inference, LaTeX manuscripts, and dedicated support.
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="fs-5 fw-bold font-mono text-indigo-300">${currentPrice}.00</div>
                                        <div className="text-white-50 small" style={{ fontSize: '0.7rem' }}>Billed {billingCycle}</div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="d-flex align-items-center justify-content-between gap-3">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="btn btn-primary px-4 py-2 d-inline-flex align-items-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderColor: '#4f46e5' }}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                                <span>Authorizing with Stripe...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-shield-check"></i>
                                                <span>Authorize ${currentPrice}.00 with Stripe</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                            </form>
                        )}

                    </div>

                </div>
            </div>
        </PortalModal>
    );
};
