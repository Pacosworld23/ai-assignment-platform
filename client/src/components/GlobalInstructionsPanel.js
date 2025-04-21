import React from 'react';
import './GlobalInstructionsPanel.css';

const GlobalInstructionsPanel = ({ instructions, onClose }) => {
  return (
    <div className="global-instructions-panel">
      <div className="instructions-header">
        <h3>Assignment Instructions</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="instructions-content">
        {instructions}
      </div>
      <div className="instructions-footer">
        <p className="note">Keep these instructions in mind as you progress through the assignment.</p>
      </div>
    </div>
  );
};

export default GlobalInstructionsPanel;