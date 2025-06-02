# Easy2Share Client

A modern web application for instant file sharing. Built with React, this client application provides a user-friendly interface for uploading and downloading files through unique share code and qr.

## Features

- **Simple File Upload**: Drag and drop or select multiple files to upload
- **Real-time Progress**: Track upload progress with speed and size information
- **Share Options**:
  - Unique share code generation
  - Direct download link
  - QR code for mobile sharing
- **Easy Download**: Enter a share code to download files
- **Multiple File Support**: Upload and download multiple files at once
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Details

- Built with React.js
- Uses Axios for API communication
- Implements QR code generation for easy mobile sharing
- Real-time upload progress tracking

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Dependencies

- react
- react-qr-code
- axios
- react-dom

## Note

The application is designed to work with the Easy2Share backend service. Make sure the backend service is running and properly configured before using the client application. Github link of server repo is - https://github.com/Abhishek-bramhawale/Easy2Share-server
