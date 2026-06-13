import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AUTH_HEADER } from '../api/client';
import { useMenuRefresh } from '../context/MenuRefreshContext';
import type { MenuItem } from '../types';
import './Menu.css';

function ProcessIcon() {
  return (
    <svg className="menu-item-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z"/>
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg className="menu-item-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5M1.5 4h13a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5"/>
    </svg>
  );
}

function WorkItemIcon({ type }: { type?: string }) {
  if (type === 'case') return <CaseIcon />;
  return <ProcessIcon />;
}

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
      if (Array.isArray(emb['processDefinitions'])) return emb['processDefinitions'] as unknown[];
      if (Array.isArray(emb['tasks'])) return emb['tasks'] as unknown[];
    }
  }
  if (Array.isArray(result)) return result as unknown[];
  return [];
}

function extractItems(result: unknown): MenuItem[] {
  return extractArray(result)
    .map((item) => {
      const i = item as Record<string, unknown>;
      return {
        id: String(i['id'] ?? i['key'] ?? i['processDefinitionId'] ?? ''),
        name: String(i['name'] ?? i['processDefinitionName'] ?? i['title'] ?? i['key'] ?? i['id'] ?? ''),
        type: i['type'] != null ? String(i['type']) : undefined,
      };
    })
    .filter((item) => item.id.length > 0);
}

export function Menu() {
  const [work, setWork] = useState<MenuItem[]>([]);
  const [tasks, setTasks] = useState<MenuItem[]>([]);
  const [workSearch, setWorkSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [workOpen, setWorkOpen] = useState(false);
  const { subscribe } = useMenuRefresh();
  const location = useLocation();

  const loadWork = useCallback(() => {
    const controller = new AbortController();
    fetch('/platform-api/work-definitions', {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setWork(extractItems(data)))
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
      .then((data) => setTasks(extractItems(data)))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') console.error('Failed to load tasks', err);
      });
    return controller;
  }, []);

  useEffect(() => {
    const workCtrl = loadWork();
    const taskCtrl = loadTasks();

    const interval = setInterval(() => { loadTasks(); }, 10000);
    const unsubscribe = subscribe(() => {
      loadTasks();
      loadWork();
    });

    return () => {
      workCtrl.abort();
      taskCtrl.abort();
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadWork, loadTasks, subscribe]);

  const isActiveWork = (item: MenuItem) => {
    const match = location.pathname.match(/\/process\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const isActiveTask = (item: MenuItem) => {
    const match = location.pathname.match(/\/task\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const filteredWork = work.filter(
    (w) => !workSearch.trim() || w.name.toLowerCase().includes(workSearch.trim().toLowerCase())
  );

  const filteredTasks = tasks.filter(
    (t) => !taskSearch.trim() || t.name.toLowerCase().includes(taskSearch.trim().toLowerCase())
  );

  return (
    <>
      <section className="menu-section">
        <button
          type="button"
          className="menu-heading menu-heading--toggle"
          onClick={() => setWorkOpen((o) => !o)}
          aria-expanded={workOpen}
        >
          <span className="menu-heading__label">Work</span>
          <span className="menu-heading__count">{work.length}</span>
          <span className="menu-heading__chevron" aria-hidden="true">
            {workOpen ? '▲' : '▼'}
          </span>
        </button>

        {workOpen && (
          <>
            <input
              type="search"
              className="menu-search"
              value={workSearch}
              onChange={(e) => setWorkSearch(e.target.value)}
              placeholder="Search work"
            />
            <div className="menu-list">
              {filteredWork.map((item) => (
                <Link
                  key={item.id}
                  to={`/process/${encodeURIComponent(item.id)}`}
                  className={isActiveWork(item) ? 'active' : undefined}
                >
                  <WorkItemIcon type={item.type} />
                  {item.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

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
    </>
  );
}
