const { OpenAI } = require('openai');
const NodeCache = require('node-cache');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for responses to improve performance
const aiCache = new NodeCache({ stdTTL: 7200 }); // 2 hour cache

/**
 * Enhanced AI Service with improved helper functions for academic integrity
 */
class AIService {
  /**
   * Generate an AI response for a student's question
   * @param {Object} options - Configuration for the AI request
   */
  async generateResponse(options) {
    const {
      questionId,
      questionText,
      aiOption,
      userPrompt,
      customPrompt,
      studentInput,
      globalInstructions,
      dependencyAnswers
    } = options;

    console.log("Processing AI option:", aiOption);

    // Different handling based on AI option
    switch(aiOption) {
      case 'compare':
        return await this.generateComparison(questionText, studentInput, globalInstructions);
      case 'hints':
        return await this.generateHint(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'guidance':
        return await this.generateGuidance(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'examples':
        return await this.generateExamples(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'step_framework':
        return await this.generateStepFramework(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'socratic':
        return await this.generateSocraticQuestions(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      case 'error_detection':
        return await this.generateErrorDetection(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers);
      default:
        return "AI assistance is not enabled for this question.";
    }
  }

  /**
   * Generate a hint for the student that promotes critical thinking
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt asking for a hint
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated hint
   */
  async generateHint(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please be more specific about what you're struggling with. A good hint request focuses on a concept or step you're stuck on.";
    }

    // Create cache key with all relevant context
    const cacheKey = `hint-${Buffer.from(questionText + userPrompt + (studentInput || '') + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache for previously generated hints
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI hint');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI hint with improved critical thinking focus...');
      
      // Prepare context from previous answers when available
      let contextText = '';
      if (dependencyAnswers && Object.keys(dependencyAnswers).length > 0) {
        contextText = 'Previous related answers:\n';
        for (const [id, answer] of Object.entries(dependencyAnswers)) {
          contextText += `Question: ${answer.questionText}\nStudent's Answer: ${answer.content}\n\n`;
        }
      }
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Enhanced system prompt focusing on Socratic method and critical thinking
      let systemPrompt = `You are an AI tutor that provides targeted, concise hints that help students develop critical thinking skills. 

Guidelines for effective hinting:
1. NEVER provide complete solutions or direct answers to the problem
2. Use the Socratic method - ask guiding questions that lead to discovery
3. Focus on concepts, not calculations
4. Keep hints brief (max 2-3 sentences)
5. Point to relevant principles or formulas without applying them directly
6. If the student is completely stuck, provide only the first step
7. Use analogies or simplified examples to clarify concepts
8. Match the hint complexity to the student's current understanding
`;
      
      // Add global instructions if available
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Guidelines: ${globalInstructions}`;
      }
      
      // Add instructor-specific guidance if available
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidance: ${customPrompt}`;
      }
      
      // Add specific constraints for the response
      systemPrompt += `\n\nYour response MUST:
- Be under 80 words
- Focus on process/approach rather than the final answer
- Avoid giving away key insights that would prevent the student from experiencing the "aha moment"
- End with a thought-provoking question that guides the student's next step`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Using a larger context model
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `${contextText ? contextText + "\n" : ""}
Question: ${questionText}

Student's current work: ${studentInput || "Not started yet"}

Student's request for help: ${userPrompt}

Respond with a brief, targeted hint that promotes critical thinking without giving away the answer.`
          }
        ],
        max_tokens: 150, // Limiting token count to ensure concise hints
        temperature: 0.7,
        presence_penalty: 0.6, // Discourage repetition
        frequency_penalty: 0.3 // Slightly discourage common phrases
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Additional validation to ensure the response is a hint and not a solution
      if (result.length > 300) {
        // If the response is too long, truncate and add an ellipsis
        const truncatedResult = result.substring(0, 280) + "...";
        aiCache.set(cacheKey, truncatedResult);
        return truncatedResult;
      }
      
