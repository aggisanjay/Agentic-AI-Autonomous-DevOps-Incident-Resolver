import { useNavigate } from 'react-router-dom';
import useIncidentStore from '../store/incidentStore.js';

export default function Navbar() {
    const connected = useIncidentStore((s) => s.connected);
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="navbar-brand" onClick={() => navigate('/')}>
                <div className="logo-icon">⚡</div>
                <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Incident Resolver
                </span>
            </div>

            <div className="navbar-right">
                <div className="navbar-status">
                    <span className={`status-dot ${connected ? '' : 'disconnected'}`} />
                    <span>{connected ? 'Live Connected' : 'Reconnecting...'}</span>
                </div>
            </div>
        </nav>
    );
}
