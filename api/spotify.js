module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // TEST 1: Basic response
    res.json({ 
        status: 'Function loaded OK',
        env_id: !!process.env.SPOTIFY_CLIENT_ID,
        env_secret: !!process.env.SPOTIFY_CLIENT_SECRET
    });
};
