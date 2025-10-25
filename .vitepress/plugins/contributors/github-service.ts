import { Logger } from './logger';

export class GitHubService {
    private config: Required<GitHubConfig>;
    private logger: Logger;
    private cache = new Map<string, any>();

    constructor(config: GitHubConfig, logger: Logger) {
        this.config = {
            token: config.token || '',
            repoOwner: config.repoOwner || '',
            repoName: config.repoName || ''
        };
        this.logger = logger;
    }

    async getContributorsStats(): Promise<Map<string, { commits: number }>> {
        if (!this.config.token || !this.config.repoOwner || !this.config.repoName) {
            return new Map();
        }

        try {
            this.logger.stepStart(`Получение статистики из GitHub репозитория ${this.config.repoOwner}/${this.config.repoName}`);

            const contributors = await this.getRepositoryContributors();
            const stats = new Map();

            let processed = 0;
            const total = contributors.length;

            const batchSize = 5;
            for (let i = 0; i < contributors.length; i += batchSize) {
                const batch = contributors.slice(i, i + batchSize);

                const batchPromises = batch.map(contributor => {
                    return new Promise<void>(async (resolve) => {
                        stats.set(contributor.login, {
                            commits: contributor.contributions
                        });
                        resolve();
                    });
                });

                await Promise.all(batchPromises);
                processed += batch.length;
                this.logger.progress(processed, total, 'GitHub контрибьюторы');

                if (i + batchSize < contributors.length) {
                    await this.delay(500);
                }
            }

            this.logger.success(`Получена статистика GitHub для ${stats.size} контрибьюторов`);
            return stats;

        } catch (error) {
            this.logger.error(`Ошибка при получении статистики GitHub: ${error}`);
            return new Map();
        }
    }

    private async getRepositoryContributors(): Promise<any[]> {
        const response = await fetch(
            `https://api.github.com/repos/${this.config.repoOwner}/${this.config.repoName}/contributors?per_page=100`,
            { headers: this.getHeaders() }
        );

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
        }

        const contributors = await response.json();
        this.logger.info(`Найдено ${contributors.length} контрибьюторов в GitHub репозитории`);
        return contributors;
    }

    async getUserInfo(login: string): Promise<{ name: string; login: string; avatar_url: string; html_url: string; email?: string } | null> {
        // Проверяем кэш
        if (this.cache.has(`user_${login}`)) {
            return this.cache.get(`user_${login}`);
        }

        try {
            const response = await fetch(
                `https://api.github.com/users/${login}`,
                { headers: this.getHeaders() }
            );

            if (response.ok) {
                const userData = await response.json();
                const userInfo = {
                    name: userData.name || userData.login,
                    login: userData.login,
                    avatar_url: userData.avatar_url,
                    html_url: userData.html_url,
                    email: userData.email
                };

                // Сохраняем в кэш
                this.cache.set(`user_${login}`, userInfo);
                return userInfo;
            }
            return null;
        } catch (error) {
            this.logger.warn(`Ошибка при получении информации о ${login} из GitHub: ${error}`);
            return null;
        }
    }

    async findUsersByEmails(emails: string[]): Promise<Map<string, { name: string; login: string; avatar_url: string; html_url: string }>> {
        const results = new Map();

        if (!emails.length) {
            return results;
        }

        this.logger.info(`Массовый поиск ${emails.length} пользователей на GitHub...`);

        const batchSize = 3;
        const delayBetweenBatches = 1000;

        let processed = 0;

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);

            const batchPromises = batch.map(email => this.findUserByEmail(email));
            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach((userData, index) => {
                if (userData) {
                    results.set(batch[index], userData);
                }
            });

            processed += batch.length;
            this.logger.progress(processed, emails.length, 'Поиск на GitHub');

            if (i + batchSize < emails.length) {
                await this.delay(delayBetweenBatches);
            }
        }

        this.logger.success(`Найдено ${results.size} пользователей на GitHub`);
        return results;
    }

    async findUserByEmail(email: string): Promise<{ name: string; login: string; avatar_url: string; html_url: string } | null> {
        if (this.cache.has(`email_${email}`)) {
            return this.cache.get(`email_${email}`);
        }

        if (!this.config.token) {
            return null;
        }

        try {
            const response = await fetch(
                `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email&per_page=1`,
                { headers: this.getHeaders() }
            );

            if (!response.ok) {
                if (response.status === 403) {
                    this.logger.warn('Достигнут лимит запросов к GitHub API');
                }
                return null;
            }

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const user = data.items[0];
                const userInfo = {
                    name: user.login,
                    login: user.login,
                    avatar_url: user.avatar_url,
                    html_url: user.html_url
                };

                // Сохраняем в кэш
                this.cache.set(`email_${email}`, userInfo);
                return userInfo;
            }

            return null;
        } catch (error) {
            this.logger.warn(`Ошибка при поиске пользователя ${email}: ${error}`);
            return null;
        }
    }

    private getHeaders() {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'VitePress-Contributors-Plugin'
        };

        if (this.config.token) {
            headers['Authorization'] = `token ${this.config.token}`;
        }

        return headers;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}