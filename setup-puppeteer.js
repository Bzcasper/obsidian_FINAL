import { execSync } from 'child_process';

async function setupPuppeteer() {
  console.log('Setting up Puppeteer...');

  try {
    // Install Puppeteer with Chrome
    console.log('Installing Puppeteer and Chrome...');
    execSync('npm install puppeteer', {
      stdio: 'inherit'
    });

    console.log('Puppeteer setup completed successfully!');
  } catch (error) {
    console.error('Error during Puppeteer setup:', error);
    process.exit(1);
  }
}

setupPuppeteer();