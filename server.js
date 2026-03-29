require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Utility functions to extract info from URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    }
    // Shorts
    const shortsRegExp = /youtube\.com\/shorts\/([^#\&\?]*)/;
    const shortsMatch = url.match(shortsRegExp);
    if (shortsMatch && shortsMatch[1]) {
        return shortsMatch[1];
    }
    return null;
}

async function extractChannelId(url) {
    // If it's already a channel ID
    if (url.includes('youtube.com/channel/')) {
        return url.split('youtube.com/channel/')[1].split('/')[0];
    }
    
    // For handle (@handle) or custom URL
    let handle = null;
    if (url.includes('youtube.com/@')) {
        handle = url.split('youtube.com/@')[1].split('/')[0];
    } else if (url.includes('youtube.com/c/')) {
        handle = url.split('youtube.com/c/')[1].split('/')[0];
    } else if (url.includes('youtube.com/user/')) {
        handle = url.split('youtube.com/user/')[1].split('/')[0];
    }
    
    if (handle) {
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: 'snippet',
                    q: handle,
                    type: 'channel',
                    key: YOUTUBE_API_KEY
                }
            });
            if (response.data.items && response.data.items.length > 0) {
                return response.data.items[0].snippet.channelId;
            }
        } catch (error) {
            console.error('Error fetching channel ID:', error.message);
        }
    }
    return null;
}

app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    try {
        const videoId = extractVideoId(url);
        
        if (videoId) {
            // It's a video
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                params: {
                    part: 'statistics,snippet,contentDetails',
                    id: videoId,
                    key: YOUTUBE_API_KEY
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return res.status(404).json({ error: 'Video not found.' });
            }

            const video = response.data.items[0];
            const views = parseInt(video.statistics.viewCount || 0);
            const likes = parseInt(video.statistics.likeCount || 0);
            const comments = parseInt(video.statistics.commentCount || 0);
            const isShorts = url.includes('/shorts/');
            
            // Calculate earnings
            const viewsInThousands = views / 1000;
            let lowCpm, highCpm;

            if (isShorts) {
                lowCpm = 0.01;
                highCpm = 0.05;
            } else {
                lowCpm = 1.0;
                highCpm = 5.0;
            }

            const estimatedLow = (viewsInThousands * lowCpm).toFixed(2);
            const estimatedHigh = (viewsInThousands * highCpm).toFixed(2);
            const engagementRate = views > 0 ? (((likes + comments) / views) * 100).toFixed(2) : 0;

            return res.json({
                type: 'video',
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle,
                views,
                likes,
                comments,
                isShorts,
                engagementRate,
                earnings: {
                    low: parseFloat(estimatedLow),
                    high: parseFloat(estimatedHigh)
                }
            });
        }
        
        // Try channel
        const channelId = await extractChannelId(url);
        if (channelId) {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
                params: {
                    part: 'statistics,snippet',
                    id: channelId,
                    key: YOUTUBE_API_KEY
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return res.status(404).json({ error: 'Channel not found.' });
            }

            const channel = response.data.items[0];
            const totalViews = parseInt(channel.statistics.viewCount || 0);
            const subscribers = parseInt(channel.statistics.subscriberCount || 0);
            const videoCount = parseInt(channel.statistics.videoCount || 0);
            
            const viewsInThousands = totalViews / 1000;
            const lowCpm = 0.5;
            const avgCpm = 2.0;
            const highCpm = 5.0;

            const totalLow = (viewsInThousands * lowCpm).toFixed(2);
            const totalAvg = (viewsInThousands * avgCpm).toFixed(2);
            const totalHigh = (viewsInThousands * highCpm).toFixed(2);
            
            // Generate some daily/monthly dummy estimates assuming 1% views per month for display
            // In a better approach, we'd fetch recent videos. Here we use an approximation:
            const monthlyViewsAvg = totalViews / 24; // Just a rough estimate formula for presentation

            return res.json({
                type: 'channel',
                title: channel.snippet.title,
                thumbnail: channel.snippet.thumbnails.high.url,
                subscribers,
                totalViews,
                videoCount,
                earnings: {
                    totalLow: parseFloat(totalLow),
                    totalAvg: parseFloat(totalAvg),
                    totalHigh: parseFloat(totalHigh),
                    monthlyAvg: parseFloat((monthlyViewsAvg / 1000 * avgCpm).toFixed(2)),
                    dailyAvg: parseFloat((monthlyViewsAvg / 30 / 1000 * avgCpm).toFixed(2))
                }
            });
        }

        return res.status(400).json({ error: 'Invalid URL. Please provide a valid YouTube Video or Channel URL.' });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ error: 'Error fetching data from YouTube API.' });
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
module.exports = app;
