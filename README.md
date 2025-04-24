# Figma Text Extractor

A tool to extract text layers and generate data dictionaries from Figma files using the Figma API.

## Features

- Extracts all text layers from a Figma file, page, or frame
- Generates enhanced data dictionaries with field detection
- Identifies dynamic fields with confidence scoring
- Exports data to CSV and JSON formats
- Uses environment variables for secure API token storage

## Prerequisites

- Node.js 18+ (for native fetch support)
- Figma account with Personal Access Token
- npm or yarn

## Installation

1. Clone this repository:
```bash
git clone https://github.com/mttwhlly/get-figma-text.git
cd get-figma-text
```

2. Install dependencies:
```bash
npm install dotenv
```

3. Create a `.env` file in the project root:
```
FIGMA_TOKEN=your-figma-token-here
FILE_KEY=your-file-key-here
```

## Usage

### Basic Text Extraction

Run the basic text extractor:
```bash
node get-figma-text.js
```

This creates a `figma-text-layers.csv` file with all text layers from your Figma file.

### Enhanced Data Dictionary Generator

Run the enhanced data dictionary generator:
```bash
node generate-data-dictionary.js
```

#### Target Specific Pages or Frames

Configure targeting in your `.env` file:

1. **Target entire file (default):**
```
FIGMA_TOKEN=your-token
FILE_KEY=your-file-key
```

2. **Target specific page by name:**
```
FIGMA_TOKEN=your-token
FILE_KEY=your-file-key
TARGET_TYPE=page
TARGET_NAME=Login Page
```

3. **Target specific frame by name:**
```
FIGMA_TOKEN=your-token
FILE_KEY=your-file-key
TARGET_TYPE=frame
TARGET_NAME=Login Form
```

4. **Target by ID:**
```
FIGMA_TOKEN=your-token
FILE_KEY=your-file-key
TARGET_TYPE=node
TARGET_ID=123:456
```

#### Finding IDs in Figma

1. Select the page or frame in Figma
2. Right-click and copy link
3. The ID will be after the `node-id=` parameter in the URL

## Output Files

### Basic Text Extractor
- `figma-text-layers.csv` - All text layers with basic information

### Data Dictionary Generator
- `figma-data-dictionary.json` - Complete data dictionary with confidence scoring
- `figma-data-dictionary-summary.csv` - Summary in spreadsheet format

When targeting specific pages/frames:
- `figma-data-dictionary-page-Login_Page.json`
- `figma-data-dictionary-frame-Login_Form.json`

## Data Dictionary Output

The data dictionary includes:
- Automatic field type detection (email, phone, date, etc.)
- Confidence scoring for each identified field
- Data type inference
- Maximum length calculation
- Validation rule suggestions
- Required field detection
- Placeholder text detection

## Security

- Never commit your `.env` file
- Keep your Figma token secure
- Add `.env` to your `.gitignore` file

## License

MIT