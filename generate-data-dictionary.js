// Load environment variables
require('dotenv').config();

// Configuration from .env file
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FILE_KEY;

// Target configuration - can be set to page name, frame name, or their IDs
const TARGET_TYPE = process.env.TARGET_TYPE || 'file'; // 'file', 'page', 'frame', or 'node'
const TARGET_NAME = process.env.TARGET_NAME; // Name of page or frame
const TARGET_ID = process.env.TARGET_ID; // ID of page, frame, or specific node

// Validate environment variables
if (!FIGMA_TOKEN || !FILE_KEY) {
    console.error('Error: Missing FIGMA_TOKEN or FILE_KEY in .env file');
    process.exit(1);
}

// Common patterns for dynamic fields
const FIELD_PATTERNS = {
    email: /.*email.*|.*e-mail.*/i,
    phone: /.*phone.*|.*mobile.*|.*tel.*/i,
    name: /.*name.*|.*first.*|.*last.*|.*full.*/i,
    date: /.*date.*|.*time.*|.*created.*|.*updated.*/i,
    price: /.*price.*|.*cost.*|.*amount.*|\$|€|£/i,
    id: /.*id\b.*|.*uuid.*|.*identifier.*/i,
    description: /.*description.*|.*desc.*|.*summary.*/i,
    title: /.*title.*|.*heading.*|.*headline.*/i,
    status: /.*status.*|.*state.*/i,
    count: /.*count.*|.*number.*|.*quantity.*|.*amount.*/i,
    address: /.*address.*|.*street.*|.*city.*|.*state.*|.*zip.*/i,
    username: /.*username.*|.*user\s*name.*/i,
    password: /.*password.*|.*pin.*/i,
    url: /.*url.*|.*link.*|.*website.*/i,
    image: /.*image.*|.*photo.*|.*picture.*|.*avatar.*/i
};

// Placeholder patterns (unchanged)
const PLACEHOLDER_PATTERNS = [
    /\{.*\}/,       // {placeholder}
    /\[.*\]/,       // [placeholder]
    /<%.*%>/,       // <%placeholder%>
    /{{.*}}/,       // {{placeholder}}
    /lorem ipsum/i,
    /example\.com/i,
    /test@test/i,
    /xxx/i,
    /placeholder/i,
    /sample/i,
    /your\s+/i,     // "Your name", "Your email", etc.
    /enter\s+/i,    // "Enter name", "Enter email", etc.
    /dummy/i,
    /tbd/i,
    /\.\.\./,       // ...
    /###/,          // ###
    /\$\d+/,        // $100, $50, etc.
    /\d{3}-\d{3}-\d{4}/, // Phone number patterns
    /\(\d{3}\)\s*\d{3}-\d{4}/, // (555) 555-5555
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date patterns
    /\d{4}-\d{2}-\d{2}/ // ISO date pattern
];

// Function to find a specific node by ID or name
function findTargetNode(node, targetType, targetIdentifier) {
    // Check if this is the target node
    if (targetType === 'node' && node.id === targetIdentifier) {
        return node;
    }
    
    if (targetType === 'page' && node.type === 'CANVAS') {
        if (node.id === targetIdentifier || node.name === targetIdentifier) {
            return node;
        }
    }
    
    if (targetType === 'frame' && node.type === 'FRAME') {
        if (node.id === targetIdentifier || node.name === targetIdentifier) {
            return node;
        }
    }
    
    // Recursively search children
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const found = findTargetNode(child, targetType, targetIdentifier);
            if (found) return found;
        }
    }
    
    return null;
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

// Check if text looks like a placeholder
function hasPlaceholderText(text) {
    if (!text) return false;
    text = text.toLowerCase();
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text));
}

// Convert Figma layer name to API field name
function convertToApiFieldName(name) {
    // Remove special characters and convert to snake_case
    name = name.replace(/[^\w\s]/g, '');
    name = name.replace(/\s+/g, '_');
    return name.toLowerCase();
}

