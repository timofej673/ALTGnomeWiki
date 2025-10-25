export interface Contributor {
  name: string;
  email: string;
  login: string;
  avatar_url: string;
  html_url: string;
  commits: number;
  lines_added?: number;
  lines_deleted?: number;
  total_lines_changed?: number;
  files_changed?: number;
  source: 'git' | 'forgejo' | 'github' | 'git+api';
}

export interface ContributorsPluginData {
  contributors: Contributor[];
  lastUpdated: string;
  totalCommits: number;
  totalContributors: number;
}

export interface ForgejoConfig {
  baseUrl?: string;
  token?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface GitHubConfig {
  token?: string;
  repoOwner?: string;
  repoName?: string;
}

export interface ContributorsPluginOptions {
  forgejo?: ForgejoConfig;
  github?: GitHubConfig;
  mode?: 'fast' | 'ultra-fast' | 'full';
}