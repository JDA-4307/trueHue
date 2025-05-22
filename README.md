# trueHue: AI-Powered Veneer Validator
The Steelcase AI-Powered Veneer Validator is a mobile application designed to assist quality assurance and field engineers in validating wood veneer colors against Steelcase specifications. This tool streamlines the inspection process while improving accuracy and consistency through artificial intelligence.

<p align="center">
<img src="image.png" alt="Steelcase Logo" width="400">
</p>

## Documentation Links
- [Installation Guide](Installation-Guide.pdf)
- [Detailed Design Document (PDF)](JIC-4307-Final-Report-Color-Validator.pdf)

## Prerequisites
- Computer  
- Internet connection  

## Software Installation

### 1. Install VSCode
1. Download VSCode from: <https://code.visualstudio.com/download>  
2. Follow the installation instructions for macOS  

### 2. Install Homebrew
1. Open Terminal and run:  
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. If Xcode doesn't exist, run:  
   ```bash
   xcode-select --install
   ```

### 3. Install Git
1. Using Homebrew, install Git:  
   ```bash
   brew install git
   ```
2. Verify installation:  
   ```bash
   git --version
   ```

### 4. Install Docker
1. Download Docker from: <https://www.docker.com/get-started/>  
2. Alternatively, install via Terminal:  
   ```bash
   brew install --cask docker
   ```
3. Verify installation:  
   ```bash
   docker --version
   ```
4. Open Docker desktop application  

## Application Setup

### 1. Clone Repository
```bash
git clone https://github.com/JDA-4307/JIC_4307_ColorValidation.git
```

### 2. Configure Local Settings
1. Open the cloned folder in VSCode  
2. Locate the `config.js` file  
3. Get your local IP address:  
   ```bash
   ipconfig getifaddr en0
   ```
4. Update the `API_URL` in `config.js`:  
   ```javascript
   API_URL = "http://<your_local_ip>:3050"
   ```

### 3. Start Backend Services
1. Open the `docker-compose.yml` file in VSCode  
2. Press the **Run All Services** button above the services section  
3. Wait for container installation to complete (check Docker Desktop to confirm)  

### 4. Start Frontend Application
1. In VSCode Terminal, navigate to the TrueHue folder:  
   ```bash
   cd TrueHue
   ```
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Start the application:  
   ```bash
   npx expo start
   ```

### 5. Run the Application
Choose your preferred method:  
- Web browser: Press `w`  
- iOS simulator: Press `i`  
- Android simulator: Press `a`  
- Mobile device: Scan the QR code with the Expo Go app  

## Troubleshooting
- If Docker services fail to start, check that Docker Desktop is running.  
- If you encounter dependency issues, try running `npm install` again.  
- For connection issues, verify that your IP address is correctly configured in `config.js`.

## Release Notes v1.0.0

#### Key Features

### Color Analysis
- Real-time validation of wood veneer samples against predefined Steelcase color specifications
- Support for three wood veneer types: Medium Cherry, Desert Oak, and Graphite Walnut
- Confidence scoring system indicating reliability of each validation result
- Clear pass/fail determination with "in range" or "out of range" indicators

### User-Friendly Image Capture
- Take photos directly within the app
- Select existing images from device gallery
- Preview functionality to ensure proper sample capture before analysis
- Option to retake or select new images if needed

### Dual Analysis Options
- Quick "Analyze" option for instantaneous classification
- Comprehensive "Generate Report" option for detailed analysis across all veneer types

### Robust Report Management
- Save validation results for future reference
- Browse historical validations in reverse chronological order
- Filter reports by date (day/month/year)
- Filter reports by wood veneer type
- View confidence percentages for all saved validations

### Intuitive Interface
- Clean, minimalist design focusing on core functionality
- Bottom navigation bar for easy access to key features
- Simple three-tab layout: Home, Reports, and Image Picker

### Technical Details
- Cross-platform compatibility (iOS and Android)
- Locally processed image analysis for quick results
- Cloud storage of validation reports for access across devices
- No login required for basic functionality

#### Bug Fixes

- Fixed inconsistent UI displays so only the correct result appears for each analysis.  
- Corrected confidence-score logic to avoid defaulting to 100%, now reflecting actual model certainty.   
- Improved image-decoding, resizing, and feature-extraction pipeline for more reliable inputs.

#### Known Issues

- **Lighting Sensitivity**: Extreme shadows or highlights can still skew results; improved normalization is planned for the next sprint.  
- **Security**: No authentication or encryption yet—future releases will add Firebase Authentication and HTTPS.  
- **Planned Enhancements**: Multilingual UI support and push-notification alerts are not included in v1.0.0 but are on the roadmap.

## Development Team

* Rishi Manimaran - Backend Developer
* Benson Lin - Frontend Developer
* Jihoon Kim - Frontend Developer
* Zhihui Chen - Backend Developer
* Zuhair Al Araf - Backend Developer

