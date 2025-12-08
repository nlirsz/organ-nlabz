const { execSync } = require('child_process');

if (process.env.RENDER) {
    console.log('Detected Render environment. Running build...');
    try {
        execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
} else {
    console.log('Not on Render. Skipping auto-build.');
}