// Infer data type from text content
function inferDataType(text) {
    if (!text) return 'string';
    
    if (/^\d+$/.test(text)) return 'integer';
    if (/^\d*\.\d+$/.test(text)) return 'float';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return 'date';
    if (/^(true|false)$/i.test(text)) return 'boolean';
    if (/^[\w\.-]+@[\w\.-]+\.\w+$/.test(text)) return 'email';
    if (/^https?:\/\/.+/.test(text)) return 'url';
    if (/^\$\d+(\.\d{2})?$/.test(text)) return 'currency';
    if (/^\d{3}-\d{3}-\d{4}$/.test(text)) return 'phone';
    
    return 'string';
}

// Calculate maximum length based on bounding box
function calculateMaxLength(node) {
    if (node.absoluteBoundingBox) {
        const box = node.absoluteBoundingBox;
        const width = box.width || 0;
        const fontSize = node.style?.fontSize || 12;
        // Rough estimate: width / (fontSize * 0.6)
        return Math.floor(width / (fontSize * 0.6));
    }
    return null;
}

// Guess if field is required based on name
function isLikelyRequired(name) {
    const requiredPatterns = [
        /required/i,
        /mandatory/i,
        /\*/,
        /\*\*/,
        /must\s+have/i,
        /cannot\s+be\s+empty/i
    ];
    return requiredPatterns.some(pattern => pattern.test(name));
}

// Suggest validation rules based on field type
function suggestValidationRules(fieldType, text) {
    const rules = [];
    
    switch (fieldType) {
        case 'email':
            rules.push('valid_email_format');
            rules.push('min_length: 5');
            break;
        case 'phone':
            rules.push('valid_phone_format');
            rules.push('digits_only');
            break;
        case 'date':
            rules.push('valid_date_format');
            rules.push('not_future_date');
            break;
        case 'price':
        case 'currency':
            rules.push('positive_number');
            rules.push('max_decimal_places: 2');
            break;
        case 'url':
            rules.push('valid_url_format');
            break;
        case 'password':
            rules.push('min_length: 8');
            rules.push('contains_uppercase');
            rules.push('contains_lowercase');
            rules.push('contains_number');
            break;
    }
    
    // Add length validation if applicable
    if (text && text.length > 0) {
        rules.push(`max_length: ${Math.max(text.length * 2, 50)}`);
    }
    
    return rules;
}

// Create enhanced data dictionary
function createEnhancedDataDictionary(textNodes) {
    const dataDictionary = {};
    
    textNodes.forEach(node => {
        const name = node.name.toLowerCase();
        const text = (node.characters || '').toLowerCase();
        
        // Check if the node might be a dynamic field
        let fieldType = null;
        for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
            if (pattern.test(name) || pattern.test(text)) {
                fieldType = key;
                break;
            }
        }
        
        if (fieldType || hasPlaceholderText(text)) {
            const apiFieldName = convertToApiFieldName(node.name);
            
            dataDictionary[apiFieldName] = {
                figmaId: node.id,
                figmaName: node.name,
                originalText: node.characters || '',
                suggestedFieldType: fieldType || 'string',
                dataType: inferDataType(node.characters || ''),
                maxLength: calculateMaxLength(node),
                isRequired: isLikelyRequired(node.name),
                validationRules: suggestValidationRules(fieldType, text),
                fontSize: node.style?.fontSize,
                fontFamily: node.style?.fontFamily,
                position: {
                    x: node.absoluteBoundingBox?.x,
                    y: node.absoluteBoundingBox?.y
                },
                dimensions: {
                    width: node.absoluteBoundingBox?.width,
                    height: node.absoluteBoundingBox?.height
                },
                isPlaceholder: hasPlaceholderText(text),
                confidence: determinConfidence(fieldType, text, node.name)
            };
        }
    });
    
    return dataDictionary;
}

