import { spawn } from 'child_process';
import { Logger } from './logger';

export class GitService {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async getBasicGitStats(): Promise<Map<string, number>> {
        return new Promise((resolve, reject) => {
            this.logger.stepStart('Получение статистики из локального Git');

            const gitProcess = spawn('git', ['shortlog', '-sn', '--email', '--all'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';
            let isResolved = false;

            const progressInterval = setInterval(() => {
                if (!isResolved) {
                    const size = (output.length / 1024).toFixed(1);
                    process.stdout.write(`\rGit обрабатывает данные... (${size}KB прочитано)`);
                }
            }, 1000);

            gitProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            gitProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            gitProcess.on('close', (code) => {
                clearInterval(progressInterval);

                if (isResolved) return;

                if (code === 0) {
                    process.stdout.write('\n');
                    this.logger.info('Анализируем вывод Git...');

                    const stats = new Map<string, number>();
                    const lines = output.trim().split('\n');

                    this.logger.info(`Обрабатываем ${lines.length} строк...`);

                    let processedLines = 0;
                    const totalLines = lines.length;

                    for (const line of lines) {
                        processedLines++;
                        if (processedLines % Math.max(1, Math.floor(totalLines / 10)) === 0) {
                            this.logger.progress(processedLines, totalLines, 'Анализ строк Git');
                        }

                        const match = line.match(/^\s*(\d+)\s+(.+?)\s+<(.+)>$/);
                        if (match) {
                            const [, commits, , email] = match;
                            stats.set(email.trim(), parseInt(commits));
                        }
                    }

                    isResolved = true;
                    this.logger.success(`Git анализ завершен: ${stats.size} авторов`);
                    resolve(stats);
                } else {
                    clearInterval(progressInterval);
                    process.stdout.write('\n');
                    isResolved = true;
                    reject(new Error(`Git shortlog failed: ${errorOutput}`));
                }
            });

            gitProcess.on('error', (error) => {
                clearInterval(progressInterval);
                if (isResolved) return;
                isResolved = true;
                process.stdout.write('\n');
                reject(new Error(`Git process error: ${error.message}`));
            });

            setTimeout(() => {
                if (!isResolved) {
                    clearInterval(progressInterval);
                    isResolved = true;
                    gitProcess.kill();
                    process.stdout.write('\n');
                    reject(new Error('Git shortlog timeout (30 seconds)'));
                }
            }, 30000);
        });
    }

    async getUltraFastStats(): Promise<Map<string, number>> {
        return new Promise((resolve, reject) => {
            this.logger.stepStart('Быстрый анализ коммитов за последний год');

            const gitProcess = spawn('git', [
                'log',
                '--pretty=format:%aE',
                '--since="1 year ago"',
                '--no-merges'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let isResolved = false;

            process.stdout.write('Быстрый анализ коммитов за последний год...');

            gitProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            gitProcess.on('close', (code) => {
                if (isResolved) return;

                if (code === 0) {
                    process.stdout.write('\n');

                    const emailCounts = new Map<string, number>();
                    const emails = output.trim().split('\n');

                    this.logger.info(`Обрабатываем ${emails.length} коммитов...`);

                    let processed = 0;
                    for (const email of emails) {
                        processed++;
                        if (email) {
                            emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
                        }
                        if (processed % Math.max(1, Math.floor(emails.length / 10)) === 0) {
                            this.logger.progress(processed, emails.length, 'Анализ коммитов');
                        }
                    }

                    this.logger.success(`Быстрый анализ завершен: ${emailCounts.size} авторов`);
                    resolve(emailCounts);
                } else {
                    process.stdout.write('\n');
                    isResolved = true;
                    reject(new Error('Git log failed'));
                }
            });

            gitProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                process.stdout.write('\n');
                reject(error);
            });

            setTimeout(() => {
                if (!isResolved) {
                    gitProcess.kill();
                    process.stdout.write('\n');
                    reject(new Error('Git log timeout (10 seconds)'));
                }
            }, 10000);
        });
    }
}