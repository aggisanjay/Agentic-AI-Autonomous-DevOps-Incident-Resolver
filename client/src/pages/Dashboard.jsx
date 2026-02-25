import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useIncidentStore from '../store/incidentStore.js';
import CreateIncidentModal from '../components/CreateIncidentModal.jsx';

export default function Dashboard() {
    const { incidents, loading, fetchIncidents } = useIncidentStore();
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchIncidents();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusIcon = (status) => {
        const icons = {
            created: '◌',
            investigating: '◉',
            identified: '◎',
            mitigating: '⟳',
            resolved: '✓',
            failed: '✕',
        };
        return icons[status] || '○';
    };

    const activeCount = incidents.filter((i) => !['resolved', 'failed'].includes(i.status)).length;
    const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;
    const criticalCount = incidents.filter((i) => i.severity === 'critical').length;

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">Incident Command</h1>
                    <p className="page-subtitle">
                        AI-powered autonomous incident resolution
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)} id="new-incident-btn">
                    <span style={{ fontSize: '1.1em' }}>⚡</span> New Incident
                </button>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-chip">
                    <span>Total</span>
                    <span className="stat-count">{incidents.length}</span>
                </div>
                <div className="stat-chip" style={activeCount > 0 ? { borderColor: 'rgba(79, 125, 249, 0.2)', color: 'var(--blue-vivid)' } : {}}>
                    <span>Active</span>
                    <span className="stat-count">{activeCount}</span>
                </div>
                <div className="stat-chip" style={criticalCount > 0 ? { borderColor: 'rgba(248, 113, 113, 0.2)', color: 'var(--red)' } : {}}>
                    <span>Critical</span>
                    <span className="stat-count">{criticalCount}</span>
                </div>
                <div className="stat-chip">
                    <span>Resolved</span>
                    <span className="stat-count">{resolvedCount}</span>
                </div>
            </div>

            {loading && (
                <div className="loading-center">
                    <div className="spinner" />
                </div>
            )}

            {!loading && incidents.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🛡️</div>
                    <div className="empty-state-title">All Systems Operational</div>
                    <div className="empty-state-text">
                        No active incidents. Create one to see the AI agent investigate and resolve it in real-time.
                    </div>
                </div>
            )}

            <div className="incident-grid">
                {incidents.map((incident) => (
                    <div
                        key={incident.id}
                        className={`glass-card interactive incident-card severity-${incident.severity}`}
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                        id={`incident-card-${incident.id}`}
                    >
                        <div className="incident-card-header">
                            <div>
                                <div className="incident-card-title">{incident.title}</div>
                                <div className="incident-card-meta">
                                    <span className="incident-card-service">⬡ {incident.service}</span>
                                    <span className="incident-card-time">{formatDate(incident.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        {incident.description && (
                            <p className="incident-card-description">{incident.description}</p>
                        )}

                        <div className="incident-card-footer">
                            <span className={`badge badge-${incident.severity}`}>
                                {incident.severity}
                            </span>
                            <span className={`badge-status status-${incident.status}`}>
                                {getStatusIcon(incident.status)} {incident.status}
                            </span>
                            {incident.stepCount && parseInt(incident.stepCount) > 0 && (
                                <span className="step-count">
                                    ⚙ {incident.stepCount} steps
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && <CreateIncidentModal onClose={() => setShowModal(false)} />}
        </div>
    );
}
