import { Logger } from './logger';

export class ForgejoService {
    private config: Required<ForgejoConfig>;
    private logger: Logger;

    constructor(config: ForgejoConfig, logger: Logger) {
        this.config = {
            baseUrl: config.baseUrl || '',
            token: config.token || '',
            repoOwner: config.repoOwner || '',
            repoName: config.repoName || ''
        };
        this.logger = logger;
    }

    async getContributorsStats(): Promise<Map<string, { commits: number }>> {
        if (!this.config.token || !this.config.baseUrl) {
            return new Map();
        }

        try {
            this.logger.stepStart(`Получение информации о репозитории из Forgejo ${this.config.repoOwner}/${this.config.repoName}`);

            const repoInfo = await this.getRepositoryInfo();

            if (repoInfo) {
                this.logger.info(`Репозиторий найден: ${repoInfo.full_name}`);
                this.logger.info(`Описание: ${repoInfo.description || 'нет описания'}`);
            }

            this.logger.warn('Forgejo API не поддерживает эндпоинт /contributors, используем только локальные Git данные');
            return new Map();

        } catch (error) {
            this.logger.error(`Ошибка при получении информации из Forgejo: ${error}`);
            return new Map();
        }
    }

    private async getRepositoryInfo(): Promise<any> {
        const response = await fetch(
            `${this.config.baseUrl}/api/v1/repos/${this.config.repoOwner}/${this.config.repoName}`,
            { headers: this.getHeaders() }
        );

        if (!response.ok) {
            throw new Error(`Forgejo API error: ${response.status} ${await response.text()}`);
        }

        return await response.json();
    }

    async getUserInfo(login: string): Promise<{ name: string; login: string; avatar_url: string; html_url: string; email?: string } | null> {
        try {
            const response = await fetch(
                `${this.config.baseUrl}/api/v1/users/${login}`,
                { headers: this.getHeaders() }
            );

            if (response.ok) {
                const userData = await response.json();
                return {
                    name: userData.full_name || userData.login,
                    login: userData.login,
                    avatar_url: userData.avatar_url,
                    html_url: userData.html_url,
                    email: userData.email
                };
            }
            return null;
        } catch (error) {
            this.logger.warn(`Ошибка при получении информации о ${login} из Forgejo: ${error}`);
            return null;
        }
    }

    async findUserByEmail(email: string): Promise<{ name: string; login: string; avatar_url: string; html_url: string } | null> {
        try {
            this.logger.info(`Поиск пользователя Forgejo для email: ${email}`);

            const usernameFromEmail = email.split('@')[0];
            const userInfo = await this.getUserInfo(usernameFromEmail);

            if (userInfo) {
                this.logger.success(`Найден пользователь Forgejo: ${userInfo.login}`);
                return userInfo;
            }

            this.logger.info(`Пользователь Forgejo для email ${email} не найден`);
            return null;
        } catch (error) {
            this.logger.warn(`Ошибка при поиске пользователя Forgejo по email ${email}: ${error}`);
            return null;
        }
    }

    private getHeaders() {
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
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