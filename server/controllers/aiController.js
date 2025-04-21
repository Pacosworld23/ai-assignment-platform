const enhancedAIService = require('../services/aiService');

/**
 * AI Controller - Handles all AI-related API endpoints
 */
class AIController {
  
  /**
   * Generate AI response based on the question type and student request
   */
  async generateResponse(req, res) {
    try {
      const {
        assignmentId,
        questionId,
        questionText,
        studentInput,
        customPrompt,
        aiOption,
        userPrompt,
        globalInstructions,
        dependencies
      } = req.body;
      
      console.log(`AI request for question ${questionId}, type: ${aiOption}`);
      
      // Validate required fields
      if (!questionId || !questionText || !aiOption) {
        return res.status(400).json({ 
          error: 'Missing required fields for AI generation'
        });
      }
      
      // Process dependency answers
      let dependencyAnswers = {};
      if (dependencies && dependencies.length > 0) {
        // In a real application, you would fetch these from a database
        // Here we're assuming they're passed in the request
        dependencyAnswers = dependencies.reduce((acc, dep) => {
          acc[dep.questionId] = {
            questionText: dep.questionText,
            content: dep.studentAnswer
          };
          return acc;
        }, {});
      }
      
      // Generate the AI response
      const aiResponse = await enhancedAIService.generateResponse({
        questionId,
        questionText,
        aiOption,
        userPrompt,
        customPrompt,
        studentInput,
        globalInstructions,
        dependencyAnswers
      });
      
      // Return the response
      res.json({ aiResponse });
      
    } catch (error) {
      console.error('Error in AI controller:', error);
      res.status(500).json({ 
        error: 'Failed to generate AI response',
        details: error.message 
      });
    }
  }
  
  /**
   * Save student-AI interaction for analysis and context building
   */
  async saveInteraction(req, res) {
    try {
      const {
        assignmentId,
        questionId,
        studentId,
        prompt,
        response,
        timestamp
      } = req.body;
      
      // In a real implementation, this would be saved to a database
      console.log(`Saving AI interaction: ${questionId}, ${prompt.substring(0, 30)}...`);
      
      // For now, just acknowledge the save
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error saving AI interaction:', error);
      res.status(500).json({ error: 'Failed to save interaction' });
    }
  }
}

module.exports = new AIController();
