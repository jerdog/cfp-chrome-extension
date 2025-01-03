# CFP Chrome Extension

The CFP Chrome Extension is a Chrome extension designed to streamline the process of managing and submitting conference talk proposals. It allows users to add, edit, delete, and manage talks, as well as import and export talks from a JSON file or the Sessionize API.

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/jerdog/cfp-chrome-extension)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Note:** Currently pending approval for inclusion in the Chrome Web Store. You can download manually on the Releases link.

## Features

- **Talk Management**
  - Add, edit, delete, and manage talks.
  - Import talks from a JSON file or the Sessionize API.
  - Export a JSON template for easier data formatting.
  - Copy directly from the extension and paste into the CFP form.
- **Settings Management**
  - Export and import settings for the extension.
- **Custom Fields**
  - Add custom fields for easier data entry, such as your LinkedIn profile, GitHub repository, etc.

## Version History

- **[1.0.1](https://github.com/jerdog/cfp-chrome-extension/releases/tag/v1.0.1)**: Resolved a few issues with copying + sorting.
- **[1.0.0](https://github.com/jerdog/cfp-chrome-extension/releases/tag/v1.0.0)**: Initial release.

## Installation

1. Clone the repository or [download the ZIP](https://github.com/jerdog/cfp-chrome-extension/archive/refs/heads/main.zip).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode**.
4. Click on **Load Unpacked** and select the project folder.

## Usage
### Options Page

- **Settings Management**: Export and import settings for the extension.
  - JSON format is used for exporting and importing settings.
  - Settings include custom fields and talk data.
- **Import/Export Talks:** Import and export talks from a JSON file.
  - Add your Sessionize API URL (found <a href="https://sessionize.com/app/speaker/embed" target="_blank">here</a>), `Save`, and then `Fetch Talks` to bring them in.
    - Note: Logic is in place which will only fetch talks that are not already in the extension.
  - Use the **Import Talks (JSON)** and **Export Talks (JSON)** buttons to work with your talks manually.
- **Manage Talks:** View and manage your existing talks (if any).
  - **Add Talk**: Manually add a talk.
  - **Delete All Talks**: Remove all talks from the extension.
    - Note: This action is irreversible. Make sure to export your talks before proceeding.
  - You can edit or delete individual talks by clicking on the respective buttons for each talk.

#### Sample JSON Template

Here’s a sample JSON template for importing talks:

```json
[
  {
    "title": "Talk Title 1",
    "description": "A brief description of the first talk.",
    "duration": 30,
    "level": "Beginner"
  },
  {
    "title": "Talk Title 2",
    "description": "An in-depth discussion on advanced topics.",
    "duration": 45,
    "level": "Advanced"
  },
  {
    "title": "Talk Title 3",
    "description": "An intermediate-level talk with practical examples.",
    "duration": 60,
    "level": "Intermediate"
  }
]
```

**Fields Explanation**

Note: The following fields are by default taken from the Sessionize API. If you are manually adding talks, make sure to include these fields.

1. `title`: The title of the talk (string).
2. `description`: A brief description of the talk (string).
3. `duration`: Duration of the talk in minutes (integer).
4. `level`: Expertise level of the talk; should be one of Beginner, Intermediate, or Advanced (string).

**How to Use**

* Save the JSON content to a file (e.g., `talks.json`).
* Import the file using the `Import Talks (JSON)` button in the options page of the extension.

### Popup Page

- **Select a Talk**: Choose a talk from the dropdown to view its details.
  - **Filters:** Filter talks by `level` or `duration`.
  - **Reset:** Reset the view.
- **Custom Fields**: View the fields you setup in the Options page, and copy them to be pasted.
- **Settings page**: Quickly navigate to the Options page.

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
