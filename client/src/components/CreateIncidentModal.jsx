import { useState } from 'react';
import useIncidentStore from '../store/incidentStore.js';

const services = [
    'api-gateway',
    'auth-service',
    'payment-service',
    'user-service',
    'notification-service',
    'order-service',
];

const severities = ['critical', 'high', 'medium', 'low'];

const incidentTemplates = [
    { title: 'High Error Rate on API Gateway', description: 'Error rate spiked above 25% on the API gateway. Users are reporting 500 errors on the checkout flow.', severity: 'critical', service: 'api-gateway' },
    { title: 'Auth Service Latency Degradation', description: 'P99 latency on the auth service has exceeded 3 seconds. Login timeouts increasing rapidly.', severity: 'high', service: 'auth-service' },
    { title: 'Payment Service Memory Leak', description: 'Memory usage on payment service pods is growing unbounded. OOMKills expected within the hour.', severity: 'critical', service: 'payment-service' },
    { title: 'User Service DB Connection Exhaustion', description: 'Connection pool at 95% capacity. New connections being rejected intermittently.', severity: 'high', service: 'user-service' },
    { title: 'Notification Delayed Processing', description: 'Email and push notifications are delayed by 10+ minutes. Queue depth growing steadily.', severity: 'medium', service: 'notification-service' },
];

export default function CreateIncidentModal({ onClose }) {
    const createIncident = useIncidentStore((s) => s.createIncident);
    const [form, setForm] = useState({
        title: '',
        description: '',
        severity: 'high',
        service: 'api-gateway',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        setSubmitting(true);
        try {
            await createIncident(form);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const useTemplate = (template) => {
        setForm(template);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h2 className="modal-title">🚨 New Incident</h2>

                <div className="modal-templates">
                    <label className="form-label">Quick Fill</label>
                    <div className="template-grid">
                        {incidentTemplates.map((t, i) => (
                            <button
                                key={i}
                                type="button"
                                className="template-btn"
                                onClick={() => useTemplate(t)}
                            >
                                {t.service}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input
                            className="form-input"
                            placeholder="Brief incident description..."
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                            id="incident-title-input"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            placeholder="What is happening? What symptoms are observed?"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            id="incident-description-input"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Severity</label>
                            <select
                                className="form-select"
                                value={form.severity}
                                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                                id="incident-severity-select"
                            >
                                {severities.map((s) => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Affected Service</label>
                            <select
                                className="form-select"
                                value={form.service}
                                onChange={(e) => setForm({ ...form, service: e.target.value })}
                                id="incident-service-select"
                            >
                                {services.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting || !form.title.trim()} id="create-incident-btn">
                            {submitting ? (
                                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</>
                            ) : (
                                <>⚡ Create Incident</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
