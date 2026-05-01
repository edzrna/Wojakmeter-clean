export default function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");

  res.status(200).send(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#071018"/>
          <stop offset="100%" stop-color="#0b1622"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />

      <!-- Title -->
      <text 
        x="600" 
        y="260" 
        text-anchor="middle" 
        fill="#4dff88" 
        font-size="90" 
        font-family="Arial" 
        font-weight="800"
      >
        WOJAKMETER
      </text>

      <!-- Subtitle -->
      <text 
        x="600" 
        y="360" 
        text-anchor="middle" 
        fill="#cfd7e3" 
        font-size="40" 
        font-family="Arial"
      >
        OG IMAGE TEST
      </text>

      <!-- Footer -->
      <text 
        x="600" 
        y="480" 
        text-anchor="middle" 
        fill="#9eacbf" 
        font-size="28" 
        font-family="Arial"
      >
        wojakmeter.com
      </text>

    </svg>
  `);
}