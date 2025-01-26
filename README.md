# Color Verification & Validation
This project, "Color Verification & Validation," is developed to assist **Steelcase**'s QA operators and field engineers in identifying wood veneer colors with high accuracy. It currently identifies Medium Cherry and Graphite Walnut, with plans to expand functionality for color validation in future releases

<p align="center">
<img src="image.png" alt="Steelcase Logo" width="300">
</p>


## Release Notes

### Version 0.1.0:

#### New Features
* Transitioned from a web application to a mobile app using React Native
* Introduced a feature allowing users to take pictures directly within the app

#### Bug Fixes
* No fixes in this release

#### **Known Issues**
- The current version supports only two color classes: **Medium Cherry** and **Graphite Walnut**.
- The model always returns a confidence level of 100%, which may indicate a bug in the confidence calculation

### Version 0.0.0

#### **Features**
- Identifies wood veneer colors as either **Medium Cherry** or **Graphite Walnut**.
- Enables users to upload images via a simple web interface for color identification.

#### **Bug Fixes**
- No fixes in this release, as this is the first iteration.

#### **Known Issues**
- **Desert Oak images** are incorrectly formatted due to inconsistencies in the dataset preprocessing pipeline. A future update will address this by implementing preprocessing steps.
- The current model supports only two color classes; additional classes will be implemented in future iterations.