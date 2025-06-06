import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <Link to="/">
            <h1>Aprendi</h1>
          </Link>
          <p className="tagline">Integrate AI into your classroom, on your terms</p>
        </div>
        
        <nav className="nav-links">
          <Link to="/" className="nav-link">Create Assignment</Link>
          <Link to="/teacher-review/1" className="nav-link">Review Submissions</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
