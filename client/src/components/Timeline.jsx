export default function Timeline({ steps, thinking }) {
    const actionConfig = {
        check_logs: { label: 'Check Logs', icon: '📋', color: 'var(--cyan)' },
        check_metrics: { label: 'Check Metrics', icon: '📊', color: 'var(--purple)' },
        restart_service: { label: 'Restart Service', icon: '🔄', color: 'var(--amber)' },
        scale_pods: { label: 'Scale Pods', icon: '📈', color: 'var(--blue-vivid)' },
        run_healthcheck: { label: 'Health Check', icon: '💚', color: 'var(--emerald)' },
        resolve_incident: { label: 'Resolved', icon: '✅', color: 'var(--emerald)' },
        analysis: { label: 'AI Analysis', icon: '🧠', color: 'var(--purple)' },
        reasoning: { label: 'Reasoning', icon: '🧠', color: 'var(--text-muted)' },
        error: { label: 'Error', icon: '❌', color: 'var(--red)' },
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="timeline">
            {steps.map((step, idx) => {
                const config = actionConfig[step.action] || { label: step.action, icon: '⚙', color: 'var(--blue)' };
                return (
                    <div className="timeline-step" key={idx}>
                        <div className={`timeline-dot action-${step.action}`} />
                        <div className="timeline-content">
                            <div className="timeline-step-header">
                                <span className="timeline-action" style={{ borderColor: `color-mix(in srgb, ${config.color} 25%, transparent)` }}>
                                    {config.icon} {config.label}
                                </span>
                                <span className="timeline-step-number">#{step.stepNumber || idx + 1}</span>
                            </div>
                            {step.reasoning && (
                                <p className="timeline-reasoning">{step.reasoning}</p>
                            )}
                            {step.output && (
                                <div className="timeline-output">{step.output}</div>
                            )}
                            {step.timestamp && (
                                <div className="timeline-timestamp">{formatTime(step.timestamp)}</div>
                            )}
                        </div>
                    </div>
                );
            })}

            {thinking && (
                <div className="thinking-indicator">
                    <div className="thinking-dots">
                        <span /><span /><span />
                    </div>
                    <span className="thinking-text">{thinking}</span>
                </div>
            )}

            {steps.length === 0 && !thinking && (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <div className="empty-state-icon">🔍</div>
                    <div className="empty-state-title">Awaiting Agent</div>
                    <div className="empty-state-text">The AI agent will begin investigating shortly. Steps will appear here in real-time.</div>
                </div>
            )}
        </div>
    );
}
