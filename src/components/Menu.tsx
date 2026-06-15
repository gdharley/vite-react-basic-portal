import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AUTH_HEADER } from '../api/client';
import { useMenuRefresh } from '../context/MenuRefreshContext';
import { AppModal } from './AppModal';
import type { App, MenuItem } from '../types';
import './Menu.css';

const THEME_COLORS: Record<string, string> = {
  'theme-1': '#0f55d6',
  'theme-2': '#16a34a',
  'theme-3': '#ea580c',
  'theme-4': '#7c3aed',
  'theme-5': '#dc2626',
  'theme-6': '#0891b2',
  'theme-7': '#b45309',
  'theme-8': '#4b5563',
};

const APP_FALLBACK_COLORS = ['#0f55d6', '#16a34a', '#ea580c', '#7c3aed', '#dc2626', '#0891b2'];

function extractArray(result: unknown): unknown[] {
  if (typeof result === 'string') {
    try { return extractArray(JSON.parse(result)); } catch { return []; }
  }
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (r['body']) return extractArray(r['body']);
    if (Array.isArray(r['data'])) return r['data'] as unknown[];
    if (Array.isArray(r['content'])) return r['content'] as unknown[];
    if (r['_embedded'] && typeof r['_embedded'] === 'object') {
      const emb = r['_embedded'] as Record<string, unknown>;
      if (Array.isArray(emb['data'])) return emb['data'] as unknown[];
      if (Array.isArray(emb['tasks'])) return emb['tasks'] as unknown[];
    }
  }
  if (Array.isArray(result)) return result as unknown[];
  return [];
}

function extractTasks(result: unknown): MenuItem[] {
  return extractArray(result)
    .map((item) => {
      const i = item as Record<string, unknown>;
      return {
        id: String(i['id'] ?? i['key'] ?? ''),
        name: String(i['name'] ?? i['title'] ?? i['key'] ?? i['id'] ?? ''),
      };
    })
    .filter((item) => item.id.length > 0);
}

function groupIntoApps(raw: unknown[]): App[] {
  const appMap = new Map<string, { app: Omit<App, 'items'>; items: MenuItem[] }>();

  raw.forEach((rawItem, index) => {
    const item = rawItem as Record<string, unknown>;
    const appKey = String(item['appKey'] ?? 'default');
    const appName = String(item['appName'] ?? appKey);
    const appColor = String(item['appColor'] ?? 'theme-1');
    const appOrder = Number(item['appOrder'] ?? 9999);

    if (!appMap.has(appKey)) {
      const colorIndex = appMap.size % APP_FALLBACK_COLORS.length;
      const color = THEME_COLORS[appColor] ?? APP_FALLBACK_COLORS[colorIndex];
      appMap.set(appKey, {
        app: { key: appKey, name: appName, color, order: appOrder },
        items: [],
      });
    }

    appMap.get(appKey)!.items.push({
      id: String(item['id'] ?? item['key'] ?? index),
      name: String(item['name'] ?? item['title'] ?? item['key'] ?? item['id'] ?? ''),
      type: item['type'] != null ? String(item['type']) : undefined,
      appKey,
    });
  });

  return Array.from(appMap.values())
    .map(({ app, items }) => ({ ...app, items }))
    .sort((a, b) => a.order - b.order);
}

export function Menu() {
  const [apps, setApps] = useState<App[]>([]);
  const [tasks, setTasks] = useState<MenuItem[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [workOpen, setWorkOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<App | null>(null);
  const { subscribe, trigger: triggerRefresh } = useMenuRefresh();
  const location = useLocation();

  const loadWork = useCallback(() => {
    const controller = new AbortController();
    fetch('/platform-api/work-definitions', {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const raw = Array.isArray(data) ? data : [];
        setApps(groupIntoApps(raw));
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') console.error('Failed to load work definitions', err);
      });
    return controller;
  }, []);

  const loadTasks = useCallback(() => {
    const controller = new AbortController();
    fetch('/platform-api/search/tasks?filterId=open', {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setTasks(extractTasks(data)))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') console.error('Failed to load tasks', err);
      });
    return controller;
  }, []);

  useEffect(() => {
    const workCtrl = loadWork();
    const taskCtrl = loadTasks();
    const interval = setInterval(() => { loadTasks(); }, 10000);
    const unsubscribe = subscribe(() => { loadTasks(); loadWork(); });
    return () => {
      workCtrl.abort();
      taskCtrl.abort();
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadWork, loadTasks, subscribe]);

  const totalWorkItems = useMemo(() => apps.reduce((n, a) => n + a.items.length, 0), [apps]);

  const filteredApps = useMemo(() =>
    apps.filter((a) => !appSearch.trim() || a.name.toLowerCase().includes(appSearch.trim().toLowerCase())),
    [apps, appSearch]
  );

  const isActiveTask = (item: MenuItem) => {
    const match = location.pathname.match(/\/task\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const filteredTasks = tasks.filter(
    (t) => !taskSearch.trim() || t.name.toLowerCase().includes(taskSearch.trim().toLowerCase())
  );

  return (
    <>
      {/* Work / Apps section */}
      <section className="menu-section">
        <button
          type="button"
          className="menu-heading menu-heading--toggle"
          onClick={() => setWorkOpen((o) => !o)}
          aria-expanded={workOpen}
        >
          <span className="menu-heading__label">Work</span>
          <span className="menu-heading__count">{totalWorkItems}</span>
          <span className="menu-heading__chevron" aria-hidden="true">{workOpen ? '▲' : '▼'}</span>
        </button>

        {workOpen && (
          <>
            <input
              type="search"
              className="menu-search"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="Search apps"
            />
            <div className="menu-list">
              {filteredApps.map((app) => (
                <button
                  key={app.key}
                  type="button"
                  className="app-item"
                  onClick={() => setActiveApp(app)}
                >
                  <span
                    className="app-item__dot"
                    style={{ background: app.color }}
                    aria-hidden="true"
                  />
                  <span className="app-item__name">{app.name}</span>
                  <span className="app-item__count">{app.items.length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Tasks section */}
      <section className="menu-section">
        <h2 className="menu-heading">
          <span className="menu-heading__label">Tasks</span>
          <span className="menu-heading__count">{tasks.length}</span>
        </h2>
        <input
          type="search"
          className="menu-search"
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          placeholder="Search tasks"
        />
        <div className="menu-list">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              to={`/task/${encodeURIComponent(task.id)}`}
              className={isActiveTask(task) ? 'active' : undefined}
            >
              {task.name}
            </Link>
          ))}
        </div>
      </section>

      {/* App modal */}
      {activeApp && (
        <AppModal
          app={activeApp}
          onClose={() => setActiveApp(null)}
          onWorkStarted={() => { triggerRefresh(); }}
        />
      )}
    </>
  );
}
