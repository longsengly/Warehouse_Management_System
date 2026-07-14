import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children, currentPage, setCurrentPage, currentPageName }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="app-container">
      {/* Sidebar for Navigation */}
      <div className={`sidebar-wrapper ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar currentPage={currentPage} setCurrentPage={(page) => {
          setCurrentPage(page);
          setMobileSidebarOpen(false); // Auto close sidebar on mobile click
        }} />
      </div>

      {/* Main layout contents */}
      <div className="main-content">
        <Navbar 
          currentPageName={currentPageName} 
          onToggleMobileSidebar={toggleMobileSidebar} 
        />
        <main className="content-body">
          {children}
        </main>
      </div>

      {/* Custom responsive overrides stylesheet injected for the sidebar toggles */}
      <style>{`
        .sidebar-wrapper {
          transition: transform 0.3s ease;
        }
        @media (max-width: 992px) {
          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 200;
            transform: translateX(-100%);
          }
          .sidebar-wrapper.mobile-open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0,0,0,0.4);
            z-index: 190;
          }
        }
      `}</style>
      
      {mobileSidebarOpen && (
        <div className="sidebar-overlay no-print" onClick={toggleMobileSidebar} />
      )}
    </div>
  );
};

export default Layout;
