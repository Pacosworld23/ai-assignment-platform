const { OpenAI } = require('openai');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for parsed assignments
const parseCache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache

/**
 * Service for parsing assignments from PDF text using AI
 */
class AssignmentParserService {
  /**
   * Parse an assignment from PDF text using AI
   * @param {string|object} pdfContent - Text extracted from PDF or an object with text and tables
   * @returns {Object} - Parsed assignment data
   */
  async parseAssignment(pdfContent) {
    // Handle different input formats
    let pdfText = '';
    let tables = [];

    if (typeof pdfContent === 'string') {
      // Old format - just text
      pdfText = pdfContent;
    } else if (pdfContent && typeof pdfContent === 'object') {
      // New format with text and tables
      pdfText = pdfContent.text || '';
      tables = pdfContent.tables || [];
    }

    // Create cache key based on first 500 chars of text
    const cacheKey = `assignment-${Buffer.from(pdfText.substring(0, 500)).toString('base64')}`;
    const cachedResult = parseCache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached assignment parsing result');
      return cachedResult;
    }

    try {
      console.log('Parsing assignment with OpenAI...');
      // Set timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

      // Build the prompt including table descriptions if present
      let promptText = `
Extract the following from the provided assignment text:
1. The assignment title
2. Global instructions that apply to all questions
3. Each individual question, numbered in order
4. Tables with their data in a structured format

Format your response as a JSON object with:
- "title": The assignment title
- "globalInstructions": Overall instructions for the assignment
- "tables": Array of tables, each with { "id": "string", "data": [[row1col1, row1col2], ...] }
- "questions": Array of questions, each with:
  - "number": The question number
  - "text": The question text
  - "dependsOn": Array of question numbers this question depends on (empty if none)
  - "requiredForNext": Boolean indicating if this question is required for the next
  - "tableData": Array of arrays representing table data directly related to this question (if applicable)

Extract tables that appear in the assignment and include the data with the relevant questions.
`;

      if (tables.length > 0) {
        promptText += `\nThe assignment contains ${tables.length} tables:\n`;
        tables.forEach((table, index) => {
          promptText += `Table ${index + 1}:\n`;
          table.content.rows.forEach(row => {
            promptText += row.join(' | ') + '\n';
          });
          promptText += '\n';
        });
      }

      promptText += `\nHere is the assignment text:\n${pdfText.substring(0, 6000)}`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          { role: "system", content: "You are an expert at analyzing educational assignments. You can identify interdependent problems and extract structured information including tables. Respond with valid JSON only." },
          { role: "user", content: promptText }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      // Extract and parse the JSON response safely
      let result;
      try {
        const responseText = response.choices[0].message.content;
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract valid JSON from response");
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw parseError;
      }

      // Ensure tables property exists
      if (!result.tables) {
        result.tables = [];
      }

      // Add IDs and AI options to questions
      if (result.questions && Array.isArray(result.questions)) {
        const questionIdMap = {};
        // First pass: generate question IDs
        result.questions = result.questions.map(q => {
          const id = uuidv4();
          questionIdMap[q.number] = id;
          return { ...q, id, aiOption: 'no_ai', customPrompt: '' };
        });
        // Second pass: convert dependsOn numbers to IDs
        result.questions = result.questions.map(q => {
          let dependsOn = [];
          if (q.dependsOn && Array.isArray(q.dependsOn)) {
            dependsOn = q.dependsOn.map(num => questionIdMap[num]).filter(Boolean);
          }
          return { ...q, dependsOn };
        });
      }

      // Transform the data to connect questions with their tables
      if (
        result.questions && Array.isArray(result.questions) &&
        result.tables && Array.isArray(result.tables)
      ) {
        // Create a map of table IDs to table data
        const tableMap = {};
        result.tables.forEach(table => {
          tableMap[table.id] = table.data;
        });
        // Replace table references in questions with actual table data
        result.questions = result.questions.map(question => {
          if (question.tableData && Array.isArray(question.tableData)) {
            const actualTableData = [];
            question.tableData.forEach(tableId => {
              if (tableMap[tableId]) {
                actualTableData.push(...tableMap[tableId]);
              }
            });
            question.tableData = actualTableData.length > 0 ? actualTableData : [];
          }
          return question;
        });
      }

      // Cache and return the result
      parseCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error parsing assignment with AI:', error);
      // Fallback result structure
      return {
        title: "Parsed Assignment",
        globalInstructions: "Please complete all questions.",
        questions: [
          { id: uuidv4(), number: 1, text: "Sample Question 1", aiOption: 'no_ai', customPrompt: '', dependsOn: [], requiredForNext: false },
          { id: uuidv4(), number: 2, text: "Sample Question 2", aiOption: 'no_ai', customPrompt: '', dependsOn: [], requiredForNext: false }
        ]
      };
    }
  }
}



module.exports = new AssignmentParserService();
