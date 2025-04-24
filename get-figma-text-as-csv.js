// Load environment variables
require('dotenv').config();

// Configuration from .env file
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FILE_KEY;

// Validate environment variables
if (!FIGMA_TOKEN || !FILE_KEY) {
    console.error('Error: Missing FIGMA_TOKEN or FILE_KEY in .env file');
    process.exit(1);
}

// Function to recursively find all text nodes
function findTextNodes(node, textNodes = []) {
    if (node.type === 'TEXT') {
        textNodes.push({
            id: node.id,
            name: node.name,
            characters: node.characters,
            fontFamily: node.style?.fontFamily || '',
            fontSize: node.style?.fontSize || '',
            positionX: node.absoluteBoundingBox?.x || '',
            positionY: node.absoluteBoundingBox?.y || '',
            width: node.absoluteBoundingBox?.width || '',
            height: node.absoluteBoundingBox?.height || ''
        });
    }
    
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => findTextNodes(child, textNodes));
    }
    
    return textNodes;
}

// Function to escape CSV fields
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    field = String(field);
    if (field.includes('"') || field.includes(',') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

// Function to convert array of objects to CSV
function convertToCSV(textNodes) {
    const headers = ['id', 'name', 'characters', 'fontFamily', 'fontSize', 'positionX', 'positionY', 'width', 'height'];
    
    // Create CSV rows
    const rows = textNodes.map(node => 
        headers.map(header => escapeCSV(node[header])).join(',')
    );
    
    // Add headers
    const headerRow = headers.join(',');
    rows.unshift(headerRow);
    
    return rows.join('\n');
}

// Main function to fetch Figma file and extract text layers
async function getAllTextLayers() {
    try {
        const response = await fetch(
            `https://api.figma.com/v1/files/${FILE_KEY}`,
            {
                headers: {
                    'X-Figma-Token': FIGMA_TOKEN
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Find all text nodes in the document
        const textNodes = findTextNodes(data.document);
        
        // Process and display the text layers
        console.log(`Found ${textNodes.length} text layers:`);
        
        // Display first 5 as sample
        textNodes.slice(0, 5).forEach(node => {
            console.log('----------------------------');
            console.log(`Name: ${node.name}`);
            console.log(`ID: ${node.id}`);
            console.log(`Text: ${node.characters}`);
        });
        
        if (textNodes.length > 5) {
            console.log(`... and ${textNodes.length - 5} more`);
        }
        
        // Return the text nodes for further processing
        return textNodes;
        
    } catch (error) {
        console.error('Error fetching from Figma:', error);
    }
}

// Export function to save as CSV
async function exportTextLayersToCSV() {
    const textNodes = await getAllTextLayers();
    
    if (textNodes) {
        const fs = require('fs');
        const csv = convertToCSV(textNodes);
        
        fs.writeFileSync(
            'figma-text-layers.csv',
            csv
        );
        console.log('Text layers exported to figma-text-layers.csv');
    }
}

// Execute the export function
exportTextLayersToCSV();