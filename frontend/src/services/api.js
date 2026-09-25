import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes timeout for local AI processing & OCR
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkHealth = async () => {
  const response = await api.get('/health', { timeout: 15000 });
  return response.data;
};

export const uploadPDF = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 600000, // 10 minutes timeout
    onUploadProgress,
  });
  return response.data;
};

export const askQuestion = async (documentId, question, conversationHistory = [], debugMode = true) => {
  const response = await api.post('/ask', {
    document_id: documentId,
    question: question,
    conversation_history: conversationHistory,
    debug_mode: debugMode
  }, {
    timeout: 300000 // 5 minutes timeout for LLM response
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/documents', { timeout: 15000 });
  return response.data;
};

export const testLLM = async (prompt) => {
  const response = await api.post('/api/test-llm', { prompt });
  return response.data;
};

export default api;
