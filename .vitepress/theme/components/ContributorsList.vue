<script setup lang="ts">
import type { ContributorsPluginData } from '../../plugins/contributors/types';

import contributorsData from 'virtual:contributors-data';

const data = contributorsData as ContributorsPluginData;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'git': 'Git',
    'github': 'GitHub',
    'forgejo': 'Forgejo',
    'git+api': 'Git + API'
  };
  return labels[source] || source;
}
</script>

<template>
  <div class="contributors">
    <h2>Участники проекта ({{ data.totalContributors }})</h2>

    <div class="contributors-stats">
      <div class="stat-card">
        <div class="stat-number">{{ data.totalContributors }}</div>
        <div class="stat-label">участников</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ data.totalCommits }}</div>
        <div class="stat-label">коммитов</div>
      </div>
      <div class="stat-card">
        <div class="stat-date">{{ formatDate(data.lastUpdated) }}</div>
        <div class="stat-label">обновлено</div>
      </div>
    </div>

    <div class="contributors-grid">
      <div v-for="contributor in data.contributors" :key="contributor.email" class="contributor-card"
        :class="`source-${contributor.source}`">
        <a :href="contributor.html_url" target="_blank" rel="noopener" class="contributor-link">
          <img :src="contributor.avatar_url" :alt="contributor.name" class="avatar">
          <div class="contributor-info">
            <h4 class="name">{{ contributor.name }}</h4>
            <p class="login">@{{ contributor.login }}</p>
            <p class="email">{{ contributor.email }}</p>
            <div class="stats">
              <span class="commits">{{ contributor.commits }} коммитов</span>
              <span class="source" :class="contributor.source">{{ getSourceLabel(contributor.source) }}</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contributors {
  margin: 3rem 0;
}

.contributors-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.stat-card {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--vp-c-brand);
  margin-bottom: 0.5rem;
}

.stat-date {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-brand);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.contributors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.contributor-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.contributor-card:hover {
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.contributor-link {
  display: flex;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  margin-right: 1.5rem;
  flex-shrink: 0;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.name {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.login {
  margin: 0 0 0.5rem 0;
  color: var(--vp-c-brand);
  font-size: 0.9rem;
  font-weight: 500;
}

.email {
  margin: 0 0 1rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  word-break: break-all;
}

.stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.commits {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.source {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 500;
}

.source-git {
  background: var(--vp-c-gray-soft);
  color: var(--vp-c-text-2);
}

.source-github {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green);
}

.source-forgejo {
  background: var(--vp-c-blue-soft);
  color: var(--vp-c-blue);
}

.source-git\+api {
  background: var(--vp-c-yellow-soft);
  color: var(--vp-c-yellow);
}
</style>