import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const main = () => {
  rmSync('infoguard-extension-dist.zip', { force: true });

  if (process.platform === 'win32') {
    execSync('powershell -NoProfile -Command "Compress-Archive -Path dist\\* -DestinationPath infoguard-extension-dist.zip"', {
      stdio: 'inherit'
    });
  } else {
    execSync('cd dist && zip -r ../infoguard-extension-dist.zip .', { stdio: 'inherit' });
  }

  console.log('Created infoguard-extension-dist.zip');
};

main();
