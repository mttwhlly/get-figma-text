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
            style: node.style,
            absoluteBoundingBox: node.absoluteBoundingBox
        });
    }
    
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => findTextNodes(child, textNodes));
    }
    
    return textNodes;
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
        
        textNodes.forEach(node => {
            console.log('----------------------------');
            console.log(`Name: ${node.name}`);
            console.log(`ID: ${node.id}`);
            console.log(`Text: ${node.characters}`);
            if (node.style) {
                console.log(`Font: ${node.style.fontFamily || 'Unknown'}`);
                console.log(`Font Size: ${node.style.fontSize || 'Unknown'}`);
            }
        });
        
        // Return the text nodes for further processing
        return textNodes;
        
    } catch (error) {
        console.error('Error fetching from Figma:', error);
    }
}

// Export function to save as JSON
async function exportTextLayersToJSON() {
    const textNodes = await getAllTextLayers();
    
    if (textNodes) {
        const fs = require('fs');
        fs.writeFileSync(
            'figma-text-layers.json',
            JSON.stringify(textNodes, null, 2)
        );
        console.log('Text layers exported to figma-text-layers.json');
    }
}

// Execute the main function
getAllTextLayers();

// Uncomment to export to JSON
// exportTextLayersToJSON();