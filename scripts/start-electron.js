import { spawn } from 'child_process';
import electron from 'electron';

// Strip out ELECTRON_RUN_AS_NODE if it exists globally to prevent Electron from running as Node
delete process.env.ELECTRON_RUN_AS_NODE;

// Explicitly set NODE_ENV to development so Electron loads the Vite dev server URL
process.env.NODE_ENV = 'development';

const child = spawn(electron, ['.'], {
    stdio: 'inherit',
    windowsHide: false
});

child.on('close', (code) => {
    process.exit(code);
});
