import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TeacherUpload from './pages/TeacherUpload';
import AssignmentConfig from './pages/AssignmentConfig';
import StudentView from './pages/StudentView';
import Header from './components/Header';
import './App.css';

function App() {
  // Global state to pass assignment data between components
  const [currentAssignment, setCurrentAssignment] = useState(null);
  
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TeacherUpload setCurrentAssignment={setCurrentAssignment} />} />
            <Route path="/configure" element={<AssignmentConfig 
              assignment={currentAssignment} 
              setAssignment={setCurrentAssignment} 
            />} />
            <Route path="/student-view/:assignmentId" element={<StudentView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
