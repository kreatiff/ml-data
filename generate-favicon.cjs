const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    const icon16 = fs.readFileSync(path.join(__dirname, 'public/icons/favicon-16x16.png'));
    const icon32 = fs.readFileSync(path.join(__dirname, 'public/icons/favicon-32x32.png'));
    
    const ico = await toIco([icon16, icon32]);
    
    fs.writeFileSync(path.join(__dirname, 'public/favicon.ico'), ico);
    
    console.log('✓ favicon.ico generated successfully!');
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