      // Cache result for future use
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try asking for a more specific hint about a particular concept or step.";
      }
      console.error('Error generating AI hint:', error);
      return "I couldn't generate a hint right now. Try asking about a specific concept or step you're struggling with.";
    }
  }

  /**
   * Generate process guidance for the student
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt asking for guidance
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated guidance
   */
  async generateGuidance(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please clarify what aspect of the problem you need guidance on. Be specific about what you're trying to understand.";
    }

    // Create cache key with all relevant context
    const cacheKey = `guidance-${Buffer.from(questionText + userPrompt + (studentInput || '') + JSON.stringify(dependencyAnswers || {})).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI guidance');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI guidance with critical thinking framework...');
      
      // Prepare context from previous answers when available
      let contextText = '';
      if (dependencyAnswers && Object.keys(dependencyAnswers).length > 0) {
        contextText = 'Previous related answers:\n';
        for (const [id, answer] of Object.entries(dependencyAnswers)) {
          contextText += `Question: ${answer.questionText}\nStudent's Answer: ${answer.content}\n\n`;
        }
      }
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Enhanced system prompt focusing on critical thinking frameworks
      let systemPrompt = `You are an AI tutor that provides process guidance that helps students develop their own problem-solving skills. 

Guidelines for effective guidance:
1. NEVER provide complete solutions
2. Provide a structured framework or methodology for approaching the problem
3. Encourage metacognition - help students think about their thinking
4. Suggest general strategies without specific application
5. Break complex problems into conceptual steps
6. Recommend what information or resources might be helpful
7. Model the thought process an expert would use, without executing it`;
      
      // Add global instructions if available
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Guidelines: ${globalInstructions}`;
      }
      
      // Add instructor-specific guidance if available
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidance: ${customPrompt}`;
      }
      
      // Add specific constraints for the response
      systemPrompt += `\n\nYour response MUST:
- Provide a structured approach (3-5 steps maximum)
- Focus on methodology, not specifics
- Include prompts for self-assessment at each step
- End with a question that helps the student evaluate their understanding`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // Using a larger context model
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `${contextText ? contextText + "\n" : ""}
Question: ${questionText}

Student's current work: ${studentInput || "Not started yet"}

Student's request for guidance: ${userPrompt}

Provide a framework or approach that will help the student think through this problem without giving away the solution.`
          }
        ],
        max_tokens: 300, // Allow slightly longer responses for guidance
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result for future use
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Consider breaking your question into smaller parts.";
      }
      console.error('Error generating AI guidance:', error);
      return "I couldn't generate guidance right now. Please try asking a more specific question about your approach.";
    }
  }

  /**
   * Generate a comparison solution
   * @param {string} questionText The question text
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @returns {Promise<string>} The generated comparison
   */
  async generateComparison(questionText, studentInput, globalInstructions) {
    if (!questionText || questionText.trim().length < 5) {
      return "I need a proper question to provide an answer. Please ensure the question is complete.";
    }
    
    // Create a cache key based on the question
    const cacheKey = `ai-answer-${Buffer.from(questionText + (globalInstructions || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache first
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI answer');
      return cachedResponse;
    }
    
    try {
      console.log('Generating AI answer for comparison...');
      // Set a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      // Enhanced system prompt focusing on educational value
      let systemPrompt = `You are a knowledgeable AI tutor. Provide an educational model answer to the following assignment question. Your answer should:

1. Be well-structured and clear
2. Demonstrate proper reasoning steps
3. Explain the approach and key concepts
4. Be concise yet comprehensive
5. Show work where applicable (for math/science problems)
6. Use academic/formal language appropriate to the subject
7. Include relevant citations or references when needed

This answer will be used for comparison with a student's own work to help them learn.`;
      
      // Add global instructions if available
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Context: ${globalInstructions}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please provide a model answer for this question: ${questionText}` }
        ],
        max_tokens: 800,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Add educational disclaimer
      const finalResult = `${result}\n\n---\n*Note: This is a model answer for educational purposes. Your approach may differ while still being valid. Focus on understanding the concepts and reasoning process rather than memorizing this specific answer.*`;
      
      // Cache the result
      aiCache.set(cacheKey, finalResult);
      return finalResult;
    } catch (error) {
      console.error('Error generating AI answer:', error);
      if (error.name === 'AbortError') {
        return "Request timed out. Please try again.";
      }
      return "There was an error generating the AI answer. Please try again.";
    }
  }

  /**
   * Generate examples for the student
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt asking for examples
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated examples
   */
  async generateExamples(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!userPrompt || userPrompt.trim().length < 3) {
      return "Please provide more details for what kind of examples would be helpful. What specific concept or method are you trying to understand?";
    }

    // Create cache key
    const cacheKey = `examples-${Buffer.from(questionText + userPrompt + (studentInput || '')).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached AI examples');
      return cachedResponse;
    }
    
    try {
      console.log('Generating examples with context...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create enhanced system prompt
      let systemPrompt = `You are an AI tutor that provides illuminating examples to help students understand concepts and methods. Your examples should:

1. Be clearly different from the student's specific question
2. Illustrate the underlying principles rather than the exact problem
3. Include both the process and the solution to show proper thinking
4. Scale in complexity from simpler to more nuanced cases
5. Highlight common misconceptions or pitfalls
6. Be relevant to the student's level of understanding`;
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      // Add specific constraints
      systemPrompt += `\n\nYour response MUST:
- Provide 2-3 distinct examples that illustrate the concept/method
- Explain why each example is relevant
- NOT solve the student's specific problem directly
- End with a suggestion for how the student can apply what they've learned`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question: ${questionText}\n\nStudent's current work: ${studentInput || "Not started yet"}\n\nRequest for examples: ${userPrompt}` }
        ],
        max_tokens: 700,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try asking for examples of a more specific concept.";
      }
      console.error('Error generating examples:', error);
      return "There was an error generating examples. Please try asking for examples of a more specific concept or technique.";
    }
  }

  /**
   * Generate step-by-step framework for solving a problem
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt for step framework
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated step framework
   */
  async generateStepFramework(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    // Create cache key
    const cacheKey = `stepframework-${Buffer.from(questionText + (userPrompt || "") + (studentInput || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached step framework');
      return cachedResponse;
    }
    
    try {
      console.log('Generating step framework...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create enhanced system prompt
      let systemPrompt = `You are an AI tutor that helps students learn problem-solving methodologies. Provide a clear step-by-step framework that teaches the process, not the specific solution. Your framework should:

1. Break down the problem-solving process into clear, sequential steps
2. Explain the purpose and thinking behind each step
3. Include decision points where different approaches might be taken
4. Highlight what to check or verify at critical stages
5. Emphasize metacognitive aspects (planning, monitoring, evaluating)
6. Be applicable to similar problems in this domain`;
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      // Add specific constraints
      systemPrompt += `\n\nYour response MUST:
- Provide 4-6 clear steps (not more)
- Include guidance questions at each step
- NOT solve the specific problem
- Include a metacognition step at the end for self-assessment`;
      
      const promptText = userPrompt 
        ? `The student is asking: ${userPrompt}\n\nThe question is: ${questionText}\n\nCurrent work: ${studentInput || "Not started yet"}`
        : `Please provide a step-by-step framework for solving this problem: ${questionText}\n\nCurrent work: ${studentInput || "Not started yet"}`;
        
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        max_tokens: 600,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try with a simpler question.";
      }
      console.error('Error generating step framework:', error);
      return "There was an error generating a step-by-step framework. Please try again with a more specific request.";
    }
  }

  /**
   * Generate Socratic questions to guide student thinking
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt for Socratic guidance
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated Socratic questions
   */
  async generateSocraticQuestions(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    // Create cache key with student's current work to ensure questions are relevant
    const cacheKey = `socratic-${Buffer.from(questionText + (userPrompt || "") + (studentInput || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached Socratic questions');
      return cachedResponse;
    }
    
    try {
      console.log('Generating Socratic questions...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create enhanced system prompt for Socratic method
      let systemPrompt = `You are an AI tutor using the Socratic method to develop critical thinking skills. Your questions should:

1. Lead students to discover insights on their own
2. Move from foundational understanding to deeper analysis
3. Address misconceptions visible in the student's work
4. Highlight connections between concepts
5. Encourage metacognition and self-assessment
6. Be open-ended rather than yes/no questions
7. Challenge assumptions`;
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      // Add specific constraints
      systemPrompt += `\n\nYour response MUST:
- Provide 3-5 thoughtfully sequenced questions
- Start with more foundational questions before moving to complex ones
- Include a brief explanation of why each question is helpful (in parentheses)
- End with an encouraging note about the value of this reflection`;
      
      const userContent = `Question: ${questionText}\n\n${studentInput ? `Student's current work: ${studentInput}\n\n` : ''}${userPrompt ? `Student's request: ${userPrompt}` : 'Please provide Socratic questions to help the student think through this problem.'}`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Format for clarity
      let formattedResult = result;
      // If not already formatted as a numbered list, try to format it
      if (!result.match(/^\s*\d+\./m)) {
        // Try to find questions and format them
        const questions = result.match(/\?[^\?]*?(?=\(|$)/g);
        if (questions && questions.length > 0) {
          formattedResult = "Consider these questions to guide your thinking:\n\n";
          questions.forEach((q, i) => {
            formattedResult += `${i+1}. ${q.trim()}\n`;
          });
          formattedResult += "\nReflecting on these questions will help you develop a deeper understanding of the problem.";
        }
      }
      
      // Cache result
      aiCache.set(cacheKey, formattedResult);
      return formattedResult;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try with a more specific question about what you're struggling with.";
      }
      console.error('Error generating Socratic questions:', error);
      return "There was an error generating Socratic questions. Please try again with more details about your current understanding.";
    }
  }

  /**
   * Generate error detection and correction help
   * @param {string} questionText The question text
   * @param {string} userPrompt The student's prompt for error detection
   * @param {string} customPrompt Instructor's customized prompt/guidelines
   * @param {string} studentInput Current work the student has submitted
   * @param {string} globalInstructions General instructions for the assignment
   * @param {Object} dependencyAnswers Previous answers to related questions
   * @returns {Promise<string>} The generated error detection guidance
   */
  async generateErrorDetection(questionText, userPrompt, customPrompt, studentInput, globalInstructions, dependencyAnswers) {
    if (!studentInput || studentInput.trim().length < 5) {
      return "Please provide your work first so I can help identify potential areas for improvement. I'll focus on guiding you rather than giving direct corrections.";
    }

    // Create cache key using student input to ensure relevance
    const cacheKey = `errordetection-${Buffer.from(questionText + studentInput + (userPrompt || "")).toString('base64').substring(0, 64)}`;
    
    // Check cache
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached error detection');
      return cachedResponse;
    }
    
    try {
      console.log('Generating error detection analysis...');
      
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Create enhanced system prompt
      let systemPrompt = `You are an AI tutor that helps students identify potential areas for improvement in their work. Your feedback should:

1. Focus on types of errors rather than specific corrections
2. Encourage self-correction through guided questions
3. Provide principles and patterns to check for
4. Highlight areas of strength as well as improvement
5. Suggest verification techniques (e.g., "try testing with these values")
6. Be constructive and educational, not just evaluative`;
      
      if (globalInstructions) {
        systemPrompt += `\n\nAssignment Instructions: ${globalInstructions}`;
      }
      
      if (customPrompt) {
        systemPrompt += `\n\nInstructor Guidelines: ${customPrompt}`;
      }
      
      // Add specific constraints
      systemPrompt += `\n\nYour response MUST:
- Identify 2-3 potential areas for review (not necessarily errors)
- Ask guiding questions that lead to self-correction
- NOT provide direct corrections or solutions
- Include at least one strength in the student's approach
- Suggest a verification strategy to help the student self-check`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question: ${questionText}\n\nMy work: ${studentInput}\n\n${userPrompt ? `Additional request: ${userPrompt}` : 'Please help me identify any areas for improvement in my work.'}` }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      const result = response.choices[0].message.content;
      
      // Cache result
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        return "Request timed out. Please try submitting a smaller portion of your work for review.";
      }
      console.error('Error generating error detection:', error);
      return "There was an error analyzing your work. Please try again with a clearer explanation of what you'd like feedback on.";
    }
  }

  /**
   * Clear cache entries related to a specific assignment
   * @param {string} assignmentId The assignment ID
   */
  clearAssignmentCache(assignmentId) {
    // Implement cache clearing logic if needed
    console.log(`Clearing cache for assignment: ${assignmentId}`);
    // This would require tracking which cache keys belong to which assignment
  }
}

// Export the AIService
module.exports = new AIService();