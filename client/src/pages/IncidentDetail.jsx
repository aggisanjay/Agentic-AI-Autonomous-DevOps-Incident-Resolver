import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useIncidentStore from '../store/incidentStore.js';
import Timeline from '../components/Timeline.jsx';

// Lightweight markdown-to-HTML converter for the resolution banner
function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Horizontal rules
        .replace(/^---$/gm, '<hr/>')
        // Headers (must be before bold)
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold + italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Unordered list items
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // Ordered list items
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
        // Paragraphs (double newlines)
        .replace(/\n\n/g, '</p><p>')
        // Single newlines to <br>
        .replace(/\n/g, '<br/>');

    return `<p>${html}</p>`;
}

export default function IncidentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        activeIncident,
        timeline,
        thinking,
        loading,
        fetchIncident,
        joinIncident,
        leaveIncident,
    } = useIncidentStore();

    useEffect(() => {
        fetchIncident(id);
        joinIncident(id);
        return () => leaveIncident(id);
    }, [id]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const getStatusIcon = (status) => {
        const icons = { created: '◌', investigating: '◉', identified: '◎', mitigating: '⟳', resolved: '✓', failed: '✕' };
        return icons[status] || '○';
    };

    const getDuration = () => {
        if (!activeIncident?.createdAt) return '—';
        const end = activeIncident.resolvedAt ? new Date(activeIncident.resolvedAt) : new Date();
        const start = new Date(activeIncident.createdAt);
        const secs = Math.round((end - start) / 1000);
        if (secs < 60) return `${secs}s`;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins}m ${remSecs}s`;
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-center"><div className="spinner" /></div>
            </div>
        );
    }

    if (!activeIncident) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-title">Incident Not Found</div>
                    <div className="empty-state-text">This incident doesn't exist or hasn't loaded yet.</div>
                </div>
            </div>
        );
    }

    const isTerminal = activeIncident.status === 'resolved' || activeIncident.status === 'failed';

    return (
        <div className="page">
            <div className="back-link" onClick={() => navigate('/')}>
                ← Back to Dashboard
            </div>

            <div className="incident-detail-header">
                <h1 className="incident-detail-title">{activeIncident.title}</h1>
                <div className="incident-detail-badges">
                    <span className={`badge badge-${activeIncident.severity}`}>
                        {activeIncident.severity}
                    </span>
                    <span className={`badge-status status-${activeIncident.status}`}>
                        {getStatusIcon(activeIncident.status)} {activeIncident.status}
                    </span>
                </div>
                {activeIncident.description && (
                    <p className="incident-detail-description">{activeIncident.description}</p>
                )}
            </div>

            <div className="incident-detail-info">
                <div className="glass-card info-card">
                    <div className="info-card-label">Service</div>
                    <div className="info-card-value mono">⬡ {activeIncident.service}</div>
                </div>
                <div className="glass-card info-card">
                    <div className="info-card-label">Created</div>
                    <div className="info-card-value" style={{ fontSize: '0.85rem' }}>{formatDate(activeIncident.createdAt)}</div>
                </div>
                <div className="glass-card info-card">
                    <div className="info-card-label">Agent Steps</div>
                    <div className="info-card-value">{timeline.length}</div>
                </div>
                <div className="glass-card info-card">
                    <div className="info-card-label">Duration</div>
                    <div className="info-card-value mono">{getDuration()}</div>
                </div>
            </div>

            {isTerminal && activeIncident.resolution && (
                <div className={`resolution-banner ${activeIncident.status === 'failed' ? 'failed' : ''}`}>
                    <div className="resolution-banner-title">
                        {activeIncident.status === 'resolved' ? '✓ Resolution' : '✕ Escalation Required'}
                    </div>
                    <div
                        className="resolution-banner-text markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(activeIncident.resolution) }}
                    />
                </div>
            )}

            <h2 className="timeline-section-title">
                🧠 Agent Investigation
            </h2>

            <Timeline steps={timeline} thinking={thinking} />
        </div>
    );
}
