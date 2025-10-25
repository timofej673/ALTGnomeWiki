export class Logger {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    info(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📊 ${message}`);
    }

    success(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        console.log(`[${timestamp}] ✅ ${message} (${duration}s)`);
    }

    warn(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ⚠️ ${message}`);
    }

    error(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ❌ ${message}`);
    }

    progress(current: number, total: number, message: string) {
        const percent = ((current / total) * 100).toFixed(1);
        const timestamp = new Date().toLocaleTimeString();
        process.stdout.write(`\r[${timestamp}] 📈 ${message} ${current}/${total} (${percent}%)`);

        if (current === total) {
            process.stdout.write('\n');
        }
    }

    stepStart(stepName: string) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 🚀 ${stepName}...`);
    }
}