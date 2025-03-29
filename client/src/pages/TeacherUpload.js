import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TeacherUpload.css';

const TeacherUpload = ({ setCurrentAssignment }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file to upload');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError('');
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('assignment', file);
      
      // Send the PDF to the backend for processing with progress tracking
      const response = await axios.post('/api/assignments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // Store the processed assignment data
      setCurrentAssignment(response.data);
      
      // Navigate to configuration page
      navigate('/configure');
    } catch (err) {
      console.error('Error uploading file:', err);
      if (err.response) {
        setError(`Failed to upload: ${err.response.data.error || 'Server error'}`);
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to upload the file. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>Upload Assignment</h1>
        <p className="subtitle">
          Upload your assignment PDF to begin configuring AI integration for your students.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="file-upload-area">
            <input 
              type="file" 
              id="assignment-upload" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="file-input"
              disabled={uploading}
            />
            <label htmlFor="assignment-upload" className={`file-label ${uploading ? 'disabled' : ''}`}>
              {file ? file.name : 'Choose PDF file'}
            </label>
          </div>
          
          {file && !uploading && (
            <div className="file-preview">
              <p>Selected file: {file.name}</p>
              <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
          
          {uploading && (
            <div className="upload-progress">
              <div className="upload-status">
                <p>Processing your PDF... This may take a minute.</p>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  ></div>
                </div>
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
                <p className="upload-step">
                  {uploadProgress >= 100 ? 'Processing with AI...' : 'Uploading file...'}
                </p>
              </div>
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="upload-button" 
            disabled={!file || uploading}
          >
            {uploading ? 'Processing...' : 'Upload and Continue'}
          </button>
        </form>
      </div>
      
      <div className="feature-highlights">
        <h2>How It Works</h2>
        <div className="features">
          <div className="feature">
            <h3>1. Upload Assignment</h3>
            <p>Upload your PDF assignment to our platform.</p>
          </div>
          <div className="feature">
            <h3>2. Configure AI Integration</h3>
            <p>Specify which questions can use AI and how.</p>
          </div>
          <div className="feature">
            <h3>3. Share with Students</h3>
            <p>Students complete the assignment with controlled AI assistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherUpload;