# CFP Chrome Extension

The CFP Chrome Extension is a Chrome extension designed to streamline the process of managing and submitting conference talk proposals. It allows users to add, edit, delete, and manage talks, as well as import and export talks from a CSV file. The extension also provides the ability to fetch talks from the Sessionize API as well.

## Features
- Add, edit, delete, and manage talks.
- Import talks from a CSV file.
- Export a CSV template for easier data formatting.
- Fetch talks from Sessionize API.

## Installation
1. Clone the repository or download the ZIP.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode**.
4. Click on **Load Unpacked** and select the project folder.

## Usage
### Options Page
- **Add Talks**: Use the **Add Talk** button to manually add a talk.
- **Import Talks**: Upload a CSV file with talk details using the **Import Talks** section.
- **Export Template**: Click the **Download CSV Template** link for a preformatted file.

### Popup Page
- **Select Talks**: Choose a talk from the dropdown to view its details.
- **Fetch Talks**: Fetch data from Sessionize by providing a valid API URL in the options page.

## File Overview
- `manifest.json`: Configures the extension (permissions, pages, etc.).
- `background.js`: Initializes storage on installation.
- `options.html` & `options.js`: Manage options page functionalities.
- `popup.html` & `popup.js`: Handle the popup page for quick access.

## Development
1. Make changes to the source files.
2. Reload the extension in `chrome://extensions/`.

## License
MIT
