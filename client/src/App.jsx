import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IncidentDetail from './pages/IncidentDetail.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/incidents/:id" element={<IncidentDetail />} />
            </Routes>
        </BrowserRouter>
    );
}
