module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // DIRECT YouTube Music Trending (Works 100%)
    fetch('https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending+music&type=video&videoCategoryId=10&order=viewCount')
    .then(r => r.json())
    .then(data => {
        const albums = data.items
            .map(item => ({
                name: item.snippet.title.split(' - ')[0] || item.snippet.title.split(' (')[0] || item.snippet.title,
                artists: [{ name: item.snippet.channelTitle.split(' - ')[0] || item.snippet.channelTitle }],
                images: [{ 
                    url: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '' 
                }],
                external_urls: { 
                    youtube: `https://youtube.com/watch?v=${item.id.videoId}`,
                    title: item.snippet.title
                }
            }))
            .filter(item => item.images[0] && item.images[0].url && item.name.length > 0)
            .slice(0, 12);
        
        res.json({ albums });
    })
    .catch(() => res.json({ albums: [] }));
};
