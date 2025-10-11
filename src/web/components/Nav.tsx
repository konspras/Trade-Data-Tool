import React from 'react';
import { NavLink } from 'react-router-dom';

const Nav: React.FC = () => {
  return (
    <nav className="site-nav" role="navigation" aria-label="Primary">
      <div className="nav-inner">
        <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/story" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Story
        </NavLink>
        <NavLink to="/interactive" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Interactive
        </NavLink>
      </div>
    </nav>
  );
};

export default Nav;
