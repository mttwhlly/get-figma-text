# Figma Text Extractor

A tool to extract all text layers from Figma files using the Figma API.

## Features

- Extracts all text layers from a Figma file
- Exports data to CSV format
- Includes text content, font information, and positioning data
- Uses environment variables for secure API token storage

## Prerequisites

- Node.js 18+ (for native fetch support)
- Figma account with Personal Access Token
- npm or yarn

## Installation

1. Clone this repository:
```bash
git clone https://github.com/YOUR_USERNAME/figma-text-extractor.git
cd figma-text-extractor
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

Run the script:
```bash
node get-figma-text.js
```

This will create a `figma-text-layers.csv` file with all text layers from your Figma file.

## CSV Output

The CSV file includes the following columns:
- `id`: Unique ID of the text layer
- `name`: Layer name in Figma
- `characters`: The actual text content
- `fontFamily`: Font used
- `fontSize`: Font size
- `positionX`, `positionY`: Position coordinates
- `width`, `height`: Dimensions of the text layer

## Security

- Never commit your `.env` file
- Keep your Figma token secure
- Add `.env` to your `.gitignore` file

## License

MIT