import fs from 'fs';
import https from 'https';

const getModels = (apiKey) => {
    https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const models = JSON.parse(data).models;
                const imagenModels = models ? models.filter(m => m.name.includes('imagen')) : [];
                console.log("Available Imagen models for this API Key:");
                console.log(JSON.stringify(imagenModels, null, 2));
            } catch (e) {
                console.error("Error parsing models:", data);
            }
        });
    }).on('error', err => console.log('Network Error:', err));
};

// Retrieve API key from environment or default if running via node test.mjs
getModels(process.env.GEMINI_KEY || 'YOUR_API_KEY');
