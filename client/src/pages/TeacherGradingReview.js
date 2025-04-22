import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './TeacherGradingReview.css';

const TeacherGradingReview = () => {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignment details
        const assignmentRes = await axios.get(`/api/assignments/${assignmentId}`);
        setAssignment(assignmentRes.data);
        
        // Fetch submissions
        const submissionsRes = await axios.get(`/api/assignments/${assignmentId}/submissions`);
        setSubmissions(submissionsRes.data);
        
        if (submissionsRes.data.length > 0) {
          setSelectedSubmission(submissionsRes.data[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load submissions. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [assignmentId]);
  
  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="grading-review-container">
      <div className="review-header">
        <h1>Grading Review: {assignment?.title}</h1>
        <p>Review AI-graded student submissions</p>
      </div>
      
      <div className="review-layout">
        {/* Submission list sidebar */}
        <div className="submission-list">
          <h2>Submissions ({submissions.length})</h2>
          {submissions.map((submission) => (
            <div 
              key={submission.id}
              className={`submission-item ${selectedSubmission?.id === submission.id ? 'selected' : ''}`}
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="student-info">
                <span className="student-name">Student: {submission.studentId}</span>
                <span className="submission-time">
                  {new Date(submission.submittedAt).toLocaleString()}
                </span>
              </div>
              {submission.grade && (
                <div className="grade-preview">
                  <span className="grade-score">{submission.grade.totalScore}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Selected submission detail */}
        <div className="submission-detail">
          {selectedSubmission ? (
            <>
              <div className="detail-header">
                <h2>Student: {selectedSubmission.studentId}</h2>
                <div className="submission-meta">
                  <span>Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                </div>
              </div>
              
              {/* Grade summary */}
              {selectedSubmission.grade && (
                <div className="grade-summary">
                  <h3>AI Grading Results</h3>
                  <div className="total-grade">
                    <span className="label">Total Grade:</span>
                    <span className="score">{selectedSubmission.grade.totalScore}%</span>
                  </div>
                  
                  <div className="criteria-grades">
                    <h4>Rubric Criteria</h4>
                    {selectedSubmission.grade.criteria.map((criterion, index) => (
                      <div key={index} className="criterion-item">
                        <div className="criterion-header">
                          <span className="criterion-name">{criterion.name}</span>
                          <span className="criterion-points">
                            {criterion.achievedPoints}/{criterion.totalPoints}
                          </span>
                        </div>
                        <div className="criterion-feedback">
                          {criterion.feedback}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="overall-feedback">
                    <h4>Overall Feedback</h4>
                    <p>{selectedSubmission.grade.feedback}</p>
                  </div>
                </div>
              )}
              
              {/* Question answers */}
              <div className="answers-section">
                <h3>Student Answers</h3>
                {assignment?.questions.map((question) => (
                  <div key={question.id} className="answer-item">
                    <div className="question-text">
                      <strong>Question {question.number}:</strong> {question.text}
                    </div>
                    <div className="student-answer">
                      <strong>Answer:</strong>
                      <div className="answer-content">
                        {selectedSubmission.answers[question.id]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Teacher override section */}
              <div className="teacher-override">
                <h3>Teacher Override</h3>
                <div className="override-controls">
                  <label>
                    Adjust Grade:
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={selectedSubmission.grade?.totalScore || 0}
                      onChange={(e) => {
                        // In a real app, this would update the grade
                        console.log('Grade override:', e.target.value);
                      }}
                    />
                  </label>
                  <textarea 
                    placeholder="Add additional feedback..."
                    rows="4"
                    className="additional-feedback"
                  />
                  <button className="save-override">Save Changes</button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a submission to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherGradingReview;