# Social Earnings Estimator

A modern, responsive web application that estimates YouTube channel and video earnings based on views and industry-standard CPMs.

## Features
- **Channel Analysis:** Get estimated earnings based on low, average, and high CPMs for any YouTube channel.
- **Video Analysis:** Understand potential earnings for individual long-form videos or YouTube Shorts.
- **Dynamic Charting:** Visualize earnings variation dynamically using Chart.js.
- **Modern UI:** Built using Tailwind CSS, including dark mode support and sleek animations.

## Prerequisites
- Node.js installed on your machine.
- A YouTube Data API v3 Key.

## How to Run Locally

1. **Install Dependencies**
   Navigate to the project folder and run:
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   The project requires a `.env` file at the root directory. This has already been set up for you with your API key:
   ```env
   PORT=3000
   YOUTUBE_API_KEY=your_api_key_here
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Disclaimer
This application uses estimated CPMs to calculate potential earnings. Actual earnings for YouTube creators are strictly confidential and vary immensely based on watch time, viewer geography, niche, and user engagement. This tool does not guarantee true earning amounts.
