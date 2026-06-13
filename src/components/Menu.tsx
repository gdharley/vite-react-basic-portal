import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AUTH_HEADER } from '../api/client';
import { useMenuRefresh } from '../context/MenuRefreshContext';
import type { MenuItem } from '../types';
import './Menu.css';

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
      };
    })
    .filter((item) => item.id.length > 0);
}

export function Menu() {
  const [tasks, setTasks] = useState<MenuItem[]>([]);
  const [work, setWork] = useState<MenuItem[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [workSearch, setWorkSearch] = useState('');
  const [workOpen, setWorkOpen] = useState(false);
  const { subscribe } = useMenuRefresh();
  const location = useLocation();

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

  useEffect(() => {
    const taskCtrl = loadTasks();
    const workCtrl = loadWork();

    const interval = setInterval(() => { loadTasks(); }, 10000);
    const unsubscribe = subscribe(() => {
      loadTasks();
      loadWork();
    });

    return () => {
      taskCtrl.abort();
      workCtrl.abort();
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadTasks, loadWork, subscribe]);

  const isActiveTask = (item: MenuItem) => {
    const match = location.pathname.match(/\/task\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const isActiveWork = (item: MenuItem) => {
    const match = location.pathname.match(/\/process\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const filteredTasks = tasks.filter(
    (t) => !taskSearch.trim() || t.name.toLowerCase().includes(taskSearch.trim().toLowerCase())
  );

  const filteredWork = work.filter(
    (w) => !workSearch.trim() || w.name.toLowerCase().includes(workSearch.trim().toLowerCase())
  );

  return (
    <>
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
                  {item.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
