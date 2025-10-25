import { createHash } from 'crypto';
import { Logger } from './logger';
import { GitService } from './git-service';
import { ForgejoService } from './forgejo-service';
import { GitHubService } from './github-service';
import type { Contributor, ContributorsPluginData, ContributorsPluginOptions } from './types';

export class ContributorsService {
    private options: ContributorsPluginOptions;
    private logger: Logger;
    private gitService: GitService;
    private forgejoService: ForgejoService | null = null;
    private githubService: GitHubService | null = null;

    constructor(options: ContributorsPluginOptions = {}) {
        this.options = options;
        this.logger = new Logger();
        this.gitService = new GitService(this.logger);

        if (options.forgejo?.token && options.forgejo?.baseUrl) {
            this.forgejoService = new ForgejoService(options.forgejo, this.logger);
            this.logger.info('✅ Forgejo сервис инициализирован (только для поиска пользователей)');
        }

        if (options.github?.token && options.github?.repoOwner && options.github?.repoName) {
            this.githubService = new GitHubService(options.github, this.logger);
            this.logger.info('✅ GitHub сервис инициализирован');
        }

        if (!this.forgejoService && !this.githubService) {
            this.logger.warn('⚠️  Ни Forgejo, ни GitHub сервисы не инициализированы. Будут использоваться только локальные Git данные.');
        }
    }

    async getContributorsData(): Promise<ContributorsPluginData> {
        this.logger.info('Начинаем сбор данных о контрибьюторах');

        try {
            let gitStats: Map<string, number>;

            if (this.options.mode === 'ultra-fast') {
                gitStats = await this.gitService.getUltraFastStats();
            } else {
                gitStats = await this.gitService.getBasicGitStats();
            }

            let githubStats = new Map();
            if (this.githubService) {
                githubStats = await this.githubService.getContributorsStats();
            }

            const forgejoStats = new Map();

            const contributors = await this.mergeContributorsData(gitStats, githubStats, forgejoStats);

            const sortedContributors = contributors.sort((a, b) => b.commits - a.commits);
            const totalCommits = sortedContributors.reduce((sum, c) => sum + c.commits, 0);

            const result = {
                contributors: sortedContributors,
                lastUpdated: new Date().toISOString(),
                totalCommits,
                totalContributors: sortedContributors.length
            };

            this.logger.success('Сбор данных завершен!');
            this.logger.info(`Итоговая статистика:`);
            this.logger.info(`- Всего контрибьюторов: ${result.totalContributors}`);
            this.logger.info(`- Всего коммитов: ${result.totalCommits}`);

            if (result.contributors.length > 0) {
                this.logger.info(`- Топ контрибьютор: ${result.contributors[0].name} (${result.contributors[0].commits} коммитов)`);
            }

            const sources = this.countDataSources(contributors);
            this.logger.info(`Источники данных: ${JSON.stringify(sources)}`);

            return result;

        } catch (error) {
            this.logger.error(`Ошибка при сборе данных: ${error}`);
            return this.getFallbackData();
        }
    }

    private async mergeContributorsData(
        gitStats: Map<string, number>,
        githubStats: Map<string, { commits: number }>,
        forgejoStats: Map<string, { commits: number }>
    ): Promise<Contributor[]> {
        const contributors: Contributor[] = [];
        const processedEmails = new Set<string>();
        const processedLogins = new Set<string>();

        this.logger.info(`Объединяем данные: Git(${gitStats.size}) + GitHub(${githubStats.size})`);

        for (const [login, stats] of githubStats.entries()) {
            if (processedLogins.has(login)) continue;

            const userInfo = await this.githubService!.getUserInfo(login);
            if (userInfo) {
                const email = userInfo.email || `${login}@users.noreply.github.com`;

                contributors.push({
                    name: userInfo.name,
                    email: email,
                    login: userInfo.login,
                    avatar_url: userInfo.avatar_url,
                    html_url: userInfo.html_url,
                    commits: stats.commits,
                    source: 'github'
                });

                processedLogins.add(login);
                processedEmails.add(email);
            }
        }

        const remainingEmails = Array.from(gitStats.keys()).filter(email => !processedEmails.has(email));
        let githubUsersByEmail = new Map();

        if (this.githubService && remainingEmails.length > 0) {
            this.logger.info(`Массовый поиск ${remainingEmails.length} email через GitHub...`);
            githubUsersByEmail = await this.githubService.findUsersByEmails(remainingEmails);
        }

        let gitOnlyCount = 0;
        let apiEnhancedCount = 0;

        for (const [email, commits] of gitStats.entries()) {
            if (processedEmails.has(email)) continue;

            const username = email.split('@')[0];
            const hash = createHash('md5').update(email.toLowerCase()).digest('hex');

            let userInfo = null;
            let source: 'git' | 'git+api' = 'git';

            if (githubUsersByEmail.has(email)) {
                userInfo = githubUsersByEmail.get(email);
                source = 'git+api';
                apiEnhancedCount++;
            }

            else if (this.forgejoService && !userInfo) {
                userInfo = await this.forgejoService.findUserByEmail(email);
                if (userInfo) {
                    source = 'git+api';
                    apiEnhancedCount++;
                }
            }

            if (userInfo) {
                contributors.push({
                    name: userInfo.name,
                    email: email,
                    login: userInfo.login,
                    avatar_url: userInfo.avatar_url,
                    html_url: userInfo.html_url,
                    commits: commits,
                    source: source
                });
            } else {
                contributors.push({
                    name: username,
                    email: email,
                    login: username,
                    avatar_url: `https://www.gravatar.com/avatar/${hash}?d=identicon`,
                    html_url: `mailto:${email}`,
                    commits: commits,
                    source: 'git'
                });
                gitOnlyCount++;
            }

            processedEmails.add(email);
        }

        this.logger.info(`Результат объединения: ${contributors.length} контрибьюторов`);
        this.logger.info(`- Только Git: ${gitOnlyCount}`);
        this.logger.info(`- Улучшено API: ${apiEnhancedCount}`);
        this.logger.info(`- Из GitHub API: ${processedLogins.size}`);

        return contributors;
    }

    private countDataSources(contributors: Contributor[]): Record<string, number> {
        return contributors.reduce((acc, c) => {
            acc[c.source] = (acc[c.source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private getFallbackData(): ContributorsPluginData {
        this.logger.warn('Используем fallback данные');
        return {
            contributors: [],
            lastUpdated: new Date().toISOString(),
            totalCommits: 0,
            totalContributors: 0
        };
    }
}