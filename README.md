# Color Verification & Validation
This project, "Color Verification & Validation," is developed to assist **Steelcase**'s QA operators and field engineers in identifying wood veneer colors with high accuracy. It currently identifies Medium Cherry and Graphite Walnut, with plans to expand functionality for color validation in future releases.

<p align="center">
<img src="image.png" alt="Steelcase Logo" width="400">
</p>

## Setup
 1. Clone this repository onto your computer.
 2. Install Node.js onto your computer. https://nodejs.org/en
 3. Install Expo CLI onto your computer by using this command in the terminal: ```npm install -g expo-cli8```
 4. Navigate to the backend folder in the terminal and enter ```python server.py```
 5. Navigate to the TrueHue folder in the terminal and enter ```npx expo start``` , ```npm start``` should also work
 6. Run the app on the platform of your choice.
 7. If you want to run on mobile devices make sure to change local host to your ip address in config.js.

## Release Notes
### Version 0.5.0:

#### Features
* UI changes - adding settings for dark mode.
* Push Notifications
* Autosave
* Multilanguage
* The Report page now includes the picture of the sample

#### Bug Fixes
- Fixed UI Displays where multiple results were displayed that were inconsistent with each other.
- Fixed UI Displaying desired percentage.

#### **Known Issues**
- May not be 100% accurate.

### Version 0.4.0:

#### Features
* Integrated Models: Combined multiple models for improved color verification accuracy.
* Report Page: Added new filtering system that filters wood veneer by date (day/month/year) and wood type (Medium Cherry, Graphite Walnut, Desert Oak).
* Sharing Button: Added new share button functionality for easier result distribution.

#### Bug Fixes
- Fixed dockerfile issues to ensure all team members can run the backend code smoothly

#### **Known Issues**
- We are still running into accuracy issues with the image analyzer that needs to be fixed in sprint 5.

### Version 0.3.0:

#### Features
* New button that analyzes the uploaded wood veneer against all models and provides a confidence score for each wood type, offering more accurate and reliable results.

#### Bug Fixes
- Configured the app by docterizing it to allow certain team members devices to access the application
- Fixed confidence score being really high at 99.99% or 100% 

#### **Known Issues**
- The model is not deemed to be 100% accurate as we are still developing and improving models.

### Version 0.2.0:

#### Features
* Added Reupload functionality
* Added a spectrum for better user experience and visualization of where in the range the color falls within.

#### Bug Fixes
* Switched backend language to python, Node.js was giving errors to certain Mac OS users.

#### **Known Issues**
- We are still missing the **Desert Oak** color validation model. The current version supports only two color classes: **Medium Cherry** and **Graphite Walnute** since we had corrupted desert oak images and are still recollecting data.
- The model may not always be accurate as we are recollecting data for normalization due to lighting variances and lighting issues.

### Version 0.1.0:


#### Features
* Transitioned from a web application to a mobile app using React Native.
* Building upon the existing upload picture feature, the app now includes a new functionality that allows user to take pictures directly within in the app.

#### Bug Fixes
* No fixes in this release

#### **Known Issues**
- The current version supports only two color classes: **Medium Cherry** and **Graphite Walnut**.
- The model always returns a confidence level of 100%, which may indicate a bug in the confidence calculation

### Version 0.0.0:

#### **Features**
- Identifies wood veneer colors as either **Medium Cherry** or **Graphite Walnut**.
- Enables users to upload images via a simple web interface for color identification.

#### **Bug Fixes**
- No fixes in this release, as this is the first iteration.

#### **Known Issues**
- **Desert Oak images** are incorrectly formatted due to inconsistencies in the dataset preprocessing pipeline.
