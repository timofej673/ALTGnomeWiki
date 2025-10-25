// .vitepress/plugins/contributors/index.ts

import type { Plugin } from 'vite';
import { ContributorsService } from './service';
import type { ContributorsPluginOptions, ContributorsPluginData } from './types';

export function contributorsPlugin(options: ContributorsPluginOptions = {}): Plugin {
    const virtualModuleId = 'virtual:contributors-data';
    const resolvedVirtualModuleId = `\0${virtualModuleId}`;

    let pluginData: ContributorsPluginData;

    return {
        name: 'contributors-plugin',

        async buildStart() {
            console.log('==========================================');
            console.log('Запуск плагина сбора данных контрибьюторов');
            console.log(`Режим: ${options.mode || 'fast'}`);
            console.log('==========================================');

            const startTime = Date.now();

            try {
                const service = new ContributorsService(options);
                pluginData = await service.getContributorsData();

                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log('==========================================');
                console.log(`Плагин завершил работу за ${duration} секунд`);
                console.log('==========================================');
            } catch (error) {
                console.log('==========================================');
                console.log('Плагин завершился с ошибкой');
                console.log('==========================================');
                throw error;
            }
        },

        resolveId(id: string) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },

        load(id: string) {
            if (id === resolvedVirtualModuleId) {
                if (!pluginData) {
                    console.log('Плагин еще не завершил сбор данных, возвращаем fallback');
                    return `export default ${JSON.stringify({
                        contributors: [],
                        lastUpdated: new Date().toISOString(),
                        totalCommits: 0,
                        totalContributors: 0
                    })}`;
                }

                console.log(`Отдаем данные для ${pluginData.totalContributors} контрибьюторов`);
                return `export default ${JSON.stringify(pluginData)}`;
            }
        }
    };
}

export function useContributors(): ContributorsPluginData {
    if (typeof window !== 'undefined' && (window as any).__CONTRIBUTORS_DATA__) {
        return (window as any).__CONTRIBUTORS_DATA__;
    }

    return {
        contributors: [],
        lastUpdated: new Date().toISOString(),
        totalCommits: 0,
        totalContributors: 0
    };
}