// Determine confidence level for field identification
function determinConfidence(fieldType, text, name) {
    let confidence = 0;
    
    // Field type pattern match
    if (fieldType) confidence += 40;
    
    // Placeholder text present
    if (hasPlaceholderText(text)) confidence += 30;
    
    // Name contains field-specific keywords
    if (fieldType && FIELD_PATTERNS[fieldType].test(name)) confidence += 20;
    
    // Text contains typical format
    if (inferDataType(text) !== 'string') confidence += 10;
    
    return Math.min(confidence, 100);
}

// Main function
async function generateDataDictionary() {
    try {
        console.log('Fetching Figma file...');
        
        // Determine the API endpoint based on target type
        let apiUrl = `https://api.figma.com/v1/files/${FILE_KEY}`;
        
        // If targeting a specific node by ID, we can fetch just that node
        if (TARGET_TYPE === 'node' && TARGET_ID) {
            apiUrl = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(TARGET_ID)}`;
        }
        
        const response = await fetch(apiUrl, {
            headers: {
                'X-Figma-Token': FIGMA_TOKEN
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched Figma data');
        
        let targetNode = null;
        
        // Find the target node based on configuration
        if (TARGET_TYPE === 'file' || !TARGET_TYPE) {
            targetNode = data.document;
        } else if (TARGET_TYPE === 'node' && TARGET_ID && data.nodes) {
            targetNode = data.nodes[TARGET_ID].document;
        } else {
            targetNode = findTargetNode(
                data.document,
                TARGET_TYPE,
                TARGET_NAME || TARGET_ID
            );
        }
        
        if (!targetNode) {
            throw new Error(`Could not find target ${TARGET_TYPE}: ${TARGET_NAME || TARGET_ID}`);
        }
        
        console.log(`Found target: ${targetNode.name} (${targetNode.type})`);
        
        // Find all text nodes in the target
        const textNodes = findTextNodes(targetNode);
        console.log(`Found ${textNodes.length} text layers in ${TARGET_TYPE}`);
        
        // Create data dictionary
        const dataDictionary = createEnhancedDataDictionary(textNodes);
        console.log(`Identified ${Object.keys(dataDictionary).length} potential dynamic fields`);
        
        // Sort by confidence
        const sortedFields = Object.entries(dataDictionary)
            .sort(([, a], [, b]) => b.confidence - a.confidence);
        
        // Export to JSON
        const fs = require('fs');
        const outputPrefix = TARGET_TYPE === 'file' ? 
            'figma-data-dictionary' : 
            `figma-data-dictionary-${TARGET_TYPE}-${(TARGET_NAME || TARGET_ID).replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        fs.writeFileSync(
            `${outputPrefix}.json`,
            JSON.stringify(Object.fromEntries(sortedFields), null, 2)
        );
        console.log(`Data dictionary exported to ${outputPrefix}.json`);
        
        // Export summary CSV
        const csvContent = [
            'Field Name,Figma Name,Suggested Type,Data Type,Confidence,Is Required,Max Length,Placeholder',
            ...sortedFields.map(([key, field]) => 
                [
                    key,
                    field.figmaName,
                    field.suggestedFieldType,
                    field.dataType,
                    field.confidence,
                    field.isRequired,
                    field.maxLength || '',
                    field.isPlaceholder
                ].join(',')
            )
        ].join('\n');
        
        fs.writeFileSync(`${outputPrefix}-summary.csv`, csvContent);
        console.log(`Summary exported to ${outputPrefix}-summary.csv`);
        
        // Display sample results
        console.log('\nTop 5 identified fields:');
        sortedFields.slice(0, 5).forEach(([key, field]) => {
            console.log(`\n${key}: (Confidence: ${field.confidence}%)`);
            console.log(`  Type: ${field.suggestedFieldType}`);
            console.log(`  Figma Name: ${field.figmaName}`);
            console.log(`  Original Text: ${field.originalText}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the script
generateDataDictionary